"use strict";

const STORAGE_KEY = "quan-quen-map:places:v1";
const DEFAULT_CENTER = [10.7769, 106.7009];

const TYPES = [
  { key: "cafe", label: "Cafe", color: "#176b68", icon: "coffee" },
  { key: "food", label: "Ăn", color: "#bf4d35", icon: "utensils" },
  { key: "sweet", label: "Ngọt", color: "#8b477f", icon: "cake-slice" },
  { key: "drink", label: "Trà / bar", color: "#6550a7", icon: "glass-water" },
];

const PURPOSES = [
  { key: "taste", label: "Ngon", short: "Ngon", icon: "chef-hat" },
  { key: "quiet", label: "Yên tĩnh", short: "Yên", icon: "volume-x" },
  { key: "power", label: "Ổ cắm", short: "Cắm", icon: "plug" },
  { key: "date", label: "Đi date", short: "Date", icon: "heart" },
  { key: "work", label: "Làm việc", short: "Work", icon: "laptop" },
];

const els = {};
let map;
let markers = new Map();
let userMarker = null;
let places = [];
let selectedId = null;
let activeTypes = new Set(TYPES.map((type) => type.key));
let activePurposes = new Set();
let pinMode = false;
let statusTimer = null;

const seedPlaces = [
  {
    id: "seed-cafe-balcony",
    name: "Cafe ban công",
    type: "cafe",
    address: "Nguyễn Thị Minh Khai, Quận 3",
    lat: 10.782451,
    lng: 106.691284,
    priceLevel: 2,
    ratings: { taste: 4, quiet: 4, power: 5, date: 3, work: 5 },
    tags: ["wifi mạnh", "ngồi lâu", "cửa sổ"],
    notes: "Bàn sát cửa sổ dễ tập trung, buổi trưa hơi đông.",
    lastVisit: "2026-05-18",
    favorite: true,
  },
  {
    id: "seed-noodle-alley",
    name: "Mì vịt hẻm",
    type: "food",
    address: "Tôn Thất Đạm, Quận 1",
    lat: 10.771983,
    lng: 106.704614,
    priceLevel: 2,
    ratings: { taste: 5, quiet: 2, power: 1, date: 2, work: 1 },
    tags: ["ăn nhanh", "đậm vị"],
    notes: "Hợp bữa tối nhanh, không hợp ngồi lâu.",
    lastVisit: "2026-05-29",
    favorite: false,
  },
  {
    id: "seed-window-cake",
    name: "Bánh ngọt cửa sổ",
    type: "sweet",
    address: "Pasteur, Quận 1",
    lat: 10.776683,
    lng: 106.699583,
    priceLevel: 3,
    ratings: { taste: 4, quiet: 3, power: 2, date: 5, work: 3 },
    tags: ["tráng miệng", "ảnh đẹp"],
    notes: "Không gian sáng, hợp hẹn cuối tuần.",
    lastVisit: "2026-04-30",
    favorite: true,
  },
  {
    id: "seed-rooftop-tea",
    name: "Trà rooftop nhỏ",
    type: "drink",
    address: "Lý Tự Trọng, Quận 1",
    lat: 10.777944,
    lng: 106.703822,
    priceLevel: 3,
    ratings: { taste: 3, quiet: 4, power: 2, date: 5, work: 2 },
    tags: ["view tối", "nói chuyện"],
    notes: "Nên đi sau 18h, gió dễ chịu.",
    lastVisit: "2026-06-01",
    favorite: false,
  },
  {
    id: "seed-lunch-rice",
    name: "Cơm trưa gọn",
    type: "food",
    address: "Hai Bà Trưng, Quận 1",
    lat: 10.781093,
    lng: 106.704941,
    priceLevel: 1,
    ratings: { taste: 4, quiet: 2, power: 1, date: 1, work: 1 },
    tags: ["trưa", "giá ổn"],
    notes: "Đông từ 12h đến 13h.",
    lastVisit: "2026-05-24",
    favorite: false,
  },
];

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheElements();
  hydrateStaticControls();
  places = loadPlaces();
  initMap();
  bindEvents();
  render();
  refreshIcons();
}

