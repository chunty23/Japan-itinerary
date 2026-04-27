#!/usr/bin/env python3
"""Build enriched data.js for Japan 2026 app."""
import json, re, sys

# Load existing data — robustly extract just the JSON object literal
# (data.js may have `DATA.savedPlaces = [...]` appended after the main const)
with open('data.js','r') as f:
    content = f.read()
m = re.search(r'const DATA = ', content)
start = m.end()
# Walk braces to find matching closing '}'
depth = 0
in_str = False
esc = False
end = None
for i in range(start, len(content)):
    ch = content[i]
    if in_str:
        if esc:
            esc = False
        elif ch == '\\':
            esc = True
        elif ch == '"':
            in_str = False
    else:
        if ch == '"':
            in_str = True
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
if end is None:
    raise SystemExit('Could not find end of DATA object')
js = content[start:end]
data = json.loads(js)
# Preserve any post-DATA tail (e.g. DATA.savedPlaces) so we can re-emit it.
_tail = content[end:].lstrip(' ;\n')
if _tail.startswith(';'):
    _tail = _tail[1:]
_post_data_tail = _tail.lstrip()

# ── DAY METADATA: ISO dates, hotel info, key timed events ─────────────
# JST = UTC+9
day_meta = [
    # day, date_iso (JST), city_short, hotel_name, hotel_lat, hotel_lon, hotel_address, hotel_url
    {"day": 1, "date_iso": "2026-05-21", "city_short": "Kagoshima / Fukuoka", "lat": 31.5904, "lon": 130.5571, "hotel": "Solaria Nishitetsu Hotel Kagoshima", "hotel_address": "11 Chuocho, Kagoshima 892-0824", "hotel_lat": 31.5840, "hotel_lon": 130.5418, "hotel_url": "https://maps.google.com/?q=Solaria+Nishitetsu+Hotel+Kagoshima", "booked": True},
    {"day": 2, "date_iso": "2026-05-22", "city_short": "Kumamoto", "lat": 32.8032, "lon": 130.7079, "hotel": "CANDEO HOTELS Kumamoto Shinshigai", "hotel_address": "1-2-1 Shinshigai, Chuo-ku, Kumamoto", "hotel_lat": 32.7994, "hotel_lon": 130.7044, "hotel_url": "https://maps.google.com/?q=Candeo+Hotels+Kumamoto+Shinshigai", "booked": True},
    {"day": 3, "date_iso": "2026-05-23", "city_short": "Kumamoto / Hakata transit", "lat": 32.8032, "lon": 130.7079, "hotel": "CANDEO HOTELS Kumamoto Shinshigai", "hotel_address": "1-2-1 Shinshigai, Chuo-ku, Kumamoto", "hotel_lat": 32.7994, "hotel_lon": 130.7044, "hotel_url": "https://maps.google.com/?q=Candeo+Hotels+Kumamoto+Shinshigai", "booked": True},
    {"day": 4, "date_iso": "2026-05-24", "city_short": "Hiroshima", "lat": 34.3852, "lon": 132.4553, "hotel": "THE KNOT Hiroshima", "hotel_address": "7-13 Naka-machi, Naka-ku, Hiroshima 730-0037", "hotel_lat": 34.3917, "hotel_lon": 132.4589, "hotel_url": "https://maps.google.com/?q=THE+KNOT+Hiroshima", "booked": True},
    {"day": 5, "date_iso": "2026-05-25", "city_short": "Miyajima → Himeji → Kyoto", "lat": 35.0036, "lon": 135.7579, "hotel": "Hotel Resol Kyoto Shijo Muromachi", "hotel_address": "618-1 Tachiuriyamacho, Nakagyo Ward, Kyoto", "hotel_lat": 35.0054, "hotel_lon": 135.7568, "hotel_url": "https://maps.google.com/?q=Hotel+Resol+Kyoto+Shijo+Muromachi", "booked": True},
    {"day": 6, "date_iso": "2026-05-26", "city_short": "Kyoto · Arashiyama", "lat": 35.0094, "lon": 135.6772, "hotel": "Hotel Resol Kyoto Shijo Muromachi", "hotel_address": "618-1 Tachiuriyamacho, Nakagyo Ward, Kyoto", "hotel_lat": 35.0054, "hotel_lon": 135.7568, "hotel_url": "https://maps.google.com/?q=Hotel+Resol+Kyoto+Shijo+Muromachi", "booked": True},
    {"day": 7, "date_iso": "2026-05-27", "city_short": "Kyoto · Temples & Gion", "lat": 35.0036, "lon": 135.7579, "hotel": "Hotel Resol Kyoto Shijo Muromachi", "hotel_address": "618-1 Tachiuriyamacho, Nakagyo Ward, Kyoto", "hotel_lat": 35.0054, "hotel_lon": 135.7568, "hotel_url": "https://maps.google.com/?q=Hotel+Resol+Kyoto+Shijo+Muromachi", "booked": True},
    {"day": 8, "date_iso": "2026-05-28", "city_short": "Kyoto & Nara", "lat": 34.6851, "lon": 135.8048, "hotel": "Hotel Resol Kyoto Shijo Muromachi", "hotel_address": "618-1 Tachiuriyamacho, Nakagyo Ward, Kyoto", "hotel_lat": 35.0054, "hotel_lon": 135.7568, "hotel_url": "https://maps.google.com/?q=Hotel+Resol+Kyoto+Shijo+Muromachi", "booked": True},
    {"day": 9, "date_iso": "2026-05-29", "city_short": "Kyoto & Osaka", "lat": 34.6687, "lon": 135.5022, "hotel": "Hotel Resol Kyoto Shijo Muromachi", "hotel_address": "618-1 Tachiuriyamacho, Nakagyo Ward, Kyoto", "hotel_lat": 35.0054, "hotel_lon": 135.7568, "hotel_url": "https://maps.google.com/?q=Hotel+Resol+Kyoto+Shijo+Muromachi", "booked": True},
    {"day": 10, "date_iso": "2026-05-30", "city_short": "Kyoto → Hakone", "lat": 35.2335, "lon": 139.0276, "hotel": "nol hakone myojindai", "hotel_address": "1320-257 Gora, Hakone, Ashigarashimo District, Kanagawa", "hotel_lat": 35.2535, "hotel_lon": 139.0427, "hotel_url": "https://nolhotels.com/hakone-myojindai", "booked": True},
    {"day": 11, "date_iso": "2026-05-31", "city_short": "Hakone → Tokyo", "lat": 35.7148, "lon": 139.7967, "hotel": "The Gate Hotel Kaminarimon by Hulic", "hotel_address": "2-16-11 Kaminarimon, Taito City, Tokyo 111-0034", "hotel_lat": 35.7113, "hotel_lon": 139.7958, "hotel_url": "https://maps.google.com/?q=The+Gate+Hotel+Kaminarimon", "booked": True},
    {"day": 12, "date_iso": "2026-06-01", "city_short": "Tokyo · Shibuya/Shinjuku", "lat": 35.6595, "lon": 139.7004, "hotel": "The Gate Hotel Kaminarimon by Hulic", "hotel_address": "2-16-11 Kaminarimon, Taito City, Tokyo", "hotel_lat": 35.7113, "hotel_lon": 139.7958, "hotel_url": "https://maps.google.com/?q=The+Gate+Hotel+Kaminarimon", "booked": True},
    {"day": 13, "date_iso": "2026-06-02", "city_short": "Tokyo · Asakusa/Ebisu/Ginza", "lat": 35.7148, "lon": 139.7967, "hotel": "The Gate Hotel Kaminarimon by Hulic", "hotel_address": "2-16-11 Kaminarimon, Taito City, Tokyo", "hotel_lat": 35.7113, "hotel_lon": 139.7958, "hotel_url": "https://maps.google.com/?q=The+Gate+Hotel+Kaminarimon", "booked": True},
    {"day": 14, "date_iso": "2026-06-03", "city_short": "Tokyo · Ryogoku/Ueno/Akihabara", "lat": 35.6962, "lon": 139.7935, "hotel": "The Gate Hotel Kaminarimon by Hulic", "hotel_address": "2-16-11 Kaminarimon, Taito City, Tokyo", "hotel_lat": 35.7113, "hotel_lon": 139.7958, "hotel_url": "https://maps.google.com/?q=The+Gate+Hotel+Kaminarimon", "booked": True},
    {"day": 15, "date_iso": "2026-06-04", "city_short": "Tokyo → Atami", "lat": 35.0958, "lon": 139.0722, "hotel": "Atami GrandBach Crescendo", "hotel_address": "13-1 Higashikaigancho, Atami, Shizuoka 413-0012", "hotel_lat": 35.0951, "hotel_lon": 139.0738, "hotel_url": "https://maps.google.com/?q=Atami+GrandBach+Crescendo", "booked": True},
    {"day": 16, "date_iso": "2026-06-05", "city_short": "Atami & Izu", "lat": 35.0958, "lon": 139.0722, "hotel": "Atami GrandBach Crescendo", "hotel_address": "13-1 Higashikaigancho, Atami, Shizuoka", "hotel_lat": 35.0951, "hotel_lon": 139.0738, "hotel_url": "https://maps.google.com/?q=Atami+GrandBach+Crescendo", "booked": True},
    {"day": 17, "date_iso": "2026-06-06", "city_short": "Atami", "lat": 35.0958, "lon": 139.0722, "hotel": "Atami GrandBach Crescendo", "hotel_address": "13-1 Higashikaigancho, Atami, Shizuoka", "hotel_lat": 35.0951, "hotel_lon": 139.0738, "hotel_url": "https://maps.google.com/?q=Atami+GrandBach+Crescendo", "booked": True},
    {"day": 18, "date_iso": "2026-06-07", "city_short": "Atami → Tokyo → Narita", "lat": 35.7720, "lon": 140.3929, "hotel": "Hotel Nikko Narita", "hotel_address": "500 Tokko, Narita, Chiba 286-0106", "hotel_lat": 35.7607, "hotel_lon": 140.3866, "hotel_url": "https://maps.google.com/?q=Hotel+Nikko+Narita", "booked": True},
    {"day": 19, "date_iso": "2026-06-08", "city_short": "Narita → Seoul → Home", "lat": 35.7720, "lon": 140.3929, "hotel": "Departing", "hotel_address": "Narita International Airport", "hotel_lat": 35.7720, "hotel_lon": 140.3929, "hotel_url": "https://maps.google.com/?q=Narita+International+Airport", "booked": True},
]

