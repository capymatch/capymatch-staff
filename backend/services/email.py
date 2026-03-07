"""Invite email service — sends signup links via Resend."""

import os
import asyncio
import logging
import resend
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

log = logging.getLogger(__name__)

resend.api_key = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")


def _build_invite_html(invite_name: str, invited_by: str, team: str, invite_url: str) -> str:
    team_line = f'<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Team: {team}</p>' if team else ""
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 0;">
      <div style="background:#0f172a;border-radius:12px 12px 0 0;padding:24px 28px;text-align:center;">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.1);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
          <span style="color:#fff;font-weight:700;font-size:13px;">CM</span>
        </div>
        <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;">You're Invited to CapyMatch</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px;">
        <p style="margin:0 0 4px;font-size:15px;color:#111827;">Hi {invite_name},</p>
        <p style="margin:0 0 20px;font-size:13px;color:#6b7280;"><strong>{invited_by}</strong> has invited you to join CapyMatch as a Coach.</p>
        {team_line}
        <a href="{invite_url}" style="display:block;text-align:center;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;margin:20px 0;">Complete Your Setup</a>
        <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center;">This invite expires in 7 days. If the button doesn't work, copy this link:<br/>
        <span style="color:#6b7280;word-break:break-all;">{invite_url}</span></p>
      </div>
    </div>
    """


async def send_invite_email(
    to_email: str,
    invite_name: str,
    invited_by: str,
    team: str,
    invite_url: str,
) -> dict:
    """Send invite email via Resend. Returns {success, email_id, error}."""
    if not resend.api_key:
        return {"success": False, "email_id": None, "error": "RESEND_API_KEY not configured"}

    html = _build_invite_html(invite_name, invited_by, team or "", invite_url)

    params = {
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": f"{invited_by} invited you to CapyMatch",
        "html": html,
    }

    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        email_id = result.get("id") if isinstance(result, dict) else getattr(result, "id", None)
        log.info(f"Invite email sent to {to_email}, id={email_id}")
        return {"success": True, "email_id": email_id, "error": None}
    except Exception as e:
        log.error(f"Failed to send invite email to {to_email}: {e}")
        return {"success": False, "email_id": None, "error": str(e)}
