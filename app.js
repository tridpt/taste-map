"use strict";

const STORAGE_KEY = "quan-quen-map:places:v1";
const BACKUP_META_KEY = "quan-quen-map:backup-meta:v1";
const GIST_SETTINGS_KEY = "quan-quen-map:gist-settings:v1";
const SIDEBAR_STATE_KEY = "quan-quen-map:sidebar-state:v1";
const TYPES_KEY = "quan-quen-map:types:v1";
const COLLECTIONS_KEY = "quan-quen-map:collections:v1";
const IMAGE_DB_NAME = "quan-quen-map-images";
const IMAGE_STORE = "images";
const ITINERARIES_KEY = "quan-quen-map:itineraries:v1";
const THEME_KEY = "quan-quen-map:theme:v1";
const LANG_KEY = "quan-quen-map:lang:v1";
const THEME_COLORS = { light: "#f4f7f6", dark: "#0f1714" };
const BACKUP_REMINDER_DAYS = 7;
const RECENT_RECOMMENDATION_DAYS = 14;
const RANDOM_NEARBY_RADIUS = 3000;
const PRICE_ESTIMATE_VND = { 1: 40000, 2: 80000, 3: 150000, 4: 300000 };
const PHOTO_CATEGORIES = [
  { key: "food", label: "Món" },
  { key: "space", label: "Không gian" },
  { key: "menu", label: "Menu" },
  { key: "other", label: "Khác" },
];
const STALE_VISIT_DAYS = 45;
const STALE_FAVORITE_DAYS = 30;
const GIST_FILENAME = "taste-map-backup.json";
const DEFAULT_CENTER = [10.7769, 106.7009];

const DEFAULT_TYPES = [
  { key: "cafe", label: "Cafe", color: "#176b68", icon: "coffee" },
  { key: "food", label: "Ăn", color: "#bf4d35", icon: "utensils" },
  { key: "sweet", label: "Ngọt", color: "#8b477f", icon: "cake-slice" },
  { key: "drink", label: "Trà / bar", color: "#6550a7", icon: "glass-water" },
];

const TYPE_COLORS = ["#176b68", "#bf4d35", "#8b477f", "#6550a7", "#2f7d4f", "#b98524", "#3a6ea5", "#a6457f"];

let TYPES = DEFAULT_TYPES.map((type) => ({ ...type }));

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
let markerLayer = null;
let userMarker = null;
let userLocation = null;
let places = [];
let selectedId = null;
let activeTypes = new Set(TYPES.map((type) => type.key));
let activePurposes = new Set();
let activeTags = new Set();
let activeAreas = new Set();
let openNowOnly = false;
let openFilterDay = "";
let openFilterTime = "";
let priceRange = { min: 1, max: 4 };
let maxDistanceKm = 0;
let itinerary = [];
let routeLine = null;
let routeRequestKey = "";
let osrmRoute = null;
let collections = [];
let activeCollection = "";
let savedItineraries = [];
let tagManagerOpen = false;
let typeManagerOpen = false;
let lastFocusedBeforeEditor = null;
let heatLayer = null;
let heatmapMode = false;
let discoverMarker = null;
const imageCache = new Map();
const persistedImageIds = new Set();
let imageDbPromise = null;
let imageDbAvailable = true;
let lang = "vi";
let editorPhotos = [];
let editorVisits = [];
let editorOpeningDays = new Set(DAY_OPTIONS.map((day) => day.key));
let pendingImports = [];
let undoStack = [];
let deferredInstallPrompt = null;
let waitingServiceWorker = null;
let pinMode = false;
let statusTimer = null;
let recommendationRerollCount = 0;

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
  applyStoredLang();
  applyStoredTheme();
  loadTypes();
  setSidebarCollapsed(loadSidebarCollapsed(), { persist: false, refresh: false });
  hydrateStaticControls();
  syncRangeLabels();
  places = loadPlaces();
  collections = loadCollections();
  savedItineraries = loadSavedItineraries();
  initMap();
  bindEvents();
  render();
  renderDataPanel();
  refreshIcons();
  setupInstallPrompt();
  registerServiceWorker();
  handleSharedLaunch();
  initImages();
}

function cacheElements() {
  [
    "workspace",
    "sidebarToggleBtn",
    "placeCount",
    "globalSearch",
    "locateBtn",
    "themeToggleBtn",
    "langToggleBtn",
    "langLabel",
    "exportBtn",
    "importTrigger",
    "importFile",
    "installAppBtn",
    "updateAppBtn",
    "newPlaceBtn",
    "resetFiltersBtn",
    "typeFilters",
    "manageTypesBtn",
    "typeManager",
    "newTypeName",
    "addTypeBtn",
    "typeManagerList",
    "purposeFilters",
    "tagFilters",
    "manageTagsBtn",
    "tagManager",
    "sortMode",
    "openNowFilter",
    "openFilterDay",
    "openFilterTime",
    "priceMin",
    "priceMax",
    "priceRangeLabel",
    "distanceFilter",
    "distanceLabel",
    "areaFilters",
    "itineraryMeta",
    "itineraryContent",
    "newCollectionBtn",
    "collectionFilterList",
    "suggestMood",
    "rerollRecommendationsBtn",
    "recommendationList",
    "favoriteReminder",
    "backupStatus",
    "backupReminder",
    "dataPlaceCount",
    "dataBackupAt",
    "dataGistStatus",
    "dataStorageUsage",
    "dismissBackupReminderBtn",
    "encryptedExportBtn",
    "plainExportBtn",
    "csvImportTrigger",
    "csvImportFile",
    "csvExportBtn",
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
    "placeDetailMeta",
    "placeDetailContent",
    "statsSummary",
    "statsContent",
    "pinModeBtn",
    "randomNearbyBtn",
    "heatmapBtn",
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
    "photoCategory",
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
        <span>${escapeHtml(typeLabel(type))}</span>
      </button>
    `,
  ).join("");

  els.purposeFilters.innerHTML = PURPOSES.map(
    (purpose) => `
      <button class="chip-button" type="button" data-key="${escapeAttr(purpose.key)}" aria-pressed="false">
        <i data-lucide="${escapeAttr(purpose.icon)}"></i>
        <span>${escapeHtml(purposeLabel(purpose.key))}</span>
      </button>
    `,
  ).join("");

  els.placeType.innerHTML = TYPES.map(
    (type) => `<option value="${escapeAttr(type.key)}">${escapeHtml(typeLabel(type))}</option>`,
  ).join("");

  els.ratingFields.innerHTML = PURPOSES.map(
    (purpose) => `
      <div class="rating-row">
        <label for="rating-${escapeAttr(purpose.key)}">${escapeHtml(purposeLabel(purpose.key))}</label>
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
    showStatus(t("msg.mapLoadFail"), true);
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

  markerLayer = typeof L.markerClusterGroup === "function"
    ? L.markerClusterGroup({
        maxClusterRadius: 50,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        chunkedLoading: true,
      })
    : L.layerGroup();
  markerLayer.addTo(map);

  map.on("click", (event) => {
    if (!pinMode && !isEditorOpen()) return;
    setFormCoordinates(event.latlng.lat, event.latlng.lng);
    if (!isEditorOpen()) openEditor();
    reverseLookup(event.latlng.lat, event.latlng.lng);
    setPinMode(false);
    showStatus(t("msg.pinPicked"));
  });
}

function bindEvents() {
  els.sidebarToggleBtn.addEventListener("click", toggleSidebar);
  els.globalSearch.addEventListener("input", render);
  els.sortMode.addEventListener("change", render);
  els.suggestMood.addEventListener("change", () => {
    recommendationRerollCount = 0;
    renderRecommendations();
  });
  els.rerollRecommendationsBtn.addEventListener("click", rerollRecommendations);
  els.newPlaceBtn.addEventListener("click", () => openEditor());
  els.closeEditorBtn.addEventListener("click", closeEditor);
  els.resetFiltersBtn.addEventListener("click", resetFilters);
  els.placeForm.addEventListener("submit", savePlace);
  els.deletePlaceBtn.addEventListener("click", deleteCurrentPlace);
  els.locateBtn.addEventListener("click", locateUser);
  els.themeToggleBtn.addEventListener("click", toggleTheme);
  els.langToggleBtn.addEventListener("click", toggleLang);
  els.openNowFilter.addEventListener("click", () => {
    openNowOnly = !openNowOnly;
    syncFilterButtons();
    render();
  });
  els.openFilterDay.addEventListener("change", () => {
    openFilterDay = els.openFilterDay.value;
    if (openNowOnly) render();
  });
  els.openFilterTime.addEventListener("change", () => {
    openFilterTime = els.openFilterTime.value;
    if (openNowOnly) render();
  });
  els.priceMin.addEventListener("input", handlePriceRangeInput);
  els.priceMax.addEventListener("input", handlePriceRangeInput);
  els.distanceFilter.addEventListener("input", () => {
    maxDistanceKm = Number(els.distanceFilter.value);
    syncRangeLabels();
    render();
  });
  els.areaFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-area]");
    if (!button) return;
    const area = button.dataset.area;
    if (activeAreas.has(area)) activeAreas.delete(area);
    else activeAreas.add(area);
    syncFilterButtons();
    render();
  });
  els.itineraryContent.addEventListener("click", handleItineraryAction);
  els.newCollectionBtn.addEventListener("click", promptNewCollection);
  els.collectionFilterList.addEventListener("click", handleCollectionFilterClick);
  els.manageTagsBtn.addEventListener("click", () => {
    tagManagerOpen = !tagManagerOpen;
    els.tagManager.classList.toggle("hidden", !tagManagerOpen);
    els.manageTagsBtn.setAttribute("aria-pressed", String(tagManagerOpen));
    renderTagManager();
  });
  els.tagManager.addEventListener("click", handleTagManagerAction);
  els.manageTypesBtn.addEventListener("click", () => {
    typeManagerOpen = !typeManagerOpen;
    els.typeManager.classList.toggle("hidden", !typeManagerOpen);
    els.manageTypesBtn.setAttribute("aria-pressed", String(typeManagerOpen));
    renderTypeManager();
  });
  els.addTypeBtn.addEventListener("click", () => {
    const type = createCustomType(els.newTypeName.value);
    if (type) {
      els.newTypeName.value = "";
      showStatus(t("msg.typeAdded", { name: type.label }));
    } else {
      showStatus(t("msg.typeInvalid"), true);
    }
  });
  els.typeManagerList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-type]");
    if (!button) return;
    if (!window.confirm(t("msg.confirmDeleteType"))) return;
    deleteCustomType(button.dataset.deleteType);
  });
  els.exportBtn.addEventListener("click", exportEncryptedBackup);
  els.encryptedExportBtn.addEventListener("click", exportEncryptedBackup);
  els.plainExportBtn.addEventListener("click", exportPlainBackup);
  els.csvImportTrigger.addEventListener("click", () => els.csvImportFile.click());
  els.csvImportFile.addEventListener("change", handleCsvImport);
  els.csvExportBtn.addEventListener("click", exportCsv);
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
  els.randomNearbyBtn.addEventListener("click", pickRandomNearby);
  els.heatmapBtn.addEventListener("click", toggleHeatmap);

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

  els.favoriteReminder.addEventListener("click", (event) => {
    const item = event.target.closest("[data-place-id]");
    if (!item) return;
    selectPlace(item.dataset.placeId, true);
  });

  els.placeDetailContent.addEventListener("click", handlePlaceDetailAction);
  els.statsContent.addEventListener("click", (event) => {
    const stale = event.target.closest("[data-stale-id]");
    if (stale) selectPlace(stale.dataset.staleId, true);
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
    showStatus(t("msg.geoToForm"));
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
  els.photoGallery.addEventListener("change", (event) => {
    const select = event.target.closest("[data-photo-category]");
    if (!select) return;
    const photo = editorPhotos.find((item) => item.id === select.dataset.photoCategory);
    if (photo) {
      photo.category = select.value;
      renderEditorPhotos();
    }
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
    if (event.key === "Tab") trapEditorFocus(event);
    if (event.key === "Escape") {
      els.geoResults.classList.add("hidden");
      if (pinMode) setPinMode(false);
      else if (isEditorOpen()) closeEditor();
    }
  });
}

function loadSidebarCollapsed() {
  return localStorage.getItem(SIDEBAR_STATE_KEY) === "collapsed";
}

function toggleSidebar() {
  setSidebarCollapsed(!els.workspace.classList.contains("sidebar-collapsed"));
}

function setSidebarCollapsed(collapsed, { persist = true, refresh = true } = {}) {
  els.workspace.classList.toggle("sidebar-collapsed", collapsed);
  els.sidebarToggleBtn.setAttribute("aria-pressed", String(collapsed));
  const label = collapsed ? "Mở thanh bên" : "Thu gọn thanh bên";
  const icon = collapsed ? "panel-left-open" : "panel-left-close";
  els.sidebarToggleBtn.title = label;
  els.sidebarToggleBtn.setAttribute("aria-label", label);
  els.sidebarToggleBtn.innerHTML = `<i data-lucide="${icon}"></i>`;

  if (persist) {
    localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? "collapsed" : "expanded");
  }
  if (refresh) refreshIcons();
  setTimeout(() => map?.invalidateSize(), 190);
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
    showStatus(t("msg.dataLoadFail"), true);
    return [];
  }
}

