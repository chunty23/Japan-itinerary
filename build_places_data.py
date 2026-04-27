#!/usr/bin/env python3
"""Inject all 176 saved places into data.js as DATA.savedPlaces."""
import csv, json, re

SRC = "/home/user/workspace/Japan-itinerary/japan2026-mymaps-geocoded.csv"
DATA_JS = "/home/user/workspace/Japan-itinerary/data.js"

rows = list(csv.DictReader(open(SRC, encoding="utf-8")))

places = []
for r in rows:
    if not r["Lat"]:
        continue
    places.append({
        "name": r["Name"],
        "address": r["Address"],
        "category": r["Category"],
        "note": r["Note"],
        "emoji": r["Emoji"],
        "city": r["City"],
        "color": r["Color"],
        "url": r["MapsURL"],
        "lat": float(r["Lat"]),
        "lng": float(r["Lng"]),
    })

# Read existing data.js
with open(DATA_JS, encoding="utf-8") as f:
    src = f.read()

# Build the savedPlaces JSON
places_json = json.dumps(places, ensure_ascii=False, indent=2)
injected = f"\n\n// ── Saved Places (from Google Maps 'Japan 2026' list, geocoded + categorized) ──\nDATA.savedPlaces = {places_json};\n"

# Strip any prior injection
src = re.sub(r"\n\n// ── Saved Places.*?DATA\.savedPlaces = \[.*?\];\n", "", src, flags=re.DOTALL)

# Append new
new = src.rstrip() + injected

with open(DATA_JS, "w", encoding="utf-8") as f:
    f.write(new)

print(f"Wrote {len(places)} places to {DATA_JS}")
