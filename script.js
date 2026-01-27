// Temperature
const convertBtn = document.getElementById('convertBtn');
if (convertBtn) {
  convertBtn.addEventListener('click', () => {
    const cEl = document.getElementById('celsius');
    const out = document.getElementById('convertResult');
    const c = cEl ? parseFloat(cEl.value) : NaN;
    if (out) {
      if (Number.isFinite(c)) {
        const f = c * 9/5 + 32;
        out.textContent = `${c} °C = ${f.toFixed(2)} °F`;
      } else {
        out.textContent = 'Please enter a Celsius value.';
      }
    }
  });
}

// Metric -> Standard conversions
function convertMetric(value, type) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  switch (type) {
    case 'm_to_ft': return { out: v * 3.28084, unit: 'ft' };
    case 'km_to_mi': return { out: v * 0.621371, unit: 'mi' };
    case 'cm_to_in': return { out: v * 0.393701, unit: 'in' };
    case 'kg_to_lb': return { out: v * 2.20462, unit: 'lb' };
    case 'g_to_oz': return { out: v * 0.035274, unit: 'oz' };
    case 'l_to_gal': return { out: v * 0.264172, unit: 'gal' };
    default: return null;
  }
}

const convertMetricBtn = document.getElementById('convertMetricBtn');
if (convertMetricBtn) {
  convertMetricBtn.addEventListener('click', () => {
    const valEl = document.getElementById('metricValue');
    const typeEl = document.getElementById('metricType');
    const out = document.getElementById('metricResult');
    const val = valEl ? parseFloat(valEl.value) : NaN;
    const type = typeEl ? typeEl.value : null;
    if (!out) return;
    if (!Number.isFinite(val)) { out.textContent = 'Enter a numeric value.'; return; }
    const res = convertMetric(val, type);
    if (!res) { out.textContent = 'Unknown conversion.'; return; }
    out.textContent = `${val} -> ${res.out.toFixed(4)} ${res.unit}`;
  });
}

// Show API config status in the UI (hidden when no key present)
const unsplashNoteEl = document.getElementById('unsplashNote');
if (unsplashNoteEl) {
  const key = window.UNSPLASH_ACCESS_KEY;
  if (!key || key.startsWith('REPLACE')) {
    // hide the note when no API key is provided
    unsplashNoteEl.style.display = 'none';
  } else {
    unsplashNoteEl.textContent = 'API key configured — showing only photos that include a named location.';
    unsplashNoteEl.style.display = 'block';
  }
}

// Load local curated places list (places.json) if present
let LOCAL_PLACES = [];
fetch('places.json').then(r => {
  if (!r.ok) throw new Error('no local places');
  return r.json();
}).then(data => {
  if (Array.isArray(data) && data.length) LOCAL_PLACES = data;
}).catch(() => {
  LOCAL_PLACES = [];
});

// Random Location Photo + Address
function randomLatLon() {
  // Worldwide random lat/lon
  const lat = (Math.random() * 180) - 90;
  const lon = (Math.random() * 360) - 180;
  return [lat, lon];
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Reverse geocode failed', err);
    return null;
  }
}

// Format a reverse-geocode result into a concise, human-readable label
function formatReverseGeocode(rev) {
  if (!rev) return null;
  const a = rev.address || {};
  const parts = [];
  if (a.city) parts.push(a.city);
  else if (a.town) parts.push(a.town);
  else if (a.village) parts.push(a.village);
  else if (a.hamlet) parts.push(a.hamlet);
  if (a.state) parts.push(a.state);
  if (a.country) parts.push(a.country);
  if (parts.length) return parts.join(', ');
  return rev.display_name || null;
}

function getPhotoLocationLabel(photo) {
  if (!photo || !photo.location) return null;
  const loc = photo.location;
  if (loc.title) return loc.title;
  if (loc.name) return loc.name;
  if (loc.city) return loc.city;
  if (loc.town) return loc.town;
  if (loc.region) return loc.region;
  if (loc.country) return loc.country;
  return null;
}