# ── BOOKINGS: confirmed reservations w/ details ──────────────────────────
bookings = [
    # FLIGHTS
    {"category": "Flights", "day": 1, "date": "2026-05-21", "time": "19:45 JST arrival", "title": "Flight to Kagoshima (KOJ)", "who": "Kyle & Charlie", "details": "Arrive Kagoshima Airport 7:45 pm. Pre-arranged transfer to hotel (~44 min, US$386 Toyota Alphard for 6).", "url": "https://maps.google.com/?q=Kagoshima+Airport", "status": "Booked"},
    {"category": "Flights", "day": 1, "date": "2026-05-21", "time": "~19:00 JST arrival", "title": "Flight to Fukuoka (FUK)", "who": "Bob & Wendy", "details": "Arrive Fukuoka. Own arrangements that night.", "url": "", "status": "Booked"},
    {"category": "Flights", "day": 3, "date": "2026-05-23", "time": "Evening", "title": "Flight to Osaka (KIX)", "who": "Cody & JJ", "details": "Arrive Osaka in the evening, overnight before morning train to Hiroshima.", "url": "", "status": "Booked"},
    {"category": "Flights", "day": 3, "date": "2026-05-23", "time": "Evening", "title": "Flight to Hiroshima", "who": "Brady", "details": "Arrives Hiroshima this evening; explores solo Sunday morning.", "url": "", "status": "Booked"},
    {"category": "Flights", "day": 15, "date": "2026-06-04", "time": "TBD", "title": "Departure Tokyo → Home", "who": "Cody & JJ + Brady", "details": "Depart Narita / Haneda. Allow 3+ hrs to airport. Suica taps onto Narita Express.", "url": "", "status": "Booked"},
    {"category": "Flights", "day": 19, "date": "2026-06-08", "time": "TBD", "title": "Narita → Seoul (ICN) → Salt Lake City", "who": "Kyle & Charlie", "details": "Korean transit can be tight — allow ample time at Narita (2.5 hrs).", "url": "", "status": "Booked"},
    # HOTELS
    {"category": "Hotels", "day": 1, "date": "2026-05-21", "time": "Check-in", "title": "Solaria Nishitetsu Kagoshima", "who": "Kyle & Charlie", "details": "11 Chuocho, Kagoshima. Hotel recommends arranging your own taxi.", "url": "https://maps.google.com/?q=Solaria+Nishitetsu+Hotel+Kagoshima", "status": "Booked", "source": "Expedia confirmation"},
    {"category": "Hotels", "day": 2, "date": "2026-05-22", "time": "Check-in", "title": "CANDEO HOTELS Kumamoto Shinshigai (2 nights)", "who": "Kyle & Charlie + Bob & Wendy", "details": "1-2-1 Shinshigai, Chuo-ku. Forward large bags to Resol Kyoto Day 4 morning.", "url": "https://maps.google.com/?q=Candeo+Hotels+Kumamoto+Shinshigai", "status": "Booked"},
    {"category": "Hotels", "day": 4, "date": "2026-05-24", "time": "Check-in", "title": "THE KNOT Hiroshima (1 night, 4 King rooms)", "who": "All 7", "details": "7-13 Naka-machi, Naka-ku · $532 total · Pre-checkin: stayconcierge.jp.", "url": "https://maps.google.com/?q=THE+KNOT+Hiroshima", "status": "Booked", "source": "Direct hotel confirmation"},
    {"category": "Hotels", "day": 5, "date": "2026-05-25", "time": "Check-in", "title": "Hotel Resol Kyoto Shijo Muromachi (5 nights, 4 twin rooms)", "who": "All 7", "details": "618-1 Tachiuriyamacho, Nakagyo. Forward bags from Kumamoto on Day 4 morning.", "url": "https://maps.google.com/?q=Hotel+Resol+Kyoto+Shijo+Muromachi", "status": "Booked"},
    {"category": "Hotels", "day": 10, "date": "2026-05-30", "time": "Check-in", "title": "nol hakone myojindai (1 night, 4 twin rooms)", "who": "All 7", "details": "1320-257 Gora, Hakone. Free shuttle from Gora Station: 15:00 / 15:30 / 16:30. Onsen + kaiseki.", "url": "https://nolhotels.com/hakone-myojindai", "status": "Booked"},
    {"category": "Hotels", "day": 11, "date": "2026-05-31", "time": "Check-in", "title": "The Gate Hotel Kaminarimon (5 nights)", "who": "All 7", "details": "2-16-11 Kaminarimon, Taito City. Steps from Sensoji. Bags should arrive ahead of you.", "url": "https://maps.google.com/?q=The+Gate+Hotel+Kaminarimon", "status": "Booked"},
    {"category": "Hotels", "day": 15, "date": "2026-06-04", "time": "Check-in", "title": "Atami GrandBach Crescendo", "who": "Kyle & Charlie + Bob & Wendy", "details": "13-1 Higashikaigancho, Atami. Onsen ryokan-style.", "url": "https://maps.google.com/?q=Atami+GrandBach+Crescendo", "status": "Booked"},
    {"category": "Hotels", "day": 18, "date": "2026-06-07", "time": "Check-in", "title": "Hotel Nikko Narita", "who": "Kyle & Charlie", "details": "500 Tokko, Narita. Pre-flight overnight. Bags forwarded from The Gate Hotel arrive ahead.", "url": "https://maps.google.com/?q=Hotel+Nikko+Narita", "status": "Booked"},
    # TRAINS (from calendar)
    {"category": "Trains", "day": 2, "date": "2026-05-22", "time": "10:32 JST", "title": "Shinkansen Kagoshima-Chuo → Kumamoto", "who": "Kyle & Charlie", "details": "From Kagoshima-Chuo (auto-imported from Gmail to Calendar). ~50 min.", "url": "https://maps.google.com/?q=Kagoshima-Chuo+Station", "status": "Booked", "source": "Google Calendar"},
    {"category": "Trains", "day": 2, "date": "2026-05-22", "time": "10:38 JST", "title": "Shinkansen Hakata → Kumamoto", "who": "Bob & Wendy", "details": "From Hakata Station (auto-imported from Gmail to Calendar). ~33 min.", "url": "https://maps.google.com/?q=Hakata+Station", "status": "Booked", "source": "Google Calendar"},
    {"category": "Trains", "day": 18, "date": "2026-06-07", "time": "16:19 JST", "title": "Train to Shinagawa → Narita Express", "who": "Kyle & Charlie", "details": "Tokyo → Narita Airport Terminal 1 (auto-imported from Gmail).", "url": "https://maps.google.com/?q=Shinagawa+Station", "status": "Booked", "source": "Google Calendar"},
    # ACTIVITIES — confirmed
    {"category": "Activities", "day": 6, "date": "2026-05-26", "time": "11:00 JST", "title": "Hozugawa-kudari Boat Ride", "who": "All 7", "details": "Arashiyama river boat (~2 hrs). Ends near Togetsukyo / Arashiyama. Pair with Bamboo Grove first.", "url": "https://www.hozugawakudari.jp/en", "status": "Booked"},
    {"category": "Activities", "day": 6, "date": "2026-05-26", "time": "19:00 JST", "title": "TeamLab Kyoto", "who": "All 7", "details": "Entry 7:00–7:30 pm. Allow ~90 min inside.", "url": "https://www.teamlab.art/e/kyoto/", "status": "Booked"},
    {"category": "To Book", "day": 6, "date": "2026-05-26", "time": "Lunch", "title": "Lunch at Itsuki Chaya Arashiyama Honten", "who": "All 7", "details": "Right at Togetsukyo. Yudofu and obanzai set lunch — perfect post-boat. Reservation not yet made.", "url": "https://maps.google.com/?q=Itsuki+Chaya+Arashiyama+Honten", "status": "To Book"},
    {"category": "Activities", "day": 14, "date": "2026-06-03", "time": "18:00 JST", "title": "Chanko Wanko — Sumo Show + Chanko Nabe Dinner", "who": "All 7", "details": "Ryogoku sumo district. Walk past Kokugikan beforehand. Confirm broth is non-seafood for Cody & JJ.", "url": "https://maps.google.com/?q=Chanko+Wanko+Tokyo", "status": "Booked"},
    # TO-BOOK (high priority)
    {"category": "To Book", "day": 12, "date": "2026-06-01", "time": "Sunset slot", "title": "Shibuya Sky observation deck", "who": "All 7", "details": "¥3,400 pp · Book 4 weeks ahead for sunset slot. shibuya-sky.tokyo", "url": "https://www.shibuya-scramble-square.com/sky/", "status": "To Book"},
    {"category": "To Book", "day": 13, "date": "2026-06-02", "time": "Morning", "title": "Betty Smith Custom Jeans Workshop — Ebisu", "who": "Group of choice", "details": "2-3 hr workshop · betty-smith.com — book well ahead.", "url": "https://betty-smith.com/", "status": "To Book"},
    {"category": "To Book", "day": 11, "date": "2026-05-31", "time": "Lunch", "title": "Kakiya (oyster bar) on Miyajima", "who": "All 7", "details": "Walk-in, queue early. No reservations.", "url": "https://maps.google.com/?q=Kakiya+Miyajima", "status": "Optional"},
    {"category": "To Book", "day": 7, "date": "2026-05-27", "time": "Dinner", "title": "Teppan Tavern Tenamonya — A5 Wagyu", "who": "All 7", "details": "Only 7 tables/night. Edge of Gion. English website. Book ASAP for late May.", "url": "https://teppan-tavern-tenamonya.com/", "status": "To Book"},
    {"category": "To Book", "day": 12, "date": "2026-06-01", "time": "Dinner", "title": "Ushigoro Bambina Shibuya — top wagyu yakiniku", "who": "All 7", "details": "3rd-floor private room seats up to 8. Book 1–2 wks via Tabelog.", "url": "https://ushigoro.com/", "status": "To Book"},
]

