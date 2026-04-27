// ─── HELPERS ───────────────────────────────────────
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const nl2br = s => esc(s||'').replace(/\n/g,'<br>');
const nl2li = s => (s||'').split('\n').filter(l=>l.trim()).map(l=>'<li>'+linkify(esc(l))+'</li>').join('');
const linkify = s => s.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');

function toggleOpen(el) { el.classList.toggle('open'); }
window.toggleOpen = toggleOpen;

// ── Theme toggle (persisted)
(function(){
  const saved = localStorage.getItem('jp2026-theme');
  if (saved === 'dark' || (saved===null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark');
  }
  const btn = $('#darkToggle');
  if (btn) btn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('jp2026-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });
})();

// ── Tab switching
function switchTab(name, opts){
  opts = opts||{};
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  $$('.tab-content').forEach(t => t.classList.remove('active'));
  const btn = document.querySelector('.tab-btn[data-tab="'+name+'"]');
  const pane = document.getElementById('tab-'+name);
  if (btn) btn.classList.add('active');
  if (pane) pane.classList.add('active');
  if (name === 'map') initMap();
  if (!opts.noScroll) window.scrollTo({top:0,behavior:'smooth'});
  // When entering Itinerary tab, auto-scroll to today's day-card unless explicitly disabled
  if (name === 'itinerary' && opts.scrollToToday !== false) scrollToTodayCard();
}
window.switchTab = switchTab;

$$('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Auto-scroll to today's day card in the Itinerary tab
function scrollToTodayCard(){
  // wait a tick for layout
  setTimeout(()=>{
    const el = document.querySelector('#tab-itinerary .day-card.today-highlight');
    if (el){
      el.classList.add('open');
      el.scrollIntoView({block:'center', behavior:'smooth'});
    }
  }, 80);
}
window.scrollToTodayCard = scrollToTodayCard;

// ── Export itinerary as PDF — builds a dedicated, clean printable view
function escHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function buildPrintableHTML(opts){
  const o = Object.assign({cover:true, itinerary:true, bookings:true, places:true, phrasebook:true}, opts||{});
  const days = (DATA.days || []).filter(d => d.day && /^\d+$/.test(String(d.day)));
  const meta = DATA.dayMeta || {};
  const places = (DATA.savedPlaces || []);
  const phrases = (DATA.phrasebook || []);
  // Group savedPlaces by city
  const placesByCity = {};
  places.forEach(p => { (placesByCity[p.city] = placesByCity[p.city] || []).push(p); });

  let html = '';

  // Cover
  if (o.cover) html += `<section class="pp-cover">
    <div class="pp-flag">🎌</div>
    <h1>Japan 2026 · Family Itinerary</h1>
    <p class="pp-sub">May 21 – June 8, 2026 · 19 Days</p>
    <p class="pp-route">Kagoshima › Kumamoto › Hiroshima › Miyajima › Himeji › Osaka › Nara › Nagano › Kyoto › Hakone › Atami › Izu › Tokyo › Seoul</p>
    <div class="pp-travelers">
      <strong>Travelers (7):</strong> Kyle &amp; Charlie · Bob &amp; Wendy · Cody &amp; JJ · Brady
    </div>
    <div class="pp-dietary">
      <strong>Dietary:</strong> Brady = no egg · Cody &amp; JJ = no seafood/shellfish/fish dashi
    </div>
    <div class="pp-legend">
      <strong>Map color key</strong>
      ${Object.keys(MAP_CAT_META).map(c=>`<span class="pp-legend-item"><span class="pp-legend-dot" style="background:${MAP_CAT_META[c].color}"></span>${MAP_CAT_META[c].emoji} ${c}</span>`).join('')}
    </div>
    <p class="pp-generated">Generated ${new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</p>
  </section>`;

  // Daily itinerary
  if (o.itinerary) {
  html += `<section class="pp-section pp-itin"><h2>Day-by-Day Itinerary</h2>`;
  let lastRegion = null;
  days.forEach((d) => {
    const region = d.region || '';
    if (region && region !== lastRegion){
      html += `<div class="pp-region">${escHtml(region)}</div>`;
      lastRegion = region;
    }
    html += `<article class="pp-day"><div class="pp-day-head">
      <span class="pp-day-num">Day ${escHtml(d.day)}</span>
      <span class="pp-day-date">${escHtml(d.date)}</span>
      <span class="pp-day-city">${escHtml(d.city||'').split('\n')[0]}</span>
    </div>`;
    if (d.hotel)     html += `<div class="pp-row"><span class="pp-lbl">Hotel:</span> ${escHtml(d.hotel)}</div>`;
    if (d.transport) html += `<div class="pp-row"><span class="pp-lbl">Transport:</span> ${escHtml(d.transport)}</div>`;
    if (d.highlights){
      html += `<div class="pp-row"><span class="pp-lbl">Highlights:</span></div><ul class="pp-list">`;
      String(d.highlights).split(/\n/).forEach(h => h.trim() && (html += `<li>${escHtml(h.trim())}</li>`));
      html += `</ul>`;
    }
    if (d.activities){
      html += `<div class="pp-row"><span class="pp-lbl">Activities &amp; Sights:</span></div><ul class="pp-list">`;
      String(d.activities).split(/\n/).forEach(a => a.trim() && (html += `<li>${escHtml(a.trim())}</li>`));
      html += `</ul>`;
    }
    if (d.food){
      html += `<div class="pp-row"><span class="pp-lbl">Food picks:</span> ${escHtml(d.food)}</div>`;
    }
    if (d.notes){
      html += `<div class="pp-row pp-notes"><span class="pp-lbl">Notes:</span> ${escHtml(d.notes)}</div>`;
    }
    html += `</article>`;
  });
  html += `</section>`;
  } // end o.itinerary

  // Bookings
  if (o.bookings && DATA.bookings && DATA.bookings.length){
    html += `<section class="pp-section pp-bookings"><h2>Confirmed Bookings</h2><table class="pp-table">
      <thead><tr><th>Date</th><th>Time</th><th>Title</th><th>Who</th></tr></thead><tbody>`;
    DATA.bookings.forEach(b => {
      html += `<tr><td>${escHtml(b.date||'')}</td><td>${escHtml(b.time||'')}</td><td>${escHtml(b.title||'')}</td><td>${escHtml(b.who||'')}</td></tr>`;
    });
    html += `</tbody></table></section>`;
  }

  // Saved places by city
  if (o.places) {
  html += `<section class="pp-section pp-places"><h2>Saved Places (${places.length})</h2>`;
  MAP_CITIES_ORDER.forEach(city => {
    const list = placesByCity[city];
    if (!list || !list.length) return;
    html += `<div class="pp-place-city"><h3>${escHtml(city)} <span class="pp-count">${list.length}</span></h3><ul class="pp-place-list">`;
    list.forEach(p => {
      const m = MAP_CAT_META[p.category] || {emoji:'',color:'#888'};
      html += `<li><span class="pp-place-dot" style="background:${m.color}"></span><span class="pp-place-emoji">${m.emoji}</span><strong>${escHtml(p.name)}</strong> <span class="pp-place-cat">· ${escHtml(p.category)}</span>${p.note?`<div class="pp-place-note">${escHtml(p.note)}</div>`:''}</li>`;
    });
    html += `</ul></div>`;
  });
  html += `</section>`;
  } // end o.places

  // Phrasebook
  if (o.phrasebook && phrases.length){
    html += `<section class="pp-section pp-phrases"><h2>Phrasebook (${phrases.length})</h2>`;
    const byCat = {};
    phrases.forEach(p => { (byCat[p.category||'Other'] = byCat[p.category||'Other'] || []).push(p); });
    Object.keys(byCat).forEach(cat => {
      html += `<div class="pp-phr-cat"><h3>${escHtml(cat)}</h3><table class="pp-phr-table"><tbody>`;
      byCat[cat].forEach(ph => {
        html += `<tr><td class="pp-phr-en">${escHtml(ph.en)}</td><td class="pp-phr-ja">${escHtml(ph.ja)}</td><td class="pp-phr-ro">${escHtml(ph.romaji)}</td></tr>`;
        if (ph.note) html += `<tr><td colspan="3" class="pp-phr-note">↳ ${escHtml(ph.note)}</td></tr>`;
      });
      html += `</tbody></table></div>`;
    });
    html += `</section>`;
  }

  return html;
}

// ── PDF section picker dialog ──
const PDF_SECTIONS = [
  { key:'cover',     icon:'\ud83c\udf0c', title:'Cover page',
    desc:'Title, route, travelers, dietary alerts, color legend.' },
  { key:'itinerary', icon:'\ud83d\udcc5', title:'Day-by-day itinerary',
    desc:'All 19 days grouped by region, with hotel, highlights, activities, and notes.' },
  { key:'bookings',  icon:'\u2705', title:'Confirmed bookings',
    desc:'Locked-in reservations table (date, time, who).' },
  { key:'places',    icon:'\ud83d\uddfa\ufe0f', title:'Saved places',
    desc:'All map pins grouped by city with notes.' },
  { key:'phrasebook',icon:'\ud83d\udde3\ufe0f', title:'Phrasebook',
    desc:'Useful Japanese phrases + kanji, organized by category.' },
];

function pdfCounts(){
  const phrases = (DATA.phrasebook || []).length;
  const places = (DATA.savedPlaces || []).length;
  const bookings = (DATA.bookings || []).length;
  const days = ((DATA.days||[]).filter(d=>d.day && /^\d+$/.test(String(d.day)))).length;
  return { cover:1, itinerary:days, bookings, places, phrasebook:phrases };
}

function openPdfDialog(){
  let bd = document.getElementById('pdfDialog');
  if (!bd){
    bd = document.createElement('div');
    bd.id = 'pdfDialog';
    bd.className = 'pdfdlg-backdrop';
    bd.setAttribute('role','dialog');
    bd.setAttribute('aria-modal','true');
    bd.setAttribute('aria-labelledby','pdfDialogTitle');
    const counts = pdfCounts();
    bd.innerHTML = `
      <div class="pdfdlg" role="document">
        <div class="pdfdlg-head">
          <h3 id="pdfDialogTitle">\ud83d\udcc4 Choose what to include</h3>
          <p class="pdfdlg-sub">Pick the sections you want in your printable PDF.</p>
        </div>
        <div class="pdfdlg-body">
          <div class="pdfdlg-toolbar">
            <button type="button" class="pdfdlg-mini" data-act="all">\u2713 Select all</button>
            <button type="button" class="pdfdlg-mini" data-act="none">\u2715 Deselect all</button>
          </div>
          <div class="pdfdlg-list">
            ${PDF_SECTIONS.map(s => {
              const c = counts[s.key];
              const badge = (s.key==='cover') ? '' : `<span class="pdfdlg-count">${c}</span>`;
              return `<label class="pdfdlg-row checked">
                <input type="checkbox" data-key="${s.key}" checked>
                <div class="pdfdlg-meta">
                  <div class="pdfdlg-title">${s.icon} ${s.title}${badge}</div>
                  <div class="pdfdlg-desc">${s.desc}</div>
                </div>
              </label>`;
            }).join('')}
          </div>
        </div>
        <div class="pdfdlg-foot">
          <button type="button" class="pdfdlg-cancel" data-act="cancel">Cancel</button>
          <button type="button" class="pdfdlg-go" data-act="go">\ud83d\udda8\ufe0f Generate PDF</button>
        </div>
      </div>`;
    document.body.appendChild(bd);

    const refreshGo = () => {
      const any = bd.querySelectorAll('input[type=checkbox]:checked').length > 0;
      bd.querySelector('.pdfdlg-go').disabled = !any;
      bd.querySelectorAll('.pdfdlg-row').forEach(r => {
        r.classList.toggle('checked', !!r.querySelector('input').checked);
      });
    };
    bd.addEventListener('click', (e) => {
      if (e.target === bd){ closePdfDialog(); return; }
      const act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'all'){
        bd.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = true);
        refreshGo();
      } else if (act === 'none'){
        bd.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = false);
        refreshGo();
      } else if (act === 'cancel'){
        closePdfDialog();
      } else if (act === 'go'){
        const opts = {};
        bd.querySelectorAll('input[type=checkbox]').forEach(c => opts[c.getAttribute('data-key')] = c.checked);
        closePdfDialog();
        runExportPDF(opts);
      }
    });
    bd.addEventListener('change', (e) => {
      if (e.target.matches('input[type=checkbox]')) refreshGo();
    });
    document.addEventListener('keydown', (e) => {
      if (bd.classList.contains('open') && e.key === 'Escape') closePdfDialog();
    });
  }
  // Reset to all-checked each open
  bd.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = true);
  bd.querySelectorAll('.pdfdlg-row').forEach(r => r.classList.add('checked'));
  bd.querySelector('.pdfdlg-go').disabled = false;
  bd.classList.add('open');
}

