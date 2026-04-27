"""Apply resolved Google Maps coordinates with a city-centroid sanity check."""
import json, re, math

CITY_CENTROIDS = {
    'Kagoshima':  (31.59, 130.55),
    'Kumamoto':   (32.80, 130.71),
    'Hiroshima':  (34.39, 132.46),
    'Miyajima':   (34.30, 132.32),
    'Himeji':     (34.83, 134.69),
    'Osaka':      (34.69, 135.50),
    'Nara':       (34.68, 135.83),
    'Nagano':     (36.65, 138.18),
    'Kyoto':      (35.01, 135.77),
    'Kyoto-North':(35.12, 135.67),
    'Hakone':     (35.23, 139.02),
    'Atami':      (35.10, 139.08),
    'Izu':        (34.78, 138.95),  # Izu peninsula is large; centroid roughly mid
    'Tokyo':      (35.68, 139.76),
    'Narita':     (35.77, 140.39),
    'Seoul':      (37.57, 126.98),
}
# Max plausible distance from city centroid (km). Big regions need bigger radii.
MAX_DIST_KM = {
    'Kagoshima': 25, 'Kumamoto': 30, 'Hiroshima': 25, 'Miyajima': 10,
    'Himeji': 20, 'Osaka': 25, 'Nara': 30, 'Nagano': 100,
    'Kyoto': 25, 'Kyoto-North': 100, 'Hakone': 25, 'Atami': 20,
    'Izu': 60,  # Izu peninsula is ~60km long
    'Tokyo': 35, 'Narita': 30, 'Seoul': 30, 'Osaka': 35,
}

def haversine(a, b):
    R = 6371
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp = math.radians(b[0]-a[0]); dl = math.radians(b[1]-a[1])
    h = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(h))

with open('coord-cache.json') as f: cache = json.load(f)
with open('data.js') as f: src = f.read()
m = re.search(r'(DATA\.savedPlaces\s*=\s*)(\[.*?\])(;)', src, re.DOTALL)
arr = json.loads(m.group(2))

updated = 0
kept = 0
flagged_urls = set()
suspects = []
small_shifts = 0

for p in arr:
    url = p.get('url')
    if not url:
        continue
    c = cache.get(url)
    if not c or 'lat' not in c:
        continue
    new_lat, new_lng = c['lat'], c['lng']
    centroid = CITY_CENTROIDS.get(p['city'])
    if not centroid:
        # Unknown city — accept if shift is small
        d_old = haversine((p['lat'], p['lng']), (new_lat, new_lng))
        if d_old < 5:  # 5km
            p['lat'], p['lng'] = new_lat, new_lng; updated += 1
        else:
            suspects.append((p['name'], p['city'], 'unknown city, big shift', d_old))
            kept += 1
        continue
    d_to_centroid = haversine(centroid, (new_lat, new_lng))
    max_d = MAX_DIST_KM.get(p['city'], 30)
    if d_to_centroid <= max_d:
        # New coords are plausibly in the right region — accept
        d_shift = haversine((p['lat'], p['lng']), (new_lat, new_lng))
        if d_shift > 0.001:  # >1m means it actually changed
            p['lat'], p['lng'] = new_lat, new_lng
            updated += 1
            if d_shift < 0.1:  # <100m
                small_shifts += 1
        else:
            updated += 1  # already correct
    else:
        suspects.append((p['name'], p['city'], f'new coord {d_to_centroid:.0f}km from {p["city"]} centroid', d_to_centroid))
        flagged_urls.add(url)
        kept += 1

# Save flagged-URL list so user can re-curate them later
with open('flagged_urls.json', 'w') as f:
    json.dump([{'name': n, 'city': c, 'reason': r} for n, c, r, _ in suspects], f, indent=2, ensure_ascii=False)

# Write updated savedPlaces back into data.js
new_block = json.dumps(arr, ensure_ascii=False, indent=2)
new_src = src[:m.start(2)] + new_block + src[m.end(2):]
with open('data.js', 'w') as f:
    f.write(new_src)

print(f"Updated coords: {updated} ({small_shifts} were small <100m corrections)")
print(f"Kept old (suspect URL): {kept}")
print(f"\nSuspect places kept on old coord:")
for name, city, reason, d in sorted(suspects, key=lambda x: -x[3]):
    print(f"  {city:12s}  {name[:40]:40s}  {reason}")
