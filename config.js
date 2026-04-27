// Google Maps API key — injected at deploy time by Netlify (see netlify.toml).
// For local preview, copy this file to config.local.js and set the key there,
// or run with ?gmapsKey=YOUR_KEY in the URL once.
window.GOOGLE_MAPS_API_KEY = "%GOOGLE_MAPS_API_KEY%";
// Fallback: allow ?gmapsKey=... query param to override during local dev
(function () {
  if (!window.GOOGLE_MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY.startsWith("%")) {
    var p = new URLSearchParams(location.search).get("gmapsKey");
    var stored = localStorage.getItem("japan2026_gmaps_key");
    if (p) {
      localStorage.setItem("japan2026_gmaps_key", p);
      window.GOOGLE_MAPS_API_KEY = p;
    } else if (stored) {
      window.GOOGLE_MAPS_API_KEY = stored;
    } else {
      window.GOOGLE_MAPS_API_KEY = "";
    }
  }
})();