function closePdfDialog(){
  const bd = document.getElementById('pdfDialog');
  if (bd) bd.classList.remove('open');
}

function runExportPDF(opts){
  let host = document.getElementById('printableRoot');
  if (!host){
    host = document.createElement('div');
    host.id = 'printableRoot';
    document.body.appendChild(host);
  }
  host.innerHTML = buildPrintableHTML(opts);
  document.body.classList.add('printing');
  setTimeout(()=>{
    try { window.print(); } catch(e){}
    setTimeout(()=>{ document.body.classList.remove('printing'); }, 300);
  }, 350);
}

function exportPDF(){ openPdfDialog(); }
window.exportPDF = exportPDF;
window.addEventListener('afterprint', ()=>document.body.classList.remove('printing'));
const _pdfBtn = document.getElementById('pdfBtn');
if (_pdfBtn) _pdfBtn.addEventListener('click', exportPDF);

// ── Scroll-to-top
window.addEventListener('scroll', () => {
  $('#scrollTop').classList.toggle('visible', window.scrollY > 400);
});

// ── DATE HELPERS ─────────────────────────────────
const TRIP_START = new Date('2026-05-21T00:00:00+09:00');
const TRIP_END   = new Date('2026-06-08T23:59:59+09:00');
function nowJST(){
  const now = new Date();
  // approximate JST regardless of viewer timezone
  const utc = now.getTime() + now.getTimezoneOffset()*60000;
  return new Date(utc + 9*3600*1000);
}
function getCurrentDayIndex(){
  const now = nowJST();
  if (now < TRIP_START) return -1;          // pre-trip
  if (now > TRIP_END)   return 99;          // post-trip
  const days = Math.floor((now - TRIP_START)/(86400*1000));
  return days; // 0-indexed
}