// Strip HTML tags from a string
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

// Look for a readable label in Commons extmetadata fields
function extractCommonsLabel(ext) {
  if (!ext) return null;
  const fields = ['ObjectName', 'ImageDescription', 'ImageDescriptionURL', 'Credit', 'Artist', 'Credit', 'UsageTerms', 'Caption', 'Headline', 'Location'];
  for (const f of fields) {
    if (ext[f] && ext[f].value) {
      const txt = stripHtml(ext[f].value);
      if (txt && txt.length > 3 && !/^[0-9\-.,\s]+$/.test(txt)) return txt.split(/[\.|\n]/)[0];
    }
  }
  return null;
}

// Fetch random files from Wikimedia Commons and return the first with a readable label
async function fetchRandomCommonsPhotoWithLocation(maxAttempts = 6) {
  const apiBase = 'https://commons.wikimedia.org/w/api.php';
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const url = `${apiBase}?action=query&generator=random&grnnamespace=6&grnlimit=5&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data || !data.query || !data.query.pages) continue;
      const pages = Object.values(data.query.pages);
      for (const p of pages) {
        if (p.imageinfo && p.imageinfo.length) {
          const info = p.imageinfo[0];
          const ext = info.extmetadata || {};
          const label = extractCommonsLabel(ext);
          if (label) {
            const imageUrl = info.url;
            const pageUrl = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.title.replace(/^File:/i, ''))}`;
            return { url: imageUrl, label, page: pageUrl };
          }
        }
      }
      // otherwise retry
    } catch (err) {
      console.error('Commons fetch error', err);
    }
  }
  return null;
}

// Search Wikimedia Commons for a given query and return an image with readable label
async function fetchCommonsImageForQuery(query, maxResults = 5) {
  try {
    const apiBase = 'https://commons.wikimedia.org/w/api.php';
    const url = `${apiBase}?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=${maxResults}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.query || !data.query.pages) return null;
    const pages = Object.values(data.query.pages);
    for (const p of pages) {
      if (p.imageinfo && p.imageinfo.length) {
        const info = p.imageinfo[0];
        const ext = info.extmetadata || {};
        const label = extractCommonsLabel(ext) || query;
        const imageUrl = info.url;
        const pageUrl = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.title.replace(/^File:/i, ''))}`;
        return { url: imageUrl, label, page: pageUrl };
      }
    }
  } catch (err) {
    console.error('fetchCommonsImageForQuery error', err);
  }
  return null;
}

