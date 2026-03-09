"""Domain Mapping Engine for Gmail History Import.
Maps email addresses to schools in the Knowledge Base using registrable domain matching.
"""
import tldextract

BLOCKED_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
    "icloud.com", "me.com", "live.com", "msn.com", "comcast.net",
    "att.net", "sbcglobal.net", "verizon.net", "protonmail.com",
    "mail.com", "zoho.com", "yandex.com",
}


def extract_registrable_domain(email_or_url: str):
    text = email_or_url.strip().lower()
    if "@" in text:
        text = text.split("@", 1)[1]
    ext = tldextract.extract(text)
    if ext.domain and ext.suffix:
        return f"{ext.domain}.{ext.suffix}"
    return None


async def map_email_to_school(db, email: str) -> dict:
    domain = extract_registrable_domain(email)
    if not domain or domain in BLOCKED_DOMAINS:
        return {
            "school_id": None, "normalized_domain": None,
            "match_type": "unmapped", "confidence": 0,
            "match_reason": "Could not parse domain",
        }

    # 1. Lookup in aliases
    alias = await db.school_domain_aliases.find_one(
        {"domain": domain}, {"_id": 0}, sort=[("confidence", -1)],
    )
    if alias:
        return {
            "school_id": alias["school_id"], "normalized_domain": domain,
            "match_type": "exact_alias", "confidence": alias["confidence"],
            "match_reason": f"Matched by domain: {email.split('@')[1] if '@' in email else email} -> {alias['school_id']}",
        }

    # 2. Fallback: KB domain field
    kb_entry = await db.university_knowledge_base.find_one(
        {"domain": domain}, {"_id": 0, "university_name": 1, "domain": 1},
    )
    if kb_entry and kb_entry.get("university_name"):
        return {
            "school_id": kb_entry["university_name"], "normalized_domain": domain,
            "match_type": "kb_domain", "confidence": 85,
            "match_reason": f"Matched by KB domain: {domain} -> {kb_entry['university_name']}",
        }

    return {
        "school_id": None, "normalized_domain": domain,
        "match_type": "unmapped", "confidence": 0,
        "match_reason": f"No school found for domain: {domain}",
    }