function cacheElements() {
  [
    "workspace",
    "placeCount",
    "globalSearch",
    "locateBtn",
    "exportBtn",
    "importTrigger",
    "importFile",
    "newPlaceBtn",
    "resetFiltersBtn",
    "typeFilters",
    "purposeFilters",
    "sortMode",
    "filteredCount",
    "placeList",
    "emptyState",
    "geoSearch",
    "geoSearchBtn",
    "geoResults",
    "pinModeBtn",
    "mapStatus",
    "editorPanel",
    "placeForm",
    "editorMode",
    "editorTitle",
    "closeEditorBtn",
    "placeId",
    "placeName",
    "placeType",
    "priceLevel",
    "placeAddress",
    "placeLat",
    "placeLng",
    "lastVisit",
    "ratingFields",
    "placeTags",
    "placeNotes",
    "favoritePlace",
    "deletePlaceBtn",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function hydrateStaticControls() {
  els.typeFilters.innerHTML = TYPES.map(
    (type) => `
      <button class="segment-button" type="button" data-type="${escapeAttr(type.key)}" aria-pressed="true">
        <i data-lucide="${escapeAttr(type.icon)}"></i>
        <span>${escapeHtml(type.label)}</span>
      </button>
    `,
  ).join("");

  els.purposeFilters.innerHTML = PURPOSES.map(
    (purpose) => `
      <button class="chip-button" type="button" data-key="${escapeAttr(purpose.key)}" aria-pressed="false">
        <i data-lucide="${escapeAttr(purpose.icon)}"></i>
        <span>${escapeHtml(purpose.label)}</span>
      </button>
    `,
  ).join("");

  els.placeType.innerHTML = TYPES.map(
    (type) => `<option value="${escapeAttr(type.key)}">${escapeHtml(type.label)}</option>`,
  ).join("");

  els.ratingFields.innerHTML = PURPOSES.map(
    (purpose) => `
      <div class="rating-row">
        <label for="rating-${escapeAttr(purpose.key)}">${escapeHtml(purpose.label)}</label>
        <input id="rating-${escapeAttr(purpose.key)}" data-rating="${escapeAttr(purpose.key)}" type="range" min="0" max="5" step="1" value="3" />
        <output for="rating-${escapeAttr(purpose.key)}">3</output>
      </div>
    `,
  ).join("");
}

function initMap() {
  if (!window.L) {
    showStatus("Không tải được bản đồ.", true);
    return;
  }

  map = L.map("map", {
    zoomControl: false,
    scrollWheelZoom: true,
  }).setView(DEFAULT_CENTER, 13);

  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  map.on("click", (event) => {
    if (!pinMode && !isEditorOpen()) return;
    setFormCoordinates(event.latlng.lat, event.latlng.lng);
    if (!isEditorOpen()) openEditor();
    reverseLookup(event.latlng.lat, event.latlng.lng);
    setPinMode(false);
    showStatus("Đã chọn vị trí.");
  });
}

function bindEvents() {
  els.globalSearch.addEventListener("input", render);
  els.sortMode.addEventListener("change", render);
  els.newPlaceBtn.addEventListener("click", () => openEditor());
  els.closeEditorBtn.addEventListener("click", closeEditor);
  els.resetFiltersBtn.addEventListener("click", resetFilters);
  els.placeForm.addEventListener("submit", savePlace);
  els.deletePlaceBtn.addEventListener("click", deleteCurrentPlace);
  els.locateBtn.addEventListener("click", locateUser);
  els.exportBtn.addEventListener("click", exportPlaces);
  els.importTrigger.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importPlaces);
  els.geoSearchBtn.addEventListener("click", searchGeo);
  els.geoSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchGeo();
    }
  });
  els.pinModeBtn.addEventListener("click", () => setPinMode(!pinMode));

  els.typeFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-type]");
    if (!button) return;
    const key = button.dataset.type;
    if (activeTypes.has(key)) {
      activeTypes.delete(key);
    } else {
      activeTypes.add(key);
    }
    if (activeTypes.size === 0) activeTypes.add(key);
    syncFilterButtons();
    render();
  });

  els.purposeFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-key]");
    if (!button) return;
    const key = button.dataset.key;
    if (activePurposes.has(key)) {
      activePurposes.delete(key);
    } else {
      activePurposes.add(key);
    }
    syncFilterButtons();
    render();
  });

  els.placeList.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-action='edit']");
    if (editButton) {
      event.stopPropagation();
      openEditor(getPlace(editButton.dataset.id));
      return;
    }

    const favoriteButton = event.target.closest("[data-action='favorite']");
    if (favoriteButton) {
      event.stopPropagation();
      toggleFavorite(favoriteButton.dataset.id);
      return;
    }

    const item = event.target.closest("[data-place-id]");
    if (!item) return;
    selectPlace(item.dataset.placeId, true);
  });

  els.geoResults.addEventListener("click", (event) => {
    const result = event.target.closest("[data-lat]");
    if (!result) return;
    const lat = Number(result.dataset.lat);
    const lng = Number(result.dataset.lng);
    const name = result.dataset.name || "";
    const address = result.dataset.address || "";
    map.setView([lat, lng], 16);
    openEditor();
    setFormCoordinates(lat, lng);
    if (!els.placeName.value.trim()) els.placeName.value = name;
    if (!els.placeAddress.value.trim()) els.placeAddress.value = address;
    els.geoResults.classList.add("hidden");
    showStatus("Đã đưa vị trí vào form.");
  });

  els.ratingFields.addEventListener("input", (event) => {
    const range = event.target.closest("[data-rating]");
    if (!range) return;
    range.parentElement.querySelector("output").value = range.value;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      els.geoResults.classList.add("hidden");
      if (pinMode) setPinMode(false);
      else if (isEditorOpen()) closeEditor();
    }
  });
}