function savePlaces() {
  const serialized = places.map((place) => ({
    ...place,
    images: place.images.map((image) => ({ id: image.id, category: image.category })),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  persistImagesToDb();
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
  const validCategory = new Set(PHOTO_CATEGORIES.map((cat) => cat.key));
  const out = [];
  for (const photo of images.slice(0, 8)) {
    if (typeof photo === "string") {
      if (photo.startsWith("data:image/")) {
        out.push({ id: makeId(), category: "other", dataUrl: photo });
      }
      continue;
    }
    if (!photo || !photo.id) continue;
    const category = validCategory.has(photo.category) ? photo.category : "other";
    const entry = { id: String(photo.id), category };
    if (typeof photo.dataUrl === "string" && photo.dataUrl.startsWith("data:image/")) {
      entry.dataUrl = photo.dataUrl;
    }
    out.push(entry);
  }
  return out;
}

function imageDataUrl(image) {
  if (!image) return "";
  return image.dataUrl || imageCache.get(image.id) || "";
}

function openImageDb() {
  if (imageDbPromise) return imageDbPromise;
  imageDbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      imageDbAvailable = false;
      reject(new Error("IndexedDB không khả dụng"));
      return;
    }
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      imageDbAvailable = false;
      reject(request.error);
    };
  });
  return imageDbPromise;
}

async function loadImagesFromDb() {
  try {
    const db = await openImageDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, "readonly");
      const store = tx.objectStore(IMAGE_STORE);
      const keysReq = store.getAllKeys();
      const valuesReq = store.getAll();
      tx.oncomplete = () => {
        keysReq.result.forEach((key, index) => {
          imageCache.set(String(key), valuesReq.result[index]);
          persistedImageIds.add(String(key));
        });
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    imageDbAvailable = false;
  }
}

function writeImageToDb(id, dataUrl) {
  return new Promise((resolve) => {
    openImageDb()
      .then((db) => {
        const tx = db.transaction(IMAGE_STORE, "readwrite");
        tx.objectStore(IMAGE_STORE).put(dataUrl, id);
        tx.oncomplete = () => {
          persistedImageIds.add(id);
          resolve(true);
        };
        tx.onerror = () => resolve(false);
      })
      .catch(() => resolve(false));
  });
}

function persistImagesToDb() {
  if (!imageDbAvailable) return Promise.resolve();
  const writes = [];
  places.forEach((place) => {
    place.images.forEach((image) => {
      if (!image.dataUrl) return;
      imageCache.set(image.id, image.dataUrl);
      if (!persistedImageIds.has(image.id)) {
        writes.push(writeImageToDb(image.id, image.dataUrl));
      }
    });
  });
  return Promise.allSettled(writes);
}

function deleteImageFromDb(id) {
  return new Promise((resolve) => {
    openImageDb()
      .then((db) => {
        const tx = db.transaction(IMAGE_STORE, "readwrite");
        tx.objectStore(IMAGE_STORE).delete(id);
        tx.oncomplete = () => {
          persistedImageIds.delete(id);
          imageCache.delete(id);
          resolve(true);
        };
        tx.onerror = () => resolve(false);
      })
      .catch(() => resolve(false));
  });
}

function pruneOrphanImages() {
  const referenced = new Set();
  places.forEach((place) => place.images.forEach((image) => referenced.add(image.id)));
  const orphans = [...persistedImageIds].filter((id) => !referenced.has(id));
  imageCache.forEach((_, id) => {
    if (!referenced.has(id)) orphans.push(id);
  });
  const unique = [...new Set(orphans)];
  if (unique.length === 0) return Promise.resolve(0);
  return Promise.allSettled(unique.map(deleteImageFromDb)).then(() => unique.length);
}

function hydratePlaceImages() {  places.forEach((place) => {
    place.images.forEach((image) => {
      if (!image.dataUrl) {
        const cached = imageCache.get(image.id);
        if (cached) image.dataUrl = cached;
      }
    });
    place.images = place.images.filter((image) => image.dataUrl);
  });
}

