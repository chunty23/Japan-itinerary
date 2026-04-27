# Japan 2026 — One-time setup for collaborative editing

This site can read & write a shared Google Sheet so anyone in the group can add
places, bookings, transport, and day items right from the site. You set this up
**once** (~3 minutes). Everyone else just uses the "+ Add" button.

---

## The Sheet

**URL:** https://docs.google.com/spreadsheets/d/1vBAilO53g5teNXc3IisZ2-22_JfcPi7wiaMG-bFxCnM/edit

Four tabs: `Places`, `Bookings`, `Transport`, `Day_Items`. Each has a sample row labeled
`status: sample` — feel free to delete those whenever.

The site never deletes rows. Editors only **add**. Set the `status` column to
`hidden` to hide a row from the site without deleting it.

---

## Step 1 — Add the Apps Script

1. Open the sheet (link above).
2. Click **Extensions → Apps Script**.
3. Delete whatever's in `Code.gs` and paste the entire contents of
   [`apps_script.gs`](./apps_script.gs) from this repo.
4. Click 💾 (save). Name it "Japan 2026 API" if asked.

## Step 2 — Deploy as a Web App

1. Top-right: **Deploy → New deployment**.
2. Click the gear next to "Select type" → **Web app**.
3. Settings:
   - Description: anything (e.g. "Japan 2026 v1")
   - Execute as: **Me** (your account)
   - Who has access: **Anyone**
4. Click **Deploy**. Authorize when prompted (Google will warn — click
   "Advanced" → "Go to Japan 2026 API" → "Allow").
5. Copy the **Web app URL**. It looks like
   `https://script.google.com/macros/s/AKfycb.../exec`.

## Step 3 — Wire the URL into the site

Send me the Web app URL and I'll paste it into `data-loader.js` line 4 and
redeploy. (Or you can edit it yourself, commit, push — Netlify auto-deploys.)

That's it. The "+ Add" button on the site will start working immediately.

---

## Updating the Apps Script later

If we change the schema, you re-deploy: **Deploy → Manage deployments →** pencil
icon on the existing deployment → **Version: New version → Deploy**. The URL
stays the same.

---

## What the script does

- `GET ?type=all` — returns all 4 tabs as JSON. Site fetches this on load.
- `POST {type, row}` — appends one row to the matching tab. Site posts this when
  someone hits "+ Add".

It does **not** delete or modify existing rows. That keeps the data safe even if
the script URL gets shared widely.
