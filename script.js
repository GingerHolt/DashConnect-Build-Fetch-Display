// Sample Texas city data (coords, zip codes, police station contact)
const CITIES = {
  'Austin': { coords: [30.2672, -97.7431], zips: ['73301', '78701', '78702', '78703'], station: 'Austin Police Dept: (512) 974-5000' },
  'Houston': { coords: [29.7604, -95.3698], zips: ['77002', '77003', '77004'], station: 'Houston Police Dept: (713) 308-8900' },
  'Dallas': { coords: [32.7767, -96.7970], zips: ['75201', '75202', '75203'], station: 'Dallas Police Dept: (214) 671-3001' },
  'San Antonio': { coords: [29.4241, -98.4936], zips: ['78201', '78202', '78203'], station: 'San Antonio Police Dept: (210) 207-7277' }
};

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = v => v * Math.PI / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function findNearestCity(lat, lon) {
  let best = null, bestDist = Infinity;
  for (const [city, data] of Object.entries(CITIES)) {
    const [clat, clon] = data.coords;
    const d = haversine(lat, lon, clat, clon);
    if (d < bestDist) { best = city; bestDist = d; }
  }
  return best;
}

// Temperature
document.getElementById('convertBtn').addEventListener('click', () => {
  const c = parseFloat(document.getElementById('celsius').value);
  const out = document.getElementById('convertResult');
  if (Number.isFinite(c)) {
    const f = c * 9/5 + 32;
    out.textContent = `${c} °C = ${f.toFixed(2)} °F`;
  } else {
    out.textContent = 'Please enter a Celsius value.';
  }
});

// Postal by city
document.getElementById('postalCityBtn').addEventListener('click', () => {
  const city = (document.getElementById('cityPostal').value || '').trim();
  const out = document.getElementById('postalResult');
  if (!city) { out.textContent = 'Enter a city name.'; return; }
  const key = city[0].toUpperCase() + city.slice(1).toLowerCase();
  if (CITIES[key]) {
    out.textContent = `City: ${key}; ZIPs: ${CITIES[key].zips.join(', ')}`;
  } else {
    out.textContent = 'City not found in sample data.';
  }
});

// Postal by coords
document.getElementById('postalCoordBtn').addEventListener('click', () => {
  const lat = parseFloat(document.getElementById('latPostal').value);
  const lon = parseFloat(document.getElementById('lonPostal').value);
  const out = document.getElementById('postalResult');
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) { out.textContent = 'Enter latitude and longitude.'; return; }
  const city = findNearestCity(lat, lon);
  out.textContent = `City: ${city}; ZIPs: ${CITIES[city].zips.join(', ')}`;
});

// Police by city
document.getElementById('policeCityBtn').addEventListener('click', () => {
  const city = (document.getElementById('cityPolice').value || '').trim();
  const out = document.getElementById('policeResult');
  if (!city) { out.textContent = 'Enter a city name.'; return; }
  const key = city[0].toUpperCase() + city.slice(1).toLowerCase();
  if (CITIES[key]) {
    out.textContent = `City: ${key}; Station: ${CITIES[key].station}`;
  } else {
    out.textContent = 'City not found in sample data.';
  }
});

// Police by coords
document.getElementById('policeCoordBtn').addEventListener('click', () => {
  const lat = parseFloat(document.getElementById('latPolice').value);
  const lon = parseFloat(document.getElementById('lonPolice').value);
  const out = document.getElementById('policeResult');
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) { out.textContent = 'Enter latitude and longitude.'; return; }
  const city = findNearestCity(lat, lon);
  out.textContent = `City: ${city}; Station: ${CITIES[city].station}`;
});