// ── HERO TRIP COUNTDOWN
(function tripCountdown(){
  const now = nowJST();
  const el = $('#tripCountdown');
  if (!el) return;
  const idx = getCurrentDayIndex();
  if (idx === -1) {
    const d = Math.ceil((TRIP_START - now)/(86400*1000));
    el.textContent = `🗾 ${d} day${d===1?'':'s'} until Japan`;
  } else if (idx >= 0 && idx < 19) {
    el.textContent = `📍 Day ${idx+1} of 19 — you're in Japan!`;
  } else {
    el.textContent = `🏠 Welcome home — what a trip`;
  }
})();

// ── TODAY TAB ────────────────────────────────────
function renderToday(){
  const el = $('#tab-today');
  const idx = getCurrentDayIndex();
  const days = DATA.days.filter(d => d.day && /^\d+$/.test(String(d.day)));
  let target;
  let eyebrow;
  let title;
  if (idx === -1) {
    target = days[0];
    const d = Math.ceil((TRIP_START - nowJST())/(86400*1000));
    eyebrow = `${d} day${d===1?'':'s'} to go`;
    title = `Day 1 preview · ${target.date}`;
  } else if (idx >= 0 && idx < 19) {
    target = days[idx];
    eyebrow = `Today · Day ${idx+1} of 19`;
    title = target.date;
  } else {
    eyebrow = 'Trip complete';
    title = 'You did it';
    target = days[days.length-1];
  }

  // Find next-up booking
  const upcoming = (DATA.bookings || [])
    .filter(b => b.date)
    .map(b => ({...b, _dt: new Date((b.date)+'T'+(parseTime(b.time))+'+09:00')}))
    .filter(b => !isNaN(b._dt) && b._dt > nowJST())
    .sort((a,b)=>a._dt-b._dt);
  const next = upcoming[0];

  let html = `<div class="today-card">
    <div class="today-eyebrow">${esc(eyebrow)}</div>
    <h2 class="today-title">${esc(title)} · ${esc((target&&target.city||'').split('\n')[0])}</h2>
    <div class="today-day-meta">
      ${target.hotel_name ? `<span>🏨 ${esc(target.hotel_name)}</span>` : ''}
      ${target.region ? `<span>🌏 ${esc(target.region)}</span>` : ''}
    </div>
    <button class="jump-today-btn" onclick="jumpToDay('${esc(String(target.day))}')">📋 Jump to today's full plan →</button>`;
  if (next) {
    const cd = countdownText(next._dt);
    html += `<div class="next-up">
      <div class="next-up-info">
        <div class="next-up-label">Next up · ${esc(next.category)}</div>
        <div class="next-up-title">${esc(next.title)}</div>
        <div class="next-up-time">${esc(formatBookingDate(next._dt))} · ${esc(next.who||'')}</div>
      </div>
      <div class="next-up-cd">${cd.value}<div class="cd-units">${cd.unit}</div></div>
    </div>`;
  }
  html += `</div>`;

  // Day-jump rail
  html += `<div class="day-rail">`;
  days.forEach((d,i)=>{
    const cls = i===idx?'today':(i<idx?'past':'');
    html += `<div class="day-pill ${cls}" onclick="jumpToDay('${d.day}')">Day ${d.day} · ${esc((d.date||'').split('·')[0]||d.date||'').trim()}</div>`;
  });
  html += `</div>`;

  // Inline today's full details
  if (target) {
    html += `<div class="day-card open today-highlight">
      <div class="day-card-header">
        <div class="day-num">${esc(target.day)}<small>DAY</small></div>
        <div class="day-info">
          <div class="date">${esc(target.date)}</div>
          <div class="city">${esc((target.city||'').split('\n')[0])}</div>
          <div class="teaser">${esc((target.highlights||'').split('\n')[0]||'')}</div>
        </div>
        <span class="expand-icon">▾</span>
      </div>
      <div class="day-card-body"><div class="day-details">${dayDetailsHTML(target)}</div></div>
    </div>`;
  }

  el.innerHTML = html;
}

