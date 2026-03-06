"""Program Intelligence — strategic overview."""

from fastapi import APIRouter
from program_engine import compute_all as compute_program_intelligence

router = APIRouter()


@router.get("/program/intelligence")
async def program_intelligence():
    """Return all 5 sections of Program Intelligence in a single response"""
    return compute_program_intelligence()
