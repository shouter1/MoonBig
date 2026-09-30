const objects = [
  { name: "Mars", type: "Planet", ra: 7.4, dec: 23.2, notable: true, wiki: "https://en.wikipedia.org/wiki/Mars" },
  { name: "Jupiter", type: "Planet", ra: 4.9, dec: 21.8, notable: true, wiki: "https://en.wikipedia.org/wiki/Jupiter" },
  { name: "Saturn", type: "Planet", ra: 23.1, dec: -8.5, notable: true, wiki: "https://en.wikipedia.org/wiki/Saturn" },
  { name: "Venus", type: "Planet", ra: 10.5, dec: 8.7, notable: true, wiki: "https://en.wikipedia.org/wiki/Venus" },
  { name: "Moon", type: "Moon", ra: 12.0, dec: -2.8, notable: true, wiki: "https://en.wikipedia.org/wiki/Moon" },
  { name: "Titan", type: "Moon", ra: 23.2, dec: -8.6, notable: true, wiki: "https://en.wikipedia.org/wiki/Titan_(moon)" },
  { name: "Europa", type: "Moon", ra: 4.8, dec: 21.7, notable: true, wiki: "https://en.wikipedia.org/wiki/Europa_(moon)" },
  { name: "Orion", type: "Constellation", ra: 5.6, dec: 5.5, notable: true, wiki: "https://en.wikipedia.org/wiki/Orion_(constellation)" },
  { name: "Cassiopeia", type: "Constellation", ra: 1.0, dec: 60.0, notable: true, wiki: "https://en.wikipedia.org/wiki/Cassiopeia_(constellation)" },
  { name: "Ursa Major", type: "Constellation", ra: 11.1, dec: 55.0, notable: true, wiki: "https://en.wikipedia.org/wiki/Ursa_Major" },
  { name: "Scorpius", type: "Constellation", ra: 16.9, dec: -30.0, notable: true, wiki: "https://en.wikipedia.org/wiki/Scorpius" },
  { name: "Andromeda Galaxy", type: "Galaxy", ra: 0.7, dec: 41.3, notable: true, wiki: "https://en.wikipedia.org/wiki/Andromeda_Galaxy" },
  { name: "Orion Nebula", type: "Nebula", ra: 5.6, dec: -5.5, notable: true, wiki: "https://en.wikipedia.org/wiki/Orion_Nebula" },
  { name: "Pleiades", type: "Cluster", ra: 3.8, dec: 24.1, notable: true, wiki: "https://en.wikipedia.org/wiki/Pleiades" }
];

const citySamples = [
  { lat: 40.7128, lon: -74.006, bortle: 9 },
  { lat: 34.0522, lon: -118.2437, bortle: 9 },
  { lat: 51.5072, lon: -0.1276, bortle: 9 },
  { lat: 35.6762, lon: 139.6503, bortle: 9 },
  { lat: -33.8688, lon: 151.2093, bortle: 8 },
  { lat: 48.8566, lon: 2.3522, bortle: 8 }
];

const state = {
  lat: null,
  lon: null,
  search: "",
  showAll: true,
  showWiki: true,
  lookAround: false,
  heading: 0,
  selected: null,
  cloudCover: null,
  locating: false,
  tab: "sky"
};

const els = {
  searchInput: document.getElementById("searchInput"),
  locateBtn: document.getElementById("locateBtn"),
  showAllToggle: document.getElementById("showAllToggle"),
  showWikiToggle: document.getElementById("showWikiToggle"),
  lookAroundToggle: document.getElementById("lookAroundToggle"),
  lookControls: document.getElementById("lookControls"),
  headingRange: document.getElementById("headingRange"),
  headingLabel: document.getElementById("headingLabel"),
  locationText: document.getElementById("locationText"),
  cloudText: document.getElementById("cloudText"),
  bortleText: document.getElementById("bortleText"),
  results: document.getElementById("results"),
  canvas: document.getElementById("skyCanvas"),
  selectedDetails: document.getElementById("selectedDetails"),
  tabs: document.querySelectorAll(".tab"),
  skyTab: document.getElementById("skyTab"),
  detailsTab: document.getElementById("detailsTab")
};

const ctx = els.canvas.getContext("2d");

function toRad(d) { return (d * Math.PI) / 180; }
function toDeg(r) { return (r * 180) / Math.PI; }
function normalizeDeg(v) { return ((v % 360) + 360) % 360; }

function compassLabel(deg) {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  return points[Math.round(normalizeDeg(deg) / 45)];
}

function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function siderealTime(date, lonDeg) {
  const jd = julianDate(date);
  const t = (jd - 2451545.0) / 36525.0;
  let gst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * t * t -
    (t * t * t) / 38710000;
  gst = normalizeDeg(gst);
  return normalizeDeg(gst + lonDeg);
}