async function initImages() {
  await loadImagesFromDb();
  hydratePlaceImages();
  await persistImagesToDb();
  savePlaces();
  render();
  pruneOrphanImages();
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
  els.placeCount.textContent = t("count.places", { n: places.length });
  els.filteredCount.textContent = String(filtered.length);
  renderTagFilters();
  renderTagManager();
  renderAreaFilters();
  renderRecommendations();
  renderFavoriteReminder();
  renderList(filtered);
  renderMarkers(filtered);
  renderHeat(filtered);
  renderRoute();
  renderItinerary();
  renderCollections();
  renderPlaceDetail();
  renderStats();
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

function renderTagManager() {
  if (!els.tagManager || !tagManagerOpen) return;
  const counts = new Map();
  places.forEach((place) => {
    place.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });
  const tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"));

  if (tags.length === 0) {
    els.tagManager.innerHTML = `<p class="stats-note">${escapeHtml(t("ui.noTags"))}</p>`;
    return;
  }

  els.tagManager.innerHTML = tags.map(([tag, count]) => `
    <div class="tag-manager-row">
      <span class="tag-manager-name">${escapeHtml(tag)} <span>${count}</span></span>
      <div class="tag-manager-actions">
        <button class="icon-button" type="button" data-tag-action="rename" data-tag="${escapeAttr(tag)}" title="${escapeAttr(t("ui.rename"))}" aria-label="${escapeAttr(t("ui.renameTag"))}">
          <i data-lucide="pencil"></i>
        </button>
        <button class="icon-button" type="button" data-tag-action="delete" data-tag="${escapeAttr(tag)}" title="${escapeAttr(t("ui.delete"))}" aria-label="${escapeAttr(t("ui.deleteTag"))}">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
  `).join("");
}

function handleTagManagerAction(event) {
  const button = event.target.closest("[data-tag-action]");
  if (!button) return;
  const tag = button.dataset.tag;
  if (button.dataset.tagAction === "rename") {
    const next = window.prompt(t("prompt.renameTag", { tag }), tag);
    if (next === null) return;
    const affected = renameTag(tag, next);
    showStatus(affected ? t("msg.tagRenamed", { n: affected }) : t("msg.tagInvalid"), !affected);
  } else if (button.dataset.tagAction === "delete") {
    if (!window.confirm(t("prompt.confirmDeleteTag", { tag }))) return;
    const affected = deleteTag(tag);
    showStatus(t("msg.tagDeleted", { n: affected }));
  }
}

function renameTag(oldTag, newTag) {
  const from = String(oldTag || "").trim();
  const to = String(newTag || "").trim().slice(0, 40);
  if (!from || !to || from === to) return 0;
  let affected = 0;
  pushUndoSnapshot("đổi tên tag");
  places.forEach((place) => {
    if (!place.tags.includes(from)) return;
    const next = [];
    place.tags.forEach((tag) => {
      const value = tag === from ? to : tag;
      if (!next.includes(value)) next.push(value);
    });
    place.tags = next;
    place.updatedAt = Date.now();
    affected += 1;
  });
  if (affected) {
    if (activeTags.has(from)) {
      activeTags.delete(from);
      activeTags.add(to);
    }
    savePlaces();
    render();
  } else {
    undoStack.pop();
  }
  return affected;
}

function deleteTag(tag) {
  const target = String(tag || "").trim();
  if (!target) return 0;
  let affected = 0;
  pushUndoSnapshot("xóa tag");
  places.forEach((place) => {
    if (!place.tags.includes(target)) return;
    place.tags = place.tags.filter((value) => value !== target);
    place.updatedAt = Date.now();
    affected += 1;
  });
  if (affected) {
    activeTags.delete(target);
    savePlaces();
    render();
  } else {
    undoStack.pop();
  }
  return affected;
}

function renderAreaFilters() {  const counts = new Map();
  places.forEach((place) => {
    const area = getPlaceArea(place);
    counts.set(area, (counts.get(area) || 0) + 1);
  });

  activeAreas.forEach((area) => {
    if (!counts.has(area)) activeAreas.delete(area);
  });

  const areas = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"));

  els.areaFilters.innerHTML = areas.map(([area, count]) => `
    <button class="chip-button" type="button" data-area="${escapeAttr(area)}" aria-pressed="${activeAreas.has(area)}">
      <span>${escapeHtml(area)}</span>
      <span>${count}</span>
    </button>
  `).join("");
}

function renderRecommendations() {
  const mood = els.suggestMood.value;
  const candidates = places
    .filter((place) => activeTypes.has(place.type))
    .filter((place) => [...activeTags].every((tag) => place.tags.includes(tag)));
  els.rerollRecommendationsBtn.disabled = candidates.length <= 1 || (mood === "nearby" && !userLocation);

  if (mood === "nearby" && !userLocation) {
    els.recommendationList.innerHTML = `<p class="recommendation-empty">${escapeHtml(t("ui.recNeedLocation"))}</p>`;
    return;
  }

  const scored = candidates.map((place) => ({ place, score: getMoodScore(place, mood) }));
  const recommended = getRecommendedPlaces(scored);

  if (recommended.length === 0) {
    els.recommendationList.innerHTML = `<p class="recommendation-empty">${escapeHtml(t("ui.recEmpty"))}</p>`;
    return;
  }

  els.recommendationList.innerHTML = recommended.map(({ place, score }) => {
    const distance = formatDistance(getDistanceFromUser(place));
    const meta = [typeLabel(getType(place.type)), distance, getOpeningStatus(place).label]
      .filter(Boolean)
      .join(" • ");
    return `
      <button class="recommendation-item" type="button" data-place-id="${escapeAttr(place.id)}">
        <span>
          <strong>${escapeHtml(place.name)}</strong>
          <span>${escapeHtml(meta || place.address || t("ui.noAddress"))}</span>
        </span>
        <span class="score-badge">${Math.round(score)}</span>
      </button>
    `;
  }).join("");
}

function rerollRecommendations() {
  recommendationRerollCount += 1;
  renderRecommendations();
  showStatus(t("msg.recReroll"));
}

function getFavoriteReminders() {
  return places
    .filter((place) => place.favorite)
    .map((place) => ({ place, lastVisit: place.visits[0]?.date || place.lastVisit || "" }))
    .filter((item) => !item.lastVisit || daysSince(item.lastVisit) >= STALE_FAVORITE_DAYS)
    .sort((a, b) => {
      const da = a.lastVisit ? daysSince(a.lastVisit) : Number.POSITIVE_INFINITY;
      const db = b.lastVisit ? daysSince(b.lastVisit) : Number.POSITIVE_INFINITY;
      return db - da;
    })
    .slice(0, 3);
}

function renderFavoriteReminder() {
  if (!els.favoriteReminder) return;
  const reminders = getFavoriteReminders();

  if (reminders.length === 0) {
    els.favoriteReminder.classList.add("hidden");
    els.favoriteReminder.innerHTML = "";
    return;
  }

  const items = reminders.map(({ place, lastVisit }) => {
    const note = lastVisit ? t("ui.days", { n: daysSince(lastVisit) }) : t("ui.neverVisited");
    return `
      <button class="favorite-reminder-item" type="button" data-place-id="${escapeAttr(place.id)}">
        <span class="favorite-reminder-name">${escapeHtml(place.name)}</span>
        <span class="favorite-reminder-days">${escapeHtml(note)}</span>
      </button>
    `;
  }).join("");

  els.favoriteReminder.classList.remove("hidden");
  els.favoriteReminder.innerHTML = `
    <div class="favorite-reminder-head">
      <i data-lucide="bell"></i>
      <span>${escapeHtml(t("ui.reminderTitle"))}</span>
    </div>
    <div class="favorite-reminder-list">${items}</div>
  `;
}
function getRecommendedPlaces(scored) {
  const ranked = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const pool = ranked.length ? ranked : scored.slice().sort((a, b) => b.score - a.score);
  const limit = Math.min(3, pool.length);

  if (recommendationRerollCount === 0) {
    return pool.slice(0, limit);
  }

  const fresh = pool.filter(({ place }) => !wasVisitedRecently(place));
  const weightedPool = fresh.length >= limit ? fresh : pool;
  const picked = pickWeightedRecommendations(weightedPool, limit);
  if (picked.length >= limit) return picked;

  const pickedIds = new Set(picked.map(({ place }) => place.id));
  const fallback = pool.filter(({ place }) => !pickedIds.has(place.id));
  return [...picked, ...fallback].slice(0, limit);
}

function pickWeightedRecommendations(items, limit) {
  const remaining = [...items];
  const picked = [];

  while (remaining.length > 0 && picked.length < limit) {
    const totalWeight = remaining.reduce((sum, item) => sum + getRecommendationWeight(item), 0);
    let ticket = Math.random() * totalWeight;
    const index = remaining.findIndex((item) => {
      ticket -= getRecommendationWeight(item);
      return ticket <= 0;
    });
    const [selected] = remaining.splice(index >= 0 ? index : remaining.length - 1, 1);
    picked.push(selected);
  }

  return picked;
}

function getRecommendationWeight({ place, score }) {
  const recencyPenalty = wasVisitedRecently(place) ? 0.22 : 1;
  return Math.max(1, score) ** 1.25 * recencyPenalty;
}

function wasVisitedRecently(place) {
  const latest = place.visits[0]?.date || place.lastVisit || "";
  return latest ? daysSince(latest) <= RECENT_RECOMMENDATION_DAYS : false;
}

function renderList(filtered) {
  els.emptyState.classList.toggle("hidden", filtered.length > 0);
  els.placeList.innerHTML = filtered.map((place) => {
    const type = getType(place.type);
    const selected = place.id === selectedId ? " selected" : "";
    const status = getOpeningStatus(place);
    const distance = formatDistance(getDistanceFromUser(place));
    const thumb = imageDataUrl(place.images[0]);
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
              <p>${escapeHtml(place.address || t("ui.noAddress"))}</p>
            </div>
            <span class="score-badge">${Math.round(getFitScore(place))}</span>
          </div>
          <div class="place-meta">
            <span class="type-badge" style="background:${escapeAttr(type.color)}">
              <i data-lucide="${escapeAttr(type.icon)}"></i>
              ${escapeHtml(typeLabel(type))}
            </span>
            <span class="price-badge">${formatPrice(place.priceLevel)}</span>
            ${distance ? `<span class="price-badge">${escapeHtml(distance)}</span>` : ""}
            ${status.label ? `<span class="price-badge status-badge ${status.state}">${escapeHtml(status.label)}</span>` : ""}
            ${place.visits.length ? `<span class="price-badge">${escapeHtml(t("ui.visitsCount", { n: place.visits.length }))}</span>` : ""}
            ${place.favorite ? `<span class="price-badge">${escapeHtml(t("ui.favorite"))}</span>` : ""}
          </div>
          <div class="rating-strip">${ratings}</div>
          ${tags ? `<div class="place-meta">${tags}</div>` : ""}
          <div class="place-meta">
            <button class="text-button" type="button" data-action="edit" data-id="${escapeAttr(place.id)}">${escapeHtml(t("ui.edit"))}</button>
            <button class="text-button" type="button" data-action="favorite" data-id="${escapeAttr(place.id)}">
              ${place.favorite ? escapeHtml(t("ui.unfavorite")) : escapeHtml(t("ui.favorite"))}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderMarkers(filtered) {
  if (!map || !markerLayer) return;

  const visibleIds = new Set(filtered.map((place) => place.id));
  markers.forEach((marker, id) => {
    if (!visibleIds.has(id)) {
      markerLayer.removeLayer(marker);
      markers.delete(id);
    }
  });

  filtered.forEach((place) => {
    let marker = markers.get(place.id);
    const icon = createMarkerIcon(place, place.id === selectedId);
    if (!marker) {
      marker = L.marker([place.lat, place.lng], { icon });
      marker.on("click", () => selectPlace(place.id, false));
      markers.set(place.id, marker);
      markerLayer.addLayer(marker);
    } else {
      marker.setLatLng([place.lat, place.lng]);
      marker.setIcon(icon);
    }
    marker.bindPopup(createPopup(place));
  });

  if (heatmapMode && map.hasLayer(markerLayer)) {
    map.removeLayer(markerLayer);
  } else if (!heatmapMode && !map.hasLayer(markerLayer)) {
    markerLayer.addTo(map);
  }
}

function renderHeat(filtered) {
  if (!map) return;
  if (!heatmapMode || typeof L.heatLayer !== "function") {
    if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    return;
  }
  const points = filtered.map((place) => [
    place.lat,
    place.lng,
    Math.max(0.25, getFitScore(place) / 100),
  ]);
  if (!heatLayer) {
    heatLayer = L.heatLayer(points, { radius: 32, blur: 22, maxZoom: 17 });
  } else {
    heatLayer.setLatLngs(points);
  }
  if (!map.hasLayer(heatLayer)) heatLayer.addTo(map);
}

function toggleHeatmap() {
  if (typeof L.heatLayer !== "function") {
    showStatus(t("msg.heatLoadFail"), true);
    return;
  }
  heatmapMode = !heatmapMode;
  els.heatmapBtn.setAttribute("aria-pressed", String(heatmapMode));
  render();
  showStatus(heatmapMode ? t("msg.heatOn") : t("msg.heatOff"));
}

function getFilteredPlaces() {
  const term = normalizeText(els.globalSearch.value);
  const filtered = places.filter((place) => {
    if (!activeTypes.has(place.type)) return false;
    if (place.priceLevel < priceRange.min || place.priceLevel > priceRange.max) return false;
    if (maxDistanceKm > 0) {
      const distance = getDistanceFromUser(place);
      if (distance == null || distance > maxDistanceKm * 1000) return false;
    }
    if (activeAreas.size > 0 && !activeAreas.has(getPlaceArea(place))) return false;
    if (activeCollection) {
      const collection = collections.find((item) => item.id === activeCollection);
      if (collection && !collection.placeIds.includes(place.id)) return false;
    }
    if (openNowOnly && getOpenStatusForFilter(place).state !== "open") return false;
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
    case "new":
      score = place.visits.length === 0
        ? 60 + getFitScore(place) * 0.4
        : Math.max(0, 20 - place.visits.length * 5);
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
  return getOpeningStatusAt(place, now.getDay(), now.getHours() * 60 + now.getMinutes());
}

function getOpeningStatusAt(place, day, minutes) {
  const hours = place.openingHours;
  if (!hours?.open || !hours?.close || !hours.days?.length) {
    return { state: "", label: "" };
  }

  const yesterday = (day + 6) % 7;
  const open = timeToMinutes(hours.open);
  const close = timeToMinutes(hours.close);
  const overnight = close <= open;
  const openToday = hours.days.includes(day);
  const openYesterday = hours.days.includes(yesterday);

  let isOpen = false;
  if (overnight) {
    isOpen = (openToday && minutes >= open) || (openYesterday && minutes < close);
  } else {
    isOpen = openToday && minutes >= open && minutes < close;
  }

  return {
    state: isOpen ? "open" : "closed",
    label: isOpen ? t("ui.statusOpen") : t("ui.statusClosed"),
  };
}

function timeToMinutes(value) {
  const [hour, minute] = String(value || "00:00").split(":").map(Number);
  return hour * 60 + minute;
}

function getOpenStatusForFilter(place) {
  if (!openFilterTime) return getOpeningStatus(place);
  const day = openFilterDay === "" ? new Date().getDay() : Number(openFilterDay);
  return getOpeningStatusAt(place, day, timeToMinutes(openFilterTime));
}

function getPlaceArea(place) {
  return parseArea(place.address);
}

function parseArea(address) {
  const text = String(address || "").trim();
  if (!text) return "Khác";
  const patterns = [
    /qu(?:ậ|a)n\s+[^,]+/i,
    /\bq\.?\s*\d+/i,
    /huy(?:ệ|e)n\s+[^,]+/i,
    /(?:tp\.?|th(?:à|a)nh ph(?:ố|o))\s+[^,]+/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }
  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "Khác";
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
      <p>${escapeHtml(place.address || t("ui.noAddress"))}</p>
      <div class="place-popup-row">
        <span class="type-badge" style="background:${escapeAttr(type.color)}">${escapeHtml(typeLabel(type))}</span>
        <span class="price-badge">${formatPrice(place.priceLevel)}</span>
        ${distance ? `<span class="price-badge">${escapeHtml(distance)}</span>` : ""}
        ${status.label ? `<span class="price-badge status-badge ${status.state}">${escapeHtml(status.label)}</span>` : ""}
        <span class="score-badge">${Math.round(getFitScore(place))}</span>
      </div>
    </div>
  `;
}

function renderPlaceDetail() {
  const place = selectedId ? getPlace(selectedId) : null;
  if (!place) {
    els.placeDetailMeta.textContent = t("detail.pick");
    els.placeDetailContent.innerHTML = `
      <div class="place-detail-empty">
        <i data-lucide="mouse-pointer-2"></i>
        <span>${escapeHtml(t("ui.detailEmpty"))}</span>
      </div>
    `;
    return;
  }

  const type = getType(place.type);
  const status = getOpeningStatus(place);
  const distance = formatDistance(getDistanceFromUser(place));
  const photo = imageDataUrl(place.images[0]);
  const recentVisits = place.visits.slice(0, 3);
  const lastVisit = recentVisits[0]?.date || place.lastVisit || "";
  const tags = place.tags.slice(0, 5).map((tag) => `
    <button class="tag-badge tag-filter-shortcut" type="button" data-detail-action="filter-tag" data-tag="${escapeAttr(tag)}">
      ${escapeHtml(tag)}
    </button>
  `).join("");
  els.placeDetailMeta.textContent = t("ui.points", { n: Math.round(getFitScore(place)) });
  const meta = [
    `<span class="type-badge" style="background:${escapeAttr(type.color)}"><i data-lucide="${escapeAttr(type.icon)}"></i>${escapeHtml(typeLabel(type))}</span>`,
    `<span class="price-badge">${formatPrice(place.priceLevel)}</span>`,
    distance ? `<span class="price-badge">${escapeHtml(distance)}</span>` : "",
    status.label ? `<span class="price-badge status-badge ${status.state}">${escapeHtml(status.label)}</span>` : "",
    place.favorite ? `<span class="price-badge">${escapeHtml(t("ui.favorite"))}</span>` : "",
  ].filter(Boolean).join("");

  els.placeDetailContent.innerHTML = `
    <div class="place-detail-layout">
      <div class="place-detail-media">
        ${photo
          ? `<img src="${escapeAttr(photo)}" alt="${escapeAttr(place.name)}" />`
          : `<div class="place-detail-placeholder" style="--detail-color:${escapeAttr(type.color)}"><i data-lucide="${escapeAttr(type.icon)}"></i></div>`}
      </div>
      <div class="place-detail-main">
        <div class="place-detail-title">
          <div>
            <h3>${escapeHtml(place.name)}</h3>
            <p>${escapeHtml(place.address || t("ui.noAddress"))}</p>
          </div>
          <span class="score-badge">${Math.round(getFitScore(place))}</span>
        </div>
        <div class="place-meta">${meta}</div>
        ${tags ? `<div class="place-meta">${tags}</div>` : ""}
        <div class="place-detail-actions">
          <button class="ghost-button" type="button" data-detail-action="open-maps" data-id="${escapeAttr(place.id)}">
            <i data-lucide="map"></i>
            <span>Google Maps</span>
          </button>
          <button class="ghost-button" type="button" data-detail-action="directions" data-id="${escapeAttr(place.id)}">
            <i data-lucide="route"></i>
            <span>${escapeHtml(t("ui.directions"))}</span>
          </button>
          <button class="ghost-button" type="button" data-detail-action="directions-apple" data-id="${escapeAttr(place.id)}">
            <i data-lucide="apple"></i>
            <span>Apple Maps</span>
          </button>
          <button class="ghost-button" type="button" data-detail-action="share" data-id="${escapeAttr(place.id)}">
            <i data-lucide="share-2"></i>
            <span>${escapeHtml(t("ui.share"))}</span>
          </button>
          <button class="ghost-button" type="button" data-detail-action="itinerary" data-id="${escapeAttr(place.id)}">
            <i data-lucide="${itinerary.includes(place.id) ? "calendar-minus" : "calendar-plus"}"></i>
            <span>${itinerary.includes(place.id) ? escapeHtml(t("ui.removeItinerary")) : escapeHtml(t("ui.addItinerary"))}</span>
          </button>
          <button class="ghost-button" type="button" data-detail-action="visit" data-id="${escapeAttr(place.id)}">
            <i data-lucide="calendar-check"></i>
            <span>${escapeHtml(t("ui.visited"))}</span>
          </button>
          <button class="ghost-button" type="button" data-detail-action="edit" data-id="${escapeAttr(place.id)}">
            <i data-lucide="pencil"></i>
            <span>${escapeHtml(t("ui.edit"))}</span>
          </button>
        </div>
        ${place.notes ? `<p class="place-detail-note">${escapeHtml(place.notes)}</p>` : ""}
        ${collections.length ? `
          <div class="place-collections">
            <span class="place-collections-label">${escapeHtml(t("ui.collections"))}</span>
            <div class="place-collections-chips">
              ${collections.map((collection) => `
                <button class="chip-button" type="button" data-detail-action="toggle-collection" data-collection-id="${escapeAttr(collection.id)}" data-id="${escapeAttr(place.id)}" aria-pressed="${collection.placeIds.includes(place.id) ? "true" : "false"}">
                  <span>${escapeHtml(collection.name)}</span>
                </button>
              `).join("")}
            </div>
          </div>
        ` : ""}
        <div class="place-detail-visits">
          <strong>${lastVisit ? t("ui.lastVisitAt", { date: formatDate(lastVisit) }) : t("ui.noVisit")}</strong>
          ${recentVisits.length ? recentVisits.map((visit) => `
            <span>${escapeHtml(formatDate(visit.date))} • ${visit.rating}/5${visit.note ? ` · ${escapeHtml(visit.note)}` : ""}</span>
          `).join("") : ""}
        </div>
        ${renderDetailAlbums(place)}
      </div>
    </div>
  `;
}

function renderDetailAlbums(place) {
  if (!place.images || place.images.length === 0) return "";
  const sections = PHOTO_CATEGORIES.map((cat) => {
    const photos = place.images.filter((img) => (img.category || "other") === cat.key);
    if (photos.length === 0) return "";
    const thumbs = photos.map((img) => {
      const url = imageDataUrl(img);
      return url ? `<img class="detail-album-thumb" src="${escapeAttr(url)}" alt="${escapeAttr(t(`album.${cat.key}`))}" loading="lazy" />` : "";
    }).join("");
    if (!thumbs) return "";
    return `
      <div class="detail-album">
        <span class="detail-album-label">${escapeHtml(t(`album.${cat.key}`))} <span>${photos.length}</span></span>
        <div class="detail-album-row">${thumbs}</div>
      </div>
    `;
  }).join("");
  return sections ? `<div class="place-detail-albums">${sections}</div>` : "";
}

function handlePlaceDetailAction(event) {  const button = event.target.closest("[data-detail-action]");
  if (!button) return;

  if (button.dataset.detailAction === "filter-tag") {
    filterByDetailTag(button.dataset.tag);
    return;
  }

  if (button.dataset.detailAction === "toggle-collection") {
    toggleCollectionMembership(button.dataset.collectionId, button.dataset.id);
    return;
  }

  const place = getPlace(button.dataset.id);
  if (!place) return;

  switch (button.dataset.detailAction) {
    case "open-maps":
      openExternalMap(place, false);
      break;
    case "directions":
      openExternalMap(place, true);
      break;
    case "directions-apple":
      openAppleMaps(place);
      break;
    case "share":
      sharePlace(place);
      break;
    case "itinerary":
      toggleItinerary(place.id);
      break;
    case "visit":
      markPlaceVisited(place.id);
      break;
    case "edit":
      openEditor(place);
      break;
  }
}

function filterByDetailTag(tag) {
  if (!tag) return;
  activeTags.add(tag);
  setSidebarCollapsed(false);
  syncFilterButtons();
  render();
  showStatus(t("msg.tagFiltered", { tag }));
}

function openExternalMap(place, directions) {
  const url = directions ? getDirectionsUrl(place) : getGoogleMapsUrl(place);
  window.open(url, "_blank", "noopener");
}

function getGoogleMapsUrl(place) {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", `${place.lat},${place.lng}`);
  return url.toString();
}

function getDirectionsUrl(place) {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  if (userLocation) {
    url.searchParams.set("origin", `${userLocation.lat},${userLocation.lng}`);
  }
  url.searchParams.set("destination", `${place.lat},${place.lng}`);
  return url.toString();
}

function openAppleMaps(place) {
  window.open(getAppleMapsUrl(place), "_blank", "noopener");
}function getAppleMapsUrl(place) {
  const url = new URL("https://maps.apple.com/");
  url.searchParams.set("daddr", `${place.lat},${place.lng}`);
  if (userLocation) {
    url.searchParams.set("saddr", `${userLocation.lat},${userLocation.lng}`);
  }
  url.searchParams.set("dirflg", "d");
  if (place.name) url.searchParams.set("q", place.name);
  return url.toString();
}

function sharePlace(place) {
  const payload = buildSharePayload(place);
  if (navigator.share) {
    navigator.share(payload).catch(() => {});
    return;
  }
  copyShareText(payload.text);
}

function buildSharePayload(place) {
  const url = getGoogleMapsUrl(place);
  const lines = [place.name];
  if (place.address) lines.push(place.address);
  lines.push(url);
  return {
    title: place.name,
    text: lines.join("\n"),
    url,
  };
}

async function copyShareText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showStatus(t("msg.shareCopied"));
      return;
    }
  } catch {
    // fall through to manual copy hint
  }
  showStatus(t("msg.shareCopyFail"), true);
}

function applyStoredTheme() {
  applyTheme(loadTheme());
}

function t(key, params) {
  const dict = (typeof I18N_STRINGS !== "undefined" && I18N_STRINGS[lang]) || {};
  const fallback = (typeof I18N_STRINGS !== "undefined" && I18N_STRINGS.vi) || {};
  let text = dict[key] != null ? dict[key] : (fallback[key] != null ? fallback[key] : key);
  if (params) {
    Object.keys(params).forEach((name) => {
      text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(params[name]));
    });
  }
  return text;
}

function loadLang() {
  const stored = localStorage.getItem(LANG_KEY);
  return stored === "en" ? "en" : "vi";
}

function applyStoredLang() {
  lang = loadLang();
  applyTranslations();
}

function applyTranslations() {
  document.documentElement.setAttribute("lang", lang);
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
  });
  if (els.langLabel) els.langLabel.textContent = lang === "en" ? "EN" : "VI";
}

function toggleLang() {
  lang = lang === "en" ? "vi" : "en";
  localStorage.setItem(LANG_KEY, lang);
  applyTranslations();
  hydrateStaticControls();
  syncFilterButtons();
  applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  render();
}

function typeLabel(type) {
  if (!type) return "";
  return type.custom ? type.label : t(`type.${type.key}`);
}

function purposeLabel(key) {
  return t(`purpose.${key}`);
}
function loadTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark = window.matchMedia
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", THEME_COLORS[next]);

  if (els.themeToggleBtn) {
    const isDark = next === "dark";
    els.themeToggleBtn.setAttribute("aria-pressed", String(isDark));
    const label = isDark ? t("topbar.themeToLight") : t("topbar.themeToDark");
    els.themeToggleBtn.setAttribute("title", label);
    els.themeToggleBtn.setAttribute("aria-label", label);
    const icon = els.themeToggleBtn.querySelector("i");
    if (icon) icon.setAttribute("data-lucide", isDark ? "sun" : "moon");
    refreshIcons();
  }
}

function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  showStatus(next === "dark" ? t("msg.themeDark") : t("msg.themeLight"));
}

function openEditor(place = null) {
  const hasDraft = Boolean(place);
  const isEdit = Boolean(place?.id);
  if (!isEditorOpen()) {
    lastFocusedBeforeEditor = document.activeElement;
  }
  els.workspace.classList.add("editor-open");
  els.editorPanel.setAttribute("aria-hidden", "false");
  els.editorMode.textContent = isEdit ? t("editor.editing") : (hasDraft ? t("editor.fromMaps") : t("editor.new"));
  els.editorTitle.textContent = hasDraft ? place.name : t("editor.save");
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
  editorPhotos = normalizeImages(data.images).map((image) => ({
    ...image,
    dataUrl: imageDataUrl(image),
  })).filter((image) => image.dataUrl);
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

  const restore = lastFocusedBeforeEditor;
  lastFocusedBeforeEditor = null;
  if (restore && document.body.contains(restore)) {
    restore.focus();
  } else {
    els.newPlaceBtn.focus();
  }
}

function trapEditorFocus(event) {
  if (event.key !== "Tab" || !isEditorOpen()) return;
  const focusable = els.editorPanel.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  const visible = [...focusable].filter((el) => el.offsetParent !== null || el === document.activeElement);
  if (visible.length === 0) return;
  const first = visible[0];
  const last = visible[visible.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (!els.editorPanel.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  }
}

async function handlePhotoSelection() {
  const files = [...(els.placePhotosInput.files || [])].filter((file) => file.type.startsWith("image/"));
  els.placePhotosInput.value = "";
  if (files.length === 0) return;

  try {
    const remainingSlots = Math.max(0, 8 - editorPhotos.length);
    const selected = files.slice(0, remainingSlots);
    const category = els.photoCategory.value || "other";
    const photos = await Promise.all(selected.map((file) => readCompressedPhoto(file, category)));
    editorPhotos = [...editorPhotos, ...photos.filter(Boolean)];
    renderEditorPhotos();
    if (files.length > selected.length) {
      showStatus(t("msg.photoMax"));
    }
  } catch {
    showStatus(t("msg.photoReadFail"), true);
  }
}

function readCompressedPhoto(file, category = "other") {
  return new Promise((resolve, reject) => {    const reader = new FileReader();
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
          category,
        });
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderEditorPhotos() {
  if (editorPhotos.length === 0) {
    els.photoGallery.innerHTML = "";
    return;
  }

  const optionsFor = (current) => PHOTO_CATEGORIES
    .map((cat) => `<option value="${cat.key}"${cat.key === current ? " selected" : ""}>${escapeHtml(cat.label)}</option>`)
    .join("");

  els.photoGallery.innerHTML = PHOTO_CATEGORIES
    .map((cat) => {
      const photos = editorPhotos.filter((photo) => (photo.category || "other") === cat.key);
      if (photos.length === 0) return "";
      const tiles = photos.map((photo) => `
        <div class="photo-tile">
          <img src="${escapeAttr(imageDataUrl(photo))}" alt="Ảnh quán ${escapeAttr(cat.label)}" />
          <select class="photo-category" data-photo-category="${escapeAttr(photo.id)}" aria-label="Album ảnh">
            ${optionsFor(photo.category || "other")}
          </select>
          <button type="button" data-photo-id="${escapeAttr(photo.id)}" title="${escapeAttr(t("ui.deletePhoto"))}" aria-label="${escapeAttr(t("ui.deletePhoto"))}">
            <i data-lucide="x"></i>
          </button>
        </div>
      `).join("");
      return `
        <div class="photo-album">
          <h4 class="photo-album-title">${escapeHtml(cat.label)} <span>${photos.length}</span></h4>
          <div class="photo-album-grid">${tiles}</div>
        </div>
      `;
    })
    .join("");
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
      <button type="button" data-visit-id="${escapeAttr(visit.id)}" title="${escapeAttr(t("ui.deleteVisit"))}" aria-label="${escapeAttr(t("ui.deleteVisit"))}">
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
    showStatus(t("msg.placeInvalid"), true);
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
  showUndoStatus(t("msg.placeSaved"));
}

function deleteCurrentPlace() {
  const id = els.placeId.value;
  if (!id) return;
  const place = getPlace(id);
  if (!place) return;
  if (!confirm(t("msg.confirmDeletePlace", { name: place.name }))) return;

  pushUndoSnapshot("xóa quán");
  places = places.filter((item) => item.id !== id);
  if (selectedId === id) selectedId = null;
  savePlaces();
  closeEditor();
  render();
  showUndoStatus(t("msg.placeDeleted"));
}

function selectPlace(id, panTo) {
  const place = getPlace(id);
  if (!place) return;
  selectedId = id;
  render();
  const marker = markers.get(id);
  if (panTo) {
    if (marker && markerLayer && typeof markerLayer.zoomToShowLayer === "function") {
      markerLayer.zoomToShowLayer(marker, () => marker.openPopup());
    } else {
      map?.setView([place.lat, place.lng], Math.max(map.getZoom(), 15));
      marker?.openPopup();
    }
  } else {
    marker?.openPopup();
  }
}

function toggleFavorite(id) {
  const place = getPlace(id);
  if (!place) return;
  pushUndoSnapshot("đổi quán ruột");
  place.favorite = !place.favorite;
  place.updatedAt = Date.now();
  savePlaces();
  render();
  showUndoStatus(t("msg.favoriteUpdated"));
}

function markPlaceVisited(id) {
  const place = getPlace(id);
  if (!place) return;

  const today = todayStamp();
  const alreadyMarkedToday = place.visits.some((visit) => visit.date === today);
  if (alreadyMarkedToday) {
    showStatus(t("msg.visitToday"));
    return;
  }

  pushUndoSnapshot("đánh dấu đã ghé");
  place.visits = normalizeVisits([
    {
      id: makeId(),
      date: today,
      rating: 4,
      note: "Đánh dấu nhanh",
    },
    ...place.visits,
  ]);
  place.lastVisit = today;
  place.updatedAt = Date.now();
  selectedId = place.id;
  savePlaces();
  render();
  showUndoStatus(t("msg.visitMarked"));
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
  activeAreas = new Set();
  openNowOnly = false;
  openFilterDay = "";
  openFilterTime = "";
  priceRange = { min: 1, max: 4 };
  maxDistanceKm = 0;
  els.globalSearch.value = "";
  els.sortMode.value = "fit";
  els.openFilterDay.value = "";
  els.openFilterTime.value = "";
  els.priceMin.value = "1";
  els.priceMax.value = "4";
  els.distanceFilter.value = "0";
  syncRangeLabels();
  syncFilterButtons();
  render();
}

function handlePriceRangeInput() {
  let min = Number(els.priceMin.value);
  let max = Number(els.priceMax.value);
  if (min > max) {
    if (document.activeElement === els.priceMin) {
      max = min;
      els.priceMax.value = String(max);
    } else {
      min = max;
      els.priceMin.value = String(min);
    }
  }
  priceRange = { min, max };
  syncRangeLabels();
  render();
}

function syncRangeLabels() {
  els.priceRangeLabel.textContent = `${formatPrice(priceRange.min)} – ${formatPrice(priceRange.max)}`;
  els.distanceLabel.textContent = maxDistanceKm > 0 ? `${maxDistanceKm} km` : "Tắt";
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
  els.areaFilters.querySelectorAll("[data-area]").forEach((button) => {
    button.setAttribute("aria-pressed", String(activeAreas.has(button.dataset.area)));
  });
  els.openNowFilter.setAttribute("aria-pressed", String(openNowOnly));
}

function setPinMode(value) {
  pinMode = value;
  els.pinModeBtn.setAttribute("aria-pressed", String(pinMode));
  document.body.classList.toggle("pin-mode", pinMode);
  if (pinMode) showStatus(t("msg.pinHint"));
}

async function pickRandomNearby() {
  const center = userLocation || (map && map.getCenter());
  if (!center) {
    showStatus(t("msg.nearbyNoCenter"), true);
    return;
  }

  showStatus(t("msg.nearbySearching"));
  try {
    const pois = await fetchNearbyPois(center.lat, center.lng, RANDOM_NEARBY_RADIUS);
    const fresh = pois.filter((poi) => !isPoiAlreadySaved(poi));
    const pool = fresh.length ? fresh : pois;
    if (pool.length) {
      showDiscoveredPlace(pool[Math.floor(Math.random() * pool.length)]);
      return;
    }
    showStatus(t("msg.nearbyNoNew"));
  } catch {
    showStatus(t("msg.nearbyNetFail"), true);
  }
  fallbackRandomSaved();
}

function fallbackRandomSaved() {
  const pool = getFilteredPlaces();
  if (pool.length === 0) {
    showStatus(t("msg.nearbyNoSaved"), true);
    return;
  }
  const place = (userLocation && randomNearbyPlace()) || pool[Math.floor(Math.random() * pool.length)];
  selectPlace(place.id, true);
  const distance = formatDistance(getDistanceFromUser(place));
  showStatus(t("msg.nearbyFromList", { name: place.name, dist: distance ? ` · ${distance}` : "" }));
}

async function fetchNearbyPois(lat, lng, radius) {
  const query = `[out:json][timeout:20];(node["amenity"~"cafe|restaurant|fast_food|bar|pub|ice_cream|bakery"]["name"](around:${radius},${lat},${lng}););out 80;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error("overpass failed");
  return parseOverpassPois(await res.json());
}

function parseOverpassPois(data) {
  return (data?.elements || []).filter((el) => Number.isFinite(el.lat) && Number.isFinite(el.lon) && el.tags?.name);
}

function isPoiAlreadySaved(poi) {
  return places.some((place) => haversineMeters(place.lat, place.lng, poi.lat, poi.lon) < 40);
}

function guessTypeFromTags(tags = {}) {
  const amenity = String(tags.amenity || "");
  const cuisine = normalizeText(tags.cuisine || "");
  if (amenity === "cafe") return "cafe";
  if (amenity === "bar" || amenity === "pub") return "drink";
  if (amenity === "ice_cream" || amenity === "bakery" || cuisine.includes("dessert") || cuisine.includes("cake")) return "sweet";
  if (amenity === "restaurant" || amenity === "fast_food") return "food";
  return "food";
}

function poiAddress(tags = {}) {
  return [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], tags["addr:city"]]
    .filter(Boolean)
    .join(", ");
}

function poiToDraft(poi) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: "",
    name: poi.tags.name,
    type: guessTypeFromTags(poi.tags),
    address: poiAddress(poi.tags),
    lat: poi.lat,
    lng: poi.lon,
    priceLevel: 2,
    ratings: { taste: 3, quiet: 3, power: 3, date: 3, work: 3 },
    tags: [],
    notes: "Gợi ý từ bản đồ",
    lastVisit: today,
    favorite: false,
    images: [],
    openingHours: { days: DAY_OPTIONS.map((day) => day.key), open: "", close: "" },
    visits: [],
  };
}

function showDiscoveredPlace(poi) {
  const draft = poiToDraft(poi);
  if (discoverMarker) {
    discoverMarker.remove();
    discoverMarker = null;
  }
  if (map) {
    map.setView([poi.lat, poi.lon], Math.max(map.getZoom(), 16));
    discoverMarker = L.marker([poi.lat, poi.lon], { icon: createDiscoverIcon() }).addTo(map);
    const distance = formatDistance(getDistanceFromUser({ lat: poi.lat, lng: poi.lon }));
    discoverMarker.bindPopup(`
      <div class="place-popup">
        <h3>${escapeHtml(draft.name)}</h3>
        <p>${escapeHtml(draft.address || t("ui.discoverNearby"))}</p>
        <div class="place-popup-row">
          <span class="type-badge" style="background:${escapeAttr(getType(draft.type).color)}">${escapeHtml(typeLabel(getType(draft.type)))}</span>
          ${distance ? `<span class="price-badge">${escapeHtml(distance)}</span>` : ""}
        </div>
      </div>
    `).openPopup();
    refreshIcons();
  }
  showStatus(t("msg.discoverFound", { name: draft.name }), false, {
    label: t("msg.discoverSave"),
    onClick: () => {
      if (discoverMarker) {
        discoverMarker.remove();
        discoverMarker = null;
      }
      openEditor(draft);
    },
  });
}

function createDiscoverIcon() {
  return L.divIcon({
    className: "discover-div-marker",
    html: '<span class="discover-pin"><i data-lucide="sparkles"></i></span>',
    iconSize: [34, 42],
    iconAnchor: [17, 38],
    popupAnchor: [0, -36],
  });
}

function randomNearbyPlace(radiusMeters = RANDOM_NEARBY_RADIUS) {
  if (!userLocation) return null;
  const withDistance = getFilteredPlaces()
    .map((place) => ({ place, distance: getDistanceFromUser(place) }))
    .filter((item) => Number.isFinite(item.distance));
  if (withDistance.length === 0) return null;

  const within = withDistance.filter((item) => item.distance <= radiusMeters);
  const candidates = within.length
    ? within
    : withDistance.sort((a, b) => a.distance - b.distance).slice(0, Math.min(5, withDistance.length));
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return pick.place;
}

function toggleItinerary(id) {
  if (!getPlace(id)) return;
  const index = itinerary.indexOf(id);
  if (index >= 0) {
    itinerary.splice(index, 1);
    showStatus(t("msg.itineraryRemoved"));
  } else {
    itinerary.push(id);
    showStatus(t("msg.itineraryAdded"));
  }
  render();
}

function handleItineraryAction(event) {
  const button = event.target.closest("[data-itinerary-action]");
  if (!button) return;
  const action = button.dataset.itineraryAction;

  if (action === "directions") {
    openItineraryDirections();
    return;
  }
  if (action === "clear") {
    itinerary = [];
    render();
    showStatus(t("msg.itineraryCleared"));
    return;
  }
  if (action === "save-current") {
    saveCurrentItinerary();
    return;
  }
  if (action === "load-saved") {
    loadSavedItinerary(button.dataset.savedId);
    return;
  }
  if (action === "delete-saved") {
    deleteSavedItinerary(button.dataset.savedId);
    return;
  }

  const id = button.dataset.id;
  const index = itinerary.indexOf(id);
  if (index < 0) return;

  if (action === "remove") {
    itinerary.splice(index, 1);
  } else if (action === "up" && index > 0) {
    [itinerary[index - 1], itinerary[index]] = [itinerary[index], itinerary[index - 1]];
  } else if (action === "down" && index < itinerary.length - 1) {
    [itinerary[index + 1], itinerary[index]] = [itinerary[index], itinerary[index + 1]];
  } else if (action === "select") {
    selectPlace(id, true);
    return;
  }
  render();
}

function renderItinerary() {
  if (!els.itineraryContent) return;
  const stops = itinerary.map((id) => getPlace(id)).filter(Boolean);
  itinerary = stops.map((place) => place.id);

  els.itineraryMeta.textContent = t("count.stops", { n: stops.length });

  let currentSection;
  if (stops.length === 0) {
    currentSection = `
      <div class="itinerary-empty">
        <i data-lucide="route"></i>
        <span>${escapeHtml(t("ui.itineraryEmpty"))}</span>
      </div>
    `;
  } else {
    const total = itineraryTotalDistance(stops);
    const key = routeKeyOf(stops);
    const hasReal = osrmRoute && osrmRoute.key === key;
    const summaryLabel = hasReal ? t("ui.routeReal") : t("ui.routeStraight");
    const summaryValue = hasReal
      ? `${formatRouteDistance(osrmRoute.distanceMeters)} · ${formatDuration(osrmRoute.durationSec)}`
      : (total > 0 ? formatRouteDistance(total) : "-");
    const rows = stops.map((place, index) => `
      <div class="itinerary-stop">
        <span class="itinerary-index">${index + 1}</span>
        <button class="itinerary-name" type="button" data-itinerary-action="select" data-id="${escapeAttr(place.id)}">
          <strong>${escapeHtml(place.name)}</strong>
          <span>${escapeHtml(place.address || t("ui.noAddress"))}</span>
        </button>
        <div class="itinerary-stop-actions">
          <button class="icon-button" type="button" data-itinerary-action="up" data-id="${escapeAttr(place.id)}" title="${escapeAttr(t("ui.moveUp"))}" aria-label="${escapeAttr(t("ui.moveUp"))}" ${index === 0 ? "disabled" : ""}>
            <i data-lucide="chevron-up"></i>
          </button>
          <button class="icon-button" type="button" data-itinerary-action="down" data-id="${escapeAttr(place.id)}" title="${escapeAttr(t("ui.moveDown"))}" aria-label="${escapeAttr(t("ui.moveDown"))}" ${index === stops.length - 1 ? "disabled" : ""}>
            <i data-lucide="chevron-down"></i>
          </button>
          <button class="icon-button" type="button" data-itinerary-action="remove" data-id="${escapeAttr(place.id)}" title="${escapeAttr(t("ui.remove"))}" aria-label="${escapeAttr(t("ui.remove"))}">
            <i data-lucide="x"></i>
          </button>
        </div>
      </div>
    `).join("");

    currentSection = `
      <div class="itinerary-list">${rows}</div>
      <div class="itinerary-summary">
        <span>${summaryLabel}</span>
        <strong>${summaryValue}</strong>
      </div>
      <div class="data-actions">
        <button class="primary-button" type="button" data-itinerary-action="directions">
          <i data-lucide="navigation"></i>
          <span>${escapeHtml(t("ui.directionsItinerary"))}</span>
        </button>
        <button class="ghost-button" type="button" data-itinerary-action="save-current">
          <i data-lucide="bookmark"></i>
          <span>${escapeHtml(t("ui.save"))}</span>
        </button>
        <button class="ghost-button" type="button" data-itinerary-action="clear">
          <i data-lucide="trash-2"></i>
          <span>${escapeHtml(t("ui.clearAll"))}</span>
        </button>
      </div>
    `;
  }

  let savedSection = "";
  if (savedItineraries.length) {
    const savedRows = savedItineraries.map((saved) => `
      <div class="saved-itinerary">
        <button class="saved-itinerary-load" type="button" data-itinerary-action="load-saved" data-saved-id="${escapeAttr(saved.id)}">
          <strong>${escapeHtml(saved.name)}</strong>
          <span>${escapeHtml(t("count.stops", { n: saved.placeIds.length }))}</span>
        </button>
        <button class="icon-button" type="button" data-itinerary-action="delete-saved" data-saved-id="${escapeAttr(saved.id)}" title="${escapeAttr(t("ui.delete"))}" aria-label="${escapeAttr(t("ui.delete"))}">
          <i data-lucide="x"></i>
        </button>
      </div>
    `).join("");
    savedSection = `
      <div class="saved-itinerary-section">
        <h3>${escapeHtml(t("ui.savedItineraries"))}</h3>
        <div class="saved-itinerary-list">${savedRows}</div>
      </div>
    `;
  }

  els.itineraryContent.innerHTML = currentSection + savedSection;
}

function itineraryTotalDistance(stops) {
  let total = 0;
  for (let i = 1; i < stops.length; i += 1) {
    total += haversineMeters(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng);
  }
  return total;
}

function formatRouteDistance(distance) {
  if (distance < 1000) return `${Math.round(distance)} m`;
  return `${(distance / 1000).toFixed(distance < 10000 ? 1 : 0)} km`;
}

function renderRoute() {
  if (!map) return;
  const stops = itinerary.map((id) => getPlace(id)).filter(Boolean);
  const key = routeKeyOf(stops);

  if (routeLine) {
    routeLine.remove();
    routeLine = null;
  }
  if (stops.length < 2) {
    routeRequestKey = "";
    osrmRoute = null;
    return;
  }

  const useOsrm = osrmRoute && osrmRoute.key === key;
  const latlngs = useOsrm ? osrmRoute.latlngs : stops.map((place) => [place.lat, place.lng]);
  routeLine = L.polyline(latlngs, {
    color: "#6550a7",
    weight: 4,
    opacity: 0.85,
    dashArray: useOsrm ? null : "6 8",
  }).addTo(map);

  if (!useOsrm && key !== routeRequestKey) {
    routeRequestKey = key;
    fetchOsrmRoute(stops, key);
  }
}

function routeKeyOf(stops) {
  return stops.map((place) => `${place.lat},${place.lng}`).join(";");
}

async function fetchOsrmRoute(stops, key) {
  if (typeof fetch !== "function") return;
  try {
    const coords = stops.map((place) => `${place.lng},${place.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("route failed");
    const parsed = parseOsrmRoute(await res.json(), key);
    if (!parsed) throw new Error("no route");
    osrmRoute = parsed;
    if (routeKeyOf(itinerary.map((id) => getPlace(id)).filter(Boolean)) === key) {
      renderRoute();
      renderItinerary();
    }
  } catch {
    // giữ đường chim bay làm dự phòng khi không lấy được tuyến thật
  }
}

function parseOsrmRoute(data, key) {
  const route = data?.routes?.[0];
  if (!route?.geometry?.coordinates) return null;
  return {
    key,
    distanceMeters: route.distance,
    durationSec: route.duration,
    latlngs: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}

function formatDuration(seconds) {
  const mins = Math.round((Number(seconds) || 0) / 60);
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours} giờ`;
}

function openItineraryDirections() {
  const stops = itinerary.map((id) => getPlace(id)).filter(Boolean);
  if (stops.length === 0) {
    showStatus(t("msg.itineraryEmpty"), true);
    return;
  }
  window.open(getItineraryDirectionsUrl(stops), "_blank", "noopener");
}

function getItineraryDirectionsUrl(stops) {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  const points = stops.map((place) => `${place.lat},${place.lng}`);
  if (userLocation) {
    url.searchParams.set("origin", `${userLocation.lat},${userLocation.lng}`);
    url.searchParams.set("destination", points[points.length - 1]);
    const waypoints = points.slice(0, -1);
    if (waypoints.length) url.searchParams.set("waypoints", waypoints.join("|"));
  } else {
    url.searchParams.set("origin", points[0]);
    url.searchParams.set("destination", points[points.length - 1]);
    const waypoints = points.slice(1, -1);
    if (waypoints.length) url.searchParams.set("waypoints", waypoints.join("|"));
  }
  return url.toString();
}

function loadSavedItineraries() {
  try {
    const raw = JSON.parse(localStorage.getItem(ITINERARIES_KEY));
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item) => item && item.id && item.name)
      .map((item) => ({
        id: String(item.id),
        name: String(item.name).trim().slice(0, 60),
        placeIds: Array.isArray(item.placeIds) ? item.placeIds.map(String) : [],
      }));
  } catch {
    return [];
  }
}

function saveSavedItineraries() {
  localStorage.setItem(ITINERARIES_KEY, JSON.stringify(savedItineraries));
}

function saveCurrentItinerary() {
  if (itinerary.length === 0) {
    showStatus(t("msg.itineraryEmpty"), true);
    return;
  }
  const name = window.prompt(t("prompt.itineraryName"));
  if (name === null) return;
  const clean = String(name).trim().slice(0, 60);
  if (!clean) {
    showStatus(t("msg.itineraryNameInvalid"), true);
    return;
  }
  savedItineraries.push({ id: makeId(), name: clean, placeIds: [...itinerary] });
  saveSavedItineraries();
  render();
  showStatus(t("msg.itinerarySaved", { name: clean }));
}

function loadSavedItinerary(id) {
  const saved = savedItineraries.find((item) => item.id === id);
  if (!saved) return;
  itinerary = saved.placeIds.filter((placeId) => getPlace(placeId));
  render();
  showStatus(t("msg.itineraryOpened", { name: saved.name }));
}

function deleteSavedItinerary(id) {
  savedItineraries = savedItineraries.filter((item) => item.id !== id);
  saveSavedItineraries();
  render();
  showStatus(t("msg.itineraryDeleted"));
}

function loadCollections() {
  try {
    const raw = JSON.parse(localStorage.getItem(COLLECTIONS_KEY));
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item) => item && item.id && item.name)
      .map((item) => ({
        id: String(item.id),
        name: String(item.name).trim().slice(0, 60),
        placeIds: Array.isArray(item.placeIds) ? item.placeIds.map(String) : [],
      }));
  } catch {
    return [];
  }
}

function saveCollections() {
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
}

function createCollection(name) {
  const clean = String(name || "").trim().slice(0, 60);
  if (!clean) return null;
  const collection = { id: makeId(), name: clean, placeIds: [] };
  collections.push(collection);
  saveCollections();
  render();
  return collection;
}

function promptNewCollection() {
  const name = window.prompt(t("prompt.collectionName"));
  if (name === null) return;
  const collection = createCollection(name);
  if (collection) showStatus(t("msg.collectionCreated", { name: collection.name }));
  else showStatus(t("msg.collectionInvalid"), true);
}

function deleteCollection(id) {
  collections = collections.filter((item) => item.id !== id);
  if (activeCollection === id) activeCollection = "";
  saveCollections();
  render();
  showStatus(t("msg.collectionDeleted"));
}

function toggleCollectionMembership(collectionId, placeId) {
  const collection = collections.find((item) => item.id === collectionId);
  if (!collection || !getPlace(placeId)) return;
  const index = collection.placeIds.indexOf(placeId);
  if (index >= 0) collection.placeIds.splice(index, 1);
  else collection.placeIds.push(placeId);
  saveCollections();
  render();
}

function handleCollectionFilterClick(event) {
  const remove = event.target.closest("[data-collection-remove]");
  if (remove) {
    event.stopPropagation();
    deleteCollection(remove.dataset.collectionRemove);
    return;
  }
  const chip = event.target.closest("[data-collection-filter]");
  if (!chip) return;
  const id = chip.dataset.collectionFilter;
  activeCollection = activeCollection === id ? "" : id;
  render();
}

function renderCollections() {
  if (!els.collectionFilterList) return;

  if (collections.length === 0) {
    els.collectionFilterList.innerHTML = `
      <p class="stats-note">${escapeHtml(t("ui.collectionsEmpty"))}</p>
    `;
    return;
  }

  const allChip = `
    <button class="chip-button${activeCollection === "" ? "" : ""}" type="button" data-collection-filter="" aria-pressed="${activeCollection === "" ? "true" : "false"}">
      <span>${escapeHtml(t("ui.collectionAll"))}</span>
      <span>${places.length}</span>
    </button>
  `;

  const chips = collections.map((collection) => `
    <span class="collection-chip-wrap">
      <button class="chip-button" type="button" data-collection-filter="${escapeAttr(collection.id)}" aria-pressed="${activeCollection === collection.id ? "true" : "false"}">
        <span>${escapeHtml(collection.name)}</span>
        <span>${collection.placeIds.length}</span>
      </button>
      <button class="collection-remove" type="button" data-collection-remove="${escapeAttr(collection.id)}" title="${escapeAttr(t("ui.deleteCollectionTitle"))}" aria-label="${escapeAttr(t("ui.deleteCollectionTitle"))}">
        <i data-lucide="x"></i>
      </button>
    </span>
  `).join("");

  els.collectionFilterList.innerHTML = allChip + chips;
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
    showStatus(t("msg.geoNotFound"), true);
  } finally {
    els.geoSearchBtn.disabled = false;
  }
}

