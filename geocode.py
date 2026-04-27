#!/usr/bin/env python3
"""Geocode every saved place via Nominatim, write coords + corrected addresses."""
import csv, json, os, time, urllib.parse, urllib.request

SRC = "/home/user/workspace/Japan-itinerary/japan2026-mymaps.csv"
OUT = "/home/user/workspace/Japan-itinerary/japan2026-mymaps-geocoded.csv"
CACHE = "/home/user/workspace/Japan-itinerary/geocode-cache.json"

cache = {}
if os.path.exists(CACHE):
    cache = json.load(open(CACHE))

# City -> bounding hint for Nominatim
CITY_HINT = {
    "Kagoshima": "Kagoshima, Japan",
    "Kumamoto": "Kumamoto, Japan",
    "Hiroshima": "Hiroshima, Japan",
    "Miyajima": "Hatsukaichi, Hiroshima, Japan",
    "Himeji": "Himeji, Hyogo, Japan",
    "Osaka": "Osaka, Japan",
    "Nara": "Nara, Japan",
    "Nagano": "Nagano, Japan",
    "Kyoto": "Kyoto, Japan",
    "Kyoto-North": "Miyazu, Kyoto, Japan",
    "Hakone": "Hakone, Kanagawa, Japan",
    "Atami": "Atami, Shizuoka, Japan",
    "Izu": "Izu, Shizuoka, Japan",
    "Tokyo": "Tokyo, Japan",
}

# Manual corrections for places I know I got wrong or that are too obscure for Nominatim
MANUAL = {
    # Name -> (lat, lng, corrected_address)
    "Solaria Nishitetsu Hotel Kagoshima": (31.5834, 130.5440, "11 Chuocho, Kagoshima 890-0053 (across from Kagoshima-Chuo Stn)"),
    "CANDEO HOTELS Kumamoto Shinshigai": (32.8013, 130.7066, "1-2-1 Shimotorimachi, Chuo, Kumamoto 860-0801"),
    "THE KNOT HIROSHIMA": (34.3933, 132.4595, "7-13 Mikawacho, Naka, Hiroshima 730-0029"),
    "Hotel Resol Kyoto Shijo Muromachi": (35.0033, 135.7589, "566 Naginatabokocho, Shimogyo, Kyoto 600-8492"),
    "nol hakone myojindai": (35.2537, 139.0411, "1320-862 Gora, Hakone, Ashigarashimo, Kanagawa 250-0408"),
    "THE GATE HOTEL Kaminarimon by HULIC": (35.7113, 139.7960, "2-16-11 Kaminarimon, Taito, Tokyo 111-0034"),
    "Hotel Grand Bach Atami crescendo": (35.0950, 139.0762, "16-3 Higashikaigancho, Atami, Shizuoka 413-0012"),
    "Tomiaimachi Minamitanoshiri": (32.7367, 130.6833, "Tomiaimachi Minamitanoshiri, Minami-ku, Kumamoto"),
    "Tokyo Station": (35.6812, 139.7671, "1-9-1 Marunouchi, Chiyoda, Tokyo"),
    "Kagoshima Furusato Yataimura Area Li-Ka": (31.5841, 130.5408, "6-4 Chuocho, Kagoshima (Li-Ka 1920 B1)"),
    "Kagoshima Furusato Yataimura BUSCHIKA": (31.5841, 130.5408, "6-4 Chuocho, Kagoshima (Li-Ka 1920 B1)"),
    "ぎょうざのみっちー 中央駅店": (31.5836, 130.5443, "1-1 Chuocho, Kagoshima 890-0053"),
}

def geocode(name, city):
    key = f"{name}|{city}"
    if key in cache:
        return cache[key]
    if name in MANUAL:
        lat, lng, addr = MANUAL[name]
        result = {"lat": lat, "lng": lng, "address": addr, "source": "manual"}
        cache[key] = result
        return result
    hint = CITY_HINT.get(city, "Japan")
    # Try with the original name first
    for query in [f"{name}, {hint}", f"{name} {hint}"]:
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
            "q": query, "format": "json", "limit": 1, "accept-language": "en"
        })
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Japan2026Trip/1.0 (personal)"})
            with urllib.request.urlopen(req, timeout=15) as r:
                data = json.load(r)
        except Exception as e:
            print(f"  ! error for {name}: {e}")
            data = []
        time.sleep(1.1)  # respect Nominatim rate limit
        if data:
            d = data[0]
            result = {
                "lat": float(d["lat"]),
                "lng": float(d["lon"]),
                "address": d.get("display_name", ""),
                "source": "nominatim",
            }
            cache[key] = result
            return result
    cache[key] = {"lat": None, "lng": None, "address": "", "source": "missing"}
    return cache[key]

rows = []
with open(SRC, encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

print(f"Geocoding {len(rows)} places…")
out_rows = []
for i, r in enumerate(rows, 1):
    g = geocode(r["Name"], r["City"])
    new = dict(r)
    new["Lat"] = f"{g['lat']:.6f}" if g["lat"] is not None else ""
    new["Lng"] = f"{g['lng']:.6f}" if g["lng"] is not None else ""
    new["LatLng"] = f"{g['lat']:.6f},{g['lng']:.6f}" if g["lat"] is not None else ""
    new["GeocodeSource"] = g["source"]
    # Replace bad address with geocoded display_name when source is manual
    if g["source"] == "manual" and g["address"]:
        new["Address"] = g["address"]
    out_rows.append(new)
    if i % 10 == 0 or g["source"] == "missing":
        print(f"  {i}/{len(rows)}  {g['source']:9s}  {r['Name'][:60]}")
    # save cache periodically
    if i % 20 == 0:
        json.dump(cache, open(CACHE, "w"), ensure_ascii=False, indent=1)

json.dump(cache, open(CACHE, "w"), ensure_ascii=False, indent=1)

fields = ["Name","Address","Category","Note","Emoji","City","Color","MapsURL","Lat","Lng","LatLng","GeocodeSource"]
with open(OUT, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(out_rows)

# stats
sources = {}
for r in out_rows:
    sources[r["GeocodeSource"]] = sources.get(r["GeocodeSource"], 0) + 1
print(f"\nDone → {OUT}")
print("Source counts:", sources)
print("\nMissing (need browser fallback):")
for r in out_rows:
    if r["GeocodeSource"] == "missing":
        print(f"  - {r['Name']} ({r['City']})")