function radecToHorizontal(raHours, decDeg, latDeg, lonDeg, date) {
  const lst = siderealTime(date, lonDeg) / 15;
  const hourAngleDeg = normalizeDeg((lst - raHours) * 15);

  const ha = toRad(hourAngleDeg);
  const dec = toRad(decDeg);
  const lat = toRad(latDeg);

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const altitude = toDeg(Math.asin(Math.min(1, Math.max(-1, sinAlt))));

  const y = -Math.sin(ha);
  const x = Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(ha);
  const azimuth = normalizeDeg(toDeg(Math.atan2(y, x)));

  return { altitude, azimuth };
}

function objectPosition(obj) {
  if (state.lat == null || state.lon == null) {
    const approximateAltitude = Math.max(0, Math.min(90, (obj.dec + 90) / 2));
    return {
      altitude: approximateAltitude,
      azimuth: normalizeDeg((obj.ra / 24) * 360),
      visible: true,
      approximate: true
    };
  }
  const { altitude, azimuth } = radecToHorizontal(obj.ra, obj.dec, state.lat, state.lon, new Date());
  return { altitude, azimuth, visible: altitude >= 0, approximate: false };
}

function getBortleEstimate(lat, lon) {
  let nearest = Infinity;
  let cityBortle = 4;

  citySamples.forEach((city) => {
    const dLat = toRad(city.lat - lat);
    const dLon = toRad(city.lon - lon);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(city.lat)) * Math.sin(dLon / 2) ** 2;
    const distanceKm = 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

    if (distanceKm < nearest) {
      nearest = distanceKm;
      cityBortle = city.bortle;
    }
  });

  if (nearest < 30) return Math.max(cityBortle, 8);
  if (nearest < 120) return Math.max(cityBortle - 1, 7);
  if (nearest < 300) return 6;
  if (nearest < 700) return 5;
  return 3;
}

