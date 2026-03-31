// ─── HELPERS ───
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const nl2br = s => (s||'').replace(/\n/g,'<br>');
const nl2li = s => (s||'').split('\n').filter(l=>l.trim()).map(l=>'<li>'+esc(l)+'</li>').join('');

function toggleOpen(el) {
  el.classList.toggle('open');
}

// ─── TAB SWITCHING ───
$$('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.tab-btn').forEach(b => b.classList.remove('active'));
    $$('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    $('#tab-' + btn.dataset.tab).classList.add('active');
    window.scrollTo({top: 0, behavior: 'smooth'});
  });
});

// Scroll-to-top button
window.addEventListener('scroll', () => {
  $('#scrollTop').classList.toggle('visible', window.scrollY > 400);
});

// ─── ITINERARY TAB ───
function renderItinerary() {
  const el = $('#tab-itinerary');
  let html = `<div class="tab-header">
    <h2>🗾 Day-by-Day Itinerary</h2>
    <p>May 21 – June 8 · 19 Days · Tap any day to expand</p>
  </div>`;

  let lastRegion = '';
  DATA.days.forEach(d => {
    if (d.region && d.region !== lastRegion) {
      lastRegion = d.region;
      html += `<div class="region-divider"><span class="line"></span><span class="label">${esc(d.region)}</span><span class="line"></span></div>`;
    }
    const cityShort = (d.city||'').split('\n')[0];
    const highlightLines = (d.highlights||'').split('\n').filter(l=>l.trim());
    const teaser = highlightLines[0] || '';

    html += `<div class="day-card" onclick="toggleOpen(this)">
      <div class="day-card-header">
        <div class="day-num">${d.day}</div>
        <div class="day-info">
          <div class="date">${esc(d.date)}</div>
          <div class="city">${esc(cityShort)}</div>
          <div class="teaser">${esc(teaser)}</div>
        </div>
        <span class="expand-icon">▾</span>
      </div>
      <div class="day-card-body"><div class="day-details">`;

    if (d.hotel) {
      html += `<div class="detail-section"><div class="detail-label">🏨 Hotel</div><div class="detail-text">${nl2br(esc(d.hotel))}</div></div>`;
    }
    if (d.highlights) {
      html += `<div class="detail-section"><div class="detail-label">📋 Highlights & Agenda</div><div class="detail-text"><ul>${nl2li(d.highlights)}</ul></div></div>`;
    }
    if (d.activities) {
      html += `<div class="detail-section"><div class="detail-label">🎯 Activities & Sights</div><div class="detail-text"><ul>${nl2li(d.activities)}</ul></div></div>`;
    }
    if (d.notes) {
      html += `<div class="detail-section"><div class="detail-label">📝 Notes</div><div class="detail-text">${nl2br(esc(d.notes))}</div></div>`;
    }

    html += `</div></div></div>`;
  });
  el.innerHTML = html;
}

// ─── FOOD TAB ───
function renderFood() {
  const el = $('#tab-food');
  let html = `<div class="tab-header">
    <h2>🍜 Food Guide</h2>
    <p>${DATA.food.length} restaurants & food experiences across Japan</p>
  </div>`;

  const sections = {};
  DATA.food.forEach(f => {
    const s = f.section || 'Other';
    if (!sections[s]) sections[s] = [];
    sections[s].push(f);
  });

  Object.entries(sections).forEach(([sec, items]) => {
    html += `<div class="section-card open">
      <div class="section-header" onclick="toggleOpen(this.parentElement)">${esc(sec)} <span class="shicon">▾</span></div>
      <div class="section-body"><div class="section-inner"><div class="item-grid">`;
    items.forEach(f => {
      const mustTry = (f.booked||'').toLowerCase() === 'yes' ? ' must-try' : '';
      html += `<div class="item-card${mustTry}">
        <div class="ic-name">${esc(f.name)}</div>
        <div class="ic-badges">
          ${f.type ? '<span class="badge badge-type">'+esc(f.type)+'</span>' : ''}
          ${f.price ? '<span class="badge badge-price">'+esc(f.price)+'</span>' : ''}
          ${f.time ? '<span class="badge badge-type">'+esc(f.time)+'</span>' : ''}
          ${mustTry ? '<span class="badge badge-must">Booked</span>' : ''}
        </div>
        <div class="ic-desc">${nl2br(esc(f.desc))}</div>
      </div>`;
    });
    html += `</div></div></div></div>`;
  });
  el.innerHTML = html;
}