async function fetchRandomUnsplashPhotoWithLocation(maxAttempts = 16) {
  // Only accept Unsplash photos that include an explicit location label
  const key = window.UNSPLASH_ACCESS_KEY;
  if (!key || key.startsWith('REPLACE')) return null;
  // Broader worldwide queries to surface varied locations
  const queries = ['landscape','cityscape','street','architecture','monument','landmark','harbor','beach','mountain','village','town','park','square','market','temple','church','mosque','ruins','scenic'];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const q = queries[Math.floor(Math.random() * queries.length)];
      const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(q)}&orientation=landscape`;
      const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
      if (!res.ok) {
        console.warn('Unsplash random failed', res.status);
        continue;
      }
      const photo = await res.json();
      if (!photo) continue;

      // Require an explicit metadata label from Unsplash (title/name/city/etc.)
      const metaLabel = getPhotoLocationLabel(photo);
      if (metaLabel) return { photo, label: metaLabel };

      // No metadata label — skip this photo and continue searching.
    } catch (err) {
      console.error('Error fetching Unsplash random photo', err);
    }
  }
  // No labelled photo found after retries
  return null;
}

async function showRandomLocation() {
  const loading = document.getElementById('randomLocLoading');
  const link = document.getElementById('randomLocLink');
  const img = document.getElementById('randomLocImg');
  const addr = document.getElementById('randomLocAddress');
  const attr = document.getElementById('randomLocAttr');

  loading.style.display = 'block';
  link.style.display = 'none';
  img.style.display = 'none';
  addr.textContent = '';
  attr.textContent = '';

  // If a local curated places list is available, use it (preferred)
  if (Array.isArray(LOCAL_PLACES) && LOCAL_PLACES.length > 0) {
    const entry = LOCAL_PLACES[Math.floor(Math.random() * LOCAL_PLACES.length)];
    try {
      if (entry.commonsQuery) {
        const c = await fetchCommonsImageForQuery(entry.commonsQuery);
        if (c) {
          img.onload = () => {
            loading.style.display = 'none';
            link.href = c.page;
            link.style.display = 'block';
            img.style.display = 'block';
          };
          img.onerror = (e) => { console.error('Local Commons image load error', e); loading.style.display = 'none'; };
          img.src = c.url;
          addr.textContent = entry.name || c.label || 'Location';
          attr.innerHTML = `Source: <a href="${c.page}" target="_blank">Wikimedia Commons</a>`;
          return;
        }
      }
      // Fallback to any direct url field if present
      if (entry.url) {
        img.onload = () => {
          loading.style.display = 'none';
          link.href = entry.url;
          link.style.display = 'block';
          img.style.display = 'block';
        };
        img.onerror = (e) => { console.error('Local image load error', e); loading.style.display = 'none'; };
        img.src = entry.url;
        addr.textContent = entry.name || 'Location';
        attr.innerHTML = `Source: Local list`;
        return;
      }
    } catch (err) {
      console.error('Error loading local place', err);
    }
  }

  const key = window.UNSPLASH_ACCESS_KEY;

  // If an API key is configured, prefer the provider that requires it.
  if (key && !key.startsWith('REPLACE')) {
    const photoResult = await fetchRandomUnsplashPhotoWithLocation();
    if (photoResult) {
      const { photo, label } = photoResult;
      img.onload = () => {
        loading.style.display = 'none';
        link.href = photo.links && photo.links.html ? photo.links.html : img.src;
        link.style.display = 'block';
        img.style.display = 'block';
      };
      img.onerror = (e) => { console.error('Image load error', e); loading.style.display = 'none'; };
      img.src = photo.urls && (photo.urls.regular || photo.urls.full || photo.urls.small);
      if (label) addr.textContent = `Location: ${label}`;
      if (photo.user) {
        const name = photo.user.name || photo.user.username;
        const profile = photo.user.links && photo.user.links.html ? photo.user.links.html : '#';
        attr.innerHTML = `Photo: <a href="${profile}" target="_blank">${name}</a> (Source)`;
      }
      return;
    }

    // No labelled photo found from the provider — show a message.
    loading.style.display = 'none';
    link.style.display = 'none';
    img.style.display = 'none';
    addr.textContent = 'No labelled photos found. Try again.';
    attr.textContent = '';
    return;
  }

  // No API key — try Wikimedia Commons (no key required)
  const commons = await fetchRandomCommonsPhotoWithLocation();
  if (commons) {
    img.onload = () => {
      loading.style.display = 'none';
      link.href = commons.page;
      link.style.display = 'block';
      img.style.display = 'block';
    };
    img.onerror = (e) => { console.error('Commons image load error', e); loading.style.display = 'none'; };
    img.src = commons.url;
    addr.textContent = `Location: ${commons.label}`;
    attr.innerHTML = `Source: <a href="${commons.page}" target="_blank">Wikimedia Commons</a>`;
    return;
  }

  // Commons returned nothing — show generic image but indicate location unavailable
  addr.textContent = 'Location unavailable (generic image)';
  attr.textContent = '';
  const picUrl = `https://picsum.photos/800/500?random=${Date.now()}`;
  img.onload = () => {
    loading.style.display = 'none';
    link.href = picUrl;
    link.style.display = 'block';
    img.style.display = 'block';
  };
  img.onerror = (e) => { console.error('Fallback image error', e); loading.style.display = 'none'; };
  img.src = picUrl;
}

