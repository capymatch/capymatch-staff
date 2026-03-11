"""Program Metrics — internal API for derived metrics layer.

Exposes pre-computed recruiting metrics per athlete-school relationship.
Intended for consumption by intelligence cards and internal services.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from auth_middleware import _get_current_user
from admin_guard import require_admin
from models import ProgramMetricsResponse, RecomputeAllResponse
from services.program_metrics import get_metrics, recompute_metrics, recompute_all
from services.top_action_engine import compute_all_top_actions, compute_top_action
from db_client import db

router = APIRouter(prefix="/internal/programs", tags=["program-metrics"])


class BatchMetricsRequest(BaseModel):
    program_ids: List[str]


async def _resolve_tenant(current_user: dict) -> str:
    """Resolve tenant_id from the user's linked athlete record."""
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No claimed athlete profile found")
    return athlete["tenant_id"]


@router.post("/batch-metrics")
async def batch_metrics(
    body: BatchMetricsRequest,
    current_user: dict = Depends(_get_current_user),
):
    """Fetch metrics for multiple programs in a single request."""
    tenant_id = await _resolve_tenant(current_user)
    ids = body.program_ids[:50]  # cap at 50

    results = {}
    for pid in ids:
        try:
            m = await get_metrics(pid, tenant_id)
            results[pid] = m
        except Exception:
            pass  # skip programs that fail or don't exist

    return {"metrics": results}


async def _resolve_tenant(current_user: dict) -> str:
    """Resolve tenant_id from the user's linked athlete record."""
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No claimed athlete profile found")
    return athlete["tenant_id"]


@router.get("/{program_id}/metrics", response_model=ProgramMetricsResponse)
async def get_program_metrics(
    program_id: str,
    force: bool = Query(False, description="Force recompute instead of returning cached"),
    current_user: dict = Depends(_get_current_user),
):
    """Get derived metrics for a program. Returns cached unless stale or force=true."""
    tenant_id = await _resolve_tenant(current_user)

    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"_id": 0, "program_id": 1},
    )
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    if force:
        return await recompute_metrics(program_id, tenant_id)
    return await get_metrics(program_id, tenant_id)


@router.post("/{program_id}/recompute-metrics", response_model=ProgramMetricsResponse)
async def recompute_program_metrics(
    program_id: str,
    current_user: dict = Depends(_get_current_user),
):
    """Force recompute metrics for a specific program."""
    tenant_id = await _resolve_tenant(current_user)

    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"_id": 0, "program_id": 1},
    )
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    return await recompute_metrics(program_id, tenant_id)


@router.post("/recompute-all", response_model=RecomputeAllResponse)
async def recompute_all_metrics(
    admin: dict = Depends(require_admin),
):
    """Recompute metrics for all active programs. Admin-only."""
    return await recompute_all()


@router.get("/top-actions")
async def get_all_top_actions(
    current_user: dict = Depends(_get_current_user),
):
    """Get the single top action for every active program."""
    tenant_id = await _resolve_tenant(current_user)
    actions = await compute_all_top_actions(tenant_id)
    return {"actions": actions}


@router.get("/{program_id}/top-action")
async def get_program_top_action(
    program_id: str,
    current_user: dict = Depends(_get_current_user),
):
    """Get the top action for a specific program."""
    tenant_id = await _resolve_tenant(current_user)
    action = await compute_top_action(program_id, tenant_id)
    return action