# ── PACKING & PRE-TRIP CHECKLIST ─────────────────────────────────────────
packing = [
    # category, item, note
    {"category": "Documents", "item": "Passport (6+ months validity)", "note": "Photocopy stored separately + photo on phone"},
    {"category": "Documents", "item": "Visit Japan Web pre-registration", "note": "Saves long lines at customs · vjw-lp.digital.go.jp"},
    {"category": "Documents", "item": "K-ETA for Korea transit", "note": "Korean transit-only may not need it (check 24-hr exemption); apply if uncertain · k-eta.go.kr"},
    {"category": "Documents", "item": "Travel insurance card / policy #", "note": ""},
    {"category": "Documents", "item": "Hotel confirmations (offline PDF)", "note": "Save to Files / Apple Wallet · Japanese addresses included"},
    {"category": "Documents", "item": "Dietary cards (Japanese)", "note": "Brady: no egg / Cody+JJ: no seafood/dashi · screenshot on phone"},
    {"category": "Money", "item": "¥30,000–50,000 cash starter", "note": "7-Eleven ATMs accept foreign cards · avoid currency booths"},
    {"category": "Money", "item": "Suica on Apple Wallet / Google Wallet", "note": "Add before flight · top up ¥3,000 to start"},
    {"category": "Money", "item": "Two credit cards (Visa/Mastercard primary)", "note": "Notify bank of travel · no foreign-transaction fee preferred"},
    {"category": "Connectivity", "item": "eSIM (Ubigi / Airalo / Saily)", "note": "10–20 GB plan · activate on landing · cheaper than pocket wifi"},
    {"category": "Connectivity", "item": "Backup pocket wifi (optional)", "note": "Ninja Wifi pickup at airport if eSIM fails"},
    {"category": "Connectivity", "item": "Universal travel adapter", "note": "Japan = 100V Type A · most US plugs work without adapter; Korea = 220V Type C/F if you exit transit"},
    {"category": "Connectivity", "item": "Power bank (≤100Wh)", "note": "Restrictions effective Jan 26 2026 — must keep on you, not in checked bags"},
    {"category": "Connectivity", "item": "Translation app (Google Translate offline JP pack)", "note": "Pre-download Japanese pack at home"},
    {"category": "Apps", "item": "Google Maps + offline Japan map", "note": "Download in advance"},
    {"category": "Apps", "item": "NaviTime for Japan Travel", "note": "Better train routing than Google Maps in Japan"},
    {"category": "Apps", "item": "Japan Official Travel App", "note": "Train delays + free wifi finder"},
    {"category": "Apps", "item": "DeepL / Google Translate", "note": "Camera mode for menus is amazing"},
    {"category": "Apps", "item": "Yamato Transport", "note": "For tracking luggage forwarding (3 forwards on this trip)"},
    {"category": "Health", "item": "Prescription meds + copy of script", "note": "Some US meds banned in Japan — check beforehand"},
    {"category": "Health", "item": "Pepto / loperamide / electrolytes", "note": "Different food = small chance of upset"},
    {"category": "Health", "item": "Insect repellent", "note": "Can be muggy late May / June"},
    {"category": "Health", "item": "Sunscreen (Japanese sunscreen is excellent — buy on arrival)", "note": "Biore UV Aqua Rich at any drugstore"},
    {"category": "Clothes", "item": "Layers — May/June = 65–80°F, humid", "note": "Light long sleeves + breathable pants for temples"},
    {"category": "Clothes", "item": "Compact travel umbrella", "note": "Rainy season starts late May/early June · or buy ¥500 at any conbini"},
    {"category": "Clothes", "item": "Slip-on shoes (temples + ryokan + onsen)", "note": "You'll remove shoes constantly"},
    {"category": "Clothes", "item": "Modest covering for temple visits", "note": "Shoulders & knees covered preferred"},
    {"category": "Clothes", "item": "Onsen-friendly hair tie / shower cap", "note": "Long hair must be tied up"},
    {"category": "Clothes", "item": "Swimsuit (private onsen rooms at nol hakone)", "note": "Most public onsens are nude only"},
    {"category": "Onsen Etiquette", "item": "Tattoos: bring a tattoo cover patch", "note": "Many onsen still restrict tattoos · nol hakone has private balcony onsen — no issue"},
    {"category": "Onsen Etiquette", "item": "Shower thoroughly before soaking", "note": "Sit on the stool, rinse fully"},
    {"category": "Onsen Etiquette", "item": "Small towel in hand, not in water", "note": "Place on head while soaking"},
    {"category": "Carry-on Strategy", "item": "3 luggage forwards = travel light", "note": "Kumamoto→Kyoto · Kyoto→Tokyo · Tokyo→Narita · ¥1,500–2,500/bag/leg"},
    {"category": "Carry-on Strategy", "item": "Pack 3-day carry-on for Hakone", "note": "Onsen yukata provided · just basics"},
    {"category": "Carry-on Strategy", "item": "Pack 4-day carry-on for Atami", "note": "K&C only · same hotel = simple"},
    {"category": "Pre-Departure (1 wk)", "item": "Confirm Hozugawa boat (May 26 11:00)", "note": "Ride is rain-or-shine"},
    {"category": "Pre-Departure (1 wk)", "item": "Confirm TeamLab Kyoto (May 26 19:00)", "note": "QR ticket on phone"},
    {"category": "Pre-Departure (1 wk)", "item": "Print 1-page itinerary backup", "note": "In case phone dies"},
]