async function importFromGoogleMaps() {
  const raw = els.mapsLinkInput.value.trim();
  if (!raw) {
    showStatus(t("msg.pasteLink"), true);
    return;
  }

  els.mapsImportBtn.disabled = true;
  try {
    await processGoogleMapsImportText(raw, { openSingle: true });
  } catch {
    showStatus(t("msg.mapsImportFail"), true);
  } finally {
    els.mapsImportBtn.disabled = false;
  }
}

async function pasteMapsFromClipboard() {
  if (!navigator.clipboard?.readText) {
    showStatus(t("msg.clipboardBlocked"), true);
    return;
  }

  els.mapsClipboardBtn.disabled = true;
  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (!text) {
      showStatus(t("msg.clipboardEmpty"), true);
      return;
    }
    els.mapsLinkInput.value = text;
    await processGoogleMapsImportText(text, { openSingle: true });
  } catch {
    showStatus(t("msg.clipboardReadFail"), true);
  } finally {
    els.mapsClipboardBtn.disabled = false;
  }
}

async function processGoogleMapsImportText(raw, { openSingle = false } = {}) {
  const candidates = splitImportCandidates(raw);
  if (candidates.length === 0) {
    showStatus(t("msg.importNone"), true);
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
      ? t("msg.importShort")
      : t("msg.importNoCoords"), true);
    return;
  }

  els.mapsLinkInput.value = "";
  if (resolved.length === 1 && openSingle) {
    applyImportedMapPlace(resolved[0]);
  } else {
    enqueuePendingImports(resolved);
    showStatus(t("msg.importQueued", { n: resolved.length }));
  }

  if (skipped.length > 0) {
    showStatus(t("msg.importPartial", { n: resolved.length, skipped: skipped.length }), true);
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
  showStatus(t("msg.mapsImported"));
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
        <strong>${escapeHtml(item.name || item.query || t("ui.importFallbackName"))}</strong>
        <span>${escapeHtml(formatImportMeta(item))}</span>
      </span>
      <div class="import-queue-actions">
        <button class="icon-button" type="button" data-import-action="edit" title="${escapeAttr(t("ui.editBeforeSave"))}" aria-label="${escapeAttr(t("ui.editBeforeSave"))}">
          <i data-lucide="pencil"></i>
        </button>
        <button class="icon-button" type="button" data-import-action="save" title="${escapeAttr(t("msg.discoverSave"))}" aria-label="${escapeAttr(t("msg.discoverSave"))}">
          <i data-lucide="save"></i>
        </button>
        <button class="icon-button" type="button" data-import-action="remove" title="${escapeAttr(t("ui.skip"))}" aria-label="${escapeAttr(t("ui.skip"))}">
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
      showStatus(t("msg.queueEditing"));
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
  showUndoStatus(t("msg.placeSavedMaps"));
}

