"""Admin Universities — CRUD, data health, CSV export/import for Knowledge Base."""

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime, timezone
from db_client import db
from admin_guard import require_admin
import csv
import io
import json
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/universities", dependencies=[Depends(require_admin)])

UNIVERSITY_FIELDS = [
    "university_name", "division", "conference", "region", "website",
    "mascot", "primary_coach", "coach_email", "recruiting_coordinator",
    "coordinator_email", "scholarship_type", "roster_needs"
]


@router.get("")
async def list_universities(
    search: Optional[str] = None,
    division: Optional[str] = None,
    region: Optional[str] = None,
    health: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    sort_by: Optional[str] = "university_name",
    sort_dir: Optional[str] = "asc",
):
    query = {}
    if search:
        query["university_name"] = {"$regex": search, "$options": "i"}
    if division and division != "all":
        query["division"] = division
    if region and region != "all":
        query["region"] = region
    if health == "missing_coach":
        query["$or"] = [{"primary_coach": {"$in": [None, ""]}}, {"primary_coach": {"$exists": False}}]
    elif health == "missing_email":
        query["$or"] = [{"coach_email": {"$in": [None, ""]}}, {"coach_email": {"$exists": False}}]
    elif health == "complete":
        query["primary_coach"] = {"$nin": [None, ""]}
        query["coach_email"] = {"$nin": [None, ""]}

    sort_direction = 1 if sort_dir == "asc" else -1
    sort_field = sort_by if sort_by in UNIVERSITY_FIELDS else "university_name"
    total = await db.university_knowledge_base.count_documents(query)
    skip = (page - 1) * limit
    universities = await db.university_knowledge_base.find(
        query, {"_id": 0}
    ).sort(sort_field, sort_direction).skip(skip).limit(limit).to_list(limit)

    for u in universities:
        if "uid" not in u:
            u["uid"] = u.get("university_name", "")
    return {"universities": universities, "total": total, "page": page, "limit": limit}


@router.get("/health")
async def get_data_health():
    total = await db.university_knowledge_base.count_documents({})
    missing_coach = await db.university_knowledge_base.count_documents(
        {"$or": [{"primary_coach": {"$in": [None, ""]}}, {"primary_coach": {"$exists": False}}]}
    )
    missing_email = await db.university_knowledge_base.count_documents(
        {"$or": [{"coach_email": {"$in": [None, ""]}}, {"coach_email": {"$exists": False}}]}
    )
    missing_coordinator = await db.university_knowledge_base.count_documents(
        {"$or": [{"recruiting_coordinator": {"$in": [None, ""]}}, {"recruiting_coordinator": {"$exists": False}}]}
    )
    missing_website = await db.university_knowledge_base.count_documents(
        {"$or": [{"website": {"$in": [None, ""]}}, {"website": {"$exists": False}}]}
    )
    has_scorecard = await db.university_knowledge_base.count_documents({"scorecard": {"$exists": True}})
    has_logo = await db.university_knowledge_base.count_documents({"logo_url": {"$exists": True, "$nin": [None, ""]}})
    complete = total - missing_coach
    completeness_pct = round((complete / total) * 100) if total > 0 else 0

    divisions = {}
    for div in ["D1", "D2", "D3", "NAIA", "JUCO"]:
        divisions[div] = await db.university_knowledge_base.count_documents({"division": div})

    return {
        "total": total,
        "missing_coach": missing_coach,
        "missing_email": missing_email,
        "missing_coordinator": missing_coordinator,
        "missing_website": missing_website,
        "has_scorecard": has_scorecard,
        "has_logo": has_logo,
        "complete_profiles": complete,
        "completeness_pct": completeness_pct,
        "divisions": divisions,
    }


@router.get("/export")
async def export_csv_file():
    universities = await db.university_knowledge_base.find({}, {"_id": 0}).sort("university_name", 1).to_list(5000)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=UNIVERSITY_FIELDS, extrasaction="ignore")
    writer.writeheader()
    for u in universities:
        writer.writerow({f: u.get(f, "") for f in UNIVERSITY_FIELDS})
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=universities_export.csv"},
    )


@router.post("/import")
async def import_csv_data(request: Request):
    body = await request.json()
    csv_data = body.get("csv_data", "")
    if not csv_data:
        raise HTTPException(status_code=400, detail="No CSV data provided")
    reader = csv.DictReader(io.StringIO(csv_data))
    created, updated, errors = 0, 0, []
    for i, row in enumerate(reader):
        name = row.get("university_name", "").strip()
        if not name:
            errors.append(f"Row {i+2}: Missing university_name")
            continue
        existing = await db.university_knowledge_base.find_one({"university_name": name})
        update_data = {}
        for field in UNIVERSITY_FIELDS:
            val = row.get(field, "").strip()
            if val:
                update_data[field] = val
        if existing:
            if update_data:
                update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
                await db.university_knowledge_base.update_one({"university_name": name}, {"$set": update_data})
                updated += 1
        else:
            update_data["university_name"] = name
            update_data["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.university_knowledge_base.insert_one(update_data)
            created += 1
    return {"created": created, "updated": updated, "errors": errors, "total_processed": created + updated + len(errors)}


@router.get("/{university_name}")
async def get_university(university_name: str):
    uni = await db.university_knowledge_base.find_one({"university_name": university_name}, {"_id": 0})
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    on_boards = await db.programs.count_documents({"university_name": university_name})
    uni["on_boards_count"] = on_boards
    return uni


@router.post("")
async def create_university(request: Request):
    body = await request.json()
    name = body.get("university_name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="University name is required")
    existing = await db.university_knowledge_base.find_one({"university_name": name})
    if existing:
        raise HTTPException(status_code=400, detail="University already exists")
    doc = {"created_at": datetime.now(timezone.utc).isoformat()}
    for field in UNIVERSITY_FIELDS:
        doc[field] = body.get(field, "").strip() if isinstance(body.get(field), str) else body.get(field, "")
    doc["university_name"] = name
    await db.university_knowledge_base.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/{university_name}")
async def update_university(university_name: str, request: Request):
    body = await request.json()
    existing = await db.university_knowledge_base.find_one({"university_name": university_name})
    if not existing:
        raise HTTPException(status_code=404, detail="University not found")
    update_data = {}
    for field in UNIVERSITY_FIELDS:
        if field in body:
            update_data[field] = body[field]
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.university_knowledge_base.update_one({"university_name": university_name}, {"$set": update_data})
    updated = await db.university_knowledge_base.find_one(
        {"university_name": update_data.get("university_name", university_name)}, {"_id": 0}
    )
    return updated


@router.delete("/{university_name}")
async def delete_university(university_name: str):
    result = await db.university_knowledge_base.delete_one({"university_name": university_name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="University not found")
    return {"ok": True, "deleted": university_name}