# ── PHRASEBOOK (with romaji + kana) ──────────────────────────────────────
phrasebook = [
    {"category": "Greetings", "en": "Good morning", "ja": "おはようございます", "romaji": "Ohayō gozaimasu", "note": ""},
    {"category": "Greetings", "en": "Hello / Good afternoon", "ja": "こんにちは", "romaji": "Konnichiwa", "note": ""},
    {"category": "Greetings", "en": "Good evening", "ja": "こんばんは", "romaji": "Konbanwa", "note": ""},
    {"category": "Greetings", "en": "Thank you (very much)", "ja": "ありがとうございます", "romaji": "Arigatō gozaimasu", "note": ""},
    {"category": "Greetings", "en": "Excuse me / Sorry", "ja": "すみません", "romaji": "Sumimasen", "note": "All-purpose — also gets attention"},
    {"category": "Greetings", "en": "Please", "ja": "お願いします", "romaji": "Onegai shimasu", "note": ""},
    {"category": "Greetings", "en": "Yes / No", "ja": "はい / いいえ", "romaji": "Hai / Iie", "note": ""},
    {"category": "Restaurant", "en": "A table for seven, please", "ja": "七名でお願いします", "romaji": "Shichi-mei de onegai shimasu", "note": ""},
    {"category": "Restaurant", "en": "Menu, please", "ja": "メニューをお願いします", "romaji": "Menyū o onegai shimasu", "note": ""},
    {"category": "Restaurant", "en": "I'll have this (pointing)", "ja": "これをお願いします", "romaji": "Kore o onegai shimasu", "note": ""},
    {"category": "Restaurant", "en": "Check please", "ja": "お会計をお願いします", "romaji": "O-kaikei o onegai shimasu", "note": ""},
    {"category": "Restaurant", "en": "Delicious!", "ja": "美味しい！", "romaji": "Oishii!", "note": ""},
    {"category": "Restaurant", "en": "Thank you for the meal", "ja": "ごちそうさまでした", "romaji": "Gochisōsama deshita", "note": "Say on the way out"},
    {"category": "Dietary — Brady", "en": "I cannot eat egg in any form", "ja": "卵は一切食べられません", "romaji": "Tamago wa issai taberaremasen", "note": "Show & say"},
    {"category": "Dietary — Brady", "en": "Does this contain egg?", "ja": "これは卵が入っていますか？", "romaji": "Kore wa tamago ga haitte imasu ka?", "note": ""},
    {"category": "Dietary — Brady", "en": "No egg, please", "ja": "卵なしでお願いします", "romaji": "Tamago nashi de onegai shimasu", "note": "For sukiyaki, okonomiyaki"},
    {"category": "Dietary — Cody/JJ", "en": "I cannot eat seafood or fish", "ja": "魚介類は食べられません", "romaji": "Gyokairui wa taberaremasen", "note": "Includes fish, shellfish"},
    {"category": "Dietary — Cody/JJ", "en": "Is the broth fish-based (dashi)?", "ja": "出汁は魚から作られていますか？", "romaji": "Dashi wa sakana kara tsukurarete imasu ka?", "note": "Crucial for ramen, miso, hot pot"},
    {"category": "Dietary — Cody/JJ", "en": "Without seafood, please", "ja": "魚介類なしでお願いします", "romaji": "Gyokairui nashi de onegai shimasu", "note": ""},
    {"category": "Transit", "en": "Where is ___ Station?", "ja": "___駅はどこですか？", "romaji": "___-eki wa doko desu ka?", "note": ""},
    {"category": "Transit", "en": "How much is the fare?", "ja": "いくらですか？", "romaji": "Ikura desu ka?", "note": ""},
    {"category": "Transit", "en": "One ticket to ___, please", "ja": "___まで一枚お願いします", "romaji": "___ made ichi-mai onegai shimasu", "note": ""},
    {"category": "Transit", "en": "Which platform?", "ja": "何番線ですか？", "romaji": "Nan-bansen desu ka?", "note": ""},
    {"category": "Hotel", "en": "I have a reservation", "ja": "予約しています", "romaji": "Yoyaku shite imasu", "note": ""},
    {"category": "Hotel", "en": "Could you hold my luggage?", "ja": "荷物を預かってもらえますか？", "romaji": "Nimotsu o azukatte moraemasu ka?", "note": ""},
    {"category": "Hotel", "en": "What time is checkout?", "ja": "チェックアウトは何時ですか？", "romaji": "Chekku-auto wa nan-ji desu ka?", "note": ""},
    {"category": "Shopping", "en": "How much is this?", "ja": "これはいくらですか？", "romaji": "Kore wa ikura desu ka?", "note": ""},
    {"category": "Shopping", "en": "Tax-free, please", "ja": "免税でお願いします", "romaji": "Menzei de onegai shimasu", "note": "Bring passport · ¥5,000+ purchase"},
    {"category": "Emergencies", "en": "Help!", "ja": "助けて！", "romaji": "Tasukete!", "note": ""},
    {"category": "Emergencies", "en": "Where is the hospital?", "ja": "病院はどこですか？", "romaji": "Byōin wa doko desu ka?", "note": ""},
    {"category": "Emergencies", "en": "Police: 110 · Ambulance/Fire: 119", "ja": "警察 110 / 救急 119", "romaji": "", "note": "Memorize"},
]

