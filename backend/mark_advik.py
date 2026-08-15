import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def main():
    # Find Advik
    student = await db.students.find_one({"name": {"$regex": "Advik", "$options": "i"}})
    if not student:
        print("Student Advik not found")
        return
    print(f"Found student: {student['name']} ({student['_id']})")
    
    # Sync progress if not exists
    from server import sync_student_progress
    progress = await sync_student_progress(student["_id"])
    print(f"Progress has {len(progress.get('outcomes', []))} outcomes")

asyncio.run(main())
