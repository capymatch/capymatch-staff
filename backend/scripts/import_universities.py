"""Import universities from Excel files into MongoDB university_knowledge_base collection."""
import asyncio
import os
import sys
import openpyxl
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

FILES = [
    ("/tmp/d1.xlsx", "D1"),
    ("/tmp/d2.xlsx", "D2"),
    ("/tmp/d3.xlsx", "D3"),
]

# Column indices (0-based) from header at row 5
COL = {
    "program_name": 0,
    "division": 1,
    "conference": 2,
    "region": 3,
    "website": 4,
    "program": 5,
    "mascot": 6,
    "primary_coach": 7,
    "coach_email": 8,
    "recruiting_coordinator": 9,
    "coordinator_email": 10,
    "scholarship_type": 19,
    "roster_needs": 20,
}


def clean(val):
    if val is None:
        return ""
    s = str(val).strip()
    if s.lower() in ("(not found)", "none", "select one", "n/a"):
        return ""
    return s


def cell(row, idx):
    if idx < len(row):
        return row[idx]
    return None


def parse_file(filepath, expected_division):
    wb = openpyxl.load_workbook(filepath, data_only=True)
    ws = wb.active
    universities = []
    seen = set()

    for row in ws.iter_rows(min_row=6, values_only=True):
        name = clean(cell(row, COL["program_name"]))
        if not name:
            continue
        if name in seen:
            continue
        seen.add(name)

        universities.append({
            "university_name": name,
            "division": clean(cell(row, COL["division"])) or expected_division,
            "conference": clean(cell(row, COL["conference"])),
            "region": clean(cell(row, COL["region"])),
            "website": clean(cell(row, COL["website"])),
            "mascot": clean(cell(row, COL["mascot"])),
            "primary_coach": clean(cell(row, COL["primary_coach"])),
            "coach_email": clean(cell(row, COL["coach_email"])),
            "recruiting_coordinator": clean(cell(row, COL["recruiting_coordinator"])),
            "coordinator_email": clean(cell(row, COL["coordinator_email"])),
            "scholarship_type": clean(cell(row, COL["scholarship_type"])),
            "roster_needs": clean(cell(row, COL["roster_needs"])),
        })

    wb.close()
    return universities


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Parse all files
    all_unis = []
    for filepath, div in FILES:
        unis = parse_file(filepath, div)
        print(f"  {div}: {len(unis)} universities parsed from {filepath}")
        all_unis.extend(unis)

    # Deduplicate by university_name (keep first occurrence)
    deduped = {}
    for u in all_unis:
        if u["university_name"] not in deduped:
            deduped[u["university_name"]] = u
    all_unis = list(deduped.values())
    print(f"\nTotal unique universities: {len(all_unis)}")

    # Clear existing data
    result = await db.university_knowledge_base.delete_many({})
    print(f"Cleared {result.deleted_count} existing records")

    # Insert
    if all_unis:
        await db.university_knowledge_base.insert_many(all_unis)
        print(f"Inserted {len(all_unis)} universities")

    # Create index for search
    await db.university_knowledge_base.create_index("university_name")
    await db.university_knowledge_base.create_index("division")
    await db.university_knowledge_base.create_index("region")

    # Print summary
    for div in ["D1", "D2", "D3"]:
        count = await db.university_knowledge_base.count_documents({"division": div})
        print(f"  {div}: {count}")

    client.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