function parseTime(t){
  if (!t) return '12:00:00';
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2,'0')}:${m[2]}:00`;
  return '12:00:00';
}
function countdownText(target){
  const ms = target - nowJST();
  if (ms < 0) return {value:'—', unit:''};
  const days = Math.floor(ms/86400000);
  const hrs = Math.floor((ms%86400000)/3600000);
  const mins = Math.floor((ms%3600000)/60000);
  if (days >= 2) return {value: days, unit: 'days'};
  if (days >= 1) return {value: days+'d '+hrs+'h', unit:''};
  if (hrs >= 1)  return {value: hrs+'h '+mins+'m', unit:''};
  return {value: mins+'m', unit:''};
}
function formatBookingDate(d){
  const opts = {weekday:'short', month:'short', day:'numeric'};
  return d.toLocaleDateString('en-US', opts) + ' · ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) + ' JST';
}

function jumpToDay(dayNum){
  const tabBtn = document.querySelector('[data-tab="itinerary"]');
  if (tabBtn) tabBtn.click();
  setTimeout(()=>{
    const cards = $$('#tab-itinerary .day-card');
    cards.forEach(c=>{
      const num = c.querySelector('.day-num');
      if (num && num.textContent.trim().startsWith(String(dayNum))) {
        c.classList.add('open');
        c.scrollIntoView({behavior:'smooth', block:'center'});
        c.style.transition='box-shadow .4s';
        c.style.boxShadow='0 0 0 3px rgba(188,0,45,.4)';
        setTimeout(()=>c.style.boxShadow='', 1500);
      }
    });
  },180);
}
window.jumpToDay = jumpToDay;

// ── ITINERARY TAB ────────────────────────────────────
function dayDetailsHTML(d){
  let html = '';
  if (d.hotel) {
    html += `<div class="detail-section"><div class="detail-label">🏨 Hotel</div><div class="detail-text">${nl2br(d.hotel)}</div>`;
    if (d.hotel_url) {
      html += `<div class="day-actions"><a class="day-action-btn" href="${esc(d.hotel_url)}" target="_blank" rel="noopener">📍 Map</a></div>`;
    }
    html += `</div>`;
  }
  if (d.highlights) {
    html += `<div class="detail-section"><div class="detail-label">📋 Highlights & Agenda</div><div class="detail-text"><ul>${nl2li(d.highlights)}</ul></div></div>`;
  }
  if (d.activities) {
    html += `<div class="detail-section"><div class="detail-label">🎯 Activities & Sights</div><div class="detail-text"><ul>${nl2li(d.activities)}</ul></div></div>`;
  }
  if (d.notes) {
    html += `<div class="detail-section"><div class="detail-label">📝 Notes</div><div class="detail-text">${nl2br(d.notes)}</div></div>`;
  }
  return html;
}

function renderItinerary(){
  const el = $('#tab-itinerary');
  const idx = getCurrentDayIndex();
  let html = `<div class="tab-header"><h2>🗾 Day-by-Day Itinerary</h2><p>May 21 – June 8 · 19 Days · Tap any day to expand</p></div>`;
  let lastRegion = '';
  const days = DATA.days.filter(d => d.day && /^\d+$/.test(String(d.day)));
  days.forEach((d,i) => {
    if (d.region && d.region !== lastRegion) {
      lastRegion = d.region;
      html += `<div class="region-divider"><span class="line"></span><span class="label">${esc(d.region)}</span><span class="line"></span></div>`;
    }
    const cityShort = (d.city||'').split('\n')[0];
    const teaser = ((d.highlights||'').split('\n').filter(l=>l.trim())[0]) || '';
    const isToday = i === idx;
    html += `<div class="day-card ${isToday?'today-highlight':''}" onclick="toggleOpen(this)">
      <div class="day-card-header">
        <div class="day-num">${esc(d.day)}<small>DAY</small></div>
        <div class="day-info">
          <div class="date">${esc(d.date)}</div>
          <div class="city">${esc(cityShort)}</div>
          <div class="teaser">${esc(teaser)}</div>
        </div>
        <span class="expand-icon">▾</span>
      </div>
      <div class="day-card-body"><div class="day-details">${dayDetailsHTML(d)}</div></div>
    </div>`;
  });
  el.innerHTML = html;
}

// ── BOOKINGS TAB ────────────────────────────────────
function renderBookings(){
  const el = $('#tab-bookings');
  const groups = ['Flights','Hotels','Trains','Activities','To Book'];
  const colorMap = {'Flights':'badge-flight','Hotels':'badge-hotel','Trains':'badge-train','Activities':'badge-activity','To Book':'badge-tobook'};
  let html = `<div class="tab-header"><h2>✅ Bookings & Confirmations</h2><p>Every confirmed reservation, in one place. Pulled from your inbox &amp; calendar.</p></div>`;
  groups.forEach(g => {
    const items = (DATA.bookings||[]).filter(b => b.category === g);
    if (!items.length) return;
    html += `<div class="section-card open">
      <div class="section-header" onclick="toggleOpen(this.parentElement)">
        ${g === 'Flights'?'✈️':g==='Hotels'?'🏨':g==='Trains'?'🚄':g==='Activities'?'🎟️':'📋'} ${esc(g)} <span class="shicon">▾</span></div>
      <div class="section-body"><div class="section-inner" style="padding:0">`;
    items.sort((a,b)=>(a.day||0)-(b.day||0));
    items.forEach(b => {
      html += `<div class="booking-row">
        <div class="booking-day"><span class="bd-num">${b.day||'?'}</span>${esc((b.date||'').slice(5))}</div>
        <div class="booking-info">
          <div class="b-title">${esc(b.title)}</div>
          <div class="b-meta">
            <span class="badge ${colorMap[g]}">${esc(b.status)}</span>
            ${b.time?'<span>🕒 '+esc(b.time)+'</span>':''}
            ${b.who?'<span>👥 '+esc(b.who)+'</span>':''}
          </div>
          <div class="b-details">${nl2br(b.details||'')}</div>
          ${b.source?`<div class="b-source">Source: ${esc(b.source)}</div>`:''}
        </div>
        <div class="booking-actions">
          ${b.url?`<a class="day-action-btn" href="${esc(b.url)}" target="_blank" rel="noopener">📍 Open</a>`:''}
        </div>
      </div>`;
    });
    html += `</div></div></div>`;
  });
  el.innerHTML = html;
}

// ── MAP TAB ─────────────────────────────────────────
const MAP_CITIES_ORDER = ['Kagoshima','Fukuoka','Kumamoto','Hiroshima','Miyajima','Himeji','Osaka','Nara','Nagano','Kyoto','Kyoto-North','Hakone','Atami','Izu','Tokyo','Narita','Seoul'];
const MAP_CAT_META = {
  'Dining':      {emoji:'🍜', color:'#E63946'},
  'Cafe':        {emoji:'☕', color:'#B5651D'},
  'Sightseeing': {emoji:'🏯', color:'#1D4ED8'},
  'Shopping':    {emoji:'🛍️', color:'#16A34A'},
  'Hotel':       {emoji:'🏨', color:'#7C3AED'},
  'Nightlife':   {emoji:'🌃', color:'#DB2777'},
  'Transit':     {emoji:'🚉', color:'#6B7280'},
  'Cultural':    {emoji:'🎌', color:'#C9A227'}
};
const mapState = {map:null, markers:new Map(), cityFilter:'all', catFilter:'all', selectedIdx:null};
let mapInited = false;

function filteredPlaces(){
  const places = DATA.savedPlaces || [];
  return places.map((p,i)=>({...p,_i:i})).filter(p => {
    if (mapState.cityFilter !== 'all' && p.city !== mapState.cityFilter) return false;
    if (mapState.catFilter !== 'all' && p.category !== mapState.catFilter) return false;
    return true;
  });
}

function initMap(){
  if (mapInited) return;
  const el = $('#tab-map');
  const places = DATA.savedPlaces || [];
  const cityCounts = {};
  const catCounts = {};
  places.forEach(p => {
    cityCounts[p.city] = (cityCounts[p.city]||0)+1;
    catCounts[p.category] = (catCounts[p.category]||0)+1;
  });
  const orderedCities = MAP_CITIES_ORDER.filter(c => cityCounts[c]).concat(
    Object.keys(cityCounts).filter(c => !MAP_CITIES_ORDER.includes(c)).sort()
  );
  const orderedCats = Object.keys(MAP_CAT_META).filter(c => catCounts[c]);

  const cityChips = `<button class="map-chip active" data-city="all">All Cities <span class="count">${places.length}</span></button>`
    + orderedCities.map(c => `<button class="map-chip" data-city="${esc(c)}">${esc(c)} <span class="count">${cityCounts[c]}</span></button>`).join('');
  const catChips = `<button class="map-chip active" data-cat="all">All Categories</button>`
    + orderedCats.map(c => {
      const m = MAP_CAT_META[c];
      return `<button class="map-chip" data-cat="${esc(c)}"><span class="dot" style="background:${m.color}"></span>${m.emoji} ${esc(c)} <span class="count">${catCounts[c]}</span></button>`;
    }).join('');

  el.innerHTML = `
    <div class="tab-header">
      <h2>🗺️ Interactive Trip Map</h2>
      <p>Click any pin or list item to see the live Google Maps listing — photos, reviews, hours, website.</p>
    </div>
    <div class="map-legend">${MAP_CITIES_ORDER && Object.keys(MAP_CAT_META).map(c=>`<span class="legend-item"><span class="legend-dot" style="background:${MAP_CAT_META[c].color}"></span>${MAP_CAT_META[c].emoji} ${c}</span>`).join('')}</div>
    <div class="map-toolbar" id="mapCityBar">${cityChips}</div>
    <div class="map-toolbar" id="mapCatBar">${catChips}</div>
    <div class="map-layout">
      <div class="map-list" id="mapList"></div>
      <div id="mapEnhanced"></div>
    </div>
    <div class="mpp-overlay" id="mppOverlay"></div>
    <aside class="map-place-panel" id="mppPanel" aria-hidden="true">
      <header class="mpp-header">
        <div class="mpp-emoji" id="mppEmoji"></div>
        <div class="mpp-title">
          <div class="mpp-name" id="mppName"></div>
          <div class="mpp-cat" id="mppCat"></div>
        </div>
        <button class="mpp-close" id="mppClose" aria-label="Close">×</button>
      </header>
      <div class="mpp-note" id="mppNote"></div>
      <div class="mpp-embed">
        <iframe id="mppEmbed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
      </div>
      <div class="mpp-actions" id="mppActions"></div>
    </aside>
  `;

  setTimeout(()=>{
    const map = L.map('mapEnhanced', {scrollWheelZoom:true}).setView([35.5, 136.5], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd'
    }).addTo(map);
    mapState.map = map;

    // build all markers once
    places.forEach((p, i) => {
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
      const meta = MAP_CAT_META[p.category] || {color:'#6B7280', emoji:'📍'};
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 7, fillColor: meta.color, color:'#fff', weight:2, opacity:1, fillOpacity:.95
      });
      marker.on('click', () => openPlacePanel(i));
      marker.bindTooltip(`${meta.emoji} ${esc(p.name)}`, {direction:'top', offset:[0,-6]});
      mapState.markers.set(i, marker);
    });

    // wire chip handlers
    el.querySelectorAll('#mapCityBar .map-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('#mapCityBar .map-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mapState.cityFilter = btn.dataset.city;
        refreshMapView();
      });
    });
    el.querySelectorAll('#mapCatBar .map-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('#mapCatBar .map-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mapState.catFilter = btn.dataset.cat;
        refreshMapView();
      });
    });

    // close handlers
    $('#mppClose').addEventListener('click', closePlacePanel);
    $('#mppOverlay').addEventListener('click', closePlacePanel);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('#mppPanel') && $('#mppPanel').classList.contains('open')) closePlacePanel();
    });

    refreshMapView();
  }, 80);

  mapInited = true;
}

function refreshMapView(){
  const map = mapState.map;
  if (!map) return;
  const visible = filteredPlaces();
  const visibleIdx = new Set(visible.map(p => p._i));
  const bounds = [];
  mapState.markers.forEach((marker, idx) => {
    if (visibleIdx.has(idx)){
      if (!map.hasLayer(marker)) marker.addTo(map);
      const ll = marker.getLatLng();
      bounds.push([ll.lat, ll.lng]);
    } else {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    }
  });
  if (bounds.length){
    map.fitBounds(bounds, {padding:[40,40], maxZoom: 14});
  }
  renderMapList(visible);
}

function renderMapList(visible){
  const list = $('#mapList');
  if (!list) return;
  if (!visible.length){
    list.innerHTML = '<div class="map-list-empty">No places match these filters.</div>';
    return;
  }
  // group by city in current order
  const groups = {};
  visible.forEach(p => { (groups[p.city] = groups[p.city] || []).push(p); });
  const cityOrder = Object.keys(groups).sort((a,b)=>{
    const ai = MAP_CITIES_ORDER.indexOf(a), bi = MAP_CITIES_ORDER.indexOf(b);
    return (ai<0?999:ai) - (bi<0?999:bi);
  });
  let html = '';
  cityOrder.forEach(city => {
    html += `<div class="map-list-city">${esc(city)} · ${groups[city].length}</div>`;
    groups[city].forEach(p => {
      const meta = MAP_CAT_META[p.category] || {color:'#6B7280', emoji:'📍'};
      const isSel = mapState.selectedIdx === p._i ? ' selected' : '';
      const sub = p.note || p.address || '';
      html += `<div class="map-list-item${isSel}" data-idx="${p._i}" role="button" tabindex="0">
        <span class="map-list-emoji" style="color:${meta.color}">${meta.emoji}</span>
        <span class="map-list-info">
          <span class="map-list-name">${esc(p.name)}</span>
          <span class="map-list-meta">${esc(sub)}</span>
        </span>
      </div>`;
    });
  });
  list.innerHTML = html;
  list.querySelectorAll('.map-list-item').forEach(btn => {
    btn.addEventListener('click', () => openPlacePanel(parseInt(btn.dataset.idx, 10)));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        openPlacePanel(parseInt(btn.dataset.idx, 10));
      }
    });
  });
}

function openPlacePanel(idx){
  const p = (DATA.savedPlaces || [])[idx];
  if (!p) return;
  mapState.selectedIdx = idx;
  const meta = MAP_CAT_META[p.category] || {color:'#6B7280', emoji:'📍'};
  $('#mppEmoji').textContent = meta.emoji;
  $('#mppName').textContent = p.name;
  $('#mppCat').innerHTML = `<span style="color:${meta.color};font-weight:600">${esc(p.category)}</span> · ${esc(p.city)}`;
  const noteHtml = (p.address ? `<div class="mpp-addr">📍 ${esc(p.address)}</div>` : '')
                 + (p.note ? esc(p.note) : '');
  $('#mppNote').innerHTML = noteHtml || '<em style="color:var(--muted)">No notes yet.</em>';

  const apiKey = window.GOOGLE_MAPS_API_KEY;
  const query = encodeURIComponent(p.name + (p.address ? ', ' + p.address : ', ' + p.city + ', Japan'));
  const iframe = $('#mppEmbed');
  if (apiKey){
    iframe.src = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}&zoom=16`;
    iframe.style.display = '';
  } else {
    iframe.removeAttribute('src');
    iframe.style.display = 'none';
  }

  const mapsUrl = p.url || `https://www.google.com/maps/search/?api=1&query=${query}`;
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  $('#mppActions').innerHTML = `
    <a class="mpp-action primary" href="${esc(mapsUrl)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>
    <a class="mpp-action" href="${esc(dirUrl)}" target="_blank" rel="noopener">Directions →</a>
  `;

  $('#mppPanel').classList.add('open');
  $('#mppPanel').setAttribute('aria-hidden', 'false');
  $('#mppOverlay').classList.add('open');
  document.body.classList.add('mpp-open');

  if (mapState.map && typeof p.lat === 'number' && typeof p.lng === 'number'){
    mapState.map.setView([p.lat, p.lng], Math.max(mapState.map.getZoom(), 14), {animate:true});
  }
  // re-render list to update selection state
  renderMapList(filteredPlaces());
}