function createPlaceDraftFromImport(imported) {
  const normalized = normalizeImportedPlace(imported);
  return {
    id: "",
    name: normalized.name || normalized.query || t("ui.importFallbackName"),
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
  return parts.join(" • ") || t("ui.noAddress");
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
    els.geoResults.innerHTML = `<button class="geo-result" type="button"><strong>${escapeHtml(t("ui.geoNoResults"))}</strong></button>`;
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
    showStatus(t("msg.locateUnsupported"), true);
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
      showStatus(t("msg.locateUpdated"));
    },
    () => showStatus(t("msg.locateFail"), true),
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
  showStatus(t("msg.backupJson"));
}

async function exportEncryptedBackup() {
  const password = prompt("Đặt mật khẩu cho file backup mã hóa:");
  if (password === null) return;
  if (password.length < 8) {
    showStatus(t("msg.backupPwShort"), true);
    return;
  }

  try {
    const encrypted = await encryptBackup(createBackupPayload(), password);
    downloadJson(encrypted, `taste-map-backup-encrypted-${todayStamp()}.json`);
    markBackupExported();
    showStatus(t("msg.backupEncrypted"));
  } catch {
    showStatus(t("msg.backupEncryptFail"), true);
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
    replaceAllPlaces(normalized, t("msg.importReplaceConfirm", { n: normalized.length }), t("msg.importDone"));
  } catch {
    showStatus(t("msg.importInvalidFile"), true);
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

async function handleCsvImport() {
  const file = els.csvImportFile.files?.[0];
  els.csvImportFile.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    const result = importCsvText(text);
    if (result.added === 0) {
      showStatus(result.message || t("msg.csvNoValid"), true);
      return;
    }
    showUndoStatus(result.skipped
      ? t("msg.csvAddedSkip", { n: result.added, skipped: result.skipped })
      : t("msg.csvAdded", { n: result.added }));
  } catch {
    showStatus(t("msg.csvReadFail"), true);
  }
}

function importCsvText(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { added: 0, skipped: 0, message: "CSV cần dòng tiêu đề và ít nhất 1 dòng dữ liệu." };
  }

  const header = rows[0].map((cell) => normalizeText(cell));
  const col = (keys) => header.findIndex((cell) => keys.some((key) => cell.includes(key)));
  const idx = {
    name: col(["name", "ten", "quan"]),
    type: col(["type", "loai"]),
    address: col(["address", "dia chi", "khu"]),
    lat: col(["lat", "vi do"]),
    lng: col(["lng", "lon", "kinh do"]),
    price: col(["price", "gia"]),
    tags: col(["tag"]),
    notes: col(["note", "ghi chu"]),
    favorite: col(["favorite", "ruot", "yeu thich"]),
  };

  const drafts = [];
  let skipped = 0;
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const get = (key) => (idx[key] >= 0 ? String(row[idx[key]] ?? "").trim() : "");
    const name = get("name");
    const lat = Number(get("lat"));
    const lng = Number(get("lng"));
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      skipped += 1;
      continue;
    }
    const favRaw = normalizeText(get("favorite"));
    const now = Date.now();
    drafts.push(normalizePlace({
      id: makeId(),
      name,
      type: resolveCsvType(get("type")),
      address: get("address"),
      lat,
      lng,
      priceLevel: clamp(Number(get("price")) || 2, 1, 4),
      tags: get("tags").split(/[;|]/).map((tag) => tag.trim()).filter(Boolean),
      notes: get("notes"),
      favorite: ["1", "true", "yes", "co", "x"].includes(favRaw),
      createdAt: now,
      updatedAt: now,
    }));
  }

  if (drafts.length === 0) {
    return { added: 0, skipped, message: t("msg.csvNoValidRows") };
  }

  pushUndoSnapshot("nhập CSV");
  places = [...drafts, ...places];
  savePlaces();
  render();
  return { added: drafts.length, skipped };
}

