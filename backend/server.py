from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="ASM Nöbet Çizelgesi API")
api_router = APIRouter(prefix="/api")


# ============ MODELS ============
class Physician(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str  # short label e.g., "A"
    color: str  # hex color
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PhysicianCreate(BaseModel):
    name: str
    code: str
    color: str


class PhysicianUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    color: Optional[str] = None


class WeeklyTemplate(BaseModel):
    # dayOfWeek keys: "1"=Mon .. "7"=Sun -> list of physician ids
    template: dict = Field(default_factory=dict)


class DayAssignment(BaseModel):
    date: str  # YYYY-MM-DD
    physician_ids: List[str] = Field(default_factory=list)


class HolidayOverride(BaseModel):
    date: str  # YYYY-MM-DD
    is_holiday: bool = True
    label: str = "İdari İzin"


class PinSetup(BaseModel):
    pin: str


class PinVerify(BaseModel):
    pin: str


# ============ AUTH ============
@api_router.get("/auth/status")
async def auth_status():
    doc = await db.settings.find_one({"key": "pin"}, {"_id": 0})
    return {"is_setup": doc is not None}


@api_router.post("/auth/setup")
async def auth_setup(payload: PinSetup):
    if not payload.pin or len(payload.pin) < 4:
        raise HTTPException(status_code=400, detail="PIN en az 4 haneli olmalı")
    existing = await db.settings.find_one({"key": "pin"})
    if existing:
        raise HTTPException(status_code=400, detail="PIN zaten kurulu")
    hashed = bcrypt.hashpw(payload.pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await db.settings.insert_one({"key": "pin", "value": hashed})
    return {"ok": True}


@api_router.post("/auth/verify")
async def auth_verify(payload: PinVerify):
    doc = await db.settings.find_one({"key": "pin"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=400, detail="PIN kurulu değil")
    ok = bcrypt.checkpw(payload.pin.encode('utf-8'), doc["value"].encode('utf-8'))
    if not ok:
        raise HTTPException(status_code=401, detail="Hatalı PIN")
    return {"ok": True}


@api_router.post("/auth/reset")
async def auth_reset(payload: PinVerify):
    """Verify then remove PIN so a new one can be set."""
    doc = await db.settings.find_one({"key": "pin"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=400, detail="PIN kurulu değil")
    ok = bcrypt.checkpw(payload.pin.encode('utf-8'), doc["value"].encode('utf-8'))
    if not ok:
        raise HTTPException(status_code=401, detail="Hatalı PIN")
    await db.settings.delete_one({"key": "pin"})
    return {"ok": True}


# ============ PHYSICIANS ============
@api_router.get("/physicians", response_model=List[Physician])
async def list_physicians():
    docs = await db.physicians.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return [Physician(**d) for d in docs]


@api_router.post("/physicians", response_model=Physician)
async def create_physician(payload: PhysicianCreate):
    obj = Physician(**payload.dict())
    await db.physicians.insert_one(obj.dict())
    return obj


@api_router.patch("/physicians/{physician_id}", response_model=Physician)
async def update_physician(physician_id: str, payload: PhysicianUpdate):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")
    result = await db.physicians.find_one_and_update(
        {"id": physician_id},
        {"$set": updates},
        return_document=True,
        projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Hekim bulunamadı")
    return Physician(**result)


@api_router.delete("/physicians/{physician_id}")
async def delete_physician(physician_id: str):
    result = await db.physicians.delete_one({"id": physician_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hekim bulunamadı")
    # Cascade cleanup: remove from template & assignments
    tpl = await db.settings.find_one({"key": "template"}, {"_id": 0})
    if tpl and isinstance(tpl.get("value"), dict):
        new_map = {k: [x for x in v if x != physician_id] for k, v in tpl["value"].items()}
        await db.settings.update_one({"key": "template"}, {"$set": {"value": new_map}})
    await db.assignments.update_many(
        {"physician_ids": physician_id},
        {"$pull": {"physician_ids": physician_id}}
    )
    return {"ok": True}


# ============ WEEKLY TEMPLATE ============
@api_router.get("/template")
async def get_template():
    doc = await db.settings.find_one({"key": "template"}, {"_id": 0})
    return {"template": doc["value"] if doc and "value" in doc else {}}


@api_router.put("/template")
async def put_template(payload: WeeklyTemplate):
    await db.settings.update_one(
        {"key": "template"},
        {"$set": {"value": payload.template}},
        upsert=True,
    )
    return {"ok": True, "template": payload.template}


# ============ ASSIGNMENTS ============
@api_router.get("/assignments")
async def list_assignments(year: int, month: int):
    prefix = f"{year:04d}-{month:02d}"
    docs = await db.assignments.find(
        {"date": {"$regex": f"^{prefix}"}}, {"_id": 0}
    ).to_list(500)
    return docs


@api_router.put("/assignments/{date}")
async def put_assignment(date: str, payload: DayAssignment):
    await db.assignments.update_one(
        {"date": date},
        {"$set": {"date": date, "physician_ids": payload.physician_ids}},
        upsert=True,
    )
    return {"ok": True}


@api_router.post("/assignments/bulk")
async def bulk_assignments(items: List[DayAssignment]):
    for it in items:
        await db.assignments.update_one(
            {"date": it.date},
            {"$set": {"date": it.date, "physician_ids": it.physician_ids}},
            upsert=True,
        )
    return {"ok": True, "count": len(items)}


# ============ HOLIDAY OVERRIDES ============
@api_router.get("/holidays")
async def list_holidays(year: int, month: int):
    prefix = f"{year:04d}-{month:02d}"
    docs = await db.holidays.find(
        {"date": {"$regex": f"^{prefix}"}}, {"_id": 0}
    ).to_list(500)
    return docs


@api_router.put("/holidays/{date}")
async def put_holiday(date: str, payload: HolidayOverride):
    if payload.is_holiday:
        await db.holidays.update_one(
            {"date": date},
            {"$set": {"date": date, "is_holiday": True, "label": payload.label}},
            upsert=True,
        )
        # Clear assignments for that day
        await db.assignments.delete_one({"date": date})
    else:
        await db.holidays.delete_one({"date": date})
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"service": "ASM Nöbet Çizelgesi", "ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