# ── INSERT MISSING / UPDATE DAYS ─────────────────────────────────────────
# Update Day 2 to include train times
for d in data['days']:
    if d.get('day') == '2':
        if 'Shinkansen' not in d.get('activities',''):
            d['activities'] = (
                "🚄 Kyle & Charlie: Shinkansen Kagoshima-Chuo → Kumamoto (10:32 JST · ~50 min)\n"
                "🚄 Bob & Wendy: Shinkansen Hakata → Kumamoto (10:38 JST · ~33 min)\n" + d['activities']
            )

# ── ATTACH meta to days
day_meta_by_day = {m['day']: m for m in day_meta}
for d in data['days']:
    try:
        n = int(d.get('day'))
    except:
        continue
    m = day_meta_by_day.get(n)
    if m:
        d['date_iso'] = m['date_iso']
        d['lat'] = m['lat']
        d['lon'] = m['lon']
        d['hotel_lat'] = m['hotel_lat']
        d['hotel_lon'] = m['hotel_lon']
        d['hotel_name'] = m['hotel']
        d['hotel_address'] = m['hotel_address']
        d['hotel_url'] = m['hotel_url']

# Map points: every hotel + a handful of must-see spots
map_points = []
seen = set()
for m in day_meta:
    key = m['hotel']
    if key in seen: continue
    seen.add(key)
    map_points.append({
        "type": "hotel",
        "name": m['hotel'],
        "city": m['city_short'],
        "lat": m['hotel_lat'],
        "lon": m['hotel_lon'],
        "url": m['hotel_url'],
        "day": m['day'],
    })