function closePlacePanel(){
  const panel = $('#mppPanel');
  const overlay = $('#mppOverlay');
  if (panel){
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }
  if (overlay) overlay.classList.remove('open');
  document.body.classList.remove('mpp-open');
  const iframe = $('#mppEmbed');
  if (iframe) iframe.removeAttribute('src');
  mapState.selectedIdx = null;
  renderMapList(filteredPlaces());
}

// ── PACKING TAB ─────────────────────────────────────
function renderPacking(){
  const el = $('#tab-packing');
  const cats = {};
  (DATA.packing||[]).forEach((p,i)=>{
    if (!cats[p.category]) cats[p.category]=[];
    cats[p.category].push({...p, _idx:i});
  });
  let html = `<div class="tab-header"><h2>🎒 Packing &amp; Pre-Trip Checklist</h2><p>Tap items to check off — saved on this device. ${(DATA.packing||[]).length} items across ${Object.keys(cats).length} categories.</p></div>`;
  const checked = JSON.parse(localStorage.getItem('jp2026-packed')||'{}');
  Object.entries(cats).forEach(([cat,items])=>{
    html += `<div class="packing-cat"><h3>${esc(cat)}</h3><div class="packing-list">`;
    items.forEach(it=>{
      const isChecked = checked[it._idx];
      html += `<div class="pack-item ${isChecked?'checked':''}" data-idx="${it._idx}">
        <div class="pack-check">${isChecked?'✓':''}</div>
        <div class="pack-info"><div class="pack-name">${esc(it.item)}</div>${it.note?'<div class="pack-note">'+esc(it.note)+'</div>':''}</div>
      </div>`;
    });
    html += `</div></div>`;
  });
  el.innerHTML = html;
  el.querySelectorAll('.pack-item').forEach(item=>{
    item.addEventListener('click',()=>{
      const idx = item.dataset.idx;
      item.classList.toggle('checked');
      const c = JSON.parse(localStorage.getItem('jp2026-packed')||'{}');
      if (item.classList.contains('checked')) c[idx]=true; else delete c[idx];
      localStorage.setItem('jp2026-packed', JSON.stringify(c));
      item.querySelector('.pack-check').textContent = item.classList.contains('checked')?'✓':'';
    });
  });
}