function loadPlaces() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedPlaces.map((place, index) => normalizePlace({
      ...place,
      createdAt: Date.now() - (seedPlaces.length - index) * 86400000,
      updatedAt: Date.now() - (seedPlaces.length - index) * 43200000,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Invalid place store");
    return parsed.map(normalizePlace).filter(isValidPlace);
  } catch {
    showStatus("Không đọc được dữ liệu đã lưu.", true);
    return [];
  }
}

function savePlaces() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
}

function normalizePlace(place) {
  const ratings = {};
  PURPOSES.forEach((purpose) => {
    ratings[purpose.key] = clampRating(place.ratings?.[purpose.key]);
  });

  return {
    id: String(place.id || makeId()),
    name: String(place.name || "").trim(),
    type: TYPES.some((type) => type.key === place.type) ? place.type : "cafe",
    address: String(place.address || "").trim(),
    lat: Number(place.lat),
    lng: Number(place.lng),
    priceLevel: clamp(Number(place.priceLevel || 2), 1, 4),
    ratings,
    tags: Array.isArray(place.tags)
      ? place.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12)
      : splitTags(place.tags),
    notes: String(place.notes || "").trim(),
    lastVisit: String(place.lastVisit || "").slice(0, 10),
    favorite: Boolean(place.favorite),
    createdAt: Number(place.createdAt || Date.now()),
    updatedAt: Number(place.updatedAt || Date.now()),
  };
}

function isValidPlace(place) {
  return place.name && Number.isFinite(place.lat) && Number.isFinite(place.lng);
}

function render() {
  const filtered = getFilteredPlaces();
  els.placeCount.textContent = `${places.length} ${places.length === 1 ? "quán" : "quán"} đã lưu`;
  els.filteredCount.textContent = String(filtered.length);
  renderList(filtered);
  renderMarkers(filtered);
  refreshIcons();
}

