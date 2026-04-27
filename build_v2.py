#!/usr/bin/env python3
"""V2: Rebuild master CSV with Note containing a clickable 'Open in Google Maps' link
to the original saved-place URL. Then re-split by city.

Google My Maps renders URLs in description fields as clickable links — so the pin's
info card will show: address, note, and 'Open in Google Maps →' tap-through to the
real listing (reviews, photos, website, hours).
"""
import csv, os, re, zipfile

SRC = "/home/user/workspace/Japan-itinerary/japan2026-mymaps.csv"
OUT_CSV = "/home/user/workspace/Japan-itinerary/japan2026-mymaps-v2.csv"
OUT_DIR = "/home/user/workspace/Japan-itinerary/by-city-v2"
os.makedirs(OUT_DIR, exist_ok=True)

CITY_GROUPS = {
    "Hiroshima-Miyajima": {"Hiroshima", "Miyajima"},
    "Atami-Izu": {"Atami", "Izu"},
    "Kyoto": {"Kyoto", "Kyoto-North"},
    "Nara-Nagano": {"Nara", "Nagano"},
}
def group_for(city):
    for g, members in CITY_GROUPS.items():
        if city in members:
            return g
    return city

ROUTE = ["Kagoshima","Kumamoto","Hiroshima-Miyajima","Himeji","Osaka","Nara-Nagano",
         "Kyoto","Hakone","Atami-Izu","Tokyo","Japan"]

# Read original
with open(SRC, encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

# Build v2 rows: combine note + maps URL into a 'Description' field My Maps will render
out = []
for r in rows:
    name = r["Name"]
    addr = r["Address"]
    note = r["Note"]
    url = r.get("MapsURL", "").strip()
    emoji = r["Emoji"]
    # Description shown in My Maps info-card
    parts = [note]
    if url:
        parts.append(f"📍 Open in Google Maps: {url}")
    description = "  •  ".join([p for p in parts if p])
    out.append({
        "Name": f"{emoji} {name}",
        "Address": addr,
        "Category": r["Category"],
        "City": r["City"],
        "Description": description,
        "MapsURL": url,
    })

fields = ["Name","Address","Category","City","Description","MapsURL"]

with open(OUT_CSV, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(out)

# Split by city group
buckets = {}
for r in out:
    g = group_for(r["City"])
    buckets.setdefault(g, []).append(r)

manifest = []
for i, g in enumerate(ROUTE, start=1):
    if g not in buckets:
        continue
    safe = re.sub(r"[^A-Za-z0-9-]+", "-", g)
    path = f"{OUT_DIR}/{i:02d}-{safe}.csv"
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(buckets[g])
    manifest.append((g, len(buckets[g]), path))
    print(f"{g:25s} {len(buckets[g]):3d}  →  {path}")

zip_path = f"{OUT_DIR}.zip"
with zipfile.ZipFile(zip_path, "w") as zf:
    for _, _, p in manifest:
        zf.write(p, arcname=os.path.basename(p))
print(f"\nMaster: {OUT_CSV}")
print(f"Zip:    {zip_path}")
