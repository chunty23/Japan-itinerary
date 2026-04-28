/* ────────────────────────────────────────────────────────────────────────────
 * Japan 2026 — Collaborative editing layer
 * Loads extras from a Google Sheet via an Apps Script web app and exposes
 * window.tripExtras = { Places, Bookings, Transport, Day_Items, byDay(n) }.
 * Also mounts the floating "+ Add" button + modal with Google Places
 * autocomplete, Maps URL paste, and manual cross-check.
 *
 * Setup: paste your Apps Script web-app URL into APPS_SCRIPT_URL below.
 * If left blank, the loader is a no-op (site behaves exactly as before).
 * ──────────────────────────────────────────────────────────────────────────── */
(function(){
  'use strict';

  // ⚙️  PASTE YOUR APPS SCRIPT WEB-APP URL HERE  ⚙️
  // (See SETUP_EDITING.md — Step 2 produces this URL)
  const APPS_SCRIPT_URL = window.JAPAN2026_APPS_SCRIPT_URL || '';

  const SHEET_VIEW_URL = 'https://docs.google.com/spreadsheets/d/1vBAilO53g5teNXc3IisZ2-22_JfcPi7wiaMG-bFxCnM/edit';
  const TRAVELERS = ['Kyle', 'Charlie', 'Bob', 'Wendy', 'Cody', 'JJ', 'Brady'];
  const IDENTITY_KEY = 'japan2026_identity';
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const PLACE_CATEGORIES = ['Dining','Cafe','Sightseeing','Shopping','Hotel','Nightlife','Transit','Cultural','Activity'];
  const BOOKING_TYPES = ['Hotel','Restaurant','Activity','Tour','Other'];
  const TRANSPORT_MODES = ['Shinkansen','Train','Flight','Bus','Ferry','Taxi','Rental Car','Walk'];
  const DAY_SECTIONS = ['Activities','Highlights','Food','Notes'];

  // ── PUBLIC SHAPE ──────────────────────────────────────────────────────────
  window.tripExtras = {
    Places: [], Bookings: [], Transport: [], Day_Items: [],
    isConfigured: false,
    byDay(n){
      const d = String(n);
      return {
        places:    this.Places.filter(p => String(p.day) === d),
        dayItems:  this.Day_Items.filter(p => String(p.day) === d),
        transport: this.Transport.filter(t => {
          // Transport rows match a day if depart_date matches that day's date_iso
          const day = (window.DATA && DATA.days || []).find(x => String(x.day) === d);
          return day && t.depart_date && String(t.depart_date).slice(0,10) === day.date_iso;
        })
      };
    }
  };

  // ── LOADER ────────────────────────────────────────────────────────────────
  async function loadExtras(){
    if (!APPS_SCRIPT_URL) return;
    try {
      const url = APPS_SCRIPT_URL + (APPS_SCRIPT_URL.includes('?') ? '&' : '?') + 'type=all&_=' + Date.now();
      const res = await fetch(url, { method:'GET' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Load failed');
      ['Places','Bookings','Transport','Day_Items'].forEach(k => {
        window.tripExtras[k] = (json.data[k] || []).map(normalizeRow);
      });
      window.tripExtras.isConfigured = true;
      mergeIntoData();
      // Re-render visible tab if app already rendered
      if (typeof window.rerenderActiveTab === 'function') window.rerenderActiveTab();
      else document.dispatchEvent(new CustomEvent('extras-loaded'));
      // Day_Items live-injection (renderers don't know about Day_Items, so we splice)
      injectDayItemsIntoItinerary();
    } catch (err){
      console.warn('[extras] load failed:', err);
    }
  }

  function normalizeRow(r){
    const out = {};
    Object.keys(r).forEach(k => {
      let v = r[k];
      if (v && typeof v === 'object' && v instanceof Date) v = v.toISOString();
      out[k] = v;
    });
    // Coerce numeric fields
    if (out.lat) out.lat = Number(out.lat);
    if (out.lng) out.lng = Number(out.lng);
    if (out.rating) out.rating = Number(out.rating);
    return out;
  }

  // ── MERGE INTO DATA (so existing renderers pick them up) ──────────────────
  function mergeIntoData(){
    if (!window.DATA) return;
    const ex = window.tripExtras;
    // 1. Places → DATA.savedPlaces
    if (Array.isArray(DATA.savedPlaces)){
      // Strip previous extras then re-append
      DATA.savedPlaces = DATA.savedPlaces.filter(p => !p._extra);
      ex.Places.forEach(p => {
        if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
        DATA.savedPlaces.push({
          name: p.name, city: p.city, category: p.category || 'Sightseeing',
          lat: p.lat, lng: p.lng, address: p.address || '', note: p.notes || '',
          url: p.google_url || (p.place_id ? 'https://www.google.com/maps/place/?q=place_id:' + p.place_id : ''),
          _extra: true, _addedBy: p.added_by || ''
        });
      });
    }
    // 2. Bookings → DATA.bookings (existing renderer reads this)
    if (Array.isArray(DATA.bookings)){
      DATA.bookings = DATA.bookings.filter(b => !b._extra);
      // Map extras BOOKING_TYPES (Hotel/Restaurant/Activity/Tour/Other) onto the
      // 5 renderBookings groups (Flights/Hotels/Trains/Activities/To Book).
      const TYPE_TO_GROUP = { Hotel:'Hotels', Restaurant:'To Book', Activity:'Activities', Tour:'Activities', Other:'To Book' };
      ex.Bookings.forEach(b => {
        const checkIn = b.check_in || '';
        // datetime-local emits "YYYY-MM-DDTHH:mm"; match against the date prefix.
        const checkInDate = checkIn.slice(0, 10);
        const dayMatch = checkInDate ? (DATA.days||[]).find(d => d.date_iso === checkInDate) : null;
        const detailsParts = [];
        if (b.notes) detailsParts.push(b.notes);
        if (b.confirmation) detailsParts.push('Conf: ' + b.confirmation);
        DATA.bookings.push({
          category: TYPE_TO_GROUP[b.type] || 'To Book',
          title:    b.name || '(untitled)',
          status:   'To Book',
          day:      dayMatch ? dayMatch.day : '',
          date:     checkInDate,
          who:      b.who || '',
          details:  detailsParts.join('\n'),
          url:      b.link || '',
          city:     b.city || '',
          _extra:   true,
          _addedBy: b.added_by || ''
        });
      });
    }
    // 3. Transport → DATA.transport
    if (Array.isArray(DATA.transport)){
      DATA.transport = DATA.transport.filter(t => !t._extra);
      ex.Transport.forEach(t => {
        DATA.transport.push({
          mode: t.mode, from: t.from, to: t.to,
          date: t.depart_date, depart: t.depart_time, arrive: t.arrive_time,
          who: t.who, carrier: t.carrier, ref: t.reference, link: t.link,
          notes: t.notes,
          _extra: true, _addedBy: t.added_by || ''
        });
      });
    }
  }

  // ── ADD FLOW ──────────────────────────────────────────────────────────────
  async function postRow(type, row){
    if (!APPS_SCRIPT_URL){
      throw new Error('Editing not configured. Ask the trip organizer to finish setup.');
    }
    // Use text/plain to avoid CORS preflight (Apps Script web apps don't handle OPTIONS).
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type, row, token: window.JAPAN2026_SHARED_TOKEN || '' })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Save failed');
    return json;
  }

  // ── GOOGLE PLACES INTEGRATION ─────────────────────────────────────────────
  let placesLoaded = null; // promise
  function loadPlacesLib(){
    if (placesLoaded) return placesLoaded;
    placesLoaded = new Promise((resolve, reject) => {
      const key = window.GOOGLE_MAPS_API_KEY;
      if (!key){ reject(new Error('No Maps key')); return; }
      if (window.google && window.google.maps && window.google.maps.places){
        resolve(window.google.maps); return;
      }
      const cb = '__japan2026_gmaps_cb_' + Date.now();
      window[cb] = () => { resolve(window.google.maps); delete window[cb]; };
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async&callback=${cb}`;
      s.async = true; s.defer = true;
      s.onerror = () => reject(new Error('Maps script load failed'));
      document.head.appendChild(s);
    });
    return placesLoaded;
  }

  // Wire an <input> to Google Places Autocomplete; resolves selection details.
  async function attachAutocomplete(input, onSelect){
    try {
      const maps = await loadPlacesLib();
      // Bias to Japan
      const ac = new maps.places.Autocomplete(input, {
        fields: ['place_id','name','formatted_address','geometry','website','rating','url','types'],
        componentRestrictions: { country: 'jp' }
      });
      ac.addListener('place_changed', () => {
        const p = ac.getPlace();
        if (!p || !p.place_id) return;
        const lat = p.geometry && p.geometry.location ? p.geometry.location.lat() : null;
        const lng = p.geometry && p.geometry.location ? p.geometry.location.lng() : null;
        onSelect({
          name: p.name || '',
          address: p.formatted_address || '',
          lat, lng,
          place_id: p.place_id,
          google_url: p.url || ('https://www.google.com/maps/place/?q=place_id:' + p.place_id),
          website: p.website || '',
          rating: p.rating || ''
        });
      });
    } catch (err){
      console.warn('[extras] autocomplete unavailable:', err);
    }
  }

  // Resolve a pasted Google Maps URL to place details.
  // Strategy: extract query/coords from URL, follow redirects via Google's
  // Find Place text-search using Maps JS Places library client-side.
  async function resolveMapsUrl(rawUrl){
    if (!rawUrl) return null;
    // Try to extract a name/address segment from common URL patterns
    let query = '';
    let coords = null;
    try {
      const u = new URL(rawUrl);
      // /place/<NAME>/@lat,lng,...
      const m1 = u.pathname.match(/\/place\/([^/]+)/);
      if (m1) query = decodeURIComponent(m1[1]).replace(/\+/g, ' ');
      const m2 = u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || rawUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (m2) coords = { lat: Number(m2[1]), lng: Number(m2[2]) };
      const q = u.searchParams.get('q') || u.searchParams.get('query');
      if (q) query = q;
    } catch(_) { /* not a URL */ }
    if (!query && !coords) return null;

    const maps = await loadPlacesLib();
    const svc = new maps.places.PlacesService(document.createElement('div'));
    return new Promise(resolve => {
      const req = query
        ? { query, fields: ['place_id','name','formatted_address','geometry','website','rating','url'] }
        : { location: new maps.LatLng(coords.lat, coords.lng), radius: 50, query: '' };
      svc.findPlaceFromQuery({ query: query || (coords ? coords.lat+','+coords.lng : ''),
        fields: ['place_id','name','formatted_address','geometry'] }, (results, status) => {
        if (status !== maps.places.PlacesServiceStatus.OK || !results || !results[0]){
          // fallback: only coords
          if (coords){
            resolve({ name: query || 'Pinned location', address: '', lat: coords.lat, lng: coords.lng,
              place_id: '', google_url: rawUrl });
          } else resolve(null);
          return;
        }
        const r = results[0];
        // Get full details for website/rating
        svc.getDetails({ placeId: r.place_id, fields: ['place_id','name','formatted_address','geometry','website','rating','url'] }, (d, st) => {
          const p = d && st === maps.places.PlacesServiceStatus.OK ? d : r;
          const lat = p.geometry && p.geometry.location ? p.geometry.location.lat() : (coords ? coords.lat : null);
          const lng = p.geometry && p.geometry.location ? p.geometry.location.lng() : (coords ? coords.lng : null);
          resolve({
            name: p.name || query, address: p.formatted_address || '',
            lat, lng, place_id: p.place_id || '',
            google_url: p.url || rawUrl,
            website: p.website || '', rating: p.rating || ''
          });
        });
      });
    });
  }

  // ── UI: FLOATING BUTTON + MODAL ───────────────────────────────────────────
  function mountAddButton(){
    if (document.getElementById('extrasAddBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'extrasAddBtn';
    btn.className = 'extras-fab';
    btn.setAttribute('aria-label', 'Add a place, booking, transport, or day item');
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg><span>Add</span>';
    btn.addEventListener('click', openAddModal);
    document.body.appendChild(btn);
  }

  async function openAddModal(){
    const id = await ensureIdentity();
    if (!id) return; // user cancelled identity prompt
    showAddModal(id);
  }

  function showAddModal(identity){
    const existing = document.getElementById('extrasModal');
    if (existing) existing.remove();
    const m = document.createElement('div');
    m.id = 'extrasModal';
    m.className = 'extras-modal-backdrop';
    m.innerHTML = `
      <div class="extras-modal" role="dialog" aria-modal="true" aria-labelledby="extrasModalTitle">
        <header class="extras-modal-header">
          <h3 id="extrasModalTitle">Add to the trip</h3>
          <button class="extras-modal-close" aria-label="Close">×</button>
        </header>
        <div class="extras-type-picker" role="tablist">
          <button class="extras-type-btn active" data-type="Places">📍 Place</button>
          <button class="extras-type-btn" data-type="Bookings">✅ Booking</button>
          <button class="extras-type-btn" data-type="Transport">🚄 Transport</button>
          <button class="extras-type-btn" data-type="Day_Items">📋 Day item</button>
        </div>
        <form class="extras-form" id="extrasForm" autocomplete="off"></form>
        <footer class="extras-modal-footer">
          <button type="button" class="extras-btn-ghost" id="extrasCancel">Cancel</button>
          <button type="button" class="extras-btn-primary" id="extrasSubmit">Add</button>
        </footer>
        <div class="extras-status" id="extrasStatus"></div>
        <div class="extras-signed-in" id="extrasSignedIn">
          Signed in as <span class="ex-who" id="extrasSignedInName">${esc(identity.name)}</span>
          <button type="button" class="ex-switch" id="extrasSwitch">Sign in as someone else</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    const _priorBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const close = () => { try { m.remove(); } finally { document.body.style.overflow = _priorBodyOverflow; } };
    m.addEventListener('click', e => { if (e.target === m) close(); });
    m.querySelector('.extras-modal-close').addEventListener('click', close);
    m.querySelector('#extrasCancel').addEventListener('click', close);
    document.addEventListener('keydown', function esc(e){
      if (e.key === 'Escape'){ close(); document.removeEventListener('keydown', esc); }
    });

    let currentType = 'Places';
    const renderForm = () => buildForm(currentType, m.querySelector('#extrasForm'));
    m.querySelectorAll('.extras-type-btn').forEach(b => {
      b.addEventListener('click', () => {
        m.querySelectorAll('.extras-type-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        currentType = b.dataset.type;
        renderForm();
      });
    });
    renderForm();

    m.querySelector('#extrasSubmit').addEventListener('click', async () => {
      const submitBtn = m.querySelector('#extrasSubmit');
      const status = m.querySelector('#extrasStatus');
      const ident = getIdentity();
      if (!ident || !ident.name || !ident.email){
        status.textContent = 'You\'re no longer signed in. Click "Sign in as someone else" below.';
        status.className = 'extras-status err';
        return;
      }
      const form = m.querySelector('#extrasForm');
      const row = collectForm(currentType, form);
      const err = validate(currentType, row);
      if (err){ status.textContent = err; status.className = 'extras-status err'; return; }
      submitBtn.disabled = true;
      status.textContent = 'Saving…';
      status.className = 'extras-status info';
      try {
        // Manual cross-check: if a place name was typed but no place_id, try a lookup
        if ((currentType === 'Places' || currentType === 'Bookings') && row.name && !row.place_id){
          try {
            const guess = await crossCheck(row.name + ' ' + (row.city||row.address||''));
            if (guess && guess.place_id){
              row.place_id = guess.place_id;
              if (!row.address) row.address = guess.address;
              if (!row.lat)     row.lat = guess.lat;
              if (!row.lng)     row.lng = guess.lng;
              if (!row.google_url) row.google_url = guess.google_url;
            }
          } catch(_) {}
        }
        await postRow(currentType, row);
        status.textContent = 'Added. Refreshing…';
        status.className = 'extras-status ok';
        await loadExtras();
        setTimeout(close, 700);
      } catch (err){
        console.error(err);
        status.textContent = String(err.message || err);
        status.className = 'extras-status err';
        submitBtn.disabled = false;
      }
    });

    // "Sign in as someone else" — clear identity, close add-modal, re-prompt
    m.querySelector('#extrasSwitch').addEventListener('click', async () => {
      clearIdentity();
      close();
      const next = await promptIdentity();
      if (next) showAddModal(next);
    });

    // focus first input
    setTimeout(() => {
      const f = m.querySelector('input, textarea, select');
      if (f) f.focus();
    }, 50);
  }

  // Cross-check: same as resolveMapsUrl but via text query
  async function crossCheck(text){
    try {
      const maps = await loadPlacesLib();
      const svc = new maps.places.PlacesService(document.createElement('div'));
      return new Promise(resolve => {
        svc.findPlaceFromQuery({
          query: text,
          fields: ['place_id','name','formatted_address','geometry']
        }, (results, status) => {
          if (status !== maps.places.PlacesServiceStatus.OK || !results || !results[0]){ resolve(null); return; }
          const r = results[0];
          const lat = r.geometry && r.geometry.location ? r.geometry.location.lat() : null;
          const lng = r.geometry && r.geometry.location ? r.geometry.location.lng() : null;
          resolve({
            place_id: r.place_id, name: r.name,
            address: r.formatted_address || '',
            lat, lng,
            google_url: 'https://www.google.com/maps/place/?q=place_id:' + r.place_id
          });
        });
      });
    } catch(_) { return null; }
  }

  // ── FORM BUILDERS ─────────────────────────────────────────────────────────
  function buildForm(type, el){
    const dayOpts = (window.DATA && DATA.days || [])
      .filter(d => d.date_iso)
      .map(d => `<option value="${esc(d.day)}">Day ${esc(d.day)} · ${esc((d.date||'').split('·')[0].trim())} · ${esc((d.city||'').split('\n')[0].replace(/[^\p{L}\p{N} ]+/gu,'').trim())}</option>`)
      .join('');
    const whoOpts = TRAVELERS.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');

    if (type === 'Places'){
      el.innerHTML = `
        <div class="ex-section">
          <label class="ex-label">Add via Google Maps <span class="ex-hint">(recommended)</span></label>
          <input type="text" class="ex-input" id="exPacName" placeholder="Search Google Maps — e.g. Tsukiji Outer Market…" />
          <div class="ex-or">— or —</div>
          <input type="url" class="ex-input" id="exMapsUrl" placeholder="Paste a Google Maps link (maps.app.goo.gl/...)" />
          <div class="ex-resolved" id="exResolved" hidden></div>
        </div>
        <div class="ex-section">
          <label class="ex-label">Details</label>
          <input type="text" class="ex-input" id="exName" placeholder="Place name *" required />
          <div class="ex-grid-2">
            <select class="ex-input" id="exCategory">${PLACE_CATEGORIES.map(c=>`<option>${esc(c)}</option>`).join('')}</select>
            <input type="text" class="ex-input" id="exCity" placeholder="City (e.g. Tokyo)" />
          </div>
          <select class="ex-input" id="exDay">
            <option value="">Day (optional)</option>${dayOpts}
          </select>
          <textarea class="ex-input" id="exNotes" rows="2" placeholder="Notes (why you want to go, who suggested it…)"></textarea>
        </div>
        <input type="hidden" id="exLat"><input type="hidden" id="exLng"><input type="hidden" id="exPlaceId">
        <input type="hidden" id="exGoogleUrl"><input type="hidden" id="exAddress"><input type="hidden" id="exWebsite"><input type="hidden" id="exRating">`;
      attachAutocomplete(el.querySelector('#exPacName'), data => fillFromPlace(el, data));
      el.querySelector('#exMapsUrl').addEventListener('change', async (e) => {
        const url = e.target.value.trim();
        if (!url) return;
        const status = document.querySelector('#extrasStatus');
        status.textContent = 'Looking up that link…'; status.className = 'extras-status info';
        try {
          const data = await resolveMapsUrl(url);
          if (data){ fillFromPlace(el, data); status.textContent = ''; }
          else { status.textContent = 'Could not resolve that link — please type the name instead.'; status.className = 'extras-status err'; }
        } catch(err){ status.textContent = String(err.message || err); status.className = 'extras-status err'; }
      });
    }
    else if (type === 'Bookings'){
      el.innerHTML = `
        <div class="ex-section">
          <label class="ex-label">Find on Google Maps <span class="ex-hint">(optional, attaches address & link)</span></label>
          <input type="text" class="ex-input" id="exPacName" placeholder="Hotel, restaurant, activity name…" />
        </div>
        <div class="ex-section">
          <label class="ex-label">Details</label>
          <select class="ex-input" id="exType">${BOOKING_TYPES.map(t=>`<option>${esc(t)}</option>`).join('')}</select>
          <input type="text" class="ex-input" id="exName" placeholder="Booking name *" required />
          <input type="text" class="ex-input" id="exCity" placeholder="City" />
          <div class="ex-grid-2">
            <input type="datetime-local" class="ex-input" id="exCheckIn" placeholder="Check-in / start" />
            <input type="datetime-local" class="ex-input" id="exCheckOut" placeholder="Check-out / end" />
          </div>
          <input type="text" class="ex-input" id="exWho" placeholder="Who (e.g. All 7, Kyle & Charlie)" />
          <input type="text" class="ex-input" id="exConfirmation" placeholder="Confirmation #" />
          <input type="url" class="ex-input" id="exLink" placeholder="Booking link (optional)" />
          <textarea class="ex-input" id="exNotes" rows="2" placeholder="Notes"></textarea>
        </div>
        <input type="hidden" id="exLat"><input type="hidden" id="exLng"><input type="hidden" id="exPlaceId"><input type="hidden" id="exAddress">`;
      attachAutocomplete(el.querySelector('#exPacName'), data => {
        el.querySelector('#exName').value = el.querySelector('#exName').value || data.name;
        el.querySelector('#exAddress').value = data.address;
        el.querySelector('#exLat').value = data.lat || '';
        el.querySelector('#exLng').value = data.lng || '';
        el.querySelector('#exPlaceId').value = data.place_id;
        if (!el.querySelector('#exLink').value) el.querySelector('#exLink').value = data.google_url || '';
      });
    }
    else if (type === 'Transport'){
      el.innerHTML = `
        <div class="ex-section">
          <select class="ex-input" id="exMode">${TRANSPORT_MODES.map(m=>`<option>${esc(m)}</option>`).join('')}</select>
          <div class="ex-grid-2">
            <input type="text" class="ex-input" id="exFrom" placeholder="From *" required />
            <input type="text" class="ex-input" id="exTo" placeholder="To *" required />
          </div>
          <div class="ex-grid-3">
            <input type="date" class="ex-input" id="exDepartDate" />
            <input type="time" class="ex-input" id="exDepartTime" />
            <input type="time" class="ex-input" id="exArriveTime" />
          </div>
          <input type="text" class="ex-input" id="exWho" placeholder="Who" />
          <input type="text" class="ex-input" id="exCarrier" placeholder="Carrier (e.g. JR Tokai · Nozomi 23)" />
          <input type="text" class="ex-input" id="exReference" placeholder="Reference / seat / booking #" />
          <input type="url" class="ex-input" id="exLink" placeholder="Link (optional)" />
          <textarea class="ex-input" id="exNotes" rows="2" placeholder="Notes"></textarea>
        </div>`;
    }
    else if (type === 'Day_Items'){
      el.innerHTML = `
        <div class="ex-section">
          <select class="ex-input" id="exDay" required>
            <option value="">Pick a day *</option>${dayOpts}
          </select>
          <select class="ex-input" id="exSection">${DAY_SECTIONS.map(s=>`<option>${esc(s)}</option>`).join('')}</select>
          <input type="text" class="ex-input" id="exTitle" placeholder="What to add *" required />
          <div class="ex-grid-2">
            <input type="time" class="ex-input" id="exTime" placeholder="Time (optional)" />
            <input type="number" class="ex-input" id="exDuration" placeholder="Duration (min)" min="0" />
          </div>
          <label class="ex-label" style="margin-top:.4rem">Optional: link to a Google Maps place</label>
          <input type="text" class="ex-input" id="exPacName" placeholder="Search Google Maps…" />
          <input type="text" class="ex-input" id="exWho" placeholder="Who" />
          <input type="text" class="ex-input" id="exCost" placeholder="Cost (optional)" />
          <textarea class="ex-input" id="exNotes" rows="2" placeholder="Notes"></textarea>
        </div>
        <input type="hidden" id="exPlaceId"><input type="hidden" id="exGoogleUrl">`;
      attachAutocomplete(el.querySelector('#exPacName'), data => {
        el.querySelector('#exPlaceId').value = data.place_id;
        el.querySelector('#exGoogleUrl').value = data.google_url || '';
      });
    }
  }

  function fillFromPlace(el, d){
    if (!d) return;
    if (d.name)    el.querySelector('#exName').value = d.name;
    if (d.address) el.querySelector('#exAddress').value = d.address;
    if (d.lat != null) el.querySelector('#exLat').value = d.lat;
    if (d.lng != null) el.querySelector('#exLng').value = d.lng;
    if (d.place_id)    el.querySelector('#exPlaceId').value = d.place_id;
    if (d.google_url)  el.querySelector('#exGoogleUrl').value = d.google_url;
    if (d.website && el.querySelector('#exWebsite'))   el.querySelector('#exWebsite').value = d.website;
    if (d.rating  && el.querySelector('#exRating'))    el.querySelector('#exRating').value  = d.rating;
    // Try to infer city from address
    if (d.address && el.querySelector('#exCity') && !el.querySelector('#exCity').value){
      const parts = d.address.split(',').map(s => s.trim());
      // address often ends with "City, Prefecture, Japan" — pick the city-like token
      const city = parts.find(p => /[A-Za-z]/.test(p) && !/\d/.test(p) && p.toLowerCase() !== 'japan');
      if (city) el.querySelector('#exCity').value = city.replace(/-shi$|-ku$|-cho$/i,'');
    }
    const r = document.querySelector('#exResolved');
    if (r){ r.hidden = false; r.innerHTML = `<span class="ex-pin">📍</span> ${esc(d.name)}<span class="ex-sub">${esc(d.address||'')}</span>`; }
  }

  // ── IDENTITY ──────────────────────────────────────────────────────────────
  function getIdentity(){
    try {
      const raw = localStorage.getItem(IDENTITY_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (obj && obj.name && obj.email && EMAIL_RE.test(obj.email)) return obj;
      return null;
    } catch(_) { return null; }
  }
  function saveIdentity(id){
    try { localStorage.setItem(IDENTITY_KEY, JSON.stringify(id)); } catch(_) {}
  }
  function clearIdentity(){
    try { localStorage.removeItem(IDENTITY_KEY); } catch(_) {}
  }

  // Show the identity prompt; resolves with the saved identity, or null if cancelled.
  function promptIdentity(){
    return new Promise(resolve => {
      const existing = document.getElementById('extrasIdentityModal');
      if (existing) existing.remove();
      const m = document.createElement('div');
      m.id = 'extrasIdentityModal';
      m.className = 'extras-modal-backdrop';
      const opts = TRAVELERS.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
      m.innerHTML = `
        <div class="extras-modal" role="dialog" aria-modal="true" aria-labelledby="extrasIdentityTitle">
          <header class="extras-modal-header">
            <h3 id="extrasIdentityTitle">Who's adding this?</h3>
            <button class="extras-modal-close" aria-label="Close">×</button>
          </header>
          <div class="extras-identity">
            <p>So we can credit your additions and follow up if needed. Saved on this device only — no password required.</p>
            <select class="ex-input" id="idName" aria-label="Your name">
              <option value="">Pick your name…</option>
              ${opts}
              <option value="__other">Other…</option>
            </select>
            <input type="text" class="ex-input" id="idNameOther" placeholder="Your name" hidden />
            <input type="email" class="ex-input" id="idEmail" placeholder="Email address" autocomplete="email" inputmode="email" />
          </div>
          <div class="extras-identity-err" id="idErr"></div>
          <footer class="extras-modal-footer">
            <button type="button" class="extras-btn-ghost" id="idCancel">Cancel</button>
            <button type="button" class="extras-btn-primary" id="idSave">Continue</button>
          </footer>
        </div>`;
      document.body.appendChild(m);
      const _priorBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const close = (val) => { try { m.remove(); } finally { document.body.style.overflow = _priorBodyOverflow; resolve(val || null); } };
      m.addEventListener('click', e => { if (e.target === m) close(null); });
      m.querySelector('.extras-modal-close').addEventListener('click', () => close(null));
      m.querySelector('#idCancel').addEventListener('click', () => close(null));
      document.addEventListener('keydown', function esc(e){
        if (e.key === 'Escape'){ close(null); document.removeEventListener('keydown', esc); }
      });

      const sel = m.querySelector('#idName');
      const other = m.querySelector('#idNameOther');
      sel.addEventListener('change', () => {
        if (sel.value === '__other'){ other.hidden = false; setTimeout(() => other.focus(), 30); }
        else { other.hidden = true; other.value = ''; }
      });

      m.querySelector('#idSave').addEventListener('click', () => {
        const errEl = m.querySelector('#idErr');
        let name = sel.value === '__other' ? other.value.trim() : sel.value;
        const email = (m.querySelector('#idEmail').value || '').trim();
        if (!name){ errEl.textContent = 'Pick your name (or choose Other and type it).'; return; }
        if (!EMAIL_RE.test(email)){ errEl.textContent = 'Enter a valid email address.'; return; }
        const id = { name, email };
        saveIdentity(id);
        close(id);
      });

      setTimeout(() => sel.focus(), 50);
    });
  }

  async function ensureIdentity(){
    const cur = getIdentity();
    if (cur) return cur;
    return await promptIdentity();
  }

  function collectForm(type, form){
    const v = id => (form.querySelector('#'+id) && form.querySelector('#'+id).value || '').trim();
    const ident = getIdentity() || { name: '', email: '' };
    const addedBy = ident.name;
    const addedByEmail = ident.email;
    if (type === 'Places'){
      return {
        added_by: addedBy, added_by_email: addedByEmail,
        day: v('exDay'), city: v('exCity'),
        name: v('exName'), category: v('exCategory'),
        address: v('exAddress'),
        lat: v('exLat'), lng: v('exLng'),
        place_id: v('exPlaceId'), google_url: v('exGoogleUrl'),
        website: v('exWebsite'), rating: v('exRating'),
        notes: v('exNotes')
      };
    }
    if (type === 'Bookings'){
      return {
        added_by: addedBy, added_by_email: addedByEmail,
        type: v('exType'), name: v('exName'),
        city: v('exCity'),
        check_in: v('exCheckIn'), check_out: v('exCheckOut'),
        who: v('exWho'), confirmation: v('exConfirmation'),
        link: v('exLink'),
        address: v('exAddress'),
        lat: v('exLat'), lng: v('exLng'), place_id: v('exPlaceId'),
        notes: v('exNotes')
      };
    }
    if (type === 'Transport'){
      return {
        added_by: addedBy, added_by_email: addedByEmail,
        mode: v('exMode'),
        from: v('exFrom'), to: v('exTo'),
        depart_date: v('exDepartDate'),
        depart_time: v('exDepartTime'), arrive_time: v('exArriveTime'),
        who: v('exWho'), carrier: v('exCarrier'),
        reference: v('exReference'), link: v('exLink'),
        notes: v('exNotes')
      };
    }
    if (type === 'Day_Items'){
      return {
        added_by: addedBy, added_by_email: addedByEmail,
        day: v('exDay'), section: v('exSection'),
        title: v('exTitle'), time: v('exTime'),
        duration_min: v('exDuration'),
        place_id: v('exPlaceId'), google_url: v('exGoogleUrl'),
        link: '', cost: v('exCost'), who: v('exWho'),
        notes: v('exNotes')
      };
    }
    return {};
  }

  function validate(type, row){
    if (type === 'Places' && !row.name) return 'Place name is required.';
    if (type === 'Bookings' && !row.name) return 'Booking name is required.';
    if (type === 'Transport' && (!row.from || !row.to)) return 'From and To are required.';
    if (type === 'Day_Items'){
      if (!row.day) return 'Pick a day.';
      if (!row.title) return 'Title is required.';
    }
    return null;
  }

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

  // ── BOOT ──────────────────────────────────────────────────────────────────
  function boot(){
    if (!APPS_SCRIPT_URL){
      // Show a small dev hint in the console for the trip organizer
      console.info('[Japan 2026] Collaborative editing not yet configured. ' +
        'See SETUP_EDITING.md to enable the "+ Add" button.');
    }
    mountAddButton();
    loadExtras();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // ── DAY_ITEMS INJECTION ────────────────────────────────────────────────────
  // The existing renderItinerary() doesn't know about Day_Items; we splice them
  // into each day card after a re-render. Idempotent.
  function injectDayItemsIntoItinerary(){
    const items = window.tripExtras.Day_Items || [];
    if (!items.length) return;
    // Group by day
    const byDay = {};
    items.forEach(it => {
      const d = String(it.day || '').trim();
      if (!d) return;
      (byDay[d] = byDay[d] || []).push(it);
    });
    document.querySelectorAll('[data-day]').forEach(card => {
      const d = String(card.getAttribute('data-day'));
      const list = byDay[d];
      if (!list || !list.length) return;
      // Remove any previous injection in this card
      card.querySelectorAll('.extras-day-injection').forEach(n => n.remove());
      const block = document.createElement('div');
      block.className = 'extras-day-injection';
      block.innerHTML = `
        <div class="extras-day-injection-header">
          <span class="extras-day-injection-icon">+</span>
          Group additions <span class="extras-day-injection-count">${list.length}</span>
        </div>
        <ul class="extras-day-injection-list">
          ${list.map(it => {
            const parts = [];
            if (it.time) parts.push(esc(String(it.time)));
            if (it.section) parts.push(esc(String(it.section)));
            const meta = parts.length ? `<span class="ex-day-meta">${parts.join(' \u00b7 ')}</span>` : '';
            const link = it.google_url ? ` <a class="ex-day-link" href="${window.safeUrl(it.google_url)}" target="_blank" rel="noopener">Open in Maps \u2197</a>` : '';
            const note = it.notes ? `<div class="ex-day-note">${esc(it.notes)}</div>` : '';
            const who  = it.who ? ` \u00b7 ${esc(it.who)}` : '';
            const by   = it.added_by ? `<span class="added-by-tag">${esc(it.added_by)}</span>` : '';
            return `<li class="ex-day-item">${meta}<span class="ex-day-title">${esc(it.title || '')}${who}</span>${link}${by}${note}</li>`;
          }).join('')}
        </ul>`;
      // Append to card body — the data-day card is the day's container
      card.appendChild(block);
    });
  }
  // Re-inject whenever any tab renders
  const originalRerender = window.rerenderActiveTab;
  window.rerenderActiveTab = function(){
    if (typeof originalRerender === 'function') originalRerender();
    setTimeout(injectDayItemsIntoItinerary, 30);
  };

  // Expose a refresh helper for a possible toolbar button
  window.refreshTripExtras = loadExtras;
  window.openTripAddModal = openAddModal;
  window.tripSheetUrl = SHEET_VIEW_URL;

})();