function resolveCsvType(raw) {
  const norm = normalizeText(raw);
  const byKey = TYPES.find((type) => type.key === norm);
  if (byKey) return byKey.key;
  const byLabel = TYPES.find((type) => normalizeText(type.label) === norm);
  return byLabel ? byLabel.key : "cafe";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const str = String(text).replace(/\r\n?/g, "\n");
  for (let i = 0; i < str.length; i += 1) {
    const ch = str[i];
    if (inQuotes) {
      if (ch === '"') {
        if (str[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => String(cell).trim() !== ""));
}

function exportCsv() {
  if (places.length === 0) {
    showStatus(t("msg.csvNoPlaces"), true);
    return;
  }
  const header = ["name", "type", "address", "lat", "lng", "price", "tags", "notes", "favorite"];
  const lines = [header.join(",")];
  places.forEach((place) => {
    lines.push([
      place.name,
      getType(place.type).label,
      place.address,
      place.lat,
      place.lng,
      place.priceLevel,
      place.tags.join("; "),
      place.notes,
      place.favorite ? "1" : "0",
    ].map(csvCell).join(","));
  });
  downloadText(lines.join("\n"), `taste-map-${todayStamp()}.csv`, "text/csv");
  showStatus(t("msg.csvExported", { n: places.length }));
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadText(text, filename, type) {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
    showStatus(t("msg.undoEmpty"), true);
    return;
  }
  places = snapshot.places.map(normalizePlace).filter(isValidPlace);
  selectedId = snapshot.selectedId;
  savePlaces();
  closeEditor();
  render();
  if (selectedId && getPlace(selectedId)) selectPlace(selectedId, true);
  showStatus(t("msg.undone"));
}

function showUndoStatus(message) {
  showStatus(message, false, {
    label: t("ui.undo"),
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

function renderStats() {
  if (!els.statsContent) return;
  const stats = computeStats();

  if (stats.totalVisits === 0) {
    els.statsSummary.textContent = t("stats.noVisit");
    els.statsContent.innerHTML = `
      <div class="stats-empty">
        <i data-lucide="bar-chart-3"></i>
        <span>${escapeHtml(t("ui.statsEmpty"))}</span>
      </div>
    `;
    return;
  }

  els.statsSummary.textContent = t("ui.visitsCount", { n: stats.totalVisits });

  const monthlyAvgSpend = stats.totalSpending / 6;
  const topPlaceLabel = stats.topPlace
    ? `${escapeHtml(stats.topPlace.name)} · ${t("ui.times", { n: stats.topPlace.visits.length })}`
    : "-";

  const typeRows = TYPES
    .map((type) => ({ type, agg: stats.byType.get(type.key) }))
    .filter((row) => row.agg && row.agg.count > 0)
    .map(({ type, agg }) => {
      const avg = agg.sum / agg.count;
      return `
        <div class="stat-type-row">
          <span class="type-badge" style="background:${escapeAttr(type.color)}">
            <i data-lucide="${escapeAttr(type.icon)}"></i>${escapeHtml(typeLabel(type))}
          </span>
          <div class="stat-type-bar"><i style="--value:${(avg / 5) * 100}%"></i></div>
          <strong>${avg.toFixed(1)}</strong>
        </div>
      `;
    })
    .join("");

  const maxMonth = Math.max(1, ...stats.months.map((month) => month.count));
  const monthBars = stats.months
    .map((month) => `
      <div class="stat-month" title="${escapeAttr(month.title)}: ${escapeAttr(t("ui.times", { n: month.count }))} · ${formatVnd(month.spend)}">
        <div class="stat-month-bar">
          <i style="--height:${Math.round((month.count / maxMonth) * 100)}%"></i>
        </div>
        <span class="stat-month-count">${month.count}</span>
        <span class="stat-month-label">${escapeHtml(month.label)}</span>
      </div>
    `)
    .join("");

  const maxSpend = Math.max(1, ...stats.months.map((month) => month.spend));
  const spendBars = stats.months
    .map((month) => `
      <div class="stat-month" title="${escapeAttr(month.title)}: ${formatVnd(month.spend)}">
        <div class="stat-month-bar">
          <i class="spend-bar" style="--height:${Math.round((month.spend / maxSpend) * 100)}%"></i>
        </div>
        <span class="stat-month-count">${month.spend ? formatVndShort(month.spend) : "0"}</span>
        <span class="stat-month-label">${escapeHtml(month.label)}</span>
      </div>
    `)
    .join("");

  const staleRows = stats.stalePlaces
    .map(({ place, lastVisit }) => `
      <button class="stale-place" type="button" data-stale-id="${escapeAttr(place.id)}">
        <span class="stale-name">${escapeHtml(place.name)}</span>
        <span class="stale-days">${escapeHtml(t("ui.days", { n: daysSince(lastVisit) }))}</span>
      </button>
    `)
    .join("");

  els.statsContent.innerHTML = `
    <div class="stats-grid">
      <div class="stat-tile">
        <span>${escapeHtml(t("ui.statTotalVisits"))}</span>
        <strong>${stats.totalVisits}</strong>
      </div>
      <div class="stat-tile">
        <span>${escapeHtml(t("ui.statTopPlace"))}</span>
        <strong class="stat-top-place">${topPlaceLabel}</strong>
      </div>
      <div class="stat-tile">
        <span>${escapeHtml(t("ui.statSpend6m"))}</span>
        <strong>${formatVnd(stats.totalSpending)}</strong>
      </div>
      <div class="stat-tile">
        <span>${escapeHtml(t("ui.statSpendAvg"))}</span>
        <strong>${formatVnd(Math.round(monthlyAvgSpend))}</strong>
      </div>
    </div>
    <div class="stats-section">
      <h3>${escapeHtml(t("ui.statAvgByType"))}</h3>
      ${typeRows
        ? `<div class="stat-type-list">${typeRows}</div>`
        : `<p class="stats-note">${escapeHtml(t("ui.statNoScore"))}</p>`}
    </div>
    <div class="stats-section">
      <h3>${escapeHtml(t("ui.statVisits6m"))}</h3>
      <div class="stat-month-chart">${monthBars}</div>
    </div>
    <div class="stats-section">
      <h3>${escapeHtml(t("ui.statSpendChart"))}</h3>
      <div class="stat-month-chart">${spendBars}</div>
    </div>
    <div class="stats-section">
      <h3>${escapeHtml(t("ui.statStale"))}</h3>
      ${staleRows
        ? `<div class="stale-list">${staleRows}</div>`
        : `<p class="stats-note">${escapeHtml(t("ui.statNoStale"))}</p>`}
    </div>
  `;
}

function computeStats() {
  const allVisits = [];
  let topPlace = null;
  let totalSpending = 0;
  const byType = new Map();
  const spendByKey = new Map();

  places.forEach((place) => {
    if (!topPlace || place.visits.length > topPlace.visits.length) {
      if (place.visits.length > 0) topPlace = place;
    }
    const estimate = PRICE_ESTIMATE_VND[place.priceLevel] || 0;
    place.visits.forEach((visit) => {
      allVisits.push(visit);
      totalSpending += estimate;
      const monthKey = String(visit.date || "").slice(0, 7);
      spendByKey.set(monthKey, (spendByKey.get(monthKey) || 0) + estimate);
      const agg = byType.get(place.type) || { sum: 0, count: 0 };
      agg.sum += visit.rating || 0;
      agg.count += 1;
      byType.set(place.type, agg);
    });
  });

  const now = new Date();
  const months = [];
  const monthIndex = new Map();
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthIndex.set(key, months.length);
    months.push({
      key,
      label: `T${date.getMonth() + 1}`,
      title: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
      count: 0,
      spend: spendByKey.get(key) || 0,
    });
  }

  allVisits.forEach((visit) => {
    const key = String(visit.date || "").slice(0, 7);
    if (monthIndex.has(key)) months[monthIndex.get(key)].count += 1;
  });

  const stalePlaces = places
    .map((place) => ({ place, lastVisit: place.visits[0]?.date || place.lastVisit || "" }))
    .filter((item) => item.lastVisit && daysSince(item.lastVisit) >= STALE_VISIT_DAYS)
    .sort((a, b) => daysSince(b.lastVisit) - daysSince(a.lastVisit))
    .slice(0, 3);

  return { totalVisits: allVisits.length, topPlace, byType, months, totalSpending, stalePlaces };
}

function renderDataPanel() {
  if (!els.backupStatus) return;
  const meta = getBackupMeta();
  const lastExport = meta.lastExportAt ? new Date(meta.lastExportAt) : null;
  const settings = getGistSettings();
  els.backupStatus.textContent = lastExport
    ? t("data.backupAgo", { ago: formatRelativeDays(lastExport) })
    : t("data.notBacked");
  els.backupReminder.classList.toggle("hidden", !shouldShowBackupReminder(meta));
  els.dataPlaceCount.textContent = String(places.length);
  els.dataBackupAt.textContent = lastExport ? formatRelativeDays(lastExport) : t("data.none");
  els.dataGistStatus.textContent = getGistStatusLabel(settings);
  const bytes = getAppStorageBytes();
  els.dataStorageUsage.textContent = formatBytes(bytes);
  const nearFull = bytes > 4_000_000;
  els.dataStorageUsage.classList.toggle("storage-warning", nearFull);
  els.dataStorageUsage.title = nearFull
    ? t("msg.storageWarn")
    : "";
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
  if (days <= 0) return t("time.today");
  return t("time.daysAgo", { n: days });
}

function getGistSettings() {
  try {
    return JSON.parse(localStorage.getItem(GIST_SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function getGistStatusLabel(settings) {
  if (!settings.token && !settings.gistId) return t("data.notConfigured");
  if (!settings.gistId) return t("data.gistNotCreated");
  if (!settings.lastSyncAt) return t("data.gistConfigured");
  const direction = settings.lastSyncDirection === "pull" ? t("data.pull") : t("data.push");
  return `${direction} ${formatRelativeDays(new Date(settings.lastSyncAt))}`;
}

function getAppStorageBytes() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("quan-quen-map:")) continue;
    total += byteLength(key);
    total += byteLength(localStorage.getItem(key) || "");
  }
  return total;
}

function byteLength(value) {
  return new Blob([String(value)]).size;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function saveGistSettings() {
  const settings = {
    token: els.gistToken.value.trim(),
    gistId: els.gistId.value.trim(),
  };
  localStorage.setItem(GIST_SETTINGS_KEY, JSON.stringify(settings));
  showStatus(t("msg.gistSaved"));
}

async function pushGistBackup() {
  const settings = readGistSettingsFromInputs();
  if (!settings.token) {
    showStatus(t("msg.gistNeedToken"), true);
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
    saveGistSyncState({ token: settings.token, gistId: data.id }, "push");
    markBackupExported();
    showStatus(t("msg.gistPushed"));
  } catch {
    showStatus(t("msg.gistPushFail"), true);
  } finally {
    setGistButtonsDisabled(false);
  }
}

async function pullGistBackup() {
  const settings = readGistSettingsFromInputs();
  if (!settings.token || !settings.gistId) {
    showStatus(t("msg.gistNeedCreds"), true);
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
    if (replaceAllPlaces(normalized, t("msg.gistPullConfirm", { n: normalized.length }), t("msg.gistPulled"))) {
      saveGistSyncState(settings, "pull");
    }
  } catch {
    showStatus(t("msg.gistPullFail"), true);
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

function saveGistSyncState(settings, direction) {
  localStorage.setItem(GIST_SETTINGS_KEY, JSON.stringify({
    ...settings,
    lastSyncAt: new Date().toISOString(),
    lastSyncDirection: direction,
  }));
  renderDataPanel();
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

function loadTypes() {
  let custom = [];
  try {
    const raw = JSON.parse(localStorage.getItem(TYPES_KEY));
    if (Array.isArray(raw)) {
      custom = raw
        .filter((type) => type && type.key && type.label)
        .map((type) => ({
          key: String(type.key),
          label: String(type.label).trim().slice(0, 40),
          color: /^#[0-9a-fA-F]{6}$/.test(type.color) ? type.color : "#176b68",
          icon: String(type.icon || "map-pin"),
          custom: true,
        }));
    }
  } catch {
    custom = [];
  }
  const defaultKeys = new Set(DEFAULT_TYPES.map((type) => type.key));
  custom = custom.filter((type) => !defaultKeys.has(type.key));
  TYPES = [...DEFAULT_TYPES.map((type) => ({ ...type })), ...custom];
  activeTypes = new Set(TYPES.map((type) => type.key));
  return TYPES;
}

function saveCustomTypes() {
  localStorage.setItem(TYPES_KEY, JSON.stringify(TYPES.filter((type) => type.custom)));
}

function createCustomType(label) {
  const clean = String(label || "").trim().slice(0, 40);
  if (!clean) return null;
  const base = normalizeText(clean).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "loai";
  let key = `c-${base}`;
  let suffix = 1;
  while (TYPES.some((type) => type.key === key)) {
    key = `c-${base}-${suffix}`;
    suffix += 1;
  }
  const type = {
    key,
    label: clean,
    color: TYPE_COLORS[TYPES.length % TYPE_COLORS.length],
    icon: "map-pin",
    custom: true,
  };
  TYPES.push(type);
  activeTypes.add(key);
  saveCustomTypes();
  hydrateStaticControls();
  syncFilterButtons();
  renderTypeManager();
  render();
  return type;
}

function deleteCustomType(key) {
  const type = TYPES.find((item) => item.key === key);
  if (!type || !type.custom) return;
  let affected = 0;
  places.forEach((place) => {
    if (place.type === key) {
      place.type = "cafe";
      place.updatedAt = Date.now();
      affected += 1;
    }
  });
  TYPES = TYPES.filter((item) => item.key !== key);
  activeTypes.delete(key);
  if (activeTypes.size === 0) activeTypes = new Set(TYPES.map((item) => item.key));
  saveCustomTypes();
  if (affected) savePlaces();
  hydrateStaticControls();
  syncFilterButtons();
  renderTypeManager();
  render();
  showStatus(affected ? t("msg.typeDeletedReassign", { n: affected }) : t("msg.typeDeleted"));
}

function renderTypeManager() {
  if (!els.typeManagerList || !typeManagerOpen) return;
  const custom = TYPES.filter((type) => type.custom);
  if (custom.length === 0) {
    els.typeManagerList.innerHTML = `<p class="stats-note">${escapeHtml(t("ui.noCustomType"))}</p>`;
    return;
  }
  els.typeManagerList.innerHTML = custom.map((type) => `
    <div class="tag-manager-row">
      <span class="tag-manager-name">
        <span class="type-swatch" style="background:${escapeAttr(type.color)}"></span>
        ${escapeHtml(type.label)}
      </span>
      <div class="tag-manager-actions">
        <button class="icon-button" type="button" data-delete-type="${escapeAttr(type.key)}" title="${escapeAttr(t("ui.deleteType"))}" aria-label="${escapeAttr(t("ui.deleteType"))}">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
  `).join("");
  refreshIcons();
}

function formatPrice(level) {
  return "₫".repeat(clamp(Number(level), 1, 4));
}

function formatVnd(amount) {
  const value = Math.round(Number(amount) || 0);
  return `${value.toLocaleString("vi-VN")}₫`;
}

function formatVndShort(amount) {
  const value = Math.round(Number(amount) || 0);
  if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 ? 1 : 0)}tr`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
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
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
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
    showStatus(t("msg.installed"));
  });
}

async function installApp() {
  if (!deferredInstallPrompt) {
    showStatus(t("msg.installNotReady"), true);
    return;
  }

  els.installAppBtn.disabled = true;
  try {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === "accepted") {
      els.installAppBtn.classList.add("hidden");
      showStatus(t("msg.installing"));
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
  showStatus(t("msg.updateAvailable"), false, {
    label: t("btn.update"),
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
    showStatus(t("msg.sharedReadFail"), true);
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
