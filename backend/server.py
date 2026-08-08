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

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

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
    created_at: str = Field(default_factory=now_iso)


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
    doc["created_at"] = now_iso()
    res = await db.orders.insert_one(doc)
    created = await db.orders.find_one({"_id": res.inserted_id})
    return clean(created)


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
        "slug": "moon-impact",
        "name": "Moon Impact",
        "tagline": "Deep rest, engineered.",
        "description": "A nocturnal formula tuned for deep, uninterrupted rest. Moon Impact eases the mind into stillness with a slow, rolling calm that arrives like moonrise.",
        "price": 2400,
        "thc": "20mg",
        "cbd": "5mg",
        "effect": "Sleep",
        "flavor": "Blackberry",
        "image": "https://static.prod-images.emergentagent.com/jobs/1fef2c4b-6b16-4dd9-8afb-bc98d943e39c/images/d0e78e2631e5b027c7f70cddd223f42a5dcb3719417c35ac9bc19db68f805aee.jpeg",
        "stock": 120,
        "featured": True,
    },
    {
        "slug": "trost",
        "name": "Trost",
        "tagline": "Comfort, distilled.",
        "description": "Named for the old word for solace. Trost is a daytime companion that dissolves edges without dulling clarity — a gentle, grounding warmth.",
        "price": 2100,
        "thc": "10mg",
        "cbd": "10mg",
        "effect": "Balance",
        "flavor": "Peach",
        "image": "https://static.prod-images.emergentagent.com/jobs/1fef2c4b-6b16-4dd9-8afb-bc98d943e39c/images/60abcfb6c573bb69ac449b5228a88860f7d2998e2163f180deae6445f882a53c.jpeg",
        "stock": 140,
        "featured": True,
    },
    {
        "slug": "cannoza",
        "name": "Cannoza",
        "tagline": "Clarity, uncaged.",
        "description": "A bright, sativa-forward lift for creative hours. Cannoza opens a clean, buoyant focus — sharp, social, and quietly euphoric.",
        "price": 2300,
        "thc": "15mg",
        "cbd": "2mg",
        "effect": "Focus",
        "flavor": "Citrus",
        "image": "https://static.prod-images.emergentagent.com/jobs/1fef2c4b-6b16-4dd9-8afb-bc98d943e39c/images/cd7f702a4611958a6c4af2c67397ac42b7f28c401444b99a26d5432f5f810275.jpeg",
        "stock": 95,
        "featured": True,
    },
    {
        "slug": "rasta",
        "name": "Rasta",
        "tagline": "The classic, refined.",
        "description": "A full-spectrum hybrid honouring the roots of the plant. Rasta delivers a rounded body-and-mind ease — timeless, generous, and true.",
        "price": 2600,
        "thc": "25mg",
        "cbd": "8mg",
        "effect": "Hybrid",
        "flavor": "Ruby Berry",
        "image": "https://static.prod-images.emergentagent.com/jobs/1fef2c4b-6b16-4dd9-8afb-bc98d943e39c/images/56c9ec27f8cbe4528feb26a94e101936fb6706d79ac688b6d748d6c2604aa7e8.jpeg",
        "stock": 80,
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
        await db.products.update_one({"slug": p["slug"]}, {"$setOnInsert": p}, upsert=True)
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
