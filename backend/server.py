from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
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
@api_router.post("/orders")
async def create_order(payload: OrderCreate):
    total = sum(i.price * i.quantity for i in payload.items)
    doc = payload.model_dump()
    doc["total"] = round(total, 2)
    doc["status"] = "pending"
    doc["payment_status"] = "cod_pending" if payload.payment_method == "cod" else "pending"
    doc["created_at"] = now_iso()
    res = await db.orders.insert_one(doc)
    created = await db.orders.find_one({"_id": res.inserted_id})
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
    doc["status"] = "pending"
    doc["payment_status"] = "created"
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
        {"$set": {"payment_status": "paid", "status": "confirmed", "razorpay_payment_id": payload.razorpay_payment_id}},
    )
    doc = await db.orders.find_one({"_id": ObjectId(payload.order_id)})
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