function renderList(filtered) {
  els.emptyState.classList.toggle("hidden", filtered.length > 0);
  els.placeList.innerHTML = filtered.map((place) => {
    const type = getType(place.type);
    const selected = place.id === selectedId ? " selected" : "";
    const ratings = PURPOSES.map((purpose) => {
      const value = place.ratings[purpose.key] || 0;
      return `
        <div class="mini-rating" title="${escapeAttr(purpose.label)}: ${value}/5">
          <span>${escapeHtml(purpose.short)}</span>
          <div class="mini-bar"><i style="--value:${value * 20}%"></i></div>
        </div>
      `;
    }).join("");

    return `
      <article class="place-item${selected}" data-place-id="${escapeAttr(place.id)}">
        <div class="place-item-top">
          <div class="place-title">
            <h3>${escapeHtml(place.name)}</h3>
            <p>${escapeHtml(place.address || "Chưa có địa chỉ")}</p>
          </div>
          <span class="score-badge">${Math.round(getFitScore(place))}</span>
        </div>
        <div class="place-meta">
          <span class="type-badge" style="background:${escapeAttr(type.color)}">
            <i data-lucide="${escapeAttr(type.icon)}"></i>
            ${escapeHtml(type.label)}
          </span>
          <span class="price-badge">${formatPrice(place.priceLevel)}</span>
          ${place.favorite ? '<span class="price-badge">Quán ruột</span>' : ""}
        </div>
        <div class="rating-strip">${ratings}</div>
        <div class="place-meta">
          <button class="text-button" type="button" data-action="edit" data-id="${escapeAttr(place.id)}">Sửa</button>
          <button class="text-button" type="button" data-action="favorite" data-id="${escapeAttr(place.id)}">
            ${place.favorite ? "Bỏ ruột" : "Quán ruột"}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderMarkers(filtered) {
  if (!map) return;

  const visibleIds = new Set(filtered.map((place) => place.id));
  markers.forEach((marker, id) => {
    if (!visibleIds.has(id)) {
      marker.remove();
      markers.delete(id);
    }
  });

  filtered.forEach((place) => {
    let marker = markers.get(place.id);
    const icon = createMarkerIcon(place, place.id === selectedId);
    if (!marker) {
      marker = L.marker([place.lat, place.lng], { icon }).addTo(map);
      marker.on("click", () => selectPlace(place.id, false));
      markers.set(place.id, marker);
    } else {
      marker.setLatLng([place.lat, place.lng]);
      marker.setIcon(icon);
    }
    marker.bindPopup(createPopup(place));
  });
}

function getFilteredPlaces() {
  const term = normalizeText(els.globalSearch.value);
  const filtered = places.filter((place) => {
    if (!activeTypes.has(place.type)) return false;
    if (activePurposes.size > 0) {
      const matchesPurpose = [...activePurposes].every((key) => (place.ratings[key] || 0) >= 3);
      if (!matchesPurpose) return false;
    }
    if (!term) return true;
    const haystack = normalizeText([
      place.name,
      place.address,
      place.notes,
      place.tags.join(" "),
      getType(place.type).label,
    ].join(" "));
    return haystack.includes(term);
  });

  return filtered.sort((a, b) => {
    switch (els.sortMode.value) {
      case "recent":
        return b.updatedAt - a.updatedAt;
      case "price":
        return a.priceLevel - b.priceLevel || getFitScore(b) - getFitScore(a);
      case "name":
        return a.name.localeCompare(b.name, "vi");
      case "fit":
      default:
        return getFitScore(b) - getFitScore(a) || b.updatedAt - a.updatedAt;
    }
  });
}

function getFitScore(place) {
  const keys = activePurposes.size > 0 ? [...activePurposes] : PURPOSES.map((purpose) => purpose.key);
  const base = keys.reduce((sum, key) => sum + (place.ratings[key] || 0), 0) / (keys.length * 5);
  const favoriteBoost = place.favorite ? 8 : 0;
  const recentBoost = place.lastVisit ? Math.max(0, 6 - daysSince(place.lastVisit) / 30) : 0;
  return clamp(base * 100 + favoriteBoost + recentBoost, 0, 100);
}

function createMarkerIcon(place, selected) {
  const type = getType(place.type);
  return L.divIcon({
    className: `place-div-marker${selected ? " selected" : ""}`,
    html: `
      <span class="pin-shell" style="--pin-color:${escapeAttr(type.color)}">
        <b>${Math.round(getFitScore(place))}</b>
      </span>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 38],
    popupAnchor: [0, -36],
  });
}

function createPopup(place) {
  const type = getType(place.type);
  return `
    <div class="place-popup">
      <h3>${escapeHtml(place.name)}</h3>
      <p>${escapeHtml(place.address || "Chưa có địa chỉ")}</p>
      <div class="place-popup-row">
        <span class="type-badge" style="background:${escapeAttr(type.color)}">${escapeHtml(type.label)}</span>
        <span class="price-badge">${formatPrice(place.priceLevel)}</span>
        <span class="score-badge">${Math.round(getFitScore(place))}</span>
      </div>
    </div>
  `;
}

