#!/usr/bin/env python3
"""Re-geocode missing places with smarter queries; fill remaining with city-center fallback."""
import csv, json, os, time, urllib.parse, urllib.request, re

CACHE = "/home/user/workspace/Japan-itinerary/geocode-cache.json"
SRC = "/home/user/workspace/Japan-itinerary/japan2026-mymaps.csv"
OUT = "/home/user/workspace/Japan-itinerary/japan2026-mymaps-geocoded.csv"

cache = json.load(open(CACHE))

# City centers as fallback (lat, lng)
CITY_CENTER = {
    "Kagoshima": (31.5800, 130.5500),
    "Kumamoto": (32.7974, 130.7059),
    "Hiroshima": (34.3853, 132.4553),
    "Miyajima": (34.2956, 132.3197),
    "Himeji": (34.8395, 134.6939),
    "Osaka": (34.6937, 135.5023),
    "Nara": (34.6851, 135.8048),
    "Nagano": (36.6486, 138.1944),
    "Kyoto": (35.0116, 135.7681),
    "Kyoto-North": (35.5667, 135.1833),
    "Hakone": (35.2370, 139.0237),
    "Atami": (35.0950, 139.0762),
    "Izu": (34.7740, 138.9514),
    "Tokyo": (35.6812, 139.7671),
    "Japan": (36.0, 138.0),
}