// ── PHRASEBOOK TAB ──────────────────────────────────
function renderPhrasebook(){
  const el = $('#tab-phrasebook');
  const cats = {};
  (DATA.phrasebook||[]).forEach(p=>{
    if (!cats[p.category]) cats[p.category]=[];
    cats[p.category].push(p);
  });
  let html = `<div class="tab-header"><h2>🗣️ Phrasebook</h2><p>${(DATA.phrasebook||[]).length} phrases · tap a card to read out loud · 🎌</p></div>`;
  Object.entries(cats).forEach(([cat,items])=>{
    html += `<div class="phrase-cat"><h3>${esc(cat)}</h3>`;
    items.forEach(p=>{
      html += `<div class="phrase-card" data-ja="${esc(p.ja)}">
        <div class="phrase-en">${esc(p.en)}</div>
        <div class="phrase-ja">${esc(p.ja)}</div>
        <div class="phrase-romaji">${esc(p.romaji)}</div>
        ${p.note?'<div class="phrase-note">💬 '+esc(p.note)+'</div>':''}
      </div>`;
    });
    html += `</div>`;
  });
  el.innerHTML = html;
  el.querySelectorAll('.phrase-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const ja = card.dataset.ja;
      if (!('speechSynthesis' in window) || !ja) return;
      const u = new SpeechSynthesisUtterance(ja);
      u.lang = 'ja-JP';
      u.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });
  });
}