# Add key attractions
attractions_pins = [
    ("Sakurajima volcano", 31.5856, 130.6571, "Kagoshima", 1),
    ("Kumamoto Castle", 32.8062, 130.7059, "Kumamoto", 2),
    ("Suizenji Jojuen Garden", 32.7853, 130.7437, "Kumamoto", 2),
    ("Sachiko's House", 32.7600, 130.7300, "Kumamoto", 2),
    ("Peace Memorial Park (Hiroshima)", 34.3925, 132.4534, "Hiroshima", 4),
    ("Itsukushima Shrine (Miyajima)", 34.2961, 132.3197, "Miyajima", 5),
    ("Himeji Castle", 34.8394, 134.6939, "Himeji", 5),
    ("Arashiyama Bamboo Grove", 35.0170, 135.6717, "Kyoto", 6),
    ("Hozugawa Boat Terminal", 35.0103, 135.6825, "Arashiyama", 6),
    ("Itsuki Chaya Arashiyama Honten", 35.0123, 135.6783, "Arashiyama", 6),
    ("TeamLab Kyoto", 34.9819, 135.7536, "Kyoto", 6),
    ("Fushimi Inari Taisha", 34.9671, 135.7727, "Kyoto", 7),
    ("Kinkakuji (Golden Pavilion)", 35.0394, 135.7292, "Kyoto", 7),
    ("Kiyomizu-dera", 34.9949, 135.7851, "Kyoto", 7),
    ("Todai-ji (Nara)", 34.6890, 135.8398, "Nara", 8),
    ("Dotonbori (Osaka)", 34.6687, 135.5022, "Osaka", 9),
    ("Owakudani (Hakone)", 35.2456, 139.0190, "Hakone", 11),
    ("Lake Ashi (Hakone)", 35.2070, 139.0235, "Hakone", 11),
    ("Sensoji Temple", 35.7148, 139.7967, "Tokyo", 11),
    ("Shibuya Scramble", 35.6595, 139.7004, "Tokyo", 12),
    ("Kappabashi Kitchen Town", 35.7137, 139.7898, "Tokyo", 13),
    ("Kabukiza Theater", 35.6692, 139.7665, "Tokyo", 13),
    ("Ryogoku Kokugikan (Sumo)", 35.6962, 139.7935, "Tokyo", 14),
    ("Chanko Wanko (sumo dinner)", 35.6960, 139.7935, "Tokyo", 14),
    ("MOA Museum of Art", 35.0935, 139.0918, "Atami", 16),
    ("Oedo Antique Market (Tokyo Intl Forum)", 35.6766, 139.7639, "Tokyo", 18),
]
for n,lat,lon,city,day in attractions_pins:
    map_points.append({"type": "attraction", "name": n, "city": city, "lat": lat, "lon": lon, "day": day, "url": f"https://maps.google.com/?q={n.replace(' ','+')}"})