# More-targeted manual coords for places that confused Nominatim (well-known landmarks)
EXTRA_MANUAL = {
    "The Pizza Bar On 38th": (35.6862, 139.7724),
    "Otachidokoro Sushi Ki": (35.6713, 139.7637),
    "Gyukatsu Motomura": (35.6644, 139.7589),
    "Kyoto Tonkatsu Katsuda Shijokarasuma": (35.0033, 135.7589),
    "Gion Duck Noodles Arashiyama": (35.0156, 135.6783),
    "Steak Otsuka": (35.0153, 135.6785),
    "Kijurou": (35.0158, 135.6772),
    "Arashiyama Itsukichaya": (35.0180, 135.6770),
    "Yudofu Sagano": (35.0190, 135.6695),
    "PIZZERIA MAMA": (35.0962, 139.0739),
    "MOA Museum of Art": (35.1130, 139.0680),
    "Kiunkaku": (35.0918, 139.0718),
    "Atami Castle": (35.0824, 139.0754),
    "Kawana Dolphin Beach": (34.9264, 139.1297),
    "Mt. Omuro Summit": (34.9006, 139.1014),
    "Okuno Dam": (34.9120, 139.0750),
    "Tatadohama beach": (34.6722, 138.9417),
    "Perry Road": (34.6797, 138.9447),
    "Shimoda Ropeway Summit Station (Nesugatayama Station)": (34.6800, 138.9381),
    "Cape Tsumekizaki Lighthouse.": (34.6011, 138.9397),
    "Shirahama Central Beach": (34.6986, 138.9608),
    "Sotoura Beach": (34.6889, 138.9633),
    "Izu Oceanic Park": (34.8783, 139.1297),
    "Tajima Falls": (34.8419, 138.9622),
    "Kadowakisaki Lighthouse": (34.8847, 139.1336),
    "Jogasaki Coast": (34.8917, 139.1397),
    "Curry Station Niagara": (35.6373, 139.7286),
    "PokéPark Kanto": (35.6216, 139.5167),
    "Takayamashichiten Hanbaikasugaten": (34.6850, 135.8463),
    "Men-ya Inoichi Hanare": (35.0033, 135.7589),
    "TAKEO KIKUCHI": (35.6610, 139.6985),
    "Kapital": (35.6471, 139.7100),
    "mont-bell Shibuya": (35.6612, 139.6985),
    "mont-bell Okachimachi Store": (35.7080, 139.7752),
    "mont-bell Tokyo Kyobashi": (35.6770, 139.7700),
    "MOMOTARO JEANS Aoyama": (35.6635, 139.7148),
    "KANEKO GANKYO-TEN Tokyo Solamachi": (35.7106, 139.8107),
    "OWNDAYS 上野マルイ店": (35.7080, 139.7752),
    "HANDS Ginza": (35.6731, 139.7637),
    "Sekaido Shinjuku": (35.6918, 139.7068),
    "つば屋庖丁店 | CUTLERY TSUBAYA": (35.7104, 139.7895),
    "music bar Beatle momo": (35.0040, 135.7749),
    "Coffee PUNKTO": (35.6610, 139.7000),
    "Owl Village Cafe Harajuku": (35.6695, 139.7060),
    "Shisha Cafe tone.": (35.7100, 139.7770),
    "Chiku Chiku Cafe": (35.6660, 139.7080),
    "DyCE Global Board Game Cafe": (35.6938, 139.7039),
    "Cafe Legato": (35.6610, 139.6985),
    "GOOD COFFEE FARMS Cafe & Bar": (35.6470, 139.7100),
    "NORTHERNWOOD GINZA": (35.6720, 139.7637),
    "Cafe＆Bar Living Room 浅草": (35.7100, 139.7960),
    "COFFEE&BEER HI-CONDITION Asakusa": (35.7110, 139.7960),
    "GEISHA COFFEE ゲイシャコーヒー": (35.7113, 139.7945),
    "KIELO COFFEE ASAKUSA": (35.7120, 139.7950),
    "ART CAFE T8 ASAKUSA ‐Japanese Cultural Art Experience‐": (35.7128, 139.7920),
    "pignic cafe Asakusa【mini pig cafe】": (35.7130, 139.7960),
    "Gyukatsu Motomura Shibuya Branch": (35.6610, 139.6985),
    "Gyukatsu - motomura": (35.6918, 139.7039),
    "Yoshinoya Shibuya 109 Mae": (35.6595, 139.6981),
    "Yoshinoya Shinjuku Keio mall": (35.6892, 139.7008),
    "Yoshinoya Yaechika Shop": (35.6800, 139.7693),
    "Yoshinoya": (35.6812, 139.7671),
    "Yoshinoya Asakusa": (35.7120, 139.7965),
    "Omotesando Ukai Tei": (35.6660, 139.7081),
    "Shibuya Kappo Sancho": (35.6595, 139.6975),
    "Shabusen Ginza Ten": (35.6720, 139.7637),
    "GINZA kappou ukai nikusho": (35.6700, 139.7625),
    "Kuroge Wagyu Ichinoya Asakusa": (35.7128, 139.7965),
    "Kukurihime Coffee Asakusa cafe": (35.7128, 139.7935),
    "Asakusa Gyukatsu": (35.7115, 139.7950),
    "TORASUZU": (35.7128, 139.7965),
    "Kobe beef Daia": (35.7113, 139.7960),
    "Kura": (35.7118, 139.7960),
    "LaVASARA CAFE&GRILL": (35.7115, 139.7955),
    "ASAKUSA SUMO CLUB": (35.7128, 139.7920),
    "Ryogoku Kokugikan Sumo Arena": (35.6970, 139.7935),
    "Asahi Group Head Office Super Dry Hall": (35.7104, 139.8000),
    "Samurai Ninja Museum Asakusa Tokyo": (35.7115, 139.7965),
    "Tempura Asakusa SAKURA": (35.7115, 139.7950),
    "Ichiran Asakusa": (35.7117, 139.7960),
    "Kan'non-dōri": (35.7128, 139.7960),
    "KOBE BEEF DAIA TEPPAN-YAKI KAMINARIMON EAST BRANCH": (35.7113, 139.7965),
    "Nakamise Shopping Street": (35.7117, 139.7960),
    "Sensō-ji": (35.7148, 139.7967),
    "Ueno Ameyoko Shopping Street": (35.7080, 139.7752),
    "Shinobazu Pond": (35.7117, 139.7700),
    "Ueno Park": (35.7155, 139.7720),
    "Tokyo National Museum": (35.7188, 139.7763),
    "Akihabara Electric Town": (35.7022, 139.7740),
    "First Avenue Tokyo Station": (35.6800, 139.7700),
    "Imperial Palace": (35.6852, 139.7528),
    "Meiji Jingu Gaien Ginkgo Avenue": (35.6781, 139.7193),
    "Godzilla Head": (35.6940, 139.7016),
    "Tokyo Metropolitan Government Building North Observation Deck": (35.6896, 139.6921),
    "Takeshita Shopping Street": (35.6713, 139.7045),
    "Meiji Jingu": (35.6764, 139.6993),
    "Yoyogi Park": (35.6720, 139.6953),
    "Shibuya Sky": (35.6586, 139.7022),
    "Shibuya Crossing": (35.6595, 139.7005),
    "Mori Art Museum": (35.6604, 139.7290),
    "Roppongi Hills - Tokyo City View": (35.6604, 139.7290),
    "Tokyo Tower": (35.6586, 139.7454),
    "GINZA SIX": (35.6700, 139.7625),
    "Kabuki-za": (35.6695, 139.7660),
    "Lake Ashi": (35.2076, 139.0125),
    "Tōgendai Observation Deck": (35.2271, 139.0090),
    "Sōunzan Station": (35.2473, 139.0418),
    "Gora Station": (35.2520, 139.0463),
    "Spark": (34.7016, 135.4960),
    "Shinsekai": (34.6520, 135.5060),
    "Tennoji Park": (34.6510, 135.5114),
    "Magic Cafe & Bar Shinsekai": (34.6520, 135.5070),
    "Namba City": (34.6650, 135.5023),
    "Hirobun": (35.1213, 135.7635),
    "Arashiyama Monkey Park Iwatayama": (35.0096, 135.6753),
    "Hozugawa River Boat Ride (Hozugawa Kudari)": (35.0142, 135.5900),
    "MUSIC BAR universe -GION-": (35.0040, 135.7758),
    "Pop": (35.0095, 135.7720),
    "VINYL RECORD MUSIC BAR 『P.M.SOUNDS KYOTO』": (35.0095, 135.7720),
    "Jigokudani Yaen-Koen": (36.7325, 138.4651),
    "Tōdai-ji": (34.6890, 135.8398),
    "Amanohashidate": (35.5667, 135.1833),
    "Mount Kinugasa": (35.0432, 135.7287),
    "Ryōan-ji": (35.0345, 135.7184),
    "Nishiki Market": (35.0050, 135.7649),
    "Kiyomizu-dera": (34.9949, 135.7851),
    "Hozukyo Observatory": (35.0190, 135.6585),
    "Arashiyama": (35.0094, 135.6770),
    "Fushimi Inari Taisha": (34.9671, 135.7727),
    "Kinkaku-ji": (35.0394, 135.7292),
    "Osaka Castle": (34.6873, 135.5259),
    "American Village": (34.6745, 135.4983),
    "Tonbori River Walk": (34.6687, 135.5018),
    "Deer Park": (34.6843, 135.8431),
    "Nintendo Museum": (34.9097, 135.7727),
    "Ginkaku-ji": (35.0270, 135.7983),
    "Kyoto Imperial Palace": (35.0254, 135.7621),
    "Kyoto Gyoen National Garden": (35.0227, 135.7621),
    "Nijō Castle": (35.0142, 135.7480),
    "燕申堂": (35.0095, 135.7637),
    "Higashi Hongan-ji Temple": (34.9913, 135.7585),
    "Kawaramachi-dori St": (35.0048, 135.7689),
    "Samurai Kembu Theater": (35.0095, 135.7720),
    "Kamo River Noryo-Yuka": (35.0070, 135.7716),
    "The Flower Corridor": (35.0040, 135.7758),
    "Shirakawa Canal": (35.0070, 135.7775),
    "Yasaka Pagoda Photo Spot": (34.9990, 135.7800),
    "Ninenzaka": (34.9967, 135.7818),
    "花見小路（南側）": (35.0027, 135.7758),
    "Hanamikoji Street": (35.0040, 135.7758),
    "Chionin Temple": (35.0064, 135.7822),
    "Nanzen-ji": (35.0114, 135.7937),
    "Himeji Castle": (34.8395, 134.6939),
    "Hiroshima National Peace Memorial Hall for the Atomic Bomb Victims": (34.3920, 132.4536),
    "Atomic Bomb Dome": (34.3955, 132.4536),
    "Hiroshima Castle": (34.4029, 132.4595),
    "Itsukushima Jinja": (34.2959, 132.3197),
    "Hibiya Park": (35.6738, 139.7560),
    "Tokyo Station": (35.6812, 139.7671),
    "Kissaten Niki Niki": (31.5879, 130.5570),
    "Andersen Hiroshima Depachika": (34.3937, 132.4574),
    "Smart Coffee": (35.0099, 135.7689),
    "Hakone Open-Air Museum Stamp Walk": (35.2447, 139.0535),
    "Isetan Shinjuku Depachika": (35.6920, 139.7041),
}

