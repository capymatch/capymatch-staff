"""
Seed school_domain_aliases from the University Knowledge Base.
Run once: python scripts/seed_domain_aliases.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from services.domain_mapper import extract_registrable_domain


async def seed():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Ensure unique compound index
    await db.school_domain_aliases.create_index(
        [("domain", 1), ("school_id", 1)],
        unique=True,
    )

    schools = await db.university_knowledge_base.find(
        {}, {"_id": 0, "university_name": 1, "website": 1, "coach_email": 1, "coaches_scraped": 1, "domain": 1, "scorecard": 1}
    ).to_list(None)

    print(f"Processing {len(schools)} schools...")

    aliases_created = 0
    aliases_updated = 0
    schools_with_alias = set()

    for school in schools:
        sid = school.get("university_name")
        if not sid:
            continue

        # Collect (domain, source, confidence) candidates
        candidates = []

        # 1. KB domain field (highest quality — pre-parsed registrable domain)
        kb_domain = school.get("domain", "")
        if kb_domain:
            candidates.append((kb_domain.lower().strip(), "kb_domain", 95))

        # 2. Website URL
        website = school.get("website", "")
        if website:
            domain = extract_registrable_domain(website)
            if domain:
                candidates.append((domain, "website", 80))

        # 3. Scorecard website
        scorecard = school.get("scorecard", {}) or {}
        sc_website = scorecard.get("website", "")
        if sc_website:
            domain = extract_registrable_domain(sc_website)
            if domain:
                candidates.append((domain, "scorecard", 90))

        # 4. Coach email
        coach_email = school.get("coach_email", "")
        if coach_email and "@" in coach_email:
            domain = extract_registrable_domain(coach_email)
            if domain:
                candidates.append((domain, "coach_email", 90))

        # 5. Coaches scraped
        for coach in school.get("coaches_scraped", []) or []:
            email = coach.get("email", "")
            if email and "@" in email:
                domain = extract_registrable_domain(email)
                if domain:
                    candidates.append((domain, "coaches_scraped", 85))

        # Dedupe: keep highest confidence per domain
        best = {}
        for domain, source, confidence in candidates:
            if domain not in best or confidence > best[domain][1]:
                best[domain] = (source, confidence)

        # Upsert aliases
        for domain, (source, confidence) in best.items():
            try:
                result = await db.school_domain_aliases.update_one(
                    {"domain": domain, "school_id": sid},
                    {
                        "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()},
                        "$set": {"source": source, "confidence": confidence},
                    },
                    upsert=True,
                )
                if result.upserted_id:
                    aliases_created += 1
                elif result.modified_count:
                    aliases_updated += 1
                schools_with_alias.add(sid)
            except Exception as e:
                # Duplicate key = another school already has this domain
                # This is expected (shared domains like google.com from coaches_scraped)
                pass

    # Coverage metrics
    total_schools = len(schools)
    covered = len(schools_with_alias)
    total_aliases = await db.school_domain_aliases.count_documents({})

    print(f"\n=== Domain Alias Seed Complete ===")
    print(f"Schools processed: {total_schools}")
    print(f"Schools with >= 1 alias: {covered} ({round(covered/total_schools*100, 1)}%)")
    print(f"Aliases created: {aliases_created}")
    print(f"Aliases updated: {aliases_updated}")
    print(f"Total aliases in collection: {total_aliases}")

    # Sample check
    print(f"\n=== Sample Aliases ===")
    samples = await db.school_domain_aliases.find({}, {"_id": 0}).limit(10).to_list(10)
    for s in samples:
        print(f"  {s['domain']} → {s['school_id']} (source={s['source']}, confidence={s['confidence']})")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
