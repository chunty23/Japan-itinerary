#!/usr/bin/env python3
"""Split master CSV into one CSV per city for Google My Maps layer-per-city import."""
import csv, os, re

src = "/home/user/workspace/Japan-itinerary/japan2026-mymaps.csv"
out_dir = "/home/user/workspace/Japan-itinerary/by-city"
os.makedirs(out_dir, exist_ok=True)

# Group small/adjacent regions for cleaner layers
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

with open(src, encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

# Order the layers by route
ROUTE = ["Kagoshima","Kumamoto","Hiroshima-Miyajima","Himeji","Osaka","Nara-Nagano","Kyoto","Hakone","Atami-Izu","Tokyo","Japan"]
buckets = {}
for r in rows:
    g = group_for(r["City"])
    buckets.setdefault(g, []).append(r)

fields = ["Name","Address","Category","Note","Emoji","City","Color","MapsURL"]
manifest = []
for i, g in enumerate(ROUTE, start=1):
    if g not in buckets:
        continue
    safe = re.sub(r"[^A-Za-z0-9-]+", "-", g)
    path = f"{out_dir}/{i:02d}-{safe}.csv"
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(buckets[g])
    manifest.append((g, len(buckets[g]), path))
    print(f"{g}: {len(buckets[g])} places → {path}")

# Make a zip for easy download
import zipfile
zip_path = f"{out_dir}.zip"
with zipfile.ZipFile(zip_path, "w") as zf:
    for _, _, p in manifest:
        zf.write(p, arcname=os.path.basename(p))
print(f"\nZipped → {zip_path}")
