// Verify the first two outliers (Takayama + Gyukatsu) and produce a
// final, validated coords + url file for all 4 outliers.
const { chromium } = require('playwright');
const fs = require('fs');

function haversine(a, b){
  const R=6371, p1=a[0]*Math.PI/180, p2=b[0]*Math.PI/180;
  const dp=(b[0]-a[0])*Math.PI/180, dl=(b[1]-a[1])*Math.PI/180;
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

const TARGETS = [
  {
    name: "Takayamashichiten Hanbaikasugaten",
    address: "1F, 16 Kasuganocho, Nara",
    city: "Nara",
    centroid: [34.685, 135.83],
    maxKm: 8,
    queries: [
      "高山サブレ春日店 16 Kasuganocho Nara",
      "Takayama Sablé Kasuga Nara",
      "高山七点 春日店 Nara",
      "Takayamashichiten 16 Kasuganocho Nara",
    ],
  },
  {
    name: "Gyukatsu Motomura",
    address: "3-18-10 Shinbashi, Minato, Tokyo",
    city: "Tokyo",
    centroid: [35.6655, 139.7575],   // Shinbashi
    maxKm: 5,
    queries: [
      "牛かつ もと村 新橋 3-18-10",
      "Gyukatsu Motomura Shinbashi 3-18-10",
      "牛かつもと村 新橋店",
    ],
  },
  {
    name: "Otachidokoro Sushi Ki",
    address: "5-9-19 Ginza, Chuo, Tokyo",
    city: "Tokyo",
    centroid: [35.6716, 139.7637],
    maxKm: 5,
    queries: [
      "Sushi Ki 5-9-19 Ginza Chuo Tokyo",
      "お立ち処鮨 㐂 5-9-19 銀座",
    ],
  },
  {
    name: "PIZZERIA MAMA",
    address: "11-1 Tawarahoncho, Atami, Shizuoka",
    city: "Atami",
    centroid: [35.0962, 139.0739],
    maxKm: 5,
    queries: [
      "PIZZERIA MAMA 熱海 Tawarahoncho",
      "Pizzeria Mama 11-1 Tawarahoncho Atami",
    ],
  },
];

async function tryQuery(page, q){
  const url = `https://www.google.com/maps/search/${encodeURIComponent(q)}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(
      () => /@\-?\d+\.\d+,\-?\d+\.\d+/.test(location.href),
      { timeout: 22000 }
    );
    const finalUrl = page.url();
    const m  = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const m2 = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (!m && !m2) return null;
    const [lat, lng] = (m2 || m).slice(1).map(parseFloat);
    return { lat, lng, finalUrl };
  } catch { return null; }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    locale: 'en-US',
  });
  await ctx.route('**/*', (route) => {
    const t = route.request().resourceType();
    if (['image','font','media','stylesheet'].includes(t)) return route.abort();
    return route.continue();
  });
  const page = await ctx.newPage();
  const results = [];
  for (const t of TARGETS) {
    console.log(`— ${t.name}`);
    let accepted = null;
    for (const q of t.queries) {
      const r = await tryQuery(page, q);
      if (!r) { console.log(`   "${q}" → no result`); continue; }
      const d = haversine(t.centroid, [r.lat, r.lng]);
      const ok = d <= t.maxKm;
      console.log(`   "${q}" → ${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}  (${d.toFixed(1)}km)  ${ok?'✓':'✗'}`);
      if (ok){ accepted = { ...r, query: q }; break; }
    }
    results.push(accepted ? { ...t, ...accepted } : { ...t, error: 'no valid result' });
    console.log();
  }
  fs.writeFileSync('/home/user/workspace/Japan-itinerary/outlier-coords-final.json', JSON.stringify(results, null, 2));
  await browser.close();
})();