// ─── ATTRACTIONS TAB ───
function renderAttractions() {
  const el = $('#tab-attractions');
  let html = `<div class="tab-header">
    <h2>🏯 Attractions</h2>
    <p>${DATA.attractions.length} sights & experiences</p>
  </div>`;

  const sections = {};
  DATA.attractions.forEach(a => {
    const s = a.section || 'Other';
    if (!sections[s]) sections[s] = [];
    sections[s].push(a);
  });

  Object.entries(sections).forEach(([sec, items]) => {
    html += `<div class="section-card open">
      <div class="section-header" onclick="toggleOpen(this.parentElement)">${esc(sec)} <span class="shicon">▾</span></div>
      <div class="section-body"><div class="section-inner"><div class="item-grid">`;
    items.forEach(a => {
      const mustTry = (a.booked||'').toLowerCase() === 'yes' ? ' must-try' : '';
      html += `<div class="item-card${mustTry}">
        <div class="ic-name">${esc(a.name)}</div>
        <div class="ic-badges">
          ${a.type ? '<span class="badge badge-type">'+esc(a.type)+'</span>' : ''}
          ${a.price ? '<span class="badge badge-price">'+esc(a.price)+'</span>' : ''}
          ${a.time ? '<span class="badge badge-type">'+esc(a.time)+'</span>' : ''}
          ${mustTry ? '<span class="badge badge-must">Booked</span>' : ''}
        </div>
        <div class="ic-desc">${nl2br(esc(a.desc))}</div>
      </div>`;
    });
    html += `</div></div></div></div>`;
  });
  el.innerHTML = html;
}

// ─── SHOPPING TAB ───
function renderShopping() {
  const el = $('#tab-shopping');
  let html = `<div class="tab-header">
    <h2>🛍️ Shopping Guide</h2>
    <p>${DATA.shopping.length} stores & markets</p>
  </div>`;

  const sections = {};
  DATA.shopping.forEach(s => {
    const sec = s.section || 'Other';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(s);
  });

  Object.entries(sections).forEach(([sec, items]) => {
    html += `<div class="section-card open">
      <div class="section-header" onclick="toggleOpen(this.parentElement)">${esc(sec)} <span class="shicon">▾</span></div>
      <div class="section-body"><div class="section-inner"><div class="item-grid">`;
    items.forEach(s => {
      html += `<div class="item-card">
        <div class="ic-name">${esc(s.name)}</div>
        <div class="ic-sub">${esc(s.city)}</div>
        <div class="ic-badges">
          ${s.type ? '<span class="badge badge-type">'+esc(s.type)+'</span>' : ''}
        </div>
        <div class="ic-desc">${nl2br(esc(s.desc))}</div>
      </div>`;
    });
    html += `</div></div></div></div>`;
  });
  el.innerHTML = html;
}

// ─── TIPS TAB ───
function renderTips() {
  const el = $('#tab-tips');
  let html = `<div class="tab-header">
    <h2>💡 Practical Tips</h2>
    <p>${DATA.tips.length} essential tips for Japan</p>
  </div>`;

  const icons = {'Money':'💴','Transport':'🚆','Hotels':'🏨','Food':'🍽️','Etiquette':'🗺️','Tech':'📱','Seasonal':'🌸'};
  const sections = {};
  DATA.tips.forEach(t => {
    const s = t.section || 'Other';
    if (!sections[s]) sections[s] = [];
    sections[s].push(t);
  });

  Object.entries(sections).forEach(([sec, items]) => {
    html += `<div class="section-card open">
      <div class="section-header" onclick="toggleOpen(this.parentElement)">${esc(sec)} <span class="shicon">▾</span></div>
      <div class="section-body"><div class="section-inner">`;
    items.forEach(t => {
      const icon = icons[t.category] || '💡';
      html += `<div class="tip-card">
        <span class="tip-icon">${icon}</span>
        <div class="tip-text">${nl2br(esc(t.tip))}</div>
      </div>`;
    });
    html += `</div></div></div>`;
  });
  el.innerHTML = html;
}