async function loadCloudCover(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloud_cover`;
    const response = await fetch(url);
    const data = await response.json();
    state.cloudCover = data?.current?.cloud_cover;
  } catch {
    state.cloudCover = null;
  }
  renderStatus();
}

function renderStatus() {
  if (state.locating) {
    els.locationText.textContent = "Getting your location…";
    return;
  }

  if (state.lat == null || state.lon == null) {
    els.locationText.textContent = "Location not set (showing approximate sky preview).";
    els.cloudText.textContent = "Cloud coverage: --";
    els.bortleText.textContent = "Estimated Bortle: --";
    return;
  }

  els.locationText.textContent = `${state.lat.toFixed(4)}, ${state.lon.toFixed(4)}`;
  const cloud = state.cloudCover == null ? "Unavailable" : `${state.cloudCover}%`;
  els.cloudText.textContent = `Cloud coverage: ${cloud}`;
  els.bortleText.textContent = `Estimated Bortle: ${getBortleEstimate(state.lat, state.lon)}`;
}

function getVisibleObjects() {
  let filtered = objects;
  const query = state.search.trim().toLowerCase();

  if (!state.showAll) {
    filtered = query ? objects.filter((obj) => obj.name.toLowerCase().includes(query)) : [];
  }

  if (state.showAll && query) {
    filtered = objects.filter((obj) => obj.name.toLowerCase().includes(query));
  }

  const withPositions = filtered.map((obj) => ({ ...obj, ...objectPosition(obj) }));

  if (state.lookAround) {
    const min = normalizeDeg(state.heading - 45);
    const max = normalizeDeg(state.heading + 45);
    return withPositions.filter((obj) => {
      if (obj.azimuth == null) return true;
      if (min <= max) return obj.azimuth >= min && obj.azimuth <= max;
      return obj.azimuth >= min || obj.azimuth <= max;
    });
  }

  return withPositions;
}

function visibilityClass(altitude) {
  if (altitude == null || altitude < 0) return "bad";
  if (altitude < 10) return "warn";
  return "good";
}

function formatVisibility(altitude) {
  if (altitude == null) return "Set your location";
  if (altitude < 0) return "Below horizon";
  if (altitude < 10) return "Barely above horizon";
  return "Visible";
}

function renderResults() {
  const objectsToRender = getVisibleObjects();
  els.results.innerHTML = "";

  if (!objectsToRender.length) {
    els.results.innerHTML = "<p class='hint'>Type to search, or enable “Show all sky objects”.</p>";
    renderDetails(null);
    drawSkyGraph([]);
    return;
  }

  objectsToRender.forEach((obj) => {
    const row = document.createElement("article");
    row.className = "result";
    const visibility = formatVisibility(obj.altitude);
    const badgeClass = visibilityClass(obj.altitude);

    row.innerHTML = `
      <div>
        <h3>${obj.name}</h3>
        <p>${obj.type}${obj.altitude == null ? "" : ` • ${obj.altitude.toFixed(1)}° • ${compassLabel(obj.azimuth)} (${obj.azimuth.toFixed(0)}°)`}${obj.approximate ? " • Approximate preview" : ""}</p>
        <span class="badge ${badgeClass}">${visibility}</span>
        ${state.showWiki && obj.notable ? `<p><a href="${obj.wiki}" target="_blank" rel="noreferrer">Wikipedia</a></p>` : ""}
      </div>
      <button type="button">Direction & angle</button>
    `;

    row.querySelector("button").addEventListener("click", () => {
      state.selected = obj.name;
      state.tab = "details";
      activateTab("details");
      renderDetails(obj);
    });

    els.results.appendChild(row);
  });

  const selected = objectsToRender.find((obj) => obj.name === state.selected) || objectsToRender[0];
  state.selected = selected.name;
  renderDetails(selected);
  drawSkyGraph(objectsToRender);
}

function renderDetails(obj) {
  if (!obj) {
    els.selectedDetails.textContent = "Select an object to view direction and angle.";
    return;
  }

  if (obj.altitude == null || obj.azimuth == null) {
    els.selectedDetails.innerHTML = `<strong>${obj.name}</strong><p>Set your location to calculate direction and angle.</p>`;
    return;
  }

  const visibility = formatVisibility(obj.altitude);
  els.selectedDetails.innerHTML = `
    <strong>${obj.name}</strong>
    <p>Direction: ${compassLabel(obj.azimuth)} (${obj.azimuth.toFixed(1)}° azimuth)</p>
    <p>Angle: ${obj.altitude.toFixed(1)}° altitude (0° horizon, 90° overhead)</p>
    <p>Visibility: ${visibility}</p>
    ${obj.approximate ? "<p>Using approximate position until your location is available.</p>" : ""}
    ${state.showWiki && obj.notable ? `<p><a href="${obj.wiki}" target="_blank" rel="noreferrer">Open Wikipedia</a></p>` : ""}
  `;
}

function drawSkyGraph(items) {
  const { width, height } = els.canvas;
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "#d7dfef";
  ctx.lineWidth = 1;

  for (let alt = 0; alt <= 90; alt += 30) {
    const y = height - (alt / 90) * (height - 30) - 15;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();
    ctx.fillStyle = "#7b88a3";
    ctx.fillText(`${alt}°`, 8, y + 4);
  }

  ctx.beginPath();
  ctx.moveTo(40, height - 15);
  ctx.lineTo(width - 20, height - 15);
  ctx.strokeStyle = "#a6b2ca";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  items.forEach((obj) => {
    if (obj.azimuth == null || obj.altitude == null) return;

    const x = 40 + (normalizeDeg(obj.azimuth) / 360) * (width - 60);
    const y = height - ((obj.altitude + 10) / 100) * (height - 30) - 15;
    const clampedY = Math.max(10, Math.min(height - 10, y));

    ctx.beginPath();
    ctx.arc(x, clampedY, 5, 0, Math.PI * 2);
    if (obj.altitude < 0) ctx.fillStyle = "#7d8699";
    else if (obj.altitude < 10) ctx.fillStyle = "#b1832f";
    else ctx.fillStyle = "#3f9753";
    ctx.fill();

    ctx.fillStyle = "#31405c";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(obj.name, x + 8, clampedY - 8);
  });

  ctx.fillStyle = "#7b88a3";
  ctx.fillText("Azimuth 0° → 360°", width - 140, height - 2);
}

function activateTab(tab) {
  state.tab = tab;
  els.tabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  els.skyTab.classList.toggle("active", tab === "sky");
  els.detailsTab.classList.toggle("active", tab === "details");
}

function requestLocation() {
  if (!navigator.geolocation) {
    els.locationText.textContent = "Geolocation not supported.";
    return;
  }

  if (!window.isSecureContext) {
    els.locationText.textContent = "Location requires HTTPS or localhost.";
    return;
  }

  state.locating = true;
  els.locateBtn.disabled = true;
  els.locateBtn.textContent = "Finding…";
  renderStatus();

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      state.lat = coords.latitude;
      state.lon = coords.longitude;
      state.locating = false;
      els.locateBtn.disabled = false;
      els.locateBtn.textContent = "Use My Location";
      renderStatus();
      loadCloudCover(state.lat, state.lon);
      renderResults();
    },
    (error) => {
      state.locating = false;
      els.locateBtn.disabled = false;
      els.locateBtn.textContent = "Use My Location";
      if (error.code === error.PERMISSION_DENIED) {
        els.locationText.textContent = "Location permission denied. Allow location access in browser settings.";
      } else if (error.code === error.TIMEOUT) {
        els.locationText.textContent = "Location request timed out. Try again.";
      } else {
        els.locationText.textContent = "Unable to get location right now.";
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

function setupEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderResults();
  });

  els.locateBtn.addEventListener("click", requestLocation);

  els.showAllToggle.addEventListener("change", (event) => {
    state.showAll = event.target.checked;
    renderResults();
  });

  els.showWikiToggle.addEventListener("change", (event) => {
    state.showWiki = event.target.checked;
    renderResults();
  });

  els.lookAroundToggle.addEventListener("change", (event) => {
    state.lookAround = event.target.checked;
    els.lookControls.hidden = !state.lookAround;
    renderResults();
  });

  els.headingRange.addEventListener("input", (event) => {
    state.heading = Number(event.target.value);
    els.headingLabel.textContent = `${state.heading}° (${compassLabel(state.heading)})`;
    renderResults();
  });

  els.tabs.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });
}

setupEvents();
renderStatus();
renderResults();
setInterval(renderResults, 20000);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
