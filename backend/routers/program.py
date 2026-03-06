"""Program Intelligence — strategic overview + historical trending."""

from fastapi import APIRouter
from db_client import db
from program_engine import compute_all as compute_program_intelligence
from services.snapshots import (
    extract_snapshot_metrics,
    capture_snapshot_if_needed,
    get_previous_snapshot,
    compute_trends,
)

router = APIRouter()


@router.get("/program/intelligence")
async def program_intelligence():
    """Return all 5 sections of Program Intelligence + trends in a single response"""
    data = compute_program_intelligence()

    # Extract metrics and capture daily snapshot
    current_metrics = extract_snapshot_metrics(data)
    await capture_snapshot_if_needed(db, current_metrics)

    # Compute trends against previous snapshot
    previous = await get_previous_snapshot(db)
    trends = compute_trends(current_metrics, previous)

    data["trends"] = trends
    return data
