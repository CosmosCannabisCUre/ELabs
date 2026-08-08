from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Header, Query
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from typing import List, Optional, Annotated
from datetime import datetime, timezone, timedelta
import logging
import bcrypt
import jwt
import razorpay
import uuid
import secrets
import asyncio
import httpx
import requests

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '').strip()
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '').strip()
razorpay_client = (
    razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
    else None
)

# ---------------- Object Storage (prescription uploads) ----------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "cosmos-cannabis-cure"
_storage_key = None

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
}
ALLOWED_RX_EXT = set(MIME_TYPES.keys())


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------- Email (Emergent managed Resend) ----------------
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMERGENT_EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Cosmos Cannabis Cure")


async def send_email(to_email: str, subject: str, html: str):
    if not EMERGENT_EMAIL_KEY:
        logging.getLogger(__name__).warning("EMERGENT_EMAIL_KEY missing — skipping email")
        return None
    payload = {"to": [to_email], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{EMAIL_BASE_URL}/api/v1/email/send", headers={"X-Email-Key": EMERGENT_EMAIL_KEY}, json=payload)
        r.raise_for_status()
        return r.json().get("id")
    except Exception as e:
        logging.getLogger(__name__).error(f"Email send failed: {e}")
        return None

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

PyObjectId = Annotated[str, BeforeValidator(str)]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------------- Models ----------------
class Product(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    slug: str
    brand: str = "Cosmos"
    name: str
    tagline: str
    description: str
    price: float
    thc: str
    cbd: str
    effect: str
    flavor: str
    image: str
    stock: int = 100
    featured: bool = True


class ProductCreate(BaseModel):
    slug: str
    brand: str = "Cosmos"
    name: str
    tagline: str
    description: str
    price: float
    thc: str = "10mg"
    cbd: str = "0mg"
    effect: str = "Balanced"
    flavor: str = "Berry"
    image: str
    stock: int = 100
    featured: bool = True


class OrderItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int


class OrderCreate(BaseModel):
    customer_name: str
    email: str
    phone: str
    address: str
    items: List[OrderItem]
    payment_method: str = "cod"
    alternate_phone: Optional[str] = None
    maps_location: Optional[str] = None
    consultation_consent: bool = False
    prescription_file_id: Optional[str] = None
    prescription_declared: bool = False


class Order(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    customer_name: str
    email: str
    phone: str
    address: str
    items: List[OrderItem]
    total: float
    status: str = "pending"
    payment_method: str = "cod"
    payment_status: str = "pending"
    prescription_file_id: Optional[str] = None
    prescription_declared: bool = False
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class VerifyPayment(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class BlogPost(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    slug: str
    title: str
    excerpt: str
    body: str
    category: str
    read_time: str
    date: str


class LoginInput(BaseModel):
    email: str
    password: str


class PassportCreate(BaseModel):
    holder_name: str
    phone: str
    email: str
    prescription_file_id: str
    practitioner_name: Optional[str] = None
    issue_date: str  # 'YYYY-MM-DD'
    validity_months: int = 6


class ConsultInput(BaseModel):
    prescription_file_id: str
    doctor_notes: Optional[str] = None
    practitioner_name: Optional[str] = None
    validity_months: int = 6


class WaitlistInput(BaseModel):
    email: str


# ---------------- Auth helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_admin(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if creds is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return {"id": str(user["_id"]), "email": user["email"], "role": user["role"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def clean(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


# ---------------- Auth routes ----------------
@api_router.post("/auth/login")
async def login(payload: LoginInput):
    user = await db.users.find_one({"email": payload.email.lower().strip()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(str(user["_id"]), user["email"])
    return {"token": token, "user": {"email": user["email"], "role": user["role"]}}


@api_router.get("/auth/me")
async def me(admin: dict = Depends(get_current_admin)):
    return admin


# ---------------- Product routes ----------------
@api_router.get("/products")
async def list_products():
    docs = await db.products.find().to_list(200)
    return [clean(d) for d in docs]


@api_router.get("/products/{slug}")
async def get_product(slug: str):
    doc = await db.products.find_one({"slug": slug})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return clean(doc)


@api_router.post("/products")
async def create_product(payload: ProductCreate, admin: dict = Depends(get_current_admin)):
    doc = payload.model_dump()
    res = await db.products.insert_one(doc)
    created = await db.products.find_one({"_id": res.inserted_id})
    return clean(created)


@api_router.put("/products/{product_id}")
async def update_product(product_id: str, payload: ProductCreate, admin: dict = Depends(get_current_admin)):
    await db.products.update_one({"_id": ObjectId(product_id)}, {"$set": payload.model_dump()})
    doc = await db.products.find_one({"_id": ObjectId(product_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return clean(doc)


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(get_current_admin)):
    await db.products.delete_one({"_id": ObjectId(product_id)})
    return {"success": True}


# ---------------- Order routes ----------------
async def _is_first_order(email: str, phone: str) -> bool:
    q = {"$or": [{"email": email.strip().lower()}, {"phone": phone.strip()}]}
    prior = await db.orders.count_documents(q)
    return prior == 0


async def _order_received_email(doc: dict):
    first = doc.get("is_first_order")
    extra = ("<p>As this is your first order, please keep your Google Maps location and an alternate number handy — "
             "it helps our delivery team reach you.</p>") if first else ""
    html = f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#050507;padding:32px;font-family:Arial,Helvetica,sans-serif">
      <tr><td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#0f0f14;border:1px solid #222;border-radius:8px;overflow:hidden">
          <tr><td style="padding:28px 32px;border-bottom:1px solid #222">
            <div style="color:#DF0000;letter-spacing:3px;font-size:11px;text-transform:uppercase">Cosmos Cannabis Cure</div>
            <div style="color:#fff;font-size:24px;margin-top:8px">We've received your order</div>
          </td></tr>
          <tr><td style="padding:28px 32px;color:#c9c9d0;font-size:14px;line-height:1.6">
            <p>Hello {doc['customer_name']},</p>
            <p>Thank you for your order (total <b style="color:#fff">₹{int(doc['total'])}</b>). Our in-house Ayurvedic
            doctor will call you shortly for a short consultation. After the consult, your prescription and guidance
            are issued and your order is confirmed for processing and delivery.</p>
            {extra}
            <p style="color:#8a8a95;font-size:12px">Consume responsibly · 21+ only · India</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    """
    await send_email(doc["email"], "Your Cosmos order — consultation next", html)


@api_router.post("/orders/precheck")
async def order_precheck(body: dict):
    email = (body.get("email") or "").strip().lower()
    phone = (body.get("phone") or "").strip()
    address = (body.get("address") or "").strip()
    if not email and not phone:
        return {"is_first_order": True, "address_changed": True, "needs_location": True}
    q = {"$or": [{"email": email}, {"phone": phone}]}
    last = await db.orders.find_one(q, sort=[("created_at", -1)])
    if not last:
        return {"is_first_order": True, "address_changed": True, "needs_location": True}
    address_changed = bool(address) and address != (last.get("address") or "").strip()
    return {"is_first_order": False, "address_changed": address_changed, "needs_location": address_changed}


@api_router.post("/orders")
async def create_order(payload: OrderCreate):
    total = sum(i.price * i.quantity for i in payload.items)
    doc = payload.model_dump()
    doc["total"] = round(total, 2)
    doc["status"] = "awaiting_consultation"
    doc["payment_status"] = "cod_pending" if payload.payment_method == "cod" else "pending"
    doc["is_first_order"] = await _is_first_order(payload.email, payload.phone)
    doc["consultation_status"] = "pending"
    doc["doctor_notes"] = None
    doc["passport_code"] = None
    doc["created_at"] = now_iso()
    res = await db.orders.insert_one(doc)
    created = await db.orders.find_one({"_id": res.inserted_id})
    await _order_received_email(created)
    return clean(created)


# ---------------- Payment routes ----------------
@api_router.get("/payments/config")
async def payment_config():
    return {"enabled": razorpay_client is not None, "key_id": RAZORPAY_KEY_ID}


@api_router.post("/payments/create-order")
async def create_payment_order(payload: OrderCreate):
    if razorpay_client is None:
        raise HTTPException(status_code=503, detail="Online payments are not configured. Please use Cash on Delivery or ask the store to add Razorpay keys.")
    total = round(sum(i.price * i.quantity for i in payload.items), 2)
    doc = payload.model_dump()
    doc["payment_method"] = "razorpay"
    doc["total"] = total
    doc["status"] = "awaiting_consultation"
    doc["payment_status"] = "created"
    doc["is_first_order"] = await _is_first_order(payload.email, payload.phone)
    doc["consultation_status"] = "pending"
    doc["doctor_notes"] = None
    doc["passport_code"] = None
    doc["created_at"] = now_iso()
    res = await db.orders.insert_one(doc)
    order_id = str(res.inserted_id)
    rzp_order = razorpay_client.order.create({
        "amount": int(total * 100),
        "currency": "INR",
        "receipt": order_id[-40:],
        "payment_capture": 1,
    })
    await db.orders.update_one({"_id": res.inserted_id}, {"$set": {"razorpay_order_id": rzp_order["id"]}})
    return {
        "order_id": order_id,
        "razorpay_order_id": rzp_order["id"],
        "amount": rzp_order["amount"],
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
    }


@api_router.post("/payments/verify")
async def verify_payment(payload: VerifyPayment):
    if razorpay_client is None:
        raise HTTPException(status_code=503, detail="Online payments are not configured.")
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        })
    except Exception:
        await db.orders.update_one({"_id": ObjectId(payload.order_id)}, {"$set": {"payment_status": "failed"}})
        raise HTTPException(status_code=400, detail="Payment verification failed")
    await db.orders.update_one(
        {"_id": ObjectId(payload.order_id)},
        {"$set": {"payment_status": "paid", "status": "awaiting_consultation", "razorpay_payment_id": payload.razorpay_payment_id}},
    )
    doc = await db.orders.find_one({"_id": ObjectId(payload.order_id)})
    await _order_received_email(doc)
    return clean(doc)


@api_router.get("/orders")
async def list_orders(admin: dict = Depends(get_current_admin)):
    docs = await db.orders.find().sort("created_at", -1).to_list(500)
    return [clean(d) for d in docs]


@api_router.patch("/orders/{order_id}")
async def update_order(order_id: str, body: dict, admin: dict = Depends(get_current_admin)):
    status = body.get("status")
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": status}})
    doc = await db.orders.find_one({"_id": ObjectId(order_id)})
    return clean(doc)


@api_router.post("/orders/{order_id}/consult")
async def consult_order(order_id: str, payload: ConsultInput, admin: dict = Depends(get_current_admin)):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # issue a COSMOS Passport from the doctor's prescription
    passport = await _issue_passport(
        holder_name=order["customer_name"],
        phone=order.get("phone", ""),
        email=order["email"],
        prescription_file_id=payload.prescription_file_id,
        practitioner_name=payload.practitioner_name or "Cosmos In-house Ayurvedic Doctor",
        issue_date=datetime.now(timezone.utc).date().isoformat(),
        validity_months=payload.validity_months,
    )
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "status": "confirmed",
            "consultation_status": "completed",
            "doctor_notes": (payload.doctor_notes or "").strip() or None,
            "prescription_file_id": payload.prescription_file_id,
            "passport_code": passport["code"],
        }},
    )
    # order confirmation email (post-consult)
    html = f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#050507;padding:32px;font-family:Arial,Helvetica,sans-serif">
      <tr><td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#0f0f14;border:1px solid #222;border-radius:8px;overflow:hidden">
          <tr><td style="padding:28px 32px;border-bottom:1px solid #222">
            <div style="color:#DF0000;letter-spacing:3px;font-size:11px;text-transform:uppercase">Cosmos Cannabis Cure</div>
            <div style="color:#fff;font-size:24px;margin-top:8px">Your order is confirmed</div>
          </td></tr>
          <tr><td style="padding:28px 32px;color:#c9c9d0;font-size:14px;line-height:1.6">
            <p>Hello {order['customer_name']},</p>
            <p>Your consultation is complete and your prescription has been issued. Your order is now confirmed
            and moving to processing and dispatch.</p>
            <p style="color:#fff">Your COSMOS Passport: <b style="font-family:monospace">{passport['passport_number']}</b> — valid until {passport['expiry_date']}.</p>
            <p style="color:#8a8a95;font-size:12px">Consume responsibly · 21+ only · India</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    """
    await send_email(order["email"], "Your Cosmos order is confirmed", html)
    doc = await db.orders.find_one({"_id": ObjectId(order_id)})
    return {"order": clean(doc), "passport": {"code": passport["code"], "passport_number": passport["passport_number"]}}


# ---------------- Prescription routes ----------------
@api_router.post("/prescriptions/upload")
async def upload_prescription(file: UploadFile = File(...)):
    ext = (file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "")
    if ext not in ALLOWED_RX_EXT:
        raise HTTPException(status_code=400, detail="Please upload a PDF or image (jpg, png, webp).")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB.")
    content_type = MIME_TYPES.get(ext, file.content_type or "application/octet-stream")
    rx_id = str(uuid.uuid4())
    path = f"{APP_NAME}/prescriptions/{rx_id}.{ext}"
    try:
        result = put_object(path, data, content_type)
    except Exception as e:
        logger.error(f"Prescription upload failed: {e}")
        raise HTTPException(status_code=502, detail="Could not store the prescription. Please try again.")
    await db.prescriptions.insert_one({
        "id": rx_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": now_iso(),
    })
    return {"id": rx_id, "filename": file.filename}


@api_router.get("/prescriptions/{rx_id}/download")
async def download_prescription(rx_id: str, admin: dict = Depends(get_current_admin)):
    record = await db.prescriptions.find_one({"id": rx_id, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="Prescription not found")
    data, content_type = get_object(record["storage_path"])
    return Response(content=data, media_type=record.get("content_type", content_type))


# ---------------- Passport routes ----------------
def _passport_status(expiry_iso: str) -> str:
    try:
        expiry = datetime.fromisoformat(expiry_iso).date()
    except Exception:
        return "unknown"
    today = datetime.now(timezone.utc).date()
    if today > expiry:
        return "expired"
    if (expiry - today).days <= 30:
        return "expiring"
    return "valid"


def _public_passport(doc: dict) -> dict:
    return {
        "passport_number": doc["passport_number"],
        "holder_name": doc["holder_name"],
        "practitioner_name": doc.get("practitioner_name"),
        "issue_date": doc["issue_date"],
        "expiry_date": doc["expiry_date"],
        "status": _passport_status(doc["expiry_date"]),
        "has_prescription": bool(doc.get("prescription_file_id")),
        "created_at": doc["created_at"],
    }


async def _issue_passport(holder_name, phone, email, prescription_file_id,
                          practitioner_name, issue_date, validity_months):
    rx = await db.prescriptions.find_one({"id": prescription_file_id, "is_deleted": False})
    if not rx:
        raise HTTPException(status_code=400, detail="Please upload a valid prescription first.")
    try:
        issue = datetime.fromisoformat(issue_date).date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid issue date.")
    months = max(1, min(24, validity_months))
    expiry = issue + timedelta(days=months * 30)
    doc = {
        "code": secrets.token_urlsafe(16),
        "passport_number": "CCC-" + secrets.token_hex(3).upper(),
        "holder_name": holder_name.strip(),
        "phone": (phone or "").strip(),
        "email": email.strip().lower(),
        "practitioner_name": (practitioner_name or "").strip() or None,
        "prescription_file_id": prescription_file_id,
        "issue_date": issue.isoformat(),
        "expiry_date": expiry.isoformat(),
        "created_at": now_iso(),
    }
    await db.passports.insert_one(doc)
    html = f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#050507;padding:32px;font-family:Arial,Helvetica,sans-serif">
      <tr><td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#0f0f14;border:1px solid #222;border-radius:8px;overflow:hidden">
          <tr><td style="padding:28px 32px;border-bottom:1px solid #222">
            <div style="color:#DF0000;letter-spacing:3px;font-size:11px;text-transform:uppercase">Cosmos Cannabis Cure</div>
            <div style="color:#fff;font-size:24px;margin-top:8px">Your COSMOS Passport is ready</div>
          </td></tr>
          <tr><td style="padding:28px 32px;color:#c9c9d0;font-size:14px;line-height:1.6">
            <p>Hello {doc['holder_name']},</p>
            <p>Your COSMOS Passport has been created from your consultation. Keep it handy for purchases and for validation with authorities.</p>
            <table width="100%" style="margin:16px 0;color:#fff;font-size:14px">
              <tr><td style="padding:6px 0;color:#8a8a95">Passport No.</td><td align="right" style="font-family:monospace">{doc['passport_number']}</td></tr>
              <tr><td style="padding:6px 0;color:#8a8a95">Issue Date</td><td align="right">{doc['issue_date']}</td></tr>
              <tr><td style="padding:6px 0;color:#8a8a95">Valid Until</td><td align="right">{doc['expiry_date']}</td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:18px 32px;border-top:1px solid #222;color:#5a5a63;font-size:11px">Consume responsibly · 21+ only · India</td></tr>
        </table>
      </td></tr>
    </table>
    """
    await send_email(doc["email"], "Your COSMOS Passport", html)
    return doc




@api_router.post("/passports")
async def create_passport(payload: PassportCreate):
    doc = await _issue_passport(
        payload.holder_name, payload.phone, payload.email, payload.prescription_file_id,
        payload.practitioner_name, payload.issue_date, payload.validity_months,
    )
    return {"code": doc["code"], "passport_number": doc["passport_number"], **_public_passport(doc)}


@api_router.get("/passports/verify/{code}")
async def verify_passport(code: str):
    doc = await db.passports.find_one({"code": code})
    if not doc:
        raise HTTPException(status_code=404, detail="Passport not found")
    return _public_passport(doc)


@api_router.get("/passports/{code}/prescription")
async def passport_prescription(code: str):
    doc = await db.passports.find_one({"code": code})
    if not doc or not doc.get("prescription_file_id"):
        raise HTTPException(status_code=404, detail="Not found")
    rx = await db.prescriptions.find_one({"id": doc["prescription_file_id"], "is_deleted": False})
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    data, content_type = get_object(rx["storage_path"])
    return Response(content=data, media_type=rx.get("content_type", content_type))


@api_router.get("/passports")
async def list_passports(admin: dict = Depends(get_current_admin)):
    docs = await db.passports.find().sort("created_at", -1).to_list(500)
    out = []
    for d in docs:
        rec = _public_passport(d)
        rec["code"] = d["code"]
        rec["phone"] = d.get("phone")
        rec["email"] = d.get("email")
        out.append(rec)
    return out


@api_router.post("/passports/{code}/remind")
async def remind_passport(code: str, admin: dict = Depends(get_current_admin)):
    doc = await db.passports.find_one({"code": code})
    if not doc:
        raise HTTPException(status_code=404, detail="Passport not found")
    status = _passport_status(doc["expiry_date"])
    verb = "has expired" if status == "expired" else "is valid until " + doc["expiry_date"]
    html = f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#050507;padding:32px;font-family:Arial,Helvetica,sans-serif">
      <tr><td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#0f0f14;border:1px solid #222;border-radius:8px">
          <tr><td style="padding:28px 32px">
            <div style="color:#DF0000;letter-spacing:3px;font-size:11px;text-transform:uppercase">Cosmos Cannabis Cure</div>
            <div style="color:#fff;font-size:22px;margin:8px 0 16px">A gentle reminder about your COSMOS Passport</div>
            <div style="color:#c9c9d0;font-size:14px;line-height:1.6">
              <p>Hello {doc['holder_name']},</p>
              <p>Your COSMOS Passport <b style="color:#fff">{doc['passport_number']}</b> {verb}. To keep purchasing our Ayurvedic Vijaya products smoothly, please keep a valid prescription on file and renew your passport before it lapses.</p>
              <p style="color:#8a8a95;font-size:12px">Consume responsibly · 21+ only · India</p>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
    """
    email_id = await send_email(doc["email"], "Your COSMOS Passport — a gentle reminder", html)
    return {"sent": bool(email_id), "email": doc["email"]}


RENEWAL_WINDOW_DAYS = 7


async def _send_renewal_email(doc: dict, status: str) -> bool:
    lapsed = status == "expired"
    headline = "Your COSMOS Passport has expired" if lapsed else "Your COSMOS Passport is expiring soon"
    line = (f"expired on <b style=\"color:#fff\">{doc['expiry_date']}</b>" if lapsed
            else f"is valid until <b style=\"color:#fff\">{doc['expiry_date']}</b>")
    html = f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#050507;padding:32px;font-family:Arial,Helvetica,sans-serif">
      <tr><td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#0f0f14;border:1px solid #222;border-radius:8px">
          <tr><td style="padding:28px 32px">
            <div style="color:#DF0000;letter-spacing:3px;font-size:11px;text-transform:uppercase">Cosmos Cannabis Cure</div>
            <div style="color:#fff;font-size:22px;margin:8px 0 16px">{headline}</div>
            <div style="color:#c9c9d0;font-size:14px;line-height:1.6">
              <p>Hello {doc['holder_name']},</p>
              <p>Your COSMOS Passport <b style="color:#fff">{doc['passport_number']}</b> {line}. To keep ordering our
              Ayurvedic Vijaya products without interruption, please renew your prescription and passport.</p>
              <p style="color:#8a8a95;font-size:12px">Consume responsibly · 21+ only · India</p>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
    """
    return bool(await send_email(doc["email"], headline, html))


async def _run_renewal_reminders() -> int:
    """Email holders whose passport is expiring within the window or already expired.
    Idempotent per expiry_date via `renewal_reminded_for`."""
    sent = 0
    cursor = db.passports.find({})
    async for doc in cursor:
        status = _passport_status(doc.get("expiry_date", ""))
        if status not in ("expiring", "expired"):
            continue
        if doc.get("renewal_reminded_for") == doc.get("expiry_date"):
            continue
        ok = await _send_renewal_email(doc, status)
        if ok:
            await db.passports.update_one(
                {"code": doc["code"]},
                {"$set": {"renewal_reminded_for": doc["expiry_date"], "renewal_reminded_at": now_iso()}},
            )
            sent += 1
    if sent:
        logging.getLogger(__name__).info(f"Renewal reminders sent: {sent}")
    return sent


async def _renewal_reminder_loop():
    await asyncio.sleep(60)  # let startup settle
    while True:
        try:
            await _run_renewal_reminders()
        except Exception as e:
            logging.getLogger(__name__).error(f"Renewal loop error: {e}")
        await asyncio.sleep(12 * 60 * 60)  # every 12 hours


@api_router.post("/passports/run-reminders")
async def run_renewal_reminders(admin: dict = Depends(get_current_admin)):
    count = await _run_renewal_reminders()
    return {"sent": count}


# ---------------- Blog routes ----------------
@api_router.get("/blog")
async def list_blog():
    docs = await db.blog.find().sort("date", -1).to_list(100)
    return [clean(d) for d in docs]


@api_router.get("/blog/{slug}")
async def get_blog(slug: str):
    doc = await db.blog.find_one({"slug": slug})
    if not doc:
        raise HTTPException(status_code=404, detail="Post not found")
    return clean(doc)


@api_router.post("/waitlist")
async def join_waitlist(payload: WaitlistInput):
    email = payload.email.lower().strip()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
    existing = await db.waitlist.find_one({"email": email})
    if existing:
        return {"status": "already_subscribed", "message": "You're already on the list"}
    await db.waitlist.insert_one({
        "email": email,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "subscribed", "message": "You're on the list"}


@api_router.get("/waitlist")
async def list_waitlist(admin: dict = Depends(get_current_admin)):
    docs = await db.waitlist.find().sort("created_at", -1).to_list(2000)
    return {"count": len(docs), "entries": [clean(d) for d in docs]}


@api_router.get("/")
async def root():
    return {"message": "Cosmos Cannabis Cure API"}


# ---------------- Seed ----------------
SEED_PRODUCTS = [
    {
        "slug": "moon-impact-stellardust",
        "brand": "Moon Impact",
        "name": "Stellardust",
        "tagline": "The flagship, nano-infused.",
        "description": "Moon Impact's flagship formulation, upgraded with pharmaceutical-grade nano-infusion for faster onset, superior absorption and exceptional consistency. A full-spectrum 4:1 Vijaya gummy engineered for controlled, repeatable outcomes. Designed for use as directed by a registered medical practitioner.",
        "price": 3300,
        "thc": "Full-spectrum",
        "cbd": "4:1",
        "effect": "Balance",
        "flavor": "Mixed Berry",
        "image": "/brand-assets/cutout/moon-stellardust.png",
        "stock": 60,
        "featured": True,
    },
    {
        "slug": "moon-impact-mission-brief",
        "brand": "Moon Impact",
        "name": "Mission Brief",
        "tagline": "Measured. Daytime clarity.",
        "description": "A lighter, precisely-measured nano-infused Vijaya gummy from Moon Impact. Tuned for a clear, functional daytime lift without heaviness — repeatable and reliable under medical supervision.",
        "price": 3000,
        "thc": "Nano-infused",
        "cbd": "Balanced",
        "effect": "Focus",
        "flavor": "Citrus",
        "image": "/brand-assets/cutout/moon-mission-brief.png",
        "stock": 70,
        "featured": True,
    },
    {
        "slug": "moon-impact-drift",
        "brand": "Moon Impact",
        "name": "Drift",
        "tagline": "Nighttime, engineered.",
        "description": "Moon Impact's high-potency nighttime nano-infused gummy. Formulated to guide the body into deep, uninterrupted rest — a slow, deliberate descent into sleep.",
        "price": 2800,
        "thc": "High-potency",
        "cbd": "Low",
        "effect": "Sleep",
        "flavor": "Blackberry",
        "image": "/brand-assets/cutout/moon-drift.png",
        "stock": 55,
        "featured": True,
    },
    {
        "slug": "trost-mello-13-blueberry",
        "brand": "Trost",
        "name": "Mello Gummies — Blueberry",
        "tagline": "13% cannabis leaf extract.",
        "description": "Trost's premium Mello gummies with 13% cannabis leaf extract in a ripe blueberry flavour. A discreet, delicious way to ease stress and anxiety, calm nausea and improve sleep.",
        "price": 5999,
        "thc": "13% extract",
        "cbd": "Full-spectrum",
        "effect": "Relax",
        "flavor": "Blueberry",
        "image": "/brand-assets/cutout/trost-mello-blueberry.png",
        "stock": 40,
        "featured": True,
    },
    {
        "slug": "trost-kosha-13-berry-blast",
        "brand": "Trost",
        "name": "Kosha Gummies — Berry Blast",
        "tagline": "13% Mriduvati extract.",
        "description": "Trost's Kosha Mriduvati gummies with 13% cannabis extract in a bold berry blast. Crafted for deep relief — soothing pain, inflammation and restlessness for a restorative night.",
        "price": 5999,
        "thc": "13% extract",
        "cbd": "Full-spectrum",
        "effect": "Sleep",
        "flavor": "Berry Blast",
        "image": "/brand-assets/cutout/trost-kosha-berry.png",
        "stock": 45,
        "featured": True,
    },
    {
        "slug": "trost-mello-5-cola",
        "brand": "Trost",
        "name": "Mello Gummies — Cola",
        "tagline": "5% extract. Easy start.",
        "description": "A gentle entry point from Trost — 5% cannabis leaf extract in a classic cola flavour. Perfect for measured, low-dose daily wellness.",
        "price": 1999,
        "thc": "5% extract",
        "cbd": "Full-spectrum",
        "effect": "Balance",
        "flavor": "Cola",
        "image": "/brand-assets/cutout/trost-mello-cola.png",
        "stock": 90,
        "featured": True,
    },
    {
        "slug": "cannazo-uplift-mango",
        "brand": "Cannazo",
        "name": "Uplift Gummies — Mango",
        "tagline": "315mg. Mood, elevated.",
        "description": "Cannazo India's THC-dominant Uplift Vatis in a bright mango flavour, 315mg per pack. Strong support for anxiety, stress and a brighter mood. AYUSH-licensed, lab-tested, full-spectrum with terpenes.",
        "price": 2999,
        "thc": "315mg",
        "cbd": "Full-spectrum",
        "effect": "Uplift",
        "flavor": "Mango",
        "image": "/brand-assets/cutout/cannazo-mango.png",
        "stock": 65,
        "featured": True,
    },
    {
        "slug": "cannazo-uplift-cola",
        "brand": "Cannazo",
        "name": "Uplift Gummies — Cola",
        "tagline": "350mg. Deep unwind.",
        "description": "Cannazo India's Uplift Vatis in craft cola, 350mg per pack. Formulated for insomnia relief, relaxation and unwinding. AYUSH-licensed and third-party lab-tested for consistent potency.",
        "price": 2999,
        "thc": "350mg",
        "cbd": "Full-spectrum",
        "effect": "Sleep",
        "flavor": "Craft Cola",
        "image": "/brand-assets/cutout/cannazo-cola.png",
        "stock": 60,
        "featured": True,
    },
    {
        "slug": "cannazo-uplift-blackcurrant",
        "brand": "Cannazo",
        "name": "Uplift Gummies — Blackcurrant",
        "tagline": "500mg. Advanced comfort.",
        "description": "Cannazo India's most advanced Uplift Vatis, 500mg blackcurrant. Formulated for chronic pain and deep comfort. Full-spectrum with terpenes, AYUSH-licensed and lab-verified.",
        "price": 2499,
        "thc": "500mg",
        "cbd": "Full-spectrum",
        "effect": "Pain Relief",
        "flavor": "Blackcurrant",
        "image": "/brand-assets/cutout/cannazo-blackcurrant.png",
        "stock": 50,
        "featured": True,
    },
    {
        "slug": "rasta-strawberry-3-5",
        "brand": "Rasta",
        "name": "Strawberry Relax & Reset",
        "tagline": "3.5% · Pack of 5.",
        "description": "Rastafari Wellness Relax & Reset gummies in a sweet strawberry, 3.5% full-spectrum Vijaya. A gentle daily reset that unwinds the body and quiets the mind — broad-spectrum and lab-tested.",
        "price": 702,
        "thc": "3.5%",
        "cbd": "Broad-spectrum",
        "effect": "Relax",
        "flavor": "Strawberry",
        "image": "/brand-assets/cutout/rasta-strawberry.png",
        "stock": 100,
        "featured": True,
    },
    {
        "slug": "rasta-orange-5",
        "brand": "Rasta",
        "name": "Orange Relax & Reset",
        "tagline": "5% · Pack of 5.",
        "description": "Bright, zesty orange Relax & Reset gummies from Rastafari Wellness at 5% full-spectrum Vijaya. Balanced calm with a citrus lift — crafted for everyday ease.",
        "price": 900,
        "thc": "5%",
        "cbd": "Broad-spectrum",
        "effect": "Balance",
        "flavor": "Orange",
        "image": "/brand-assets/cutout/rasta-orange.png",
        "stock": 90,
        "featured": True,
    },
    {
        "slug": "rasta-mango-5",
        "brand": "Rasta",
        "name": "Mango Relax & Reset",
        "tagline": "5% · Pack of 5.",
        "description": "Ripe Alphonso-style mango Relax & Reset gummies from Rastafari Wellness, 5% full-spectrum. Warm, rounded relaxation with a tropical sweetness.",
        "price": 900,
        "thc": "5%",
        "cbd": "Broad-spectrum",
        "effect": "Relax",
        "flavor": "Mango",
        "image": "/brand-assets/cutout/rasta-mango.png",
        "stock": 85,
        "featured": True,
    },
    {
        "slug": "rasta-kala-khatta-5",
        "brand": "Rasta",
        "name": "Kala Khatta Relax & Reset",
        "tagline": "5% · Pack of 5.",
        "description": "A nostalgic Indian kala khatta twist on Rastafari Wellness's Relax & Reset gummies, 5% full-spectrum Vijaya. Tangy, bold and deeply calming.",
        "price": 900,
        "thc": "5%",
        "cbd": "Broad-spectrum",
        "effect": "Hybrid",
        "flavor": "Kala Khatta",
        "image": "/brand-assets/cutout/rasta-kala-khatta.png",
        "stock": 80,
        "featured": True,
    },
    {
        "slug": "rasta-cappuccino-5",
        "brand": "Rasta",
        "name": "Cappuccino Relax & Reset",
        "tagline": "5% · Pack of 5.",
        "description": "A rich cappuccino Relax & Reset gummy from Rastafari Wellness at 5% full-spectrum. Coffee-forward comfort that grounds and soothes — a connoisseur's evening treat.",
        "price": 900,
        "thc": "5%",
        "cbd": "Broad-spectrum",
        "effect": "Sleep",
        "flavor": "Cappuccino",
        "image": "/brand-assets/cutout/rasta-cappuccino.png",
        "stock": 75,
        "featured": True,
    },
]

SEED_BLOG = [
    {
        "slug": "understanding-thc-cbd-ratios",
        "title": "Understanding THC & CBD Ratios",
        "excerpt": "The single most important number on your gummy jar — and how to read it.",
        "body": "The ratio of THC to CBD shapes almost everything about how a gummy feels. THC drives the psychoactive lift; CBD softens, lengthens and grounds it. A 1:1 ratio like Trost tends to feel balanced and functional, while a THC-forward profile like Rasta leans richer and more sedative.\n\nStart low. A 5–10mg dose is plenty for most first-time and occasional consumers. Wait a full 90 minutes before considering more — edibles metabolise slowly through the liver, and the peak often arrives later than expected.\n\nKeep a simple journal: product, dose, time, and how you felt at 60 and 120 minutes. Within a week you'll know your ideal ratio precisely.",
        "category": "Education",
        "read_time": "4 min",
        "date": "2026-05-28",
    },
    {
        "slug": "the-art-of-microdosing",
        "title": "The Art of Microdosing",
        "excerpt": "Less is a strategy. How small, consistent doses changed the conversation.",
        "body": "Microdosing means taking a sub-perceptual or barely-perceptual amount — typically 2.5 to 5mg of THC — to gain subtle benefits without impairment. The goal isn't to feel high; it's to feel slightly better.\n\nMany of our customers microdose Cannoza during focused work blocks or Trost in the early evening to decompress. Cut a gummy into halves or quarters, dose consistently, and observe over days rather than minutes.\n\nAs always: consult a physician if you take other medication, and never drive after dosing.",
        "category": "Wellness",
        "read_time": "3 min",
        "date": "2026-05-20",
    },
    {
        "slug": "cannabis-in-india-a-new-chapter",
        "title": "Cannabis in India: A New Chapter",
        "excerpt": "What it means to open India's first premium dispensary in Bangalore.",
        "body": "India's relationship with cannabis is ancient — bhang has been woven into ritual and medicine for millennia. Cosmos Cannabis Cure steps into that lineage with a modern, clinical, and utterly transparent approach.\n\nEvery product we stock is lab-tested, precisely dosed, and clearly labelled. We believe premium cannabis wellness deserves the same rigour and design sensibility as fine pharmacy or skincare.\n\nThis is only the beginning. From our Bangalore flagship, we're building a category defined by trust, craft, and care.",
        "category": "Culture",
        "read_time": "5 min",
        "date": "2026-05-10",
    },
]


@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logging.getLogger(__name__).info("Object storage initialized")
    except Exception as e:
        logging.getLogger(__name__).error(f"Storage init failed: {e}")
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": now_iso(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    for p in SEED_PRODUCTS:
        await db.products.update_one({"slug": p["slug"]}, {"$set": p}, upsert=True)
    await db.products.delete_many({"slug": {"$in": ["moon-impact", "trost", "cannoza", "rasta", "rasta-hybrid-cubes"]}})
    for b in SEED_BLOG:
        await db.blog.update_one({"slug": b["slug"]}, {"$setOnInsert": b}, upsert=True)

    asyncio.create_task(_renewal_reminder_loop())


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
