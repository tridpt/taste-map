"use strict";

const STORAGE_KEY = "quan-quen-map:places:v1";
const BACKUP_META_KEY = "quan-quen-map:backup-meta:v1";
const GIST_SETTINGS_KEY = "quan-quen-map:gist-settings:v1";
const BACKUP_REMINDER_DAYS = 7;
const GIST_FILENAME = "taste-map-backup.json";
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

const DAY_OPTIONS = [
  { key: 1, label: "T2" },
  { key: 2, label: "T3" },
  { key: 3, label: "T4" },
  { key: 4, label: "T5" },
  { key: 5, label: "T6" },
  { key: 6, label: "T7" },
  { key: 0, label: "CN" },
];

const els = {};
let map;
let markers = new Map();
let userMarker = null;
let userLocation = null;
let places = [];
let selectedId = null;
let activeTypes = new Set(TYPES.map((type) => type.key));
let activePurposes = new Set();
let activeTags = new Set();
let editorPhotos = [];
let editorVisits = [];
let editorOpeningDays = new Set(DAY_OPTIONS.map((day) => day.key));
let pendingImports = [];
let undoStack = [];
let deferredInstallPrompt = null;
let waitingServiceWorker = null;
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
  renderDataPanel();
  refreshIcons();
  setupInstallPrompt();
  registerServiceWorker();
  handleSharedLaunch();
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
    "installAppBtn",
    "updateAppBtn",
    "newPlaceBtn",
    "resetFiltersBtn",
    "typeFilters",
    "purposeFilters",
    "tagFilters",
    "sortMode",
    "suggestMood",
    "recommendationList",
    "backupStatus",
    "backupReminder",
    "dismissBackupReminderBtn",
    "encryptedExportBtn",
    "plainExportBtn",
    "gistToken",
    "gistId",
    "saveGistSettingsBtn",
    "pushGistBtn",
    "pullGistBtn",
    "filteredCount",
    "placeList",
    "emptyState",
    "geoSearch",
    "geoSearchBtn",
    "geoResults",
    "mapsLinkInput",
    "mapsClipboardBtn",
    "mapsImportBtn",
    "importQueuePanel",
    "saveImportQueueBtn",
    "clearImportQueueBtn",
    "importQueueList",
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
    "addPhotoBtn",
    "placePhotosInput",
    "photoGallery",
    "openingDays",
    "openingOpen",
    "openingClose",
    "visitDate",
    "visitRating",
    "addVisitBtn",
    "visitNote",
    "visitHistoryList",
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

  els.openingDays.innerHTML = DAY_OPTIONS.map(
    (day) => `
      <button class="day-toggle" type="button" data-day="${day.key}" aria-pressed="true">
        ${escapeHtml(day.label)}
      </button>
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
  els.suggestMood.addEventListener("change", renderRecommendations);
  els.newPlaceBtn.addEventListener("click", () => openEditor());
  els.closeEditorBtn.addEventListener("click", closeEditor);
  els.resetFiltersBtn.addEventListener("click", resetFilters);
  els.placeForm.addEventListener("submit", savePlace);
  els.deletePlaceBtn.addEventListener("click", deleteCurrentPlace);
  els.locateBtn.addEventListener("click", locateUser);
  els.exportBtn.addEventListener("click", exportEncryptedBackup);
  els.encryptedExportBtn.addEventListener("click", exportEncryptedBackup);
  els.plainExportBtn.addEventListener("click", exportPlainBackup);
  els.importTrigger.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importPlaces);
  els.installAppBtn.addEventListener("click", installApp);
  els.updateAppBtn.addEventListener("click", applyAppUpdate);
  els.dismissBackupReminderBtn.addEventListener("click", dismissBackupReminder);
  els.saveGistSettingsBtn.addEventListener("click", saveGistSettings);
  els.pushGistBtn.addEventListener("click", pushGistBackup);
  els.pullGistBtn.addEventListener("click", pullGistBackup);
  els.geoSearchBtn.addEventListener("click", searchGeo);
  els.geoSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchGeo();
    }
  });
  els.mapsImportBtn.addEventListener("click", importFromGoogleMaps);
  els.mapsLinkInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        importFromGoogleMaps();
      }
    }
  });
  els.mapsClipboardBtn.addEventListener("click", pasteMapsFromClipboard);
  els.saveImportQueueBtn.addEventListener("click", saveAllPendingImports);
  els.clearImportQueueBtn.addEventListener("click", clearPendingImports);
  els.importQueueList.addEventListener("click", handleImportQueueClick);
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

  els.tagFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tag]");
    if (!button) return;
    const tag = button.dataset.tag;
    if (activeTags.has(tag)) {
      activeTags.delete(tag);
    } else {
      activeTags.add(tag);
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

  els.recommendationList.addEventListener("click", (event) => {
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

  els.addPhotoBtn.addEventListener("click", () => els.placePhotosInput.click());
  els.placePhotosInput.addEventListener("change", handlePhotoSelection);
  els.photoGallery.addEventListener("click", (event) => {
    const button = event.target.closest("[data-photo-id]");
    if (!button) return;
    editorPhotos = editorPhotos.filter((photo) => photo.id !== button.dataset.photoId);
    renderEditorPhotos();
  });

  els.openingDays.addEventListener("click", (event) => {
    const button = event.target.closest("[data-day]");
    if (!button) return;
    const day = Number(button.dataset.day);
    if (editorOpeningDays.has(day)) {
      editorOpeningDays.delete(day);
    } else {
      editorOpeningDays.add(day);
    }
    renderOpeningDays();
  });

  els.addVisitBtn.addEventListener("click", addEditorVisit);
  els.visitHistoryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-visit-id]");
    if (!button) return;
    editorVisits = editorVisits.filter((visit) => visit.id !== button.dataset.visitId);
    syncLastVisitFromHistory();
    renderVisitHistory();
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
  renderDataPanel();
}

function normalizePlace(place) {
  const ratings = {};
  PURPOSES.forEach((purpose) => {
    ratings[purpose.key] = clampRating(place.ratings?.[purpose.key]);
  });
  const visits = normalizeVisits(place.visits);
  const lastVisit = String(place.lastVisit || visits[0]?.date || "").slice(0, 10);

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
    lastVisit,
    favorite: Boolean(place.favorite),
    images: normalizeImages(place.images),
    openingHours: normalizeOpeningHours(place.openingHours),
    visits,
    createdAt: Number(place.createdAt || Date.now()),
    updatedAt: Number(place.updatedAt || Date.now()),
  };
}

function isValidPlace(place) {
  return place.name && Number.isFinite(place.lat) && Number.isFinite(place.lng);
}

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((photo) => {
      if (typeof photo === "string") {
        return { id: makeId(), dataUrl: photo };
      }
      return {
        id: String(photo.id || makeId()),
        dataUrl: String(photo.dataUrl || ""),
      };
    })
    .filter((photo) => photo.dataUrl.startsWith("data:image/"))
    .slice(0, 8);
}

function normalizeOpeningHours(hours) {
  const days = Array.isArray(hours?.days)
    ? hours.days.map(Number).filter((day) => day >= 0 && day <= 6)
    : DAY_OPTIONS.map((day) => day.key);
  return {
    days: [...new Set(days)],
    open: isTimeValue(hours?.open) ? hours.open : "",
    close: isTimeValue(hours?.close) ? hours.close : "",
  };
}

function normalizeVisits(visits) {
  if (!Array.isArray(visits)) return [];
  return visits
    .map((visit) => ({
      id: String(visit.id || makeId()),
      date: String(visit.date || "").slice(0, 10),
      rating: clampRating(visit.rating || 3) || 3,
      note: String(visit.note || "").trim(),
    }))
    .filter((visit) => /^\d{4}-\d{2}-\d{2}$/.test(visit.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 50);
}

function isTimeValue(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function render() {
  const filtered = getFilteredPlaces();
  els.placeCount.textContent = `${places.length} ${places.length === 1 ? "quán" : "quán"} đã lưu`;
  els.filteredCount.textContent = String(filtered.length);
  renderTagFilters();
  renderRecommendations();
  renderList(filtered);
  renderMarkers(filtered);
  refreshIcons();
}

function renderTagFilters() {
  const counts = new Map();
  places.forEach((place) => {
    place.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });
  const tags = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"))
    .slice(0, 18);

  activeTags.forEach((tag) => {
    if (!counts.has(tag)) activeTags.delete(tag);
  });

  els.tagFilters.innerHTML = tags.map(([tag, count]) => `
    <button class="chip-button" type="button" data-tag="${escapeAttr(tag)}" aria-pressed="${activeTags.has(tag)}">
      <span>${escapeHtml(tag)}</span>
      <span>${count}</span>
    </button>
  `).join("");
}

function renderRecommendations() {
  const mood = els.suggestMood.value;
  const candidates = places
    .filter((place) => activeTypes.has(place.type))
    .filter((place) => [...activeTags].every((tag) => place.tags.includes(tag)));

  if (mood === "nearby" && !userLocation) {
    els.recommendationList.innerHTML = '<p class="recommendation-empty">Bấm nút vị trí để gợi ý quán gần bạn.</p>';
    return;
  }

  const recommended = candidates
    .map((place) => ({ place, score: getMoodScore(place, mood) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (recommended.length === 0) {
    els.recommendationList.innerHTML = '<p class="recommendation-empty">Chưa có quán phù hợp.</p>';
    return;
  }

  els.recommendationList.innerHTML = recommended.map(({ place, score }) => {
    const distance = formatDistance(getDistanceFromUser(place));
    const meta = [getType(place.type).label, distance, getOpeningStatus(place).label]
      .filter(Boolean)
      .join(" • ");
    return `
      <button class="recommendation-item" type="button" data-place-id="${escapeAttr(place.id)}">
        <span>
          <strong>${escapeHtml(place.name)}</strong>
          <span>${escapeHtml(meta || place.address || "Chưa có địa chỉ")}</span>
        </span>
        <span class="score-badge">${Math.round(score)}</span>
      </button>
    `;
  }).join("");
}

function renderList(filtered) {
  els.emptyState.classList.toggle("hidden", filtered.length > 0);
  els.placeList.innerHTML = filtered.map((place) => {
    const type = getType(place.type);
    const selected = place.id === selectedId ? " selected" : "";
    const status = getOpeningStatus(place);
    const distance = formatDistance(getDistanceFromUser(place));
    const thumb = place.images[0]?.dataUrl || "";
    const tags = place.tags.slice(0, 3).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("");
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
      <article class="place-item${selected}${thumb ? " place-with-photo" : ""}" data-place-id="${escapeAttr(place.id)}">
        ${thumb ? `<img class="place-thumb" src="${escapeAttr(thumb)}" alt="${escapeAttr(place.name)}" loading="lazy" />` : ""}
        <div class="place-main">
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
            ${distance ? `<span class="price-badge">${escapeHtml(distance)}</span>` : ""}
            ${status.label ? `<span class="price-badge status-badge ${status.state}">${escapeHtml(status.label)}</span>` : ""}
            ${place.visits.length ? `<span class="price-badge">${place.visits.length} lần ghé</span>` : ""}
            ${place.favorite ? '<span class="price-badge">Quán ruột</span>' : ""}
          </div>
          <div class="rating-strip">${ratings}</div>
          ${tags ? `<div class="place-meta">${tags}</div>` : ""}
          <div class="place-meta">
            <button class="text-button" type="button" data-action="edit" data-id="${escapeAttr(place.id)}">Sửa</button>
            <button class="text-button" type="button" data-action="favorite" data-id="${escapeAttr(place.id)}">
              ${place.favorite ? "Bỏ ruột" : "Quán ruột"}
            </button>
          </div>
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
    if (activeTags.size > 0) {
      const matchesTags = [...activeTags].every((tag) => place.tags.includes(tag));
      if (!matchesTags) return false;
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
      case "distance":
        return getSortableDistance(a) - getSortableDistance(b) || getFitScore(b) - getFitScore(a);
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

function getMoodScore(place, mood) {
  const rating = (key) => place.ratings[key] || 0;
  let score;
  switch (mood) {
    case "quick":
      score = rating("taste") * 12 + (place.type === "food" ? 18 : 0) + (place.priceLevel <= 2 ? 10 : 0);
      if (hasTagLike(place, ["nhanh", "trưa", "an nhanh", "ăn nhanh"])) score += 18;
      if (rating("quiet") <= 2) score += 4;
      break;
    case "date":
      score = rating("date") * 18 + rating("taste") * 6 + rating("quiet") * 5;
      break;
    case "quiet":
      score = rating("quiet") * 20 + rating("work") * 5;
      break;
    case "taste":
      score = rating("taste") * 20 + (place.favorite ? 8 : 0);
      break;
    case "nearby":
      score = userLocation ? Math.max(0, 100 - getDistanceFromUser(place) / 80) + getFitScore(place) * 0.25 : 0;
      break;
    case "work":
    default:
      score = rating("work") * 16 + rating("power") * 10 + rating("quiet") * 7;
      if (hasTagLike(place, ["wifi", "ngồi lâu", "ngoi lau", "ổ cắm", "o cam"])) score += 10;
      break;
  }
  const status = getOpeningStatus(place);
  if (status.state === "open") score += 6;
  if (place.favorite) score += 5;
  return clamp(score, 0, 100);
}

function hasTagLike(place, needles) {
  const text = normalizeText(place.tags.join(" "));
  return needles.some((needle) => text.includes(normalizeText(needle)));
}

function getDistanceFromUser(place) {
  if (!userLocation) return null;
  return haversineMeters(userLocation.lat, userLocation.lng, place.lat, place.lng);
}

function getSortableDistance(place) {
  const distance = getDistanceFromUser(place);
  return distance == null ? Number.POSITIVE_INFINITY : distance;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distance) {
  if (distance == null || !Number.isFinite(distance)) return "";
  if (distance < 1000) return `Cách bạn ${Math.round(distance)}m`;
  return `Cách bạn ${(distance / 1000).toFixed(distance < 10000 ? 1 : 0)}km`;
}

function getOpeningStatus(place, now = new Date()) {
  const hours = place.openingHours;
  if (!hours?.open || !hours?.close || !hours.days?.length) {
    return { state: "", label: "" };
  }

  const today = now.getDay();
  const yesterday = (today + 6) % 7;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const open = timeToMinutes(hours.open);
  const close = timeToMinutes(hours.close);
  const overnight = close <= open;
  const openToday = hours.days.includes(today);
  const openYesterday = hours.days.includes(yesterday);

  let isOpen = false;
  if (overnight) {
    isOpen = (openToday && minutes >= open) || (openYesterday && minutes < close);
  } else {
    isOpen = openToday && minutes >= open && minutes < close;
  }

  return {
    state: isOpen ? "open" : "closed",
    label: isOpen ? "Đang mở" : "Có thể đóng",
  };
}

function timeToMinutes(value) {
  const [hour, minute] = String(value || "00:00").split(":").map(Number);
  return hour * 60 + minute;
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
  const status = getOpeningStatus(place);
  const distance = formatDistance(getDistanceFromUser(place));
  return `
    <div class="place-popup">
      <h3>${escapeHtml(place.name)}</h3>
      <p>${escapeHtml(place.address || "Chưa có địa chỉ")}</p>
      <div class="place-popup-row">
        <span class="type-badge" style="background:${escapeAttr(type.color)}">${escapeHtml(type.label)}</span>
        <span class="price-badge">${formatPrice(place.priceLevel)}</span>
        ${distance ? `<span class="price-badge">${escapeHtml(distance)}</span>` : ""}
        ${status.label ? `<span class="price-badge status-badge ${status.state}">${escapeHtml(status.label)}</span>` : ""}
        <span class="score-badge">${Math.round(getFitScore(place))}</span>
      </div>
    </div>
  `;
}

function openEditor(place = null) {
  const hasDraft = Boolean(place);
  const isEdit = Boolean(place?.id);
  els.workspace.classList.add("editor-open");
  els.editorPanel.setAttribute("aria-hidden", "false");
  els.editorMode.textContent = isEdit ? "Đang sửa" : (hasDraft ? "Nhập từ Maps" : "Quán mới");
  els.editorTitle.textContent = hasDraft ? place.name : "Lưu quán";
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
    images: [],
    openingHours: { days: DAY_OPTIONS.map((day) => day.key), open: "", close: "" },
    visits: [],
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
  editorPhotos = normalizeImages(data.images);
  editorVisits = normalizeVisits(data.visits);
  editorOpeningDays = new Set(normalizeOpeningHours(data.openingHours).days);
  els.openingOpen.value = data.openingHours?.open || "";
  els.openingClose.value = data.openingHours?.close || "";
  els.visitDate.value = today;
  els.visitRating.value = "4";
  els.visitNote.value = "";

  PURPOSES.forEach((purpose) => {
    const range = els.ratingFields.querySelector(`[data-rating="${purpose.key}"]`);
    range.value = String(data.ratings?.[purpose.key] ?? 3);
    range.parentElement.querySelector("output").value = range.value;
  });

  renderEditorPhotos();
  renderOpeningDays();
  renderVisitHistory();

  setTimeout(() => {
    map?.invalidateSize();
    els.placeName.focus();
  }, 50);
}

function closeEditor() {
  els.workspace.classList.remove("editor-open");
  els.editorPanel.setAttribute("aria-hidden", "true");
  els.placeForm.reset();
  editorPhotos = [];
  editorVisits = [];
  editorOpeningDays = new Set(DAY_OPTIONS.map((day) => day.key));
  renderEditorPhotos();
  renderVisitHistory();
  setTimeout(() => map?.invalidateSize(), 50);
}

async function handlePhotoSelection() {
  const files = [...(els.placePhotosInput.files || [])].filter((file) => file.type.startsWith("image/"));
  els.placePhotosInput.value = "";
  if (files.length === 0) return;

  try {
    const remainingSlots = Math.max(0, 8 - editorPhotos.length);
    const selected = files.slice(0, remainingSlots);
    const photos = await Promise.all(selected.map(readCompressedPhoto));
    editorPhotos = [...editorPhotos, ...photos.filter(Boolean)];
    renderEditorPhotos();
    if (files.length > selected.length) {
      showStatus("Mỗi quán lưu tối đa 8 ảnh.");
    }
  } catch {
    showStatus("Không đọc được ảnh.", true);
  }
}

function readCompressedPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxSize = 900;
        const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * ratio));
        const height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);
        resolve({
          id: makeId(),
          dataUrl: canvas.toDataURL("image/jpeg", 0.82),
        });
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderEditorPhotos() {
  els.photoGallery.innerHTML = editorPhotos.map((photo) => `
    <div class="photo-tile">
      <img src="${escapeAttr(photo.dataUrl)}" alt="Ảnh quán" />
      <button type="button" data-photo-id="${escapeAttr(photo.id)}" title="Xóa ảnh" aria-label="Xóa ảnh">
        <i data-lucide="x"></i>
      </button>
    </div>
  `).join("");
  refreshIcons();
}

function renderOpeningDays() {
  els.openingDays.querySelectorAll("[data-day]").forEach((button) => {
    button.setAttribute("aria-pressed", String(editorOpeningDays.has(Number(button.dataset.day))));
  });
}

function addEditorVisit() {
  const date = els.visitDate.value || new Date().toISOString().slice(0, 10);
  editorVisits.unshift({
    id: makeId(),
    date,
    rating: clampRating(els.visitRating.value) || 3,
    note: els.visitNote.value.trim(),
  });
  editorVisits = normalizeVisits(editorVisits);
  els.visitNote.value = "";
  syncLastVisitFromHistory();
  renderVisitHistory();
}

function syncLastVisitFromHistory() {
  const latest = normalizeVisits(editorVisits)[0]?.date || "";
  if (latest) els.lastVisit.value = latest;
}

function renderVisitHistory() {
  if (editorVisits.length === 0) {
    els.visitHistoryList.innerHTML = "";
    return;
  }
  els.visitHistoryList.innerHTML = editorVisits.map((visit) => `
    <div class="visit-item">
      <span>
        <strong>${escapeHtml(formatDate(visit.date))} • ${visit.rating}/5</strong>
        ${visit.note ? `<span>${escapeHtml(visit.note)}</span>` : ""}
      </span>
      <button type="button" data-visit-id="${escapeAttr(visit.id)}" title="Xóa lần ghé" aria-label="Xóa lần ghé">
        <i data-lucide="x"></i>
      </button>
    </div>
  `).join("");
  refreshIcons();
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
    images: editorPhotos,
    openingHours: {
      days: [...editorOpeningDays],
      open: els.openingOpen.value,
      close: els.openingClose.value,
    },
    visits: editorVisits,
    createdAt: getPlace(existingId)?.createdAt || now,
    updatedAt: now,
  });

  if (!isValidPlace(place)) {
    showStatus("Tên quán và tọa độ cần hợp lệ.", true);
    return;
  }

  const index = places.findIndex((item) => item.id === existingId);
  pushUndoSnapshot(index >= 0 ? "sửa quán" : "thêm quán");
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
  showUndoStatus("Đã lưu quán.");
}

function deleteCurrentPlace() {
  const id = els.placeId.value;
  if (!id) return;
  const place = getPlace(id);
  if (!place) return;
  if (!confirm(`Xóa "${place.name}"?`)) return;

  pushUndoSnapshot("xóa quán");
  places = places.filter((item) => item.id !== id);
  if (selectedId === id) selectedId = null;
  savePlaces();
  closeEditor();
  render();
  showUndoStatus("Đã xóa quán.");
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
  pushUndoSnapshot("đổi quán ruột");
  place.favorite = !place.favorite;
  place.updatedAt = Date.now();
  savePlaces();
  render();
  showUndoStatus("Đã cập nhật quán ruột.");
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
  activeTags = new Set();
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
  els.tagFilters.querySelectorAll("[data-tag]").forEach((button) => {
    button.setAttribute("aria-pressed", String(activeTags.has(button.dataset.tag)));
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
    const data = await geocodeQuery(query);
    renderGeoResults(data);
  } catch {
    showStatus("Không tìm được vị trí.", true);
  } finally {
    els.geoSearchBtn.disabled = false;
  }
}

async function importFromGoogleMaps() {
  const raw = els.mapsLinkInput.value.trim();
  if (!raw) {
    showStatus("Hãy dán link Google Maps.", true);
    return;
  }

  els.mapsImportBtn.disabled = true;
  try {
    await processGoogleMapsImportText(raw, { openSingle: true });
  } catch {
    showStatus("Không nhập được link Google Maps.", true);
  } finally {
    els.mapsImportBtn.disabled = false;
  }
}

async function pasteMapsFromClipboard() {
  if (!navigator.clipboard?.readText) {
    showStatus("Trình duyệt chưa cho đọc clipboard.", true);
    return;
  }

  els.mapsClipboardBtn.disabled = true;
  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (!text) {
      showStatus("Clipboard đang trống.", true);
      return;
    }
    els.mapsLinkInput.value = text;
    await processGoogleMapsImportText(text, { openSingle: true });
  } catch {
    showStatus("Không đọc được clipboard.", true);
  } finally {
    els.mapsClipboardBtn.disabled = false;
  }
}

async function processGoogleMapsImportText(raw, { openSingle = false } = {}) {
  const candidates = splitImportCandidates(raw);
  if (candidates.length === 0) {
    showStatus("Không tìm thấy link hoặc nội dung để nhập.", true);
    return;
  }

  const resolved = [];
  const skipped = [];
  for (const candidate of candidates) {
    const parsed = parseGoogleMapsInput(candidate);
    if (parsed.shortUrl) {
      skipped.push("short");
      continue;
    }
    try {
      const imported = await resolveImportedPlace(parsed);
      if (hasCoordinates(imported)) {
        resolved.push(imported);
      } else {
        skipped.push("missing");
      }
    } catch {
      skipped.push("missing");
    }
  }

  if (resolved.length === 0) {
    const hasShort = skipped.includes("short");
    showStatus(hasShort
      ? "Link rút gọn Google Maps cần mở ra rồi copy URL đầy đủ."
      : "Chưa lấy được tọa độ từ nội dung này.", true);
    return;
  }

  els.mapsLinkInput.value = "";
  if (resolved.length === 1 && openSingle) {
    applyImportedMapPlace(resolved[0]);
  } else {
    enqueuePendingImports(resolved);
    showStatus(`Đã thêm ${resolved.length} quán vào hàng chờ.`);
  }

  if (skipped.length > 0) {
    showStatus(`Đã nhập ${resolved.length} mục; bỏ qua ${skipped.length} mục chưa đọc được.`, true);
  }
}

async function resolveImportedPlace(parsed) {
  let imported = parsed;
  if (!hasCoordinates(imported) && imported.query) {
    const results = await geocodeQuery(imported.query, 1);
    const first = results[0];
    if (!first) return imported;
    imported = {
      ...imported,
      name: imported.name || first.name || first.display_name?.split(",")[0],
      address: first.display_name || imported.address || "",
      lat: Number(first.lat),
      lng: Number(first.lon),
    };
  }
  return imported;
}

async function geocodeQuery(query, limit = 6) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("accept-language", "vi");
  url.searchParams.set("q", query);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

function applyImportedMapPlace(imported) {
  const lat = Number(imported.lat);
  const lng = Number(imported.lng);
  map?.setView([lat, lng], Math.max(map.getZoom(), 16));
  openEditor();
  setFormCoordinates(lat, lng);
  if (imported.name) els.placeName.value = imported.name;
  if (imported.address) els.placeAddress.value = imported.address;
  else if (imported.query && !els.placeName.value) els.placeName.value = imported.query;
  reverseLookup(lat, lng);
  showStatus("Đã nhập vị trí từ Google Maps.");
}

function enqueuePendingImports(imports) {
  const existingKeys = new Set(pendingImports.map((item) => getImportKey(item)));
  imports.forEach((item) => {
    const normalized = normalizeImportedPlace(item);
    const key = getImportKey(normalized);
    if (existingKeys.has(key)) return;
    existingKeys.add(key);
    pendingImports.push({ ...normalized, pendingId: makeId() });
  });
  renderImportQueue();
}

function renderImportQueue() {
  els.importQueuePanel.classList.toggle("hidden", pendingImports.length === 0);
  els.importQueueList.innerHTML = pendingImports.map((item) => `
    <div class="import-queue-item" data-pending-id="${escapeAttr(item.pendingId)}">
      <span>
        <strong>${escapeHtml(item.name || item.query || "Quán từ Google Maps")}</strong>
        <span>${escapeHtml(formatImportMeta(item))}</span>
      </span>
      <div class="import-queue-actions">
        <button class="icon-button" type="button" data-import-action="edit" title="Sửa trước khi lưu" aria-label="Sửa trước khi lưu">
          <i data-lucide="pencil"></i>
        </button>
        <button class="icon-button" type="button" data-import-action="save" title="Lưu quán" aria-label="Lưu quán">
          <i data-lucide="save"></i>
        </button>
        <button class="icon-button" type="button" data-import-action="remove" title="Bỏ qua" aria-label="Bỏ qua">
          <i data-lucide="x"></i>
        </button>
      </div>
    </div>
  `).join("");
  refreshIcons();
}

function handleImportQueueClick(event) {
  const button = event.target.closest("[data-import-action]");
  const itemEl = event.target.closest("[data-pending-id]");
  if (!button || !itemEl) return;

  const id = itemEl.dataset.pendingId;
  const item = pendingImports.find((pending) => pending.pendingId === id);
  if (!item) return;

  switch (button.dataset.importAction) {
    case "edit":
      pendingImports = pendingImports.filter((pending) => pending.pendingId !== id);
      renderImportQueue();
      openEditor(createPlaceDraftFromImport(item));
      showStatus("Đang sửa quán từ hàng chờ.");
      break;
    case "save":
      saveImportedPlace(item);
      pendingImports = pendingImports.filter((pending) => pending.pendingId !== id);
      renderImportQueue();
      break;
    case "remove":
      pendingImports = pendingImports.filter((pending) => pending.pendingId !== id);
      renderImportQueue();
      break;
  }
}

function saveAllPendingImports() {
  if (pendingImports.length === 0) return;
  const count = pendingImports.length;
  pushUndoSnapshot("lưu hàng chờ");
  pendingImports.forEach(saveImportedPlace);
  pendingImports = [];
  renderImportQueue();
  showUndoStatus(`Đã lưu ${count} quán.`);
}

function clearPendingImports() {
  pendingImports = [];
  renderImportQueue();
}

function saveImportedPlace(imported) {
  if (!undoStack.length || undoStack[undoStack.length - 1].label !== "lưu hàng chờ") {
    pushUndoSnapshot("lưu quán từ Maps");
  }
  const now = Date.now();
  const place = normalizePlace({
    ...createPlaceDraftFromImport(imported),
    id: makeId(),
    createdAt: now,
    updatedAt: now,
  });
  places.unshift(place);
  selectedId = place.id;
  savePlaces();
  render();
  selectPlace(place.id, true);
  showUndoStatus("Đã lưu quán từ Google Maps.");
}

function createPlaceDraftFromImport(imported) {
  const normalized = normalizeImportedPlace(imported);
  return {
    id: "",
    name: normalized.name || normalized.query || "Quán từ Google Maps",
    type: "cafe",
    address: normalized.address || normalized.query || "",
    lat: Number(normalized.lat),
    lng: Number(normalized.lng),
    priceLevel: 2,
    ratings: { taste: 3, quiet: 3, power: 3, date: 3, work: 3 },
    tags: [],
    notes: normalized.source ? `Nguồn: ${normalized.source}` : "",
    lastVisit: "",
    favorite: false,
    images: [],
    openingHours: { days: DAY_OPTIONS.map((day) => day.key), open: "", close: "" },
    visits: [],
  };
}

function normalizeImportedPlace(imported) {
  return {
    pendingId: imported.pendingId || "",
    name: String(imported.name || "").trim(),
    address: String(imported.address || "").trim(),
    query: String(imported.query || "").trim(),
    source: String(imported.source || "").trim(),
    lat: Number(imported.lat),
    lng: Number(imported.lng),
  };
}

function getImportKey(item) {
  const lat = Number(item.lat).toFixed(6);
  const lng = Number(item.lng).toFixed(6);
  return `${normalizeText(item.name || item.query)}:${lat},${lng}`;
}

function formatImportMeta(item) {
  const parts = [];
  if (hasCoordinates(item)) parts.push(`${Number(item.lat).toFixed(5)}, ${Number(item.lng).toFixed(5)}`);
  if (item.address) parts.push(item.address);
  return parts.join(" • ") || "Chưa có địa chỉ";
}

function parseGoogleMapsInput(raw) {
  const text = cleanupSharedText(raw);
  const result = { query: "", name: "", address: "", source: text, lat: null, lng: null, shortUrl: false };
  const url = parseUrl(text);

  if (!url) {
    result.query = text;
    return result;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  result.shortUrl = host === "maps.app.goo.gl" || host === "goo.gl" || host === "g.co";
  if (result.shortUrl) return result;

  const decoded = safeDecode(`${url.pathname}${url.search}${url.hash}`);
  const coordinates = findCoordinates(decoded)
    || findCoordinatesFromSearchParams(url.searchParams)
    || findCoordinates(text);
  if (coordinates) {
    result.lat = coordinates.lat;
    result.lng = coordinates.lng;
  }

  result.name = extractGoogleMapsName(url);
  result.query = extractGoogleMapsQuery(url) || result.name;
  return result;
}

function splitImportCandidates(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  const urlMatches = text.match(/https?:\/\/[^\s<>"']+/gi) || [];
  if (urlMatches.length > 0) {
    return uniqueStrings(urlMatches.map(cleanupSharedText));
  }

  const lines = text
    .split(/\n+/)
    .map(cleanupSharedText)
    .filter(Boolean);
  if (lines.length > 1) return uniqueStrings(lines);
  return [cleanupSharedText(text)];
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function extractGoogleMapsName(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  const namedPathKeys = new Set(["place", "search"]);
  const namedIndex = parts.findIndex((part) => namedPathKeys.has(part.toLowerCase()));
  if (namedIndex >= 0 && parts[namedIndex + 1]) {
    return cleanupPlaceName(parts[namedIndex + 1]);
  }
  const query = getFirstParam(url.searchParams, ["query", "q", "destination", "daddr", "near"]);
  return findCoordinates(query) ? "" : cleanupPlaceName(query);
}

function extractGoogleMapsQuery(url) {
  const direct = getFirstParam(url.searchParams, ["query", "q", "destination", "daddr", "near"]);
  if (direct && !findCoordinates(direct)) return cleanupPlaceName(direct);
  return extractGoogleMapsName(url);
}

function cleanupPlaceName(value) {
  return safeDecode(value)
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findCoordinatesFromSearchParams(params) {
  const direct = getFirstParam(params, ["q", "query", "ll", "center", "sll", "destination", "daddr"]);
  if (direct) {
    const found = findCoordinates(direct);
    if (found) return found;
  }

  for (const [, value] of params.entries()) {
    const found = findCoordinates(value);
    if (found) return found;
  }
  return null;
}

function findCoordinates(value) {
  if (!value) return null;
  const text = safeDecode(value);
  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:,|$)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&#](?:ll|center|sll|q|query|destination|daddr)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:$|[&,])/,
    /(?:^|[?&=,/ ])(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})(?:$|[&,/ ])/,
    /(?:^|\s)(-?\d{1,2}\.\d{3,})\s+(-?\d{1,3}\.\d{3,})(?:$|\s)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (isValidCoordinatePair(lat, lng)) return { lat, lng };
  }
  return null;
}

function getFirstParam(params, names) {
  for (const name of names) {
    const value = params.get(name);
    if (value) return value;
  }
  return "";
}

function cleanupSharedText(value) {
  return String(value || "")
    .trim()
    .replace(/[),.;]+$/g, "");
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function hasCoordinates(value) {
  return isValidCoordinatePair(Number(value.lat), Number(value.lng));
}

function isValidCoordinatePair(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
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
      userLocation = { lat: latitude, lng: longitude };
      map.setView([latitude, longitude], 15);
      if (userMarker) userMarker.remove();
      userMarker = L.circleMarker([latitude, longitude], {
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: "#176b68",
        fillOpacity: 1,
      }).addTo(map);
      render();
      showStatus("Đã cập nhật vị trí.");
    },
    () => showStatus("Không lấy được vị trí.", true),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
}

function createBackupPayload() {
  return {
    app: "quan-quen-map",
    version: 2,
    exportedAt: new Date().toISOString(),
    places,
  };
}

function exportPlainBackup() {
  downloadJson(createBackupPayload(), `taste-map-backup-${todayStamp()}.json`);
  markBackupExported();
  showStatus("Đã tạo file JSON backup.");
}

async function exportEncryptedBackup() {
  const password = prompt("Đặt mật khẩu cho file backup mã hóa:");
  if (password === null) return;
  if (password.length < 8) {
    showStatus("Mật khẩu backup tối thiểu 8 ký tự.", true);
    return;
  }

  try {
    const encrypted = await encryptBackup(createBackupPayload(), password);
    downloadJson(encrypted, `taste-map-backup-encrypted-${todayStamp()}.json`);
    markBackupExported();
    showStatus("Đã tạo file backup mã hóa.");
  } catch {
    showStatus("Không mã hóa được backup.", true);
  }
}

async function importPlaces() {
  const file = els.importFile.files?.[0];
  els.importFile.value = "";
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    const importedPayload = payload.encrypted ? await decryptBackupPrompt(payload) : payload;
    if (!importedPayload) return;
    const imported = Array.isArray(importedPayload) ? importedPayload : importedPayload.places;
    if (!Array.isArray(imported)) throw new Error("Invalid backup");
    const normalized = imported.map(normalizePlace).filter(isValidPlace);
    if (normalized.length === 0) throw new Error("No valid places");
    replaceAllPlaces(normalized, `Nhập ${normalized.length} quán và thay dữ liệu hiện tại?`, "Đã nhập dữ liệu.");
  } catch {
    showStatus("File nhập không hợp lệ.", true);
  }
}

async function decryptBackupPrompt(payload) {
  const password = prompt("Nhập mật khẩu file backup:");
  if (password === null) return null;
  return decryptBackup(payload, password);
}

async function encryptBackup(payload, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(password, salt);
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return {
    app: "quan-quen-map",
    version: 2,
    encrypted: true,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA-256",
    iterations: 250000,
    createdAt: new Date().toISOString(),
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(cipher),
  };
}

async function decryptBackup(payload, password) {
  const salt = base64ToUint8Array(payload.salt);
  const iv = base64ToUint8Array(payload.iv);
  const key = await deriveBackupKey(password, salt, payload.iterations || 250000);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64ToUint8Array(payload.data),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

async function deriveBackupKey(password, salt, iterations = 250000) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function replaceAllPlaces(nextPlaces, confirmMessage, successMessage) {
  if (confirmMessage && !confirm(confirmMessage)) return false;
  pushUndoSnapshot("thay dữ liệu");
  places = nextPlaces;
  selectedId = null;
  savePlaces();
  render();
  showUndoStatus(successMessage);
  return true;
}

function pushUndoSnapshot(label) {
  undoStack.push({
    label,
    places: JSON.parse(JSON.stringify(places)),
    selectedId,
    at: Date.now(),
  });
  undoStack = undoStack.slice(-12);
}

function undoLastChange() {
  const snapshot = undoStack.pop();
  if (!snapshot) {
    showStatus("Không có thao tác để hoàn tác.", true);
    return;
  }
  places = snapshot.places.map(normalizePlace).filter(isValidPlace);
  selectedId = snapshot.selectedId;
  savePlaces();
  closeEditor();
  render();
  if (selectedId && getPlace(selectedId)) selectPlace(selectedId, true);
  showStatus(`Đã hoàn tác ${snapshot.label}.`);
}

function showUndoStatus(message) {
  showStatus(message, false, {
    label: "Hoàn tác",
    onClick: undoLastChange,
  });
}

function markBackupExported() {
  const meta = getBackupMeta();
  meta.lastExportAt = new Date().toISOString();
  meta.dismissedAt = "";
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
  renderDataPanel();
}

function getBackupMeta() {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_META_KEY)) || {};
  } catch {
    return {};
  }
}

function dismissBackupReminder() {
  const meta = getBackupMeta();
  meta.dismissedAt = new Date().toISOString();
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
  renderDataPanel();
}

function arrayBufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToUint8Array(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function renderDataPanel() {
  if (!els.backupStatus) return;
  const meta = getBackupMeta();
  const lastExport = meta.lastExportAt ? new Date(meta.lastExportAt) : null;
  els.backupStatus.textContent = lastExport
    ? `Backup ${formatRelativeDays(lastExport)}`
    : "Chưa backup";
  els.backupReminder.classList.toggle("hidden", !shouldShowBackupReminder(meta));

  const settings = getGistSettings();
  if (document.activeElement !== els.gistToken) els.gistToken.value = settings.token || "";
  if (document.activeElement !== els.gistId) els.gistId.value = settings.gistId || "";
}

function shouldShowBackupReminder(meta) {
  if (places.length === 0) return false;
  const now = Date.now();
  const lastExport = meta.lastExportAt ? new Date(meta.lastExportAt).getTime() : 0;
  const dismissed = meta.dismissedAt ? new Date(meta.dismissedAt).getTime() : 0;
  const reminderMs = BACKUP_REMINDER_DAYS * 86400000;
  if (dismissed && now - dismissed < reminderMs) return false;
  return !lastExport || now - lastExport > reminderMs;
}

function formatRelativeDays(date) {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "hôm nay";
  return `${days} ngày trước`;
}

function getGistSettings() {
  try {
    return JSON.parse(localStorage.getItem(GIST_SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveGistSettings() {
  const settings = {
    token: els.gistToken.value.trim(),
    gistId: els.gistId.value.trim(),
  };
  localStorage.setItem(GIST_SETTINGS_KEY, JSON.stringify(settings));
  showStatus("Đã lưu cấu hình Gist.");
}

async function pushGistBackup() {
  const settings = readGistSettingsFromInputs();
  if (!settings.token) {
    showStatus("Cần GitHub token có quyền gist.", true);
    return;
  }

  try {
    setGistButtonsDisabled(true);
    const payload = createBackupPayload();
    const body = {
      description: "Taste Map backup",
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(payload, null, 2),
        },
      },
    };
    const url = settings.gistId
      ? `https://api.github.com/gists/${encodeURIComponent(settings.gistId)}`
      : "https://api.github.com/gists";
    const res = await fetch(url, {
      method: settings.gistId ? "PATCH" : "POST",
      headers: getGistHeaders(settings.token),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Gist push failed");
    const data = await res.json();
    els.gistId.value = data.id;
    localStorage.setItem(GIST_SETTINGS_KEY, JSON.stringify({ token: settings.token, gistId: data.id }));
    markBackupExported();
    showStatus("Đã đồng bộ lên GitHub Gist.");
  } catch {
    showStatus("Không đẩy được lên Gist.", true);
  } finally {
    setGistButtonsDisabled(false);
  }
}

async function pullGistBackup() {
  const settings = readGistSettingsFromInputs();
  if (!settings.token || !settings.gistId) {
    showStatus("Cần token và Gist ID để kéo dữ liệu.", true);
    return;
  }

  try {
    setGistButtonsDisabled(true);
    const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(settings.gistId)}`, {
      headers: getGistHeaders(settings.token),
    });
    if (!res.ok) throw new Error("Gist pull failed");
    const data = await res.json();
    const file = data.files?.[GIST_FILENAME] || Object.values(data.files || {})[0];
    if (!file?.content) throw new Error("No backup file");
    const payload = JSON.parse(file.content);
    const imported = Array.isArray(payload) ? payload : payload.places;
    if (!Array.isArray(imported)) throw new Error("Invalid backup");
    const normalized = imported.map(normalizePlace).filter(isValidPlace);
    if (normalized.length === 0) throw new Error("No valid places");
    replaceAllPlaces(normalized, `Kéo ${normalized.length} quán từ Gist và thay dữ liệu hiện tại?`, "Đã kéo dữ liệu từ Gist.");
  } catch {
    showStatus("Không kéo được dữ liệu từ Gist.", true);
  } finally {
    setGistButtonsDisabled(false);
  }
}

function readGistSettingsFromInputs() {
  const settings = {
    token: els.gistToken.value.trim(),
    gistId: els.gistId.value.trim(),
  };
  localStorage.setItem(GIST_SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

function getGistHeaders(token) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function setGistButtonsDisabled(disabled) {
  els.saveGistSettingsBtn.disabled = disabled;
  els.pushGistBtn.disabled = disabled;
  els.pullGistBtn.disabled = disabled;
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

function formatDate(dateString) {
  const [year, month, day] = String(dateString || "").split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function makeId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `place-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showStatus(message, isError = false, action = null) {
  clearTimeout(statusTimer);
  els.mapStatus.innerHTML = "";
  const text = document.createElement("span");
  text.textContent = message;
  els.mapStatus.appendChild(text);
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toast-action";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick, { once: true });
    els.mapStatus.appendChild(button);
  }
  els.mapStatus.classList.toggle("toast-error", isError);
  els.mapStatus.classList.remove("hidden");
  statusTimer = setTimeout(() => {
    els.mapStatus.classList.add("hidden");
    els.mapStatus.classList.remove("toast-error");
    els.mapStatus.innerHTML = "";
  }, action ? 6000 : 2300);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function setupInstallPrompt() {
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone;
  if (standalone) {
    els.installAppBtn.classList.add("hidden");
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.installAppBtn.classList.remove("hidden");
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    els.installAppBtn.classList.add("hidden");
    showStatus("Đã cài Taste Map.");
  });
}

async function installApp() {
  if (!deferredInstallPrompt) {
    showStatus("Trình duyệt chưa sẵn sàng cài app.", true);
    return;
  }

  els.installAppBtn.disabled = true;
  try {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === "accepted") {
      els.installAppBtn.classList.add("hidden");
      showStatus("Đang cài app.");
    }
    deferredInstallPrompt = null;
  } finally {
    els.installAppBtn.disabled = false;
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        showAppUpdateReady(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            showAppUpdateReady(worker);
          }
        });
      });
    }).catch((error) => {
      console.warn("Không đăng ký được service worker:", error);
    });
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

function showAppUpdateReady(worker) {
  waitingServiceWorker = worker;
  els.updateAppBtn.classList.remove("hidden");
  refreshIcons();
  showStatus("Có bản mới.", false, {
    label: "Cập nhật",
    onClick: applyAppUpdate,
  });
}

function applyAppUpdate() {
  if (!waitingServiceWorker) {
    window.location.reload();
    return;
  }
  els.updateAppBtn.disabled = true;
  waitingServiceWorker.postMessage({ type: "SKIP_WAITING" });
}

function handleSharedLaunch() {
  const params = new URLSearchParams(window.location.search);
  const sharedParts = ["title", "text", "url"]
    .map((key) => params.get(key))
    .filter(Boolean);
  if (sharedParts.length === 0) return;

  const sharedText = sharedParts.join("\n");
  els.mapsLinkInput.value = sharedText;
  history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
  processGoogleMapsImportText(sharedText, { openSingle: true }).catch(() => {
    showStatus("Không đọc được nội dung được chia sẻ.", true);
  });
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
