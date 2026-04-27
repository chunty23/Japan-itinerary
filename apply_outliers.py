"""Update the 4 outlier places in data.js with validated lat/lng + canonical URL."""
import json, re

with open('outlier-coords-final.json') as f:
    fixes = json.load(f)
with open('data.js') as f:
    src = f.read()
m = re.search(r'(DATA\.savedPlaces\s*=\s*)(\[.*?\])(;)', src, re.DOTALL)
arr = json.loads(m.group(2))

fix_by_name = {f['name']: f for f in fixes if 'lat' in f}
applied = 0
for p in arr:
    f = fix_by_name.get(p['name'])
    if f:
        old = (p['lat'], p['lng'])
        p['lat'] = f['lat']
        p['lng'] = f['lng']
        p['url'] = f['finalUrl']
        applied += 1
        print(f"✓ {p['name']:42s}  {old} -> ({f['lat']}, {f['lng']})")

new_block = json.dumps(arr, ensure_ascii=False, indent=2)
new_src = src[:m.start(2)] + new_block + src[m.end(2):]
with open('data.js', 'w') as f:
    f.write(new_src)
print(f"\nApplied {applied} outlier fixes to data.js")