// ─── SAM'S WARD GUIDE ───
function renderSams() {
  const el = $('#tab-sams');
  let html = `<div class="tab-header">
    <h2>📖 Sam's Ward-by-Ward Guide</h2>
    <p>Tokyo · Kyoto · Osaka — ${DATA.wards.length} places</p>
  </div>`;

  // Group by city then area
  const cities = {};
  DATA.wards.forEach(w => {
    const c = w.city || 'Other';
    if (!cities[c]) cities[c] = {};
    const a = w.area || w.ward;
    if (!cities[c][a]) cities[c][a] = [];
    cities[c][a].push(w);
  });

  Object.entries(cities).forEach(([city, areas]) => {
    html += `<div class="section-card open">
      <div class="section-header" onclick="toggleOpen(this.parentElement)">${esc(city)} <span class="shicon">▾</span></div>
      <div class="section-body"><div class="section-inner">`;

    Object.entries(areas).forEach(([area, items]) => {
      html += `<div class="ward-section open">
        <div class="ward-header" onclick="event.stopPropagation();toggleOpen(this.parentElement)">
          <span>› ${esc(area)}</span><span class="shicon" style="font-size:.8rem">▾</span>
        </div>
        <div class="ward-body">`;
      items.forEach(w => {
        html += `<div class="ward-item">
          <span class="wi-star">${w.star ? '★' : '○'}</span>
          <div class="wi-info">
            <div class="wi-name">${esc(w.name)}</div>
            <div class="wi-meta">${w.price ? esc(w.price) : ''}</div>
            <div class="wi-desc">${nl2br(esc(w.desc))}</div>
          </div>
        </div>`;
      });
      html += `</div></div>`;
    });
    html += `</div></div></div>`;
  });
  el.innerHTML = html;
}

