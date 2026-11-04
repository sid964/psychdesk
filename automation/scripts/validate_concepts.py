#!/usr/bin/env python3
"""Validate public discovery metadata; this does not independently fact-check psychology."""
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

FILE = Path(__file__).resolve().parents[1] / "data" / "curated-concepts.json"
REQUIRED = ("id", "title", "category", "term", "definition", "explanation",
            "example", "source", "related", "verification")
ALLOWED = {"editor-reviewed", "pending"}
data = json.loads(FILE.read_text(encoding="utf-8"))
concepts = data.get("concepts")
assert isinstance(concepts, list) and concepts, "A nonempty concept list is required"
ids, titles = set(), set()
for i, item in enumerate(concepts, 1):
    assert isinstance(item, dict) and all(k in item for k in REQUIRED), f"Missing field in #{i}"
    uid = item["id"]
    assert isinstance(uid, str) and re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", uid), f"Bad ID: {uid}"
    assert uid not in ids, f"Duplicate ID: {uid}"
    ids.add(uid)
    title = item["title"].casefold().strip()
    assert title and title not in titles, f"Duplicate or blank title: {title}"
    titles.add(title)
    for field in ("category", "term", "definition", "explanation", "example"):
        assert isinstance(item[field], str) and len(item[field].strip()) >= 6, f"Missing {field}: {uid}"
    assert item["verification"] in ALLOWED, f"Invalid verification status: {uid}"
    src = item["source"]
    assert isinstance(src, dict) and src.get("title") and src.get("publisher"), f"Missing source: {uid}"
    url = urlsplit(src.get("url", ""))
    assert url.scheme == "https" and url.netloc, f"Bad source URL: {uid}"
    assert isinstance(item["related"], list), f"Related must be a list: {uid}"
for item in concepts:
    for related in item["related"]:
        assert related in ids and related != item["id"], f"Unknown/self connection: {item['id']} -> {related}"
print(f"Validated {len(concepts)} distinct public discoveries; target 365.")
print("Source URLs and metadata structure validated; scientific claims need separate editorial review.")
