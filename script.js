// Celsius to Fahrenheit conversion
// Use the document.getElementById to get input and output elements
const convertBtn = document.getElementById('convertBtn');
//Use if to check if the button exists before adding event listener
if (convertBtn) {
  convertBtn.addEventListener('click', () => { // on click
    const cEl = document.getElementById('celsius'); // get input element
    const out = document.getElementById('convertResult'); // get output element
    const c = cEl ? parseFloat(cEl.value) : NaN; // interpret input value as float
    // if output element exists, perform conversion and display result
    if (out) {
      if (Number.isFinite(c)) {
        const f = c * 9/5 + 32;
        out.textContent = `${c} °C = ${f.toFixed(2)} °F`;
      } 
      // handle empty input
      else {
        out.textContent = 'Please enter a Celsius value.';
      }
    }
  });
} // END Celsius to Fahrenheit conversion

// Metric to Standard conversion function that returns 
// an object with output value and unit
function convertMetric(value, type) {
  const v = Number(value);
  // validate numeric input
  if (!Number.isFinite(v)) return null;
  // perform conversion based on type
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

// Metric to Standard conversion user interface, UI
// get elements and add event listener to button
const convertMetricBtn = document.getElementById('convertMetricBtn');
// check if button exists before adding event listener
if (convertMetricBtn) {
  convertMetricBtn.addEventListener('click', () => { // on click
    const valEl = document.getElementById('metricValue'); // input element
    const typeEl = document.getElementById('metricType'); // type dropdown
    const out = document.getElementById('metricResult'); // output element
    const val = valEl ? parseFloat(valEl.value) : NaN; // interpret input value
    const type = typeEl ? typeEl.value : null; // get selected type
    // validate output element
    if (!out) return; // nothing to do if no output element
    // validate numeric input
    if (!Number.isFinite(val)) { out.textContent = 'Enter a numeric value.'; return; } // invalid input
    // perform conversion
    const res = convertMetric(val, type); // get conversion result
    // display result or error
    if (!res) { out.textContent = 'Unknown conversion.'; return; }
    out.textContent = `${val} -> ${res.out.toFixed(4)} ${res.unit}`;
  });
} // END Metric to Standard conversion UI


// Load local curated places list (places.json) if present
let LOCAL_PLACES = []; // will hold local places if loaded
fetch('places.json').then(r => { // attempt to fetch local places file
  if (!r.ok) throw new Error('no local places'); // handle fetch error
  return r.json();  // interpret response as JSON
}).then(data => { // process JSON data
  if (Array.isArray(data) && data.length) LOCAL_PLACES = data; // store places if valid
}).catch(() => { // handle errors
  LOCAL_PLACES = [];  // reset to empty if error occurs
});

// function to strip HTML tags from a string to get plain text
function stripHtml(html) { // simple regex-based HTML tag removal
  if (!html) return ''; // handle empty input
  return html.replace(/<[^>]*>/g, '').trim(); // remove tags and trim whitespace
}

// Look for a readable label in Commons extmetadata fields
// function returns the first suitable label found or null
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

// Show a random location image and info in the UI
// use async function to wait for fetch calls
async function showRandomLocation() {
  // use getElementById to get user interface elements
  const loading = document.getElementById('randomLocLoading');
  const link = document.getElementById('randomLocLink');
  const img = document.getElementById('randomLocImg');
  const addr = document.getElementById('randomLocAddress');
  const attr = document.getElementById('randomLocAttr');

  loading.style.display = 'block';// show loading indicator
  link.style.display = 'none'; // hide link initially
  img.style.display = 'none'; // hide image initially
  addr.textContent = ''; // clear address text
  attr.textContent = ''; // clear attribution text

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

  // No API key — try Wikimedia Commons (no key required)
  // use await to wait for the fetch to complete
  const commons = await fetchRandomCommonsPhotoWithLocation();
  // If we got a Commons image with location, display it
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

// Set up event listeners for random location buttons
const randomLocBtn = document.getElementById('randomLocBtn');
if (randomLocBtn) randomLocBtn.addEventListener('click', () => showRandomLocation());
const randomLocAgainBtn = document.getElementById('randomLocAgainBtn');
if (randomLocAgainBtn) randomLocAgainBtn.addEventListener('click', () => showRandomLocation());