// ─── ICN SKINCARE ───
function renderICN() {
  const el = $('#tab-icn');
  let html = `<div class="tab-header">
    <h2>🇰🇷 Incheon Airport K-Beauty Guide</h2>
    <p>Terminal 1 · 8-hour layover · Airside & Landside</p>
  </div>`;

  // Parse ICN data into sections
  const sectionMap = {};
  DATA.icn.forEach(item => {
    const s = item.section || 'Info';
    if (!sectionMap[s]) sectionMap[s] = [];
    sectionMap[s].push(item.data);
  });

  Object.entries(sectionMap).forEach(([sec, rows]) => {
    if (!sec || sec === 'Info') return;
    html += `<div class="section-card open">
      <div class="section-header" onclick="toggleOpen(this.parentElement)">${esc(sec)} <span class="shicon">▾</span></div>
      <div class="section-body"><div class="section-inner">`;

    // Detect if this looks like a table (has headers)
    const isTimeline = sec.includes('TIMELINE') || sec.includes('🕐');
    const isTable = rows.length > 1 && rows[0].filter(c => c).length >= 3;

    if (isTimeline) {
      html += '<div class="timeline">';
      rows.forEach(r => {
        if (!r[0] || r[0] === 'Time') return;
        html += `<div class="tl-item">
          <div class="tl-time">${esc(r[0])}</div>
          <div class="tl-title">${esc(r[1] || '')}</div>
          <div class="tl-desc">${nl2br(esc((r[3]||'') + (r[4] ? ' — ' + r[4] : '')))}</div>
        </div>`;
      });
      html += '</div>';
    } else if (isTable) {
      html += '<div style="overflow-x:auto"><table class="data-table"><thead><tr>';
      // Use first row as header
      const headerRow = rows[0];
      headerRow.forEach(h => {
        if (h) html += `<th>${esc(h)}</th>`;
      });
      html += '</tr></thead><tbody>';
      rows.slice(1).forEach(r => {
        if (!r[0]) return;
        html += '<tr>';
        r.forEach((c, i) => {
          if (i < headerRow.filter(h=>h).length) {
            html += `<td>${nl2br(esc(c))}</td>`;
          }
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    } else {
      // Render as cards
      rows.forEach(r => {
        if (!r[0]) return;
        html += `<div class="tip-card">
          <div class="tip-text"><strong>${esc(r[0])}</strong>${r[1] ? '<br>' + nl2br(esc(r[1])) : ''}${r[2] ? '<br>' + nl2br(esc(r[2])) : ''}</div>
        </div>`;
      });
    }
    html += `</div></div></div>`;
  });
  el.innerHTML = html;
}

// ─── DINING TAB ───
function renderDining() {
  const el = $('#tab-dining');
  let html = `<div class="tab-header">
    <h2>🍽️ Group Dining Guide</h2>
    <p>Brady: no egg · Cody & JJ: no seafood/shellfish · ${DATA.dining.length} restaurants</p>
  </div>`;

  // Dietary info banner
  html += `<div class="section-card open" style="border-left:4px solid #f59e0b">
    <div class="section-header" onclick="toggleOpen(this.parentElement)">⚠️ Dietary Notes & Allergy Cards <span class="shicon">▾</span></div>
    <div class="section-body"><div class="section-inner">
      <div class="tip-card"><div class="tip-text">
        <strong>YAKINIKU</strong> is your group's ideal format — pure beef/meat focus, no seafood, no eggs, private rooms for 7, fits budget perfectly across every city.
      </div></div>
      <div class="tip-card"><div class="tip-text">
        <strong>Hidden egg risk:</strong> tonkatsu breading, ramen tare, tamagoyaki, tsukune meatballs. Always tell restaurants:<br>
        Brady: 「卵アレルギーです」(Tamago arerugii desu)<br>
        Cody/JJ: 「魚介類アレルギーです」(Gyokairui arerugii desu)
      </div></div>
    </div></div></div>`;

  // Group by section
  const sections = {};
  DATA.dining.forEach(d => {
    const s = d.section || 'Other';
    if (!sections[s]) sections[s] = [];
    sections[s].push(d);
  });

  Object.entries(sections).forEach(([sec, items]) => {
    html += `<div class="section-card open">
      <div class="section-header" onclick="toggleOpen(this.parentElement)">${esc(sec)} <span class="shicon">▾</span></div>
      <div class="section-body"><div class="section-inner">`;
    items.forEach(d => {
      const isTop = d.name.includes('TOP') || d.name.includes('PICK') || d.name.includes('#1');
      html += `<div class="dining-card${isTop ? ' top-pick' : ''}">
        <div class="dc-name">${nl2br(esc(d.name))}</div>
        <div class="dc-type">${nl2br(esc(d.type))}</div>
        <div class="dc-grid">
          <div><div class="dc-label">Price/pp</div><div class="dc-val">${nl2br(esc(d.price))}</div></div>
          <div><div class="dc-label">Seats 7?</div><div class="dc-val">${nl2br(esc(d.seats))}</div></div>
          <div><div class="dc-label">Dietary</div><div class="dc-val">${nl2br(esc(d.dietary))}</div></div>
          <div><div class="dc-label">Reservation</div><div class="dc-val">${nl2br(esc(d.reservation))}</div></div>
        </div>
        <div class="dc-desc">${nl2br(esc(d.details))}</div>
      </div>`;
    });
    html += `</div></div></div>`;
  });

  // Booking platforms
  if (DATA.bookingPlatforms && DATA.bookingPlatforms.length) {
    html += `<div class="section-card">
      <div class="section-header" onclick="toggleOpen(this.parentElement)">📱 How to Book: English Reservation Platforms <span class="shicon">▾</span></div>
      <div class="section-body"><div class="section-inner">
        <div style="overflow-x:auto"><table class="data-table">
          <thead><tr><th>Platform</th><th>Fee</th><th>Best For</th><th>Notes</th><th>Priority</th></tr></thead>
          <tbody>`;
    DATA.bookingPlatforms.forEach(p => {
      html += `<tr>
        <td><strong>${esc(p.platform)}</strong><br><span style="font-size:.7rem;color:#666">${esc(p.url)}</span></td>
        <td>${esc(p.fee)}</td>
        <td>${nl2br(esc(p.bestFor))}</td>
        <td>${esc(p.notes)}</td>
        <td>${esc(p.priority)}</td>
      </tr>`;
    });
    html += `</tbody></table></div></div></div></div>`;
  }

  el.innerHTML = html;
}

// ─── TRANSPORT TAB ───
function renderTransport() {
  const el = $('#tab-transport');
  let html = `<div class="tab-header">
    <h2>🚄 Transportation Guide</h2>
    <p>Shinkansen · City Transit · Passes & Cards</p>
  </div>`;

  // Key finding banner
  html += `<div class="section-card open" style="border-left:4px solid #16a34a">
    <div class="section-header" onclick="toggleOpen(this.parentElement)">⭐ Key Finding <span class="shicon">▾</span></div>
    <div class="section-body"><div class="section-inner">
      <div class="tip-card"><div class="tip-text">
        <strong>Skip the JR Pass</strong> — individual SmartEX tickets save the group ~¥245,000 (~$1,630 USD) vs. the post-2023 price-increased 14-day pass.<br>
        Use <strong>SmartEX app</strong> for all Shinkansen + <strong>Hakone Free Pass</strong> for Hakone + <strong>Suica IC cards</strong> for city transit.
      </div></div>
    </div></div></div>`;

  // Group transport data by section
  const sectionMap = {};
  DATA.transport.forEach(item => {
    const s = item.section || 'Info';
    if (!sectionMap[s]) sectionMap[s] = [];
    sectionMap[s].push(item.data);
  });

  Object.entries(sectionMap).forEach(([sec, rows]) => {
    if (!sec || sec === 'Info') return;
    // Skip the key finding text section
    if (sec.includes('KEY FINDING')) return;

    html += `<div class="section-card">
      <div class="section-header" onclick="toggleOpen(this.parentElement)">${esc(sec)} <span class="shicon">▾</span></div>
      <div class="section-body"><div class="section-inner">`;

    // Check if rows form a table (first row has multiple filled cols)
    const firstDataRow = rows.find(r => r && r.filter(c => c).length >= 2);
    if (!firstDataRow) {
      // Render as text blocks
      rows.forEach(r => {
        if (!r[0]) return;
        html += `<div class="tip-card"><div class="tip-text">${nl2br(esc(r[0]))}</div></div>`;
      });
    } else {
      // Check if first row is a header
      const numCols = firstDataRow.filter(c => c).length;
      const isHeader = rows.length > 1 && (
        firstDataRow[0] === 'Option' || firstDataRow[0] === 'Route' ||
        firstDataRow[0] === 'Journey' || firstDataRow[0] === 'From Asakusa to...' ||
        firstDataRow[0] === 'Destination' || firstDataRow[0] === 'Item' ||
        firstDataRow[0] === 'Forward #'
      );

      if (isHeader) {
        html += '<div style="overflow-x:auto"><table class="data-table"><thead><tr>';
        const colCount = firstDataRow.filter(c => c).length;
        firstDataRow.forEach(h => {
          if (h) html += `<th>${nl2br(esc(h))}</th>`;
        });
        html += '</tr></thead><tbody>';
        rows.slice(1).forEach(r => {
          if (!r[0]) return;
          const isHighlight = (r[0]||'').includes('RECOMMENDED') || (r[0]||'').includes('TOTAL') || (r[0]||'').includes('ESSENTIAL');
          html += `<tr${isHighlight ? ' class="highlight-row"' : ''}>`;
          let shown = 0;
          r.forEach(c => {
            if (shown < colCount && c) {
              html += `<td>${nl2br(esc(c))}</td>`;
              shown++;
            } else if (shown < colCount) {
              shown++;
            }
          });
          // Pad missing cols
          while (shown < colCount) { html += '<td></td>'; shown++; }
          html += '</tr>';
        });
        html += '</tbody></table></div>';
      } else {
        // Render as cards
        rows.forEach(r => {
          if (!r[0]) return;
          html += `<div class="tip-card"><div class="tip-text">`;
          html += `<strong>${esc(r[0])}</strong>`;
          r.slice(1).forEach(c => {
            if (c) html += `<br>${nl2br(esc(c))}`;
          });
          html += `</div></div>`;
        });
      }
    }
    html += `</div></div></div>`;
  });
  el.innerHTML = html;
}

// ─── RENDER ALL ───
renderItinerary();
renderFood();
renderAttractions();
renderShopping();
renderTips();
renderSams();
renderICN();
renderDining();
renderTransport();
