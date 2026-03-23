"""Pagination utilities for list endpoints.

Two flavours:
  - paginate_list()  — in-memory pagination (for pre-loaded/cached data)
  - paginate_query() — MongoDB cursor pagination (skip+limit)

Both return a consistent envelope:
  {"items": [...], "total": N, "page": 1, "page_size": 50, "total_pages": 2}
"""

from math import ceil


def paginate_list(items: list, page: int = 1, page_size: int = 50) -> dict:
    """Paginate an already-loaded Python list."""
    page = max(1, page)
    page_size = max(1, min(page_size, 200))
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    return {
        "items": items[start:end],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, ceil(total / page_size)),
    }


async def paginate_query(
    collection,
    filter: dict,
    projection: dict | None = None,
    sort: list | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    """Paginate a MongoDB query using skip+limit.

    Args:
        collection: Motor collection
        filter: MongoDB query filter
        projection: fields to include/exclude (should exclude _id)
        sort: list of (field, direction) tuples, e.g. [("created_at", -1)]
        page: 1-indexed page number
        page_size: items per page (capped at 200)

    Returns:
        Pagination envelope dict.
    """
    page = max(1, page)
    page_size = max(1, min(page_size, 200))
    skip = (page - 1) * page_size

    total = await collection.count_documents(filter)

    cursor = collection.find(filter, projection or {"_id": 0})
    if sort:
        cursor = cursor.sort(sort)
    cursor = cursor.skip(skip).limit(page_size)
    items = await cursor.to_list(page_size)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, ceil(total / page_size)),
    }