// ── FOOD / ATTRACTIONS / SHOPPING (sectioned grids) ──
function renderGridTab(tabId, items, title, subtitle, hasBooking){
  const el = $('#'+tabId);
  let html = `<div class="tab-header"><h2>${title}</h2><p>${subtitle}</p></div>`;
  html += `<div class="search-wrap"><input type="search" placeholder="Search…" oninput="filterGrid('${tabId}', this.value)"></div>`;
  const sections = {};
  items.forEach(f => {
    const s = f.section || 'Other';
    if (!sections[s]) sections[s] = [];
    sections[s].push(f);
  });
  Object.entries(sections).forEach(([sec, list])=>{
    html += `<div class="section-card open"><div class="section-header" onclick="toggleOpen(this.parentElement)">${esc(sec)} <span class="shicon">▾</span></div><div class="section-body"><div class="section-inner"><div class="item-grid">`;
    list.forEach(f => {
      const must = hasBooking && (f.booked||'').toLowerCase()==='yes';
      html += `<div class="item-card${must?' must-try':''}" data-search="${esc((f.name||'')+' '+(f.desc||'')+' '+(f.city||''))}">`;
      html += `<div class="ic-name">${esc(f.name||'')}</div>`;
      if (f.city) html += `<div class="ic-sub">${esc(f.city)}</div>`;
      html += `<div class="ic-badges">`;
      if (f.type)   html += '<span class="badge badge-type">'+esc(f.type)+'</span>';
      if (f.price)  html += '<span class="badge badge-price">'+esc(f.price)+'</span>';
      if (f.time)   html += '<span class="badge badge-type">'+esc(f.time)+'</span>';
      if (must)     html += '<span class="badge badge-must">★ Booked</span>';
      html += `</div>`;
      if (f.desc) html += `<div class="ic-desc">${nl2br(f.desc)}</div>`;
      html += `</div>`;
    });
    html += `</div></div></div></div>`;
  });
  el.innerHTML = html;
}
function filterGrid(tabId, q){
  q = q.toLowerCase().trim();
  const cards = $$('#'+tabId+' .item-card');
  cards.forEach(c=>{
    const m = (c.dataset.search||'').toLowerCase();
    c.style.display = (!q || m.includes(q)) ? '' : 'none';
  });
}
window.filterGrid = filterGrid;

// ── TIPS ────────────────────────────────────────────
function renderTips(){
  const el = $('#tab-tips');
  let html = `<div class="tab-header"><h2>💡 Tips & Notes</h2><p>${(DATA.tips||[]).length} field-tested tips</p></div>`;
  const sections = {};
  (DATA.tips||[]).forEach(t => {
    const s = t.section || 'Other';
    if (!sections[s]) sections[s] = [];
    sections[s].push(t);
  });
  Object.entries(sections).forEach(([sec, list])=>{
    html += `<div class="section-card open"><div class="section-header" onclick="toggleOpen(this.parentElement)">${esc(sec)} <span class="shicon">▾</span></div><div class="section-body"><div class="section-inner" style="padding:0">`;
    list.forEach(t=>{
      html += `<div class="tip-card"><div class="tip-icon">${t.category?(t.category.charAt(0)==='💴'?'💴':'💡'):'💡'}</div><div class="tip-text"><strong>${esc(t.category||'')}</strong> · ${nl2br(t.tip||'')}</div></div>`;
    });
    html += `</div></div></div>`;
  });
  el.innerHTML = html;
}

// ── SAM'S WARD GUIDE ────────────────────────────────
function renderSams(){
  const el = $('#tab-sams');
  let html = `<div class="tab-header"><h2>📖 Sam's Ward Guide</h2><p>Local picks across Tokyo's wards</p></div>`;
  const sections = {};
  (DATA.wards||[]).forEach(w => {
    const s = w.area || w.city || 'Other';
    if (!sections[s]) sections[s] = [];
    sections[s].push(w);
  });
  Object.entries(sections).forEach(([area, list])=>{
    html += `<div class="ward-section open"><div class="ward-header" onclick="toggleOpen(this.parentElement)">${esc(area)} (${list.length}) <span class="shicon">▾</span></div><div class="ward-body">`;
    list.forEach(w => {
      html += `<div class="ward-item">${w.star?'<span class="wi-star">★</span>':'<span class="wi-star" style="opacity:0">·</span>'}<div class="wi-info"><div class="wi-name">${esc(w.name||'')}</div>${w.price?'<div class="wi-meta">'+esc(w.price)+'</div>':''}<div class="wi-desc">${nl2br(w.desc||'')}</div></div></div>`;
    });
    html += `</div></div>`;
  });
  el.innerHTML = html;
}

