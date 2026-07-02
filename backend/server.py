from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import bcrypt
import jwt
import logging
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@thechesslifestyle.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="The Chess Lifestyle CRM")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chess-crm")


def now_utc():
    return datetime.now(timezone.utc)

def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_token(user_id: str, role: str, ttl_minutes: int = 60*24*7) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": now_utc() + timedelta(minutes=ttl_minutes),
        "iat": now_utc(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"_id": payload["sub"]}, {"password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

def require_roles(*roles):
    async def dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Forbidden")
        return user
    return dep

def clean(doc: dict) -> dict:
    if not doc:
        return doc
    if "_id" in doc:
        doc["id"] = doc.pop("_id")
    doc.pop("password_hash", None)
    return doc


# Models
class LoginBody(BaseModel):
    email: EmailStr
    password: str

class StudentIn(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    parent_name: str = ""
    parent_phone: str = ""
    level: str = "Beginner"
    monthly_fee: float = 0
    notes: str = ""
    status: str = "active"
    dob: Optional[str] = None  # YYYY-MM-DD

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    level: Optional[str] = None
    monthly_fee: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    dob: Optional[str] = None

class LeadIn(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    source: str = "Website"
    stage: str = "new"
    notes: str = ""
    next_follow_up: Optional[str] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = None
    stage: Optional[str] = None
    notes: Optional[str] = None
    next_follow_up: Optional[str] = None

class CallLogIn(BaseModel):
    outcome: str
    remarks: str = ""
    next_follow_up: Optional[str] = None

class AttendanceIn(BaseModel):
    student_id: str
    date: str
    status: str
    topic: str = ""

class PaymentIn(BaseModel):
    student_id: str
    month: int
    year: int
    amount: float
    status: str = "unpaid"
    method: str = ""
    paid_date: Optional[str] = None

class PaymentUpdate(BaseModel):
    status: Optional[str] = None
    method: Optional[str] = None
    paid_date: Optional[str] = None
    amount: Optional[float] = None

class ChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None

class ScheduleSlot(BaseModel):
    day: str  # mon,tue,wed,thu,fri,sat,sun
    time: str  # "HH:MM"
    duration_min: int = 60

class BatchIn(BaseModel):
    name: str
    level: str = "Beginner"
    coach: str = ""
    notes: str = ""
    student_ids: List[str] = []
    schedule: List[ScheduleSlot] = []

class BatchUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[str] = None
    coach: Optional[str] = None
    notes: Optional[str] = None
    student_ids: Optional[List[str]] = None
    schedule: Optional[List[ScheduleSlot]] = None

class TakeAttendanceIn(BaseModel):
    date: str
    topic: str = ""
    absent_ids: List[str] = []
    late_ids: List[str] = []


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.students.create_index("name")
    await db.leads.create_index("stage")
    await db.payments.create_index([("student_id", 1), ("year", 1), ("month", 1)], unique=True)
    await db.attendance.create_index([("student_id", 1), ("date", 1)])
    await db.batches.create_index("name")
    await seed_admin()
    await seed_demo_data()
    await backfill_dobs()
    await seed_batches()

async def backfill_dobs():
    """Backfill DOB for seeded students that were created before the DOB field existed."""
    today = date.today()
    presets = {
        "Aarav Mehta": (3, 12),
        "Diya Kapoor": (0, 14),
        "Kabir Reddy": (5, 9),
        "Ishaan Verma": (45, 11),
        "Aanya Iyer": (120, 13),
        "Vihaan Singh": (200, 10),
    }
    for name, (offset_days, age) in presets.items():
        s = await db.students.find_one({"name": name, "dob": {"$in": [None, ""]}})
        if not s:
            # also match students that are missing the field entirely
            s = await db.students.find_one({"name": name, "dob": {"$exists": False}})
        if s:
            bday = today + timedelta(days=offset_days)
            try:
                dob = date(bday.year - age, bday.month, bday.day)
            except ValueError:
                dob = date(bday.year - age, bday.month, 28)
            await db.students.update_one({"_id": s["_id"]}, {"$set": {"dob": dob.isoformat()}})

async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "_id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Academy Admin",
            "role": "admin",
            "created_at": iso(now_utc()),
        })
        logger.info(f"Seeded admin: {ADMIN_EMAIL}")

async def seed_demo_data():
    if await db.students.count_documents({}) > 0:
        return
    await db.users.insert_one({
        "_id": str(uuid.uuid4()), "email": "staff@thechesslifestyle.com",
        "password_hash": hash_password("staff123"), "name": "Priya Sharma",
        "role": "staff", "created_at": iso(now_utc()),
    })

    students_data = [
        {"name": "Aarav Mehta", "phone": "+91-98765-11111", "parent_name": "Rohit Mehta", "parent_phone": "+91-98765-22222", "level": "Intermediate", "monthly_fee": 3000, "dob_offset_days": 3, "age": 12},
        {"name": "Diya Kapoor", "phone": "+91-98765-11112", "parent_name": "Sneha Kapoor", "parent_phone": "+91-98765-22223", "level": "Advanced", "monthly_fee": 4500, "dob_offset_days": 0, "age": 14},
        {"name": "Kabir Reddy", "phone": "+91-98765-11113", "parent_name": "Anil Reddy", "parent_phone": "+91-98765-22224", "level": "Beginner", "monthly_fee": 2500, "dob_offset_days": 5, "age": 9},
        {"name": "Ishaan Verma", "phone": "+91-98765-11114", "parent_name": "Vikas Verma", "parent_phone": "+91-98765-22225", "level": "Intermediate", "monthly_fee": 3000, "dob_offset_days": 45, "age": 11},
        {"name": "Aanya Iyer", "phone": "+91-98765-11115", "parent_name": "Meera Iyer", "parent_phone": "+91-98765-22226", "level": "Advanced", "monthly_fee": 4500, "dob_offset_days": 120, "age": 13},
        {"name": "Vihaan Singh", "phone": "+91-98765-11116", "parent_name": "Karan Singh", "parent_phone": "+91-98765-22227", "level": "Beginner", "monthly_fee": 2500, "dob_offset_days": 200, "age": 10},
    ]
    student_ids = []
    for s in students_data:
        sid = str(uuid.uuid4())
        student_ids.append(sid)
        # Build a DOB: (today + offset_days) minus `age` years => birthday is `offset_days` from today
        birthday_this_year = today + timedelta(days=s["dob_offset_days"])
        birth_year = birthday_this_year.year - s["age"]
        try:
            dob = date(birth_year, birthday_this_year.month, birthday_this_year.day)
        except ValueError:
            dob = date(birth_year, birthday_this_year.month, 28)
        payload = {k: v for k, v in s.items() if k not in ("dob_offset_days", "age")}
        await db.students.insert_one({
            "_id": sid, **payload, "email": "", "notes": "", "status": "active",
            "dob": dob.isoformat(),
            "joined_date": iso(now_utc() - timedelta(days=60)),
            "created_at": iso(now_utc()),
        })

    await db.users.insert_one({
        "_id": str(uuid.uuid4()), "email": "aarav@student.com",
        "password_hash": hash_password("student123"), "name": "Aarav Mehta",
        "role": "student", "linked_student_id": student_ids[0],
        "created_at": iso(now_utc()),
    })

    today = date.today()
    for sid in student_ids:
        for d in range(0, 14, 2):
            day = today - timedelta(days=d)
            status_choice = "present" if (d + hash(sid)) % 4 != 0 else "absent"
            await db.attendance.insert_one({
                "_id": str(uuid.uuid4()), "student_id": sid,
                "date": day.isoformat(), "status": status_choice,
                "topic": ["Openings", "Endgames", "Tactics", "Middlegame"][d % 4],
                "created_at": iso(now_utc()),
            })

    cur = today
    prev_month = (cur.replace(day=1) - timedelta(days=1))
    for i, sid in enumerate(student_ids):
        await db.payments.insert_one({
            "_id": str(uuid.uuid4()), "student_id": sid,
            "month": prev_month.month, "year": prev_month.year,
            "amount": students_data[i]["monthly_fee"],
            "status": "paid" if i != 2 else "overdue",
            "method": "UPI" if i != 2 else "",
            "paid_date": iso(now_utc() - timedelta(days=20)) if i != 2 else None,
            "created_at": iso(now_utc()),
        })
        await db.payments.insert_one({
            "_id": str(uuid.uuid4()), "student_id": sid,
            "month": cur.month, "year": cur.year,
            "amount": students_data[i]["monthly_fee"],
            "status": "paid" if i % 3 == 0 else "unpaid",
            "method": "UPI" if i % 3 == 0 else "",
            "paid_date": iso(now_utc() - timedelta(days=2)) if i % 3 == 0 else None,
            "created_at": iso(now_utc()),
        })

    leads_data = [
        {"name": "Rahul Bansal", "phone": "+91-99887-10001", "source": "Instagram", "stage": "new", "notes": "Enquired about weekend classes"},
        {"name": "Sneha Nair", "phone": "+91-99887-10002", "source": "Website", "stage": "contacted", "notes": "Interested, wants trial next week"},
        {"name": "Mihir Joshi", "phone": "+91-99887-10003", "source": "Referral", "stage": "trial_scheduled", "notes": "Trial on Saturday 10 AM"},
        {"name": "Riya Deshmukh", "phone": "+91-99887-10004", "source": "Google Ads", "stage": "trial_done", "notes": "Trial done, considering options"},
        {"name": "Arjun Malhotra", "phone": "+91-99887-10005", "source": "Website", "stage": "enrolled", "notes": "Joined intermediate batch"},
        {"name": "Kavya Rao", "phone": "+91-99887-10006", "source": "Instagram", "stage": "not_interested", "notes": "Budget mismatch"},
        {"name": "Neel Gupta", "phone": "+91-99887-10007", "source": "Referral", "stage": "contacted", "notes": "Follow-up needed"},
    ]
    for i, l in enumerate(leads_data):
        lid = str(uuid.uuid4())
        follow_up = None
        if l["stage"] not in ("enrolled", "not_interested"):
            follow_up = (today + timedelta(days=(i % 3) - 1)).isoformat()
        await db.leads.insert_one({
            "_id": lid, **l, "email": "",
            "next_follow_up": follow_up,
            "call_logs": [
                {"id": str(uuid.uuid4()), "outcome": "answered" if i % 2 == 0 else "no_answer",
                 "remarks": l["notes"], "date": iso(now_utc() - timedelta(days=i+1))}
            ] if l["stage"] != "new" else [],
            "created_at": iso(now_utc() - timedelta(days=i*2)),
        })
    logger.info("Demo data seeded")


def set_auth_cookie(resp: Response, token: str):
    resp.set_cookie("access_token", token, httponly=True, secure=True, samesite="none",
                    max_age=60*60*24*7, path="/")

@api.post("/auth/login")
async def login(body: LoginBody, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(user["_id"], user["role"])
    set_auth_cookie(response, token)
    return {"token": token, "user": clean(user)}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return clean(user)


@api.get("/students")
async def list_students(user: dict = Depends(get_current_user)):
    if user["role"] == "student":
        sid = user.get("linked_student_id")
        if not sid: return []
        docs = await db.students.find({"_id": sid}).to_list(1)
    else:
        docs = await db.students.find().sort("name", 1).to_list(1000)
    return [clean(d) for d in docs]

@api.post("/students")
async def create_student(body: StudentIn, user: dict = Depends(require_roles("admin", "staff"))):
    doc = {"_id": str(uuid.uuid4()), **body.model_dump(),
           "joined_date": iso(now_utc()), "created_at": iso(now_utc())}
    await db.students.insert_one(doc)
    return clean(doc)

@api.get("/students/{sid}")
async def get_student(sid: str, user: dict = Depends(get_current_user)):
    if user["role"] == "student" and user.get("linked_student_id") != sid:
        raise HTTPException(403, "Forbidden")
    doc = await db.students.find_one({"_id": sid})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)

@api.patch("/students/{sid}")
async def update_student(sid: str, body: StudentUpdate, user: dict = Depends(require_roles("admin", "staff"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.students.update_one({"_id": sid}, {"$set": updates})
    doc = await db.students.find_one({"_id": sid})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)

@api.delete("/students/{sid}")
async def delete_student(sid: str, user: dict = Depends(require_roles("admin"))):
    await db.students.delete_one({"_id": sid})
    return {"ok": True}


@api.get("/attendance")
async def list_attendance(student_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if user["role"] == "student":
        sid = user.get("linked_student_id")
        if not sid: return []
        q["student_id"] = sid
    elif student_id:
        q["student_id"] = student_id
    docs = await db.attendance.find(q).sort("date", -1).to_list(500)
    return [clean(d) for d in docs]

@api.post("/attendance")
async def mark_attendance(body: AttendanceIn, user: dict = Depends(require_roles("admin", "staff"))):
    existing = await db.attendance.find_one({"student_id": body.student_id, "date": body.date})
    if existing:
        await db.attendance.update_one({"_id": existing["_id"]},
                                       {"$set": {"status": body.status, "topic": body.topic}})
        doc = await db.attendance.find_one({"_id": existing["_id"]})
    else:
        doc = {"_id": str(uuid.uuid4()), **body.model_dump(),
               "created_at": iso(now_utc())}
        await db.attendance.insert_one(doc)
    return clean(doc)


@api.get("/payments")
async def list_payments(student_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if user["role"] == "student":
        sid = user.get("linked_student_id")
        if not sid: return []
        q["student_id"] = sid
    elif student_id:
        q["student_id"] = student_id
    docs = await db.payments.find(q).sort([("year", -1), ("month", -1)]).to_list(500)
    return [clean(d) for d in docs]

@api.post("/payments")
async def create_payment(body: PaymentIn, user: dict = Depends(require_roles("admin", "staff"))):
    existing = await db.payments.find_one({"student_id": body.student_id, "year": body.year, "month": body.month})
    if existing:
        raise HTTPException(400, "Payment record already exists for this month")
    doc = {"_id": str(uuid.uuid4()), **body.model_dump(), "created_at": iso(now_utc())}
    await db.payments.insert_one(doc)
    return clean(doc)

@api.patch("/payments/{pid}")
async def update_payment(pid: str, body: PaymentUpdate, user: dict = Depends(require_roles("admin", "staff"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates.get("status") == "paid" and not updates.get("paid_date"):
        updates["paid_date"] = iso(now_utc())
    if updates:
        await db.payments.update_one({"_id": pid}, {"$set": updates})
    doc = await db.payments.find_one({"_id": pid})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)


@api.get("/leads")
async def list_leads(user: dict = Depends(require_roles("admin", "staff"))):
    docs = await db.leads.find().sort("created_at", -1).to_list(1000)
    return [clean(d) for d in docs]

@api.post("/leads")
async def create_lead(body: LeadIn, user: dict = Depends(require_roles("admin", "staff"))):
    doc = {"_id": str(uuid.uuid4()), **body.model_dump(), "call_logs": [],
           "created_at": iso(now_utc())}
    await db.leads.insert_one(doc)
    return clean(doc)

@api.get("/leads/{lid}")
async def get_lead(lid: str, user: dict = Depends(require_roles("admin", "staff"))):
    doc = await db.leads.find_one({"_id": lid})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)

@api.patch("/leads/{lid}")
async def update_lead(lid: str, body: LeadUpdate, user: dict = Depends(require_roles("admin", "staff"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.leads.update_one({"_id": lid}, {"$set": updates})
    doc = await db.leads.find_one({"_id": lid})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)

@api.delete("/leads/{lid}")
async def delete_lead(lid: str, user: dict = Depends(require_roles("admin"))):
    await db.leads.delete_one({"_id": lid})
    return {"ok": True}

@api.post("/leads/{lid}/calls")
async def add_call_log(lid: str, body: CallLogIn, user: dict = Depends(require_roles("admin", "staff"))):
    call = {"id": str(uuid.uuid4()), "outcome": body.outcome,
            "remarks": body.remarks, "date": iso(now_utc())}
    updates = {"$push": {"call_logs": {"$each": [call], "$position": 0}}}
    if body.next_follow_up:
        updates["$set"] = {"next_follow_up": body.next_follow_up}
    await db.leads.update_one({"_id": lid}, updates)
    doc = await db.leads.find_one({"_id": lid})
    return clean(doc)


@api.get("/alerts")
async def alerts(user: dict = Depends(require_roles("admin", "staff"))):
    today = date.today()
    cur_month, cur_year = today.month, today.year
    alerts_list = []

    unpaid = await db.payments.find({
        "year": cur_year, "month": cur_month,
        "status": {"$in": ["unpaid", "overdue"]}
    }).to_list(500)
    for p in unpaid:
        s = await db.students.find_one({"_id": p["student_id"]})
        if s:
            alerts_list.append({
                "id": p["_id"], "type": "unpaid_fee",
                "severity": "high" if p["status"] == "overdue" else "medium",
                "title": f"Unpaid fee: {s['name']}",
                "message": f"Rs.{p['amount']} pending for {today.strftime('%B %Y')}",
                "student_id": s["_id"],
            })

    leads = await db.leads.find({"next_follow_up": {"$ne": None}}).to_list(500)
    for l in leads:
        if l["stage"] in ("enrolled", "not_interested"):
            continue
        try:
            fu = date.fromisoformat(l["next_follow_up"])
        except Exception:
            continue
        if fu <= today:
            days_late = (today - fu).days
            alerts_list.append({
                "id": l["_id"], "type": "lead_followup",
                "severity": "high" if days_late > 0 else "medium",
                "title": f"Call {l['name']}",
                "message": f"Follow-up {'overdue by ' + str(days_late) + ' day(s)' if days_late > 0 else 'due today'} — {l['stage'].replace('_',' ')}",
                "lead_id": l["_id"],
            })

    students = await db.students.find({"status": "active"}).to_list(500)
    from_date = (today - timedelta(days=14)).isoformat()
    for s in students:
        absences = await db.attendance.count_documents({
            "student_id": s["_id"], "status": "absent", "date": {"$gte": from_date}
        })
        if absences >= 3:
            alerts_list.append({
                "id": s["_id"], "type": "attendance",
                "severity": "medium",
                "title": f"{s['name']} missing classes",
                "message": f"{absences} absences in last 14 days",
                "student_id": s["_id"],
            })

    # Upcoming birthdays (today + next 7 days)
    for s in students:
        dob_str = s.get("dob")
        if not dob_str:
            continue
        try:
            dob_d = date.fromisoformat(dob_str)
        except Exception:
            continue
        # Next occurrence of this birthday
        try:
            bday_this_year = date(today.year, dob_d.month, dob_d.day)
        except ValueError:
            bday_this_year = date(today.year, dob_d.month, 28)
        if bday_this_year < today:
            try:
                bday_this_year = date(today.year + 1, dob_d.month, dob_d.day)
            except ValueError:
                bday_this_year = date(today.year + 1, dob_d.month, 28)
        days_to = (bday_this_year - today).days
        if days_to <= 7:
            turning = bday_this_year.year - dob_d.year
            if days_to == 0:
                msg = f"Birthday today — turns {turning}. Send a wish!"
                sev = "high"
            else:
                msg = f"Birthday in {days_to} day{'s' if days_to != 1 else ''} ({bday_this_year.isoformat()}) — turns {turning}."
                sev = "medium" if days_to <= 3 else "low"
            alerts_list.append({
                "id": f"bday-{s['_id']}", "type": "birthday",
                "severity": sev,
                "title": f"{s['name']}'s birthday",
                "message": msg,
                "student_id": s["_id"],
            })

    return alerts_list

@api.get("/stats")
async def stats(user: dict = Depends(require_roles("admin", "staff"))):
    today = date.today()
    total_students = await db.students.count_documents({"status": "active"})
    total_leads = await db.leads.count_documents({})
    hot_leads = await db.leads.count_documents({"stage": {"$in": ["contacted", "trial_scheduled", "trial_done"]}})
    unpaid_count = await db.payments.count_documents({
        "year": today.year, "month": today.month,
        "status": {"$in": ["unpaid", "overdue"]}
    })
    paid_amounts = await db.payments.aggregate([
        {"$match": {"year": today.year, "month": today.month, "status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    revenue = paid_amounts[0]["total"] if paid_amounts else 0

    funnel = {"new": 0, "contacted": 0, "trial_scheduled": 0, "trial_done": 0, "enrolled": 0, "not_interested": 0}
    async for l in db.leads.find({}, {"stage": 1}):
        funnel[l.get("stage", "new")] = funnel.get(l.get("stage", "new"), 0) + 1

    return {
        "total_students": total_students,
        "total_leads": total_leads,
        "hot_leads": hot_leads,
        "unpaid_count": unpaid_count,
        "month_revenue": revenue,
        "funnel": funnel,
    }


async def seed_batches():
    if await db.batches.count_documents({}) > 0:
        return
    students = await db.students.find().to_list(200)
    if not students:
        return
    by_level = {"Beginner": [], "Intermediate": [], "Advanced": []}
    for s in students:
        by_level.setdefault(s.get("level", "Beginner"), []).append(s["_id"])
    presets = [
        {"name": "Beginner Evening", "level": "Beginner", "coach": "Priya Sharma",
         "student_ids": by_level.get("Beginner", []),
         "schedule": [{"day": "mon", "time": "17:00", "duration_min": 60},
                      {"day": "wed", "time": "17:00", "duration_min": 60},
                      {"day": "fri", "time": "17:00", "duration_min": 60}]},
        {"name": "Intermediate Evening", "level": "Intermediate", "coach": "Academy Admin",
         "student_ids": by_level.get("Intermediate", []),
         "schedule": [{"day": "tue", "time": "18:00", "duration_min": 75},
                      {"day": "thu", "time": "18:00", "duration_min": 75}]},
        {"name": "Advanced Weekend", "level": "Advanced", "coach": "Academy Admin",
         "student_ids": by_level.get("Advanced", []),
         "schedule": [{"day": "sat", "time": "10:00", "duration_min": 90},
                      {"day": "sun", "time": "10:00", "duration_min": 90}]},
    ]
    for p in presets:
        await db.batches.insert_one({
            "_id": str(uuid.uuid4()), **p, "notes": "",
            "created_at": iso(now_utc()),
        })
    logger.info("Batches seeded")


DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

def today_day_key() -> str:
    return DAY_KEYS[date.today().weekday()]


@api.get("/batches")
async def list_batches(user: dict = Depends(require_roles("admin", "staff"))):
    docs = await db.batches.find().sort("name", 1).to_list(200)
    return [clean(d) for d in docs]

@api.post("/batches")
async def create_batch(body: BatchIn, user: dict = Depends(require_roles("admin", "staff"))):
    doc = {"_id": str(uuid.uuid4()), **body.model_dump(), "created_at": iso(now_utc())}
    await db.batches.insert_one(doc)
    return clean(doc)

@api.get("/batches/{bid}")
async def get_batch(bid: str, user: dict = Depends(require_roles("admin", "staff"))):
    doc = await db.batches.find_one({"_id": bid})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)

@api.patch("/batches/{bid}")
async def update_batch(bid: str, body: BatchUpdate, user: dict = Depends(require_roles("admin", "staff"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.batches.update_one({"_id": bid}, {"$set": updates})
    doc = await db.batches.find_one({"_id": bid})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)

@api.delete("/batches/{bid}")
async def delete_batch(bid: str, user: dict = Depends(require_roles("admin"))):
    await db.batches.delete_one({"_id": bid})
    return {"ok": True}

@api.get("/batches/{bid}/attendance")
async def get_batch_attendance(bid: str, target_date: str, user: dict = Depends(require_roles("admin", "staff"))):
    """Return attendance state for each student in the batch for a specific date. Missing records default to 'present'."""
    batch = await db.batches.find_one({"_id": bid})
    if not batch:
        raise HTTPException(404, "Batch not found")
    records = await db.attendance.find({
        "student_id": {"$in": batch.get("student_ids", [])},
        "date": target_date,
    }).to_list(500)
    by_student = {r["student_id"]: r for r in records}
    result = []
    for sid in batch.get("student_ids", []):
        rec = by_student.get(sid)
        result.append({
            "student_id": sid,
            "status": rec["status"] if rec else None,  # null means not yet marked
            "topic": rec["topic"] if rec else "",
        })
    return {"batch_id": bid, "date": target_date, "records": result}

@api.post("/batches/{bid}/attendance")
async def take_batch_attendance(bid: str, body: TakeAttendanceIn, user: dict = Depends(require_roles("admin", "staff"))):
    """Marks all students in the batch as 'present' by default, except those listed in absent_ids or late_ids."""
    batch = await db.batches.find_one({"_id": bid})
    if not batch:
        raise HTTPException(404, "Batch not found")
    absent = set(body.absent_ids)
    late = set(body.late_ids)
    student_ids = batch.get("student_ids", [])
    saved = 0
    for sid in student_ids:
        if sid in absent:
            status = "absent"
        elif sid in late:
            status = "late"
        else:
            status = "present"
        existing = await db.attendance.find_one({"student_id": sid, "date": body.date})
        if existing:
            await db.attendance.update_one({"_id": existing["_id"]},
                                           {"$set": {"status": status, "topic": body.topic, "batch_id": bid}})
        else:
            await db.attendance.insert_one({
                "_id": str(uuid.uuid4()), "student_id": sid,
                "date": body.date, "status": status,
                "topic": body.topic, "batch_id": bid,
                "created_at": iso(now_utc()),
            })
        saved += 1
    return {"ok": True, "count": saved, "date": body.date}

@api.get("/schedule/today")
async def schedule_today(user: dict = Depends(require_roles("admin", "staff"))):
    """Return batches that have a session today, with student count."""
    key = today_day_key()
    batches = await db.batches.find().to_list(200)
    out = []
    for b in batches:
        for slot in b.get("schedule", []):
            if slot.get("day") == key:
                out.append({
                    "id": b["_id"], "name": b["name"], "level": b.get("level", ""),
                    "time": slot.get("time", ""), "duration_min": slot.get("duration_min", 60),
                    "student_count": len(b.get("student_ids", [])),
                    "coach": b.get("coach", ""),
                })
    out.sort(key=lambda x: x["time"])
    return out
    students = await db.students.find().to_list(200)
    leads = await db.leads.find().to_list(200)
    today = date.today()
    payments = await db.payments.find({"year": today.year, "month": today.month}).to_list(200)

    s_lines = []
    for s in students:
        s_lines.append(f"- {s['name']} | Level: {s.get('level','')} | Phone: {s.get('phone','')} | Parent: {s.get('parent_name','')} ({s.get('parent_phone','')}) | Fee: Rs.{s.get('monthly_fee',0)} | Status: {s.get('status','')}")

    l_lines = []
    for l in leads:
        last_call = l.get("call_logs", [])
        last_call_note = last_call[0]["remarks"] if last_call else "no calls yet"
        l_lines.append(f"- {l['name']} | Stage: {l.get('stage','')} | Phone: {l.get('phone','')} | Source: {l.get('source','')} | Last call remarks: {last_call_note} | Follow-up: {l.get('next_follow_up','none')}")

    p_lines = []
    students_map = {s["_id"]: s for s in students}
    for p in payments:
        s = students_map.get(p["student_id"])
        name = s["name"] if s else "?"
        p_lines.append(f"- {name} | {p['month']}/{p['year']} | Rs.{p['amount']} | {p['status']}")

    return (
        f"CURRENT DATE: {today.isoformat()}\n\n"
        f"=== STUDENTS ({len(students)}) ===\n" + "\n".join(s_lines) + "\n\n"
        f"=== LEADS ({len(leads)}) ===\n" + "\n".join(l_lines) + "\n\n"
        f"=== THIS MONTH PAYMENTS ({len(payments)}) ===\n" + "\n".join(p_lines)
    )

@api.post("/chat")
async def chat(body: ChatIn, user: dict = Depends(require_roles("admin", "staff"))):
    session_id = body.session_id or str(uuid.uuid4())
    
    await db.chat_messages.insert_one({
        "_id": str(uuid.uuid4()), "session_id": session_id, "user_id": user["_id"],
        "role": "user", "content": body.message, "created_at": iso(now_utc())
    })
    
    reply = "AI Chat is temporarily disabled. Please contact support to re-enable it."

    await db.chat_messages.insert_one({
        "_id": str(uuid.uuid4()), "session_id": session_id, "user_id": user["_id"],
        "role": "assistant", "content": reply, "created_at": iso(now_utc())
    })

    return {"reply": reply, "session_id": session_id}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
