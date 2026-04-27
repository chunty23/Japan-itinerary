// Resolve real lat/lng for every saved place by loading its Google Maps URL
// and extracting coords from the final resolved URL.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA_JS = '/home/user/workspace/Japan-itinerary/data.js';
const CACHE   = '/home/user/workspace/Japan-itinerary/coord-cache.json';

function loadPlaces(){
  const txt = fs.readFileSync(DATA_JS, 'utf8');
  const m = txt.match(/DATA\.savedPlaces\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) throw new Error('savedPlaces not found');
  return JSON.parse(m[1]);
}

function saveCache(c){ fs.writeFileSync(CACHE, JSON.stringify(c, null, 2)); }

async function resolveOne(page, url){
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for the URL to include the /@lat,lng/ pattern Google rewrites to
    await page.waitForFunction(
      () => /@\-?\d+\.\d+,\-?\d+\.\d+/.test(location.href),
      { timeout: 25000 }
    );
    const finalUrl = page.url();
    const m = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const m2 = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const lat = parseFloat((m2 || m)[1]);
    const lng = parseFloat((m2 || m)[2]);
    return { lat, lng, finalUrl };
  } catch (e) {
    return { error: String(e).slice(0, 200) };
  }
}

(async () => {
  const places = loadPlaces();
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    locale: 'en-US',
  });
  // Block images/css/fonts to speed things up
  await ctx.route('**/*', (route) => {
    const t = route.request().resourceType();
    if (['image','font','media','stylesheet'].includes(t)) return route.abort();
    return route.continue();
  });

  let done = 0, failed = 0, cached = 0;
  const total = places.filter(p => p.url).length;
  // Limited concurrency
  const CONC = 5;
  const queue = places.map((p, i) => ({ p, i })).filter(x => x.p.url);

  async function worker(id){
    const page = await ctx.newPage();
    while (true){
      const next = queue.shift();
      if (!next) break;
      const { p, i } = next;
      const key = p.url;
      if (cache[key] && typeof cache[key].lat === 'number'){
        cached++; continue;
      }
      const res = await resolveOne(page, p.url);
      cache[key] = { ...res, name: p.name };
      if (res.error) failed++;
      done++;
      if (done % 10 === 0){
        saveCache(cache);
        console.log(`[w${id}] progress: ${done}/${queue.length + done} (cached=${cached}, failed=${failed})`);
      }
    }
    await page.close();
  }

  await Promise.all(Array.from({length: CONC}, (_, i) => worker(i+1)));
  saveCache(cache);
  console.log(`DONE. total=${total} done=${done} cached=${cached} failed=${failed}`);
  await browser.close();
})();