// ── ICN SKINCARE ───────────────────────────────────
function renderICN(){
  const el = $('#tab-icn');
  let html = `<div class="tab-header"><h2>🇰🇷 Incheon (ICN) Skincare Game Plan</h2><p>Day 19 · Maximize your transit shop time</p></div>`;
  // Render as a table from raw data (preserve original schema)
  const sections = {};
  (DATA.icn||[]).forEach(r => {
    const s = r.section || 'Plan';
    if (!sections[s]) sections[s] = [];
    sections[s].push(r);
  });
  Object.entries(sections).forEach(([sec, list]) => {
    html += `<div class="section-card open"><div.section-header" onclick="toggleOpen(this.parentElement)">${esc(sec)} <span class="shicon">▾</span></div><div class="section-body"><div class="section-inner">`;
    list.forEach(row => {
      if (Array.isArray(row.data)) {
        html += `<div class="tip-card"><div class="tip-icon">🛍️</div><div class="tip-text">${row.data.filter(Boolean).map(x=>nl2br(x)).join(' · ')}</div></div>`;
      } else {
        html += `<div class="tip-card"><div class="tip-icon">🛍️</div><div class="tip-text">${nl2br(JSON.stringify(row))}</div></div>`;
      }
    });
    html += `</div></div></div>`;
  });
  el.innerHTML = html;
}

// ── DINING ──────────────────────────────────────────
function renderDining(){
  const el = $('#tab-dining');
  let html = `<div class="tab-header"><h2>🍽️ Group Dining Guide</h2><p>${(DATA.dining||[]).length} restaurants vetted for groups of 7 with Brady (no egg) &amp; Cody/JJ (no seafood)</p></div>`;
  html += `<div class="search-wrap"><input type="search" placeholder="Search restaurants…" oninput="filterGrid('tab-dining', this.value)"></div>`;
  const sections = {};
  (DATA.dining||[]).forEach(d => {
    const s = d.section || 'Other';
    if (!sections[s]) sections[s] = [];
    sections[s].push(d);
  });
  Object.entries(sections).forEach(([sec, list])=>{
    html += `<div class="section-card open"><div class="section-header" onclick="toggleOpen(this.parentElement)">${esc(sec)} <span class="shicon">▾</span></div><div class="section-body"><div class="section-inner">`;
    list.forEach(d => {
      const isTop = (d.name||'').includes('⭐') || (d.name||'').includes('TOP') || (d.name||'').includes('BOOKED');
      html += `<div class="dining-card ${isTop?'top-pick':''} item-card" data-search="${esc((d.name||'')+' '+(d.details||''))}">
        <div class="dc-name">${esc(d.name||'')}</div>
        <div class="dc-type">${nl2br(d.type||'')}</div>
        <div class="dc-grid">
          ${d.price?'<div><div class="dc-label">Price/pp</div><div class="dc-val">'+nl2br(d.price)+'</div></div>':''}
          ${d.seats?'<div><div class="dc-label">Seats 7?</div><div class="dc-val">'+nl2br(d.seats)+'</div></div>':''}
          ${d.dietary?'<div style="grid-column:1/-1"><div class="dc-label">Dietary</div><div class="dc-val">'+nl2br(d.dietary)+'</div></div>':''}
          ${d.reservation?'<div style="grid-column:1/-1"><div class="dc-label">Reservation</div><div class="dc-val">'+nl2br(d.reservation)+'</div></div>':''}
        </div>
        ${d.details?'<div class="dc-desc">'+nl2br(d.details)+'</div>':''}
      </div>`;
    });
    html += `</div></div></div>`;
  });
  el.innerHTML = html;
}

// ── TRANSPORT ───────────────────────────────────────
function renderTransport(){
  const el = $('#tab-transport');
  let html = `<div class="tab-header"><h2>🚄 Transportation</h2><p>JR Pass analysis, IC cards, and route notes</p></div>`;
  const sections = {};
  (DATA.transport||[]).forEach(r => {
    const s = r.section || 'Notes';
    if (!sections[s]) sections[s] = [];
    sections[s].push(r);
  });
  Object.entries(sections).forEach(([sec, list])=>{
    html += `<div class="section-card open"><div class="section-header" onclick="toggleOpen(this.parentElement)">${esc(sec)} <span class="shicon">▾</span></div><div class="section-body"><div class="section-inner">`;
    // simple table from rows
    const rows = list.filter(r => Array.isArray(r.data) && r.data.some(c => c && String(c).trim()));
    if (rows.length) {
      html += `<table class="data-table"><tbody>`;
      rows.forEach(r => {
        html += '<tr>';
        r.data.forEach(c => { if (String(c||'').trim()) html += '<td>'+nl2br(String(c))+'</td>'; });
        html += '</tr>';
      });
      html += `</tbody></table>`;
    }
    html += `</div></div></div>`;
  });
  el.innerHTML = html;
}

// ── INIT ────────────────────────────────────────────
renderToday();
renderItinerary();
renderBookings();
renderGridTab('tab-food', DATA.food||[], '🍜 Food Guide', `${(DATA.food||[]).length} restaurants & food experiences across Japan`, true);
renderDining();
renderGridTab('tab-attractions', DATA.attractions||[], '🏯 Attractions', `${(DATA.attractions||[]).length} sights & experiences`, true);
renderGridTab('tab-shopping', DATA.shopping||[], '🛍️ Shopping', `${(DATA.shopping||[]).length} stores · vintage, electronics, kitchen, souvenirs`, false);
renderTransport();
renderPacking();
renderPhrasebook();
renderTips();
renderSams();
renderICN();

// ── On load, if user lands on Itinerary tab + we have a today card, gently scroll it into view
(function autoScrollOnLoad(){
  // Default tab is Today, but if hash = #itinerary-today, auto-scroll
  if (location.hash === '#itinerary-today'){
    switchTab('itinerary', {scrollToToday:true});
  }
})();

// ── Live re-render once a minute so countdowns/today update without reload
setInterval(()=>{ try { renderToday(); } catch(e){} }, 60000);
