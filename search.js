// ── Smart search across all itinerary data ──────────────────────────
// Builds a unified index from DATA.* collections and provides fuzzy
// token-based scoring. Exact substring matches rank highest, followed
// by token-prefix matches, then character-subsequence (typo-tolerant)
// matches. Clicking a result switches to the appropriate tab, scrolls
// to the matching DOM element (data-sid), and highlights it briefly.

(function(){
  'use strict';

  // Catalog of categories shown as filter chips. Each entry tells us:
  //   tab   = id of tab pane (without the "tab-" prefix)
  //   build = function returning array of {sid,title,desc,extras[]}
  // The "All" filter merges them.
  const CATEGORIES = [
    { id:'days',        label:'Days',         emoji:'🗾', tab:'itinerary',
      build: () => (DATA.days||[]).filter(d=>d.day && /^\d+$/.test(String(d.day))).map(d => ({
        sid:        'day-'+d.day,
        title:      'Day '+d.day+' · '+(String(d.city||'').split('\n')[0])+' — '+(d.date||''),
        desc:       [d.highlights, d.activities, d.notes, d.hotel, d.transport, d.food].filter(Boolean).join(' · '),
        searchText: [d.day, d.date, d.city, d.region, d.highlights, d.activities, d.notes, d.hotel, d.transport, d.food].filter(Boolean).join(' '),
        meta:       [d.region && String(d.region).replace(/[·]/g,' ').trim()].filter(Boolean),
      })),
    },
    { id:'bookings',    label:'Bookings',     emoji:'✅', tab:'bookings',
      build: () => (DATA.bookings||[]).map(b => ({
        sid:        'booking-'+b._sid,
        title:      b.title || '(booking)',
        desc:       b.details || '',
        searchText: [b.title, b.details, b.who, b.status, b.category, b.source, b.time, b.date].filter(Boolean).join(' '),
        meta:       [b.category, b.status, b.day?'Day '+b.day:'', b.time].filter(Boolean),
      })),
    },
    { id:'places',      label:'Places',       emoji:'📍', tab:'map',
      build: () => (DATA.savedPlaces||[]).map((p,i)=> ({
        sid:        'place-'+i,
        _placeIdx:  i,
        title:      p.name || '(place)',
        desc:       p.note || p.address || '',
        searchText: [p.name, p.address, p.note, p.city, p.category].filter(Boolean).join(' '),
        meta:       [p.category, p.city].filter(Boolean),
      })),
    },
    { id:'food',        label:'Food',         emoji:'🍜', tab:'food',
      build: () => (DATA.food||[]).map((f,i)=> ({
        sid:        'food-'+(f._sid || ('i'+i)),
        title:      f.name || '(food)',
        desc:       f.desc || '',
        searchText: [f.name, f.desc, f.city, f.type, f.section].filter(Boolean).join(' '),
        meta:       [f.section, f.city, f.type, f.price].filter(Boolean),
      })),
    },
    { id:'dining',      label:'Group Dining', emoji:'🍽️', tab:'dining',
      build: () => (DATA.dining||[]).map((d,i)=> ({
        sid:        'dining-'+(d._sid || ('d'+i)),
        title:      d.name || '(restaurant)',
        desc:       d.details || d.type || '',
        searchText: [d.name, d.type, d.details, d.dietary, d.reservation, d.price, d.section].filter(Boolean).join(' '),
        meta:       [d.section, d.type, d.price].filter(Boolean),
      })),
    },
    { id:'attractions', label:'Attractions',  emoji:'🏯', tab:'attractions',
      build: () => (DATA.attractions||[]).map((a,i)=> ({
        sid:        'attractions-'+(a._sid || ('i'+i)),
        title:      a.name || '(attraction)',
        desc:       a.desc || '',
        searchText: [a.name, a.desc, a.city, a.type, a.section].filter(Boolean).join(' '),
        meta:       [a.section, a.city, a.type, a.price].filter(Boolean),
      })),
    },
    { id:'shopping',    label:'Shopping',     emoji:'🛍️', tab:'shopping',
      build: () => (DATA.shopping||[]).map((s,i)=> ({
        sid:        'shopping-'+(s._sid || ('i'+i)),
        title:      s.name || '(shop)',
        desc:       s.desc || '',
        searchText: [s.name, s.desc, s.city, s.type, s.section].filter(Boolean).join(' '),
        meta:       [s.section, s.city, s.type, s.price].filter(Boolean),
      })),
    },
    { id:'transport',   label:'Transport',    emoji:'🚄', tab:'transport',
      build: () => (DATA.transport||[]).filter(r=>Array.isArray(r.data)&&r.data.some(x=>x&&String(x).trim())).map((r,i)=> ({
        sid:        'transport-t'+i,
        title:      String(r.data.find(c => c && String(c).trim()) || 'Transport note').trim(),
        desc:       r.data.filter(Boolean).slice(1).join(' · '),
        searchText: r.data.filter(Boolean).join(' ') + ' ' + (r.section||''),
        meta:       [r.section].filter(Boolean),
      })),
    },
    { id:'packing',     label:'Packing',      emoji:'🎒', tab:'packing',
      build: () => (DATA.packing||[]).map((p,i)=> ({
        sid:        'pack-'+i,
        title:      p.item || '(packing)',
        desc:       p.note || '',
        searchText: [p.item, p.note, p.category].filter(Boolean).join(' '),
        meta:       [p.category].filter(Boolean),
      })),
    },
    { id:'phrasebook',  label:'Phrasebook',   emoji:'🗣️', tab:'phrasebook',
      build: () => (DATA.phrasebook||[]).map((p,i)=> ({
        sid:        'phrase-'+(p._sid || ('p'+i)),
        title:      (p.en || '') + (p.ja ? ' · ' + p.ja : ''),
        desc:       p.note ? p.note : (p.romaji || ''),
        searchText: [p.en, p.ja, p.romaji, p.note, p.category].filter(Boolean).join(' '),
        meta:       [p.category, p.romaji].filter(Boolean),
      })),
    },
    { id:'tips',        label:'Tips',         emoji:'💡', tab:'tips',
      build: () => (DATA.tips||[]).map((t,i)=> ({
        sid:        'tip-'+(t._sid || ('tip'+i)),
        title:      (t.category || 'Tip'),
        desc:       t.tip || '',
        searchText: [t.category, t.tip, t.section].filter(Boolean).join(' '),
        meta:       [t.section].filter(Boolean),
      })),
    },
    { id:'sams',        label:"Sam's Guide",  emoji:'📖', tab:'sams',
      build: () => (DATA.wards||[]).map((w,i)=> ({
        sid:        'ward-'+(w._sid || ('w'+i)),
        title:      w.name || '(ward pick)',
        desc:       w.desc || '',
        searchText: [w.name, w.desc, w.area, w.city, w.price].filter(Boolean).join(' '),
        meta:       [w.area || w.city, w.price].filter(Boolean),
      })),
    },
  ];

  // Build the unified index. Re-run if data changes (rerenderActiveTab).
  let INDEX = [];
  function buildIndex(){
    INDEX = [];
    CATEGORIES.forEach(cat => {
      try {
        const rows = cat.build() || [];
        rows.forEach(r => {
          INDEX.push({
            catId:   cat.id,
            catLabel: cat.label,
            catEmoji: cat.emoji,
            tab:     cat.tab,
            sid:     r.sid,
            title:   String(r.title||'').trim(),
            desc:    String(r.desc||'').replace(/\s+/g,' ').trim(),
            meta:    (r.meta||[]).filter(Boolean),
            _placeIdx: r._placeIdx,
            _hayLower: String((r.searchText||'') + ' ' + (r.title||'') + ' ' + (r.desc||'')).toLowerCase(),
            _titleLower: String(r.title||'').toLowerCase(),
          });
        });
      } catch(e){ console.warn('search index', cat.id, e); }
    });
  }
  window._buildSearchIndex = buildIndex;

  // ── Scoring ────────────────────────────────────────────
  // Exact phrase match in title >> token-prefix in title >> exact in desc >>
  // token-prefix in desc >> subsequence (typo tolerance).
  function scoreEntry(entry, queryRaw){
    const q = queryRaw.toLowerCase().trim();
    if (!q) return 0;
    const title = entry._titleLower;
    const hay   = entry._hayLower;
    let score = 0;

    // Whole-phrase substring
    if (title.includes(q))      score += 1000 + (title.startsWith(q) ? 500 : 0);
    else if (hay.includes(q))   score += 400;

    // Per-token scoring
    const tokens = q.split(/\s+/).filter(Boolean);
    let tokenHits = 0;
    let allTokenSubseq = true;
    tokens.forEach(t => {
      const inTitle = title.includes(t);
      const inHay   = hay.includes(t);
      if (inTitle){ score += 120; tokenHits++; }
      else if (inHay){ score += 50; tokenHits++; }
      else {
        // typo-tolerant subsequence: each char of t appears in order in hay
        if (subsequence(t, hay)) score += 18;
        else allTokenSubseq = false;
      }
      // Word-boundary boost: token at start of a word in title
      if (inTitle && new RegExp('(?:^|\\b)'+escRe(t)).test(title)) score += 60;
    });

    // Penalize if no signal at all
    if (score === 0 && allTokenSubseq && tokens.length) score = 8;
    if (score === 0) return 0;

    // Length bias: prefer shorter titles when scores tie
    score -= Math.min(40, Math.floor(title.length / 8));

    return score;
  }
  function subsequence(needle, hay){
    let i = 0;
    for (let j = 0; j < hay.length && i < needle.length; j++){
      if (hay[j] === needle[i]) i++;
    }
    return i === needle.length;
  }
  function escRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // ── Rendering ──────────────────────────────────────────
  const $ = sel => document.querySelector(sel);
  let activeFilter = 'all';
  let kbdIdx = -1;

  function renderFilters(){
    const wrap = $('#searchFilters');
    if (!wrap) return;
    const html = ['<button class="search-chip'+(activeFilter==='all'?' active':'')+'" data-filter="all" type="button" role="tab">All</button>']
      .concat(CATEGORIES.map(c =>
        '<button class="search-chip'+(activeFilter===c.id?' active':'')+'" data-filter="'+c.id+'" type="button" role="tab"><span aria-hidden="true">'+c.emoji+'</span> '+c.label+'</button>'
      )).join('');
    wrap.innerHTML = html;
    wrap.querySelectorAll('.search-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        renderFilters();
        runSearch($('#searchInput').value);
      });
    });
  }

  function highlight(text, query){
    if (!text) return '';
    const safe = String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    if (!query.trim()) return safe;
    const tokens = query.toLowerCase().trim().split(/\s+/).filter(t=>t.length>=2);
    if (!tokens.length) return safe;
    const re = new RegExp('('+tokens.map(escRe).join('|')+')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }

  function renderResults(results, query){
    const list = $('#searchResults');
    if (!list) return;
    if (!query.trim()){
      list.innerHTML = '<div class="search-empty">Type to search across days, places, bookings, food, dining, attractions, shopping, transport, packing, phrases, tips and more.</div>';
      kbdIdx = -1;
      return;
    }
    if (!results.length){
      list.innerHTML = '<div class="search-empty">No matches for &ldquo;'+highlight(query, query).replace(/<\/?mark>/g,'')+'&rdquo;. Try a different word or category.</div>';
      kbdIdx = -1;
      return;
    }
    const html = results.slice(0, 50).map((r,i) => {
      const meta = (r.meta||[]).map(m => '<span>'+highlight(m, query)+'</span>').join('<span class="dot">·</span>');
      return (
        '<button class="search-result" type="button" data-idx="'+i+'" role="option">'
        + '<div class="search-result-row1">'
        +   '<div class="search-result-title">'+highlight(r.title, query)+'</div>'
        +   '<span class="search-cat-badge">'+r.catEmoji+' '+r.catLabel+'</span>'
        + '</div>'
        + (meta ? '<div class="search-result-meta">'+meta+'</div>' : '')
        + (r.desc ? '<div class="search-result-snippet">'+highlight(snippetAround(r.desc, query, 180), query)+'</div>' : '')
        + '</button>'
      );
    }).join('');
    list.innerHTML = html;
    list.querySelectorAll('.search-result').forEach((btn,i) => {
      btn.addEventListener('click', () => goToResult(results[i]));
    });
    kbdIdx = 0;
    updateKbdActive(list);
  }

  function snippetAround(text, query, maxLen){
    text = String(text||'').replace(/\s+/g,' ').trim();
    if (text.length <= maxLen) return text;
    const q = (query||'').toLowerCase().split(/\s+/).find(t => t.length >= 2 && text.toLowerCase().includes(t));
    if (!q) return text.slice(0, maxLen) + '…';
    const idx = text.toLowerCase().indexOf(q);
    const start = Math.max(0, idx - 40);
    const end   = Math.min(text.length, start + maxLen);
    return (start>0?'…':'') + text.slice(start, end) + (end<text.length?'…':'');
  }

  function updateKbdActive(list){
    const btns = list.querySelectorAll('.search-result');
    btns.forEach((b,i)=> b.classList.toggle('kbd-active', i===kbdIdx));
    const active = btns[kbdIdx];
    if (active) active.scrollIntoView({block:'nearest'});
  }

  function runSearch(query){
    const q = (query||'').trim();
    if (!q){ renderResults([], ''); return; }
    let pool = INDEX;
    if (activeFilter !== 'all') pool = INDEX.filter(e => e.catId === activeFilter);
    const scored = [];
    for (const e of pool){
      const s = scoreEntry(e, q);
      if (s > 0) scored.push({score:s, entry:e});
    }
    scored.sort((a,b) => b.score - a.score);
    renderResults(scored.map(x => x.entry), q);
  }

  // ── Result navigation: switch tab + scroll + highlight ────
  function goToResult(entry){
    closeModal();
    // Special case: Places live in the Map tab — open the place panel.
    if (entry.catId === 'places' && typeof entry._placeIdx === 'number'){
      window.switchTab && window.switchTab('map');
      // Wait for map to initialize, then open panel
      setTimeout(()=>{
        try { window.openPlacePanel && window.openPlacePanel(entry._placeIdx); } catch(e){}
      }, 350);
      return;
    }
    // Switch to the right tab
    window.switchTab && window.switchTab(entry.tab, {noScroll:true, scrollToToday:false});

    // Wait for layout, scroll target into view, highlight
    setTimeout(() => {
      const target = document.querySelector('#tab-'+entry.tab+' [data-sid="'+cssEscape(entry.sid)+'"]');
      if (target){
        // Ensure parent collapsibles are open
        const parentCard = target.closest('.day-card, .section-card, .ward-section');
        if (parentCard) parentCard.classList.add('open');
        // Day-card: also make sure it's expanded (toggleOpen toggles)
        if (target.classList.contains('day-card')) target.classList.add('open');

        // Scroll with offset for sticky topbar+tabs
        const topbar = document.querySelector('.topbar');
        const tabnav = document.querySelector('.tab-nav');
        const offset = (topbar?topbar.getBoundingClientRect().height:0) + (tabnav?tabnav.getBoundingClientRect().height:0) + 12;
        const rect = target.getBoundingClientRect();
        const y = window.scrollY + rect.top - offset;
        window.scrollTo({top: Math.max(0,y), behavior:'smooth'});

        applyHighlight(target);
      } else {
        // Fallback: just scroll the tab into view
        window.scrollTo({top:0, behavior:'smooth'});
      }
    }, 80);
  }

  function cssEscape(s){
    return String(s).replace(/[\\"]/g, '\\$&');
  }

  function applyHighlight(el){
    // Remove any prior highlight on the page so only one pulses at a time
    document.querySelectorAll('.search-target-highlight').forEach(n => n.classList.remove('search-target-highlight'));
    el.classList.add('search-target-highlight');
    // Remove on user-initiated scroll OR after the animation finishes
    const remove = () => {
      el.classList.remove('search-target-highlight');
      window.removeEventListener('wheel', onScroll, {passive:true});
      window.removeEventListener('touchmove', onScroll, {passive:true});
      window.removeEventListener('keydown', onKey, true);
      clearTimeout(timer);
    };
    const onScroll = () => remove();
    const onKey = (e) => { if (['ArrowUp','ArrowDown','PageUp','PageDown',' ','Home','End'].includes(e.key)) remove(); };
    // Wait a beat so the programmatic scroll doesn't immediately remove
    setTimeout(() => {
      window.addEventListener('wheel', onScroll, {passive:true});
      window.addEventListener('touchmove', onScroll, {passive:true});
      window.addEventListener('keydown', onKey, true);
    }, 700);
    const timer = setTimeout(remove, 6000);
  }

  // ── Modal open/close ──────────────────────────────────
  function openModal(){
    if (!INDEX.length) buildIndex();
    renderFilters();
    const bd = $('#searchBackdrop');
    bd.classList.add('open');
    const inp = $('#searchInput');
    if (inp){ setTimeout(()=> inp.focus(), 60); }
    document.documentElement.style.overflow = 'hidden';
  }
  function closeModal(){
    const bd = $('#searchBackdrop');
    bd.classList.remove('open');
    document.documentElement.style.overflow = '';
  }

  // ── Wire up ──────────────────────────────────────────
  function init(){
    const btn = $('#searchBtn');
    if (btn) btn.addEventListener('click', openModal);

    const bd = $('#searchBackdrop');
    if (bd){
      bd.addEventListener('click', (e) => { if (e.target === bd) closeModal(); });
    }

    const inp = $('#searchInput');
    const clear = $('#searchClear');
    if (inp){
      inp.addEventListener('input', () => {
        if (clear) clear.classList.toggle('show', inp.value.length > 0);
        runSearch(inp.value);
      });
      inp.addEventListener('keydown', (e) => {
        const list = $('#searchResults');
        const btns = list ? list.querySelectorAll('.search-result') : [];
        if (e.key === 'ArrowDown'){
          e.preventDefault();
          if (btns.length){ kbdIdx = Math.min(btns.length-1, kbdIdx+1); updateKbdActive(list); }
        } else if (e.key === 'ArrowUp'){
          e.preventDefault();
          if (btns.length){ kbdIdx = Math.max(0, kbdIdx-1); updateKbdActive(list); }
        } else if (e.key === 'Enter'){
          if (btns.length && btns[kbdIdx]){
            e.preventDefault();
            btns[kbdIdx].click();
          }
        } else if (e.key === 'Escape'){
          if (inp.value){ inp.value=''; clear && clear.classList.remove('show'); runSearch(''); }
          else closeModal();
        }
      });
    }
    if (clear){
      clear.addEventListener('click', () => {
        inp.value = '';
        clear.classList.remove('show');
        runSearch('');
        inp.focus();
      });
    }

    // Global Escape closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape'){
        const bd2 = $('#searchBackdrop');
        if (bd2 && bd2.classList.contains('open')) closeModal();
      }
      // ⌘/Ctrl+K opens search
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')){
        e.preventDefault();
        openModal();
      }
    });

    // Re-build index when collaborative data refreshes
    const orig = window.rerenderActiveTab;
    window.rerenderActiveTab = function(){
      try { orig && orig(); } catch(e){}
      try { buildIndex(); } catch(e){}
    };

    // First build
    buildIndex();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