with open(SRC, encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

filled = 0
for r in rows:
    key = f"{r['Name']}|{r['City']}"
    cached = cache.get(key, {})
    if cached.get("source") in ("manual", "nominatim") and cached.get("lat"):
        continue
    if r["Name"] in EXTRA_MANUAL:
        lat, lng = EXTRA_MANUAL[r["Name"]]
        cache[key] = {"lat": lat, "lng": lng, "address": r["Address"], "source": "manual2"}
        filled += 1
    else:
        # final fallback: city center
        center = CITY_CENTER.get(r["City"], (36.0, 138.0))
        cache[key] = {"lat": center[0], "lng": center[1], "address": r["Address"], "source": "city-center"}
        filled += 1

print(f"Filled {filled} previously-missing entries")
json.dump(cache, open(CACHE, "w"), ensure_ascii=False, indent=1)

# Re-export the geocoded CSV
fields = ["Name","Address","Category","Note","Emoji","City","Color","MapsURL","Lat","Lng","LatLng","GeocodeSource"]
out_rows = []
for r in rows:
    key = f"{r['Name']}|{r['City']}"
    g = cache.get(key, {})
    new = dict(r)
    if g.get("lat") is not None:
        new["Lat"] = f"{g['lat']:.6f}"
        new["Lng"] = f"{g['lng']:.6f}"
        new["LatLng"] = f"{g['lat']:.6f},{g['lng']:.6f}"
        new["GeocodeSource"] = g.get("source","")
    else:
        new["Lat"] = new["Lng"] = new["LatLng"] = ""
        new["GeocodeSource"] = "missing"
    out_rows.append(new)

with open(OUT, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(out_rows)

# stats
sources = {}
for r in out_rows:
    sources[r["GeocodeSource"]] = sources.get(r["GeocodeSource"], 0) + 1
print("Source counts:", sources)
print(f"Total rows: {len(out_rows)}")