# ── EXPORT ──
data['bookings'] = bookings
data['packing'] = packing
data['phrasebook'] = phrasebook
data['mapPoints'] = map_points
data['dayMeta'] = day_meta

# ── SANITIZE booked-language for dining (we have NOT made any food reservations) ──
# Days highlights/activities: strip " ✓ BOOKED" tags from food/dining-context lines only,
# and " ✓ BOOKED" from the Chanko Wanko sumo dinner line. Keep transit/activity bookings intact.
import re as _re
_FOOD_BOOKED_PATTERNS = [
    r' ✓ BOOKED(?=\\n|")',  # generic trailing tag
]
for d in data.get('days', []):
    for k in ('highlights','activities','notes'):
        if k not in d: continue
        v = d[k]
        new_lines = []
        for line in v.split('\n'):
            # Itsuki Chaya is still TO BOOK — strip any '✓ BOOKED' marker.
            if 'Itsuki Chaya' in line and '✓ BOOKED' in line:
                line = line.replace(' ✓ BOOKED', '').replace('✓ BOOKED','').rstrip()
            # Chanko Wanko / Sumo Show dinner IS booked — ensure marker present.
            if ('Chanko' in line or 'Wanko' in line or 'Sumo Show Dinner' in line) and '✓ BOOKED' not in line:
                line = line.rstrip() + '  ✓ BOOKED'
            new_lines.append(line)
        d[k] = '\n'.join(new_lines)