function openEditor(place = null) {
  const isEdit = Boolean(place);
  els.workspace.classList.add("editor-open");
  els.editorPanel.setAttribute("aria-hidden", "false");
  els.editorMode.textContent = isEdit ? "Đang sửa" : "Quán mới";
  els.editorTitle.textContent = isEdit ? place.name : "Lưu quán";
  els.deletePlaceBtn.classList.toggle("hidden", !isEdit);

  const today = new Date().toISOString().slice(0, 10);
  const data = place || {
    id: "",
    name: "",
    type: "cafe",
    address: "",
    lat: map?.getCenter().lat || DEFAULT_CENTER[0],
    lng: map?.getCenter().lng || DEFAULT_CENTER[1],
    priceLevel: 2,
    ratings: { taste: 3, quiet: 3, power: 3, date: 3, work: 3 },
    tags: [],
    notes: "",
    lastVisit: today,
    favorite: false,
  };

  els.placeId.value = data.id || "";
  els.placeName.value = data.name || "";
  els.placeType.value = data.type || "cafe";
  els.priceLevel.value = String(data.priceLevel || 2);
  els.placeAddress.value = data.address || "";
  setFormCoordinates(data.lat, data.lng);
  els.lastVisit.value = data.lastVisit || "";
  els.placeTags.value = (data.tags || []).join(", ");
  els.placeNotes.value = data.notes || "";
  els.favoritePlace.checked = Boolean(data.favorite);

  PURPOSES.forEach((purpose) => {
    const range = els.ratingFields.querySelector(`[data-rating="${purpose.key}"]`);
    range.value = String(data.ratings?.[purpose.key] ?? 3);
    range.parentElement.querySelector("output").value = range.value;
  });

  setTimeout(() => {
    map?.invalidateSize();
    els.placeName.focus();
  }, 50);
}

function closeEditor() {
  els.workspace.classList.remove("editor-open");
  els.editorPanel.setAttribute("aria-hidden", "true");
  els.placeForm.reset();
  setTimeout(() => map?.invalidateSize(), 50);
}

function savePlace(event) {
  event.preventDefault();
  const existingId = els.placeId.value;
  const now = Date.now();
  const ratings = {};
  PURPOSES.forEach((purpose) => {
    ratings[purpose.key] = clampRating(els.ratingFields.querySelector(`[data-rating="${purpose.key}"]`).value);
  });

  const place = normalizePlace({
    id: existingId || makeId(),
    name: els.placeName.value,
    type: els.placeType.value,
    address: els.placeAddress.value,
    lat: Number(els.placeLat.value),
    lng: Number(els.placeLng.value),
    priceLevel: Number(els.priceLevel.value),
    ratings,
    tags: splitTags(els.placeTags.value),
    notes: els.placeNotes.value,
    lastVisit: els.lastVisit.value,
    favorite: els.favoritePlace.checked,
    createdAt: getPlace(existingId)?.createdAt || now,
    updatedAt: now,
  });

  if (!isValidPlace(place)) {
    showStatus("Tên quán và tọa độ cần hợp lệ.", true);
    return;
  }

  const index = places.findIndex((item) => item.id === existingId);
  if (index >= 0) {
    places[index] = place;
  } else {
    places.unshift(place);
  }

  savePlaces();
  selectedId = place.id;
  closeEditor();
  render();
  selectPlace(place.id, true);
  showStatus("Đã lưu quán.");
}

function deleteCurrentPlace() {
  const id = els.placeId.value;
  if (!id) return;
  const place = getPlace(id);
  if (!place) return;
  if (!confirm(`Xóa "${place.name}"?`)) return;

  places = places.filter((item) => item.id !== id);
  if (selectedId === id) selectedId = null;
  savePlaces();
  closeEditor();
  render();
  showStatus("Đã xóa quán.");
}

function selectPlace(id, panTo) {
  const place = getPlace(id);
  if (!place) return;
  selectedId = id;
  render();
  const marker = markers.get(id);
  if (panTo) map?.setView([place.lat, place.lng], Math.max(map.getZoom(), 15));
  marker?.openPopup();
}

function toggleFavorite(id) {
  const place = getPlace(id);
  if (!place) return;
  place.favorite = !place.favorite;
  place.updatedAt = Date.now();
  savePlaces();
  render();
}

function setFormCoordinates(lat, lng) {
  els.placeLat.value = Number(lat).toFixed(6);
  els.placeLng.value = Number(lng).toFixed(6);
}

function isEditorOpen() {
  return els.workspace.classList.contains("editor-open");
}

function resetFilters() {
  activeTypes = new Set(TYPES.map((type) => type.key));
  activePurposes = new Set();
  els.globalSearch.value = "";
  els.sortMode.value = "fit";
  syncFilterButtons();
  render();
}

function syncFilterButtons() {
  els.typeFilters.querySelectorAll("[data-type]").forEach((button) => {
    button.setAttribute("aria-pressed", String(activeTypes.has(button.dataset.type)));
  });
  els.purposeFilters.querySelectorAll("[data-key]").forEach((button) => {
    button.setAttribute("aria-pressed", String(activePurposes.has(button.dataset.key)));
  });
}