const randomLocBtn = document.getElementById('randomLocBtn');
if (randomLocBtn) randomLocBtn.addEventListener('click', () => showRandomLocation());
const randomLocAgainBtn = document.getElementById('randomLocAgainBtn');
if (randomLocAgainBtn) randomLocAgainBtn.addEventListener('click', () => showRandomLocation());

// Ensure the convert header image is centered and has a robust fallback if the Bing short URL is blocked
(function setupConvertHeaderFallback(){
  const img = document.getElementById('convertHeaderImg');
  const statusEl = document.getElementById('convertHeaderImgStatus');
  if (!img) return;
  // If the header element is an inline SVG (embedded), skip external-image fallback logic
  if (img.tagName && img.tagName.toLowerCase && img.tagName.toLowerCase() !== 'img') {
    if (statusEl) statusEl.textContent = '';
    return;
  }
  // enforce centering in case styles are overridden
  img.style.marginLeft = 'auto';
  img.style.marginRight = 'auto';

  let attempts = 0;
  function tryFallback() {
    attempts += 1;
    console.warn('convertHeaderImg load attempt', attempts);
    if (statusEl) statusEl.textContent = `Attempt ${attempts}: trying alternative image...`;
    if (attempts === 1) {
      // try cache-busted original (sometimes helps bypass cached 403)
      img.src = 'https://source.unsplash.com/900x240/?four-seasons,season,weather&cb=' + Date.now();
      if (statusEl) statusEl.innerHTML = `Trying original image (<a href="https://source.unsplash.com/900x240/?four-seasons,season,weather" target="_blank">open</a>)`;
    } else if (attempts === 2) {
      // try a reliable unsplash source as fallback
      img.src = 'https://source.unsplash.com/900x240/?seasons,weather';
      img.alt = 'Seasons image';
      if (statusEl) statusEl.innerHTML = `Using fallback Unsplash image (<a href="https://source.unsplash.com/900x240/?seasons,weather" target="_blank">open</a>)`;
    } else {
      // final fallback: hide the image and show the inline SVG fallback
      const svg = document.getElementById('convertHeaderSvg');
      if (svg) {
        svg.style.display = 'block';
      }
      img.style.display = 'none';
      if (statusEl) statusEl.textContent = 'Header image unavailable — showing inline fallback';
    }
  }

  img.addEventListener('error', () => {
    tryFallback();
  });

  img.addEventListener('load', () => {
    if (img.naturalWidth && statusEl) {
      // Prefer to show the actual src link (original or fallback)
      const srcLink = img.src && img.src.includes('source.unsplash.com') ? img.src : 'https://source.unsplash.com/900x240/?four-seasons,season,weather';
      statusEl.innerHTML = `Loaded header image (<a href="${srcLink}" target="_blank">open</a>)`;
    }
    // hide inline svg fallback if present
    const svg = document.getElementById('convertHeaderSvg');
    if (svg) svg.style.display = 'none';
  });

  // If the image is already complete but has zero naturalWidth, trigger fallback
  if (img.complete && img.naturalWidth === 0) {
    if (statusEl) statusEl.textContent = 'Image failed to load — attempting fallback';
    tryFallback();
  }
})();

// Make the embedded SVG the primary header image (guaranteed available)
 (function useLocalHeader(){
  const img = document.getElementById('convertHeaderImg');
  const svg = document.getElementById('convertHeaderSvg');
  const statusEl = document.getElementById('convertHeaderImgStatus');
  if (!svg) return;
  if (img) img.style.display = 'none';
  svg.style.display = 'block';
  if (statusEl) statusEl.textContent = '';
})();