# Dining list: Chanko Wanko IS booked — keep the booked badge, just sand off
# the loud "ALREADY BOOKED" copy that read like marketing.
for entry in data.get('dining', []):
    if isinstance(entry, dict) and 'Chanko Wanko' in entry.get('name',''):
        entry['name'] = 'Chanko Wanko ✅ Booked'
        entry['price'] = 'Group rate'
        entry['seats'] = '✅ Group of 7 booked'
        entry['reservation'] = '✅ Booked · Wed Jun 3, 6:00 pm'
        det = entry.get('details','')
        # Repair stale sanitizer artifacts from earlier passes.
        det = det.replace('Reservation not yet made.','Confirmed.')
        det = det.replace('Already confirmed!','Confirmed.').replace('already confirmed','confirmed')
        # Make sure the leading sentence reads as confirmed.
        if not det.lstrip().startswith('Confirmed'):
            det = 'Confirmed group reservation. ' + det.lstrip()
        entry['details'] = det
# Strip the "TOP BOOKED" / "✓ BOOKED" labels from any other dining highlights field
for entry in data.get('dining', []):
    if not isinstance(entry, dict): continue
    for k,v in list(entry.items()):
        if isinstance(v, str):
            entry[k] = v.replace('✓ BOOKED','').replace('TOP BOOKED','TOP PICK').replace('✅ BOOKED','To book')
# Itinerary section data arrays may also reference "✓ BOOKED"
for sec in data.get('itinerarySections', []) if isinstance(data.get('itinerarySections'), list) else []:
    if isinstance(sec, dict) and isinstance(sec.get('data'), list):
        sec['data'] = [
            (cell.replace('\n(✓ BOOKED)','').replace('(✓ BOOKED)','').rstrip()
             if isinstance(cell, str) and 'Itsuki' in cell
             else cell)
            for cell in sec['data']
        ]

with open('data.js','w') as f:
    f.write("// Japan 2026 — enriched data, generated " + __import__('datetime').datetime.now().strftime('%Y-%m-%d') + "\n")
    f.write("const DATA = " + json.dumps(data, ensure_ascii=False) + ";\n")
    if _post_data_tail:
        f.write("\n")
        f.write(_post_data_tail)
        if not _post_data_tail.endswith('\n'):
            f.write('\n')
print("Wrote data.js")
print("Days:", len(data['days']))
print("Bookings:", len(bookings))
print("Packing items:", len(packing))
print("Phrasebook entries:", len(phrasebook))
print("Map points:", len(map_points))