function setPinMode(value) {
  pinMode = value;
  els.pinModeBtn.setAttribute("aria-pressed", String(pinMode));
  document.body.classList.toggle("pin-mode", pinMode);
  if (pinMode) showStatus("Chọn một điểm trên bản đồ.");
}

async function searchGeo() {
  const query = els.geoSearch.value.trim();
  if (!query) return;

  els.geoSearchBtn.disabled = true;
  els.geoResults.innerHTML = "";
  els.geoResults.classList.add("hidden");

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "6");
    url.searchParams.set("accept-language", "vi");
    url.searchParams.set("q", query);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    renderGeoResults(data);
  } catch {
    showStatus("Không tìm được vị trí.", true);
  } finally {
    els.geoSearchBtn.disabled = false;
  }
}

function renderGeoResults(results) {
  if (!Array.isArray(results) || results.length === 0) {
    els.geoResults.innerHTML = '<button class="geo-result" type="button"><strong>Không có kết quả</strong></button>';
    els.geoResults.classList.remove("hidden");
    return;
  }

  els.geoResults.innerHTML = results.map((item) => {
    const name = item.name || item.display_name?.split(",")[0] || "Vị trí";
    const address = item.display_name || "";
    return `
      <button
        class="geo-result"
        type="button"
        data-lat="${escapeAttr(item.lat)}"
        data-lng="${escapeAttr(item.lon)}"
        data-name="${escapeAttr(name)}"
        data-address="${escapeAttr(address)}"
      >
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml(address)}</span>
      </button>
    `;
  }).join("");
  els.geoResults.classList.remove("hidden");
}

async function reverseLookup(lat, lng) {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("accept-language", "vi");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    const res = await fetch(url.toString());
    if (!res.ok) return;
    const data = await res.json();
    if (!els.placeAddress.value.trim() && data.display_name) {
      els.placeAddress.value = data.display_name;
    }
  } catch {
    // Reverse geocoding is optional; the coordinates are already captured.
  }
}

function locateUser() {
  if (!navigator.geolocation || !map) {
    showStatus("Trình duyệt chưa hỗ trợ định vị.", true);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      map.setView([latitude, longitude], 15);
      if (userMarker) userMarker.remove();
      userMarker = L.circleMarker([latitude, longitude], {
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: "#176b68",
        fillOpacity: 1,
      }).addTo(map);
      showStatus("Đã cập nhật vị trí.");
    },
    () => showStatus("Không lấy được vị trí.", true),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
}

function exportPlaces() {
  const payload = {
    app: "quan-quen-map",
    version: 1,
    exportedAt: new Date().toISOString(),
    places,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quan-quen-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showStatus("Đã tạo file xuất dữ liệu.");
}

async function importPlaces() {
  const file = els.importFile.files?.[0];
  els.importFile.value = "";
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    const imported = Array.isArray(payload) ? payload : payload.places;
    if (!Array.isArray(imported)) throw new Error("Invalid backup");
    const normalized = imported.map(normalizePlace).filter(isValidPlace);
    if (normalized.length === 0) throw new Error("No valid places");
    if (!confirm(`Nhập ${normalized.length} quán và thay dữ liệu hiện tại?`)) return;
    places = normalized;
    selectedId = null;
    savePlaces();
    render();
    showStatus("Đã nhập dữ liệu.");
  } catch {
    showStatus("File nhập không hợp lệ.", true);
  }
}

function getPlace(id) {
  return places.find((place) => place.id === id);
}

function getType(key) {
  return TYPES.find((type) => type.key === key) || TYPES[0];
}

function formatPrice(level) {
  return "₫".repeat(clamp(Number(level), 1, 4));
}

function splitTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function clampRating(value) {
  return clamp(Math.round(Number(value) || 0), 0, 5);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function daysSince(dateString) {
  const time = new Date(dateString).getTime();
  if (!Number.isFinite(time)) return 999;
  return Math.max(0, (Date.now() - time) / 86400000);
}

function makeId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `place-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showStatus(message, isError = false) {
  clearTimeout(statusTimer);
  els.mapStatus.textContent = message;
  els.mapStatus.classList.toggle("toast-error", isError);
  els.mapStatus.classList.remove("hidden");
  statusTimer = setTimeout(() => {
    els.mapStatus.classList.add("hidden");
    els.mapStatus.classList.remove("toast-error");
  }, 2300);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
