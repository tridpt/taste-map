# Tài liệu kỹ thuật — Quán quen (Taste Map)

Tài liệu này mô tả kiến trúc, cấu trúc mã, mô hình dữ liệu, các luồng xử lý, dịch vụ ngoài, cách build/test/deploy và cách mở rộng. Dành cho người phát triển/bảo trì.

> Tài liệu liên quan: `README.md` (tổng quan + chạy nhanh), `FEATURES.md` (danh sách tính năng), `TEST_CHECKLIST.md` (checklist test nhanh), `HUONG_DAN_TEST.md` (test thủ công từng bước).

---

## 1. Tổng quan

**Quán quen** là web app tĩnh (single-page, không build step bắt buộc) để lưu và quản lý quán ăn/cafe theo gu cá nhân. Đặc điểm:

- **Không backend**: toàn bộ chạy ở trình duyệt. Dữ liệu lưu cục bộ (localStorage + IndexedDB). Đồng bộ tùy chọn qua GitHub Gist.
- **PWA**: cài được như ứng dụng, hoạt động offline với dữ liệu đã lưu.
- **Song ngữ** Tiếng Việt / English.
- **Vanilla JS** (không framework), bản đồ bằng Leaflet, icon bằng Lucide.

**Quy mô**: ~8.200 dòng (app.js ~4.200, style.css ~2.300, i18n.js ~660, index.html ~560), 45 test Playwright.

---

## 2. Công nghệ & phụ thuộc

**Thư viện client (CDN unpkg, đã ghim phiên bản):**
- Leaflet 1.9.4 — bản đồ.
- Leaflet.markercluster 1.5.3 — gom cụm marker.
- leaflet.heat 0.2.0 — lớp heatmap.
- Lucide 1.17.0 — bộ icon (gọi `lucide.createIcons()`).

**Dịch vụ web ngoài (miễn phí, dùng chung):**
- OpenStreetMap tiles — nền bản đồ.
- Nominatim — tìm địa chỉ (geocode) + đảo địa chỉ (reverse).
- Overpass API — tìm quán thật quanh khu vực.
- OSRM (router.project-osrm.org) — định tuyến đường đi.
- GitHub Gist API — đồng bộ backup (tùy chọn, cần token).

**Dev/CI:** Node + Playwright (test), http-server (chạy local), GitHub Actions (CI + deploy Pages).

---

## 3. Cấu trúc thư mục

```
quan-quen-map/
├── index.html          # Khung HTML + toàn bộ DOM tĩnh, nạp i18n.js rồi app.js
├── app.js              # Toàn bộ logic ứng dụng (~4.200 dòng)
├── i18n.js             # Từ điển dịch VI/EN (I18N_STRINGS)
├── style.css           # Toàn bộ CSS, biến theme, dark mode, responsive
├── sw.js               # Service worker (cache app shell + tile + runtime)
├── manifest.json       # PWA manifest (tên, icon, share_target)
├── icon.svg, icons/    # Icon ứng dụng
├── scripts/
│   └── check-encoding.js   # Kiểm tra UTF-8 tránh mojibake
├── tests/
│   └── app.spec.js     # 45 test Playwright
├── playwright.config.js
├── package.json        # scripts: serve / test / check
├── .github/workflows/ci.yml   # CI: check + test → deploy Pages
└── *.md                # README, FEATURES, DOCUMENTATION, TEST_CHECKLIST, HUONG_DAN_TEST
```

Không có bundler: `index.html` nạp trực tiếp 3 file JS theo thứ tự `i18n.js` → `app.js`, và các thư viện CDN. Mọi hàm trong `app.js` là hàm cấp cao (global scope của classic script) nên test Playwright gọi được trực tiếp qua `page.evaluate`.

---

## 4. Khởi động (init flow)

`app.js` đăng ký `DOMContentLoaded → init()`. Thứ tự trong `init()`:

1. `cacheElements()` — gom tất cả phần tử DOM theo id vào object `els`.
2. `applyStoredLang()` — đọc ngôn ngữ đã lưu, dịch UI tĩnh (`applyTranslations`).
3. `applyStoredTheme()` — đọc + áp dụng dark/light.
4. `loadTypes()` — nạp loại quán (mặc định + tùy chỉnh), reset `activeTypes`.
5. `setSidebarCollapsed(...)` — khôi phục trạng thái thanh bên.
6. `hydrateStaticControls()` — dựng các control động (filter loại/gu, select loại, rating, ngày).
7. `syncRangeLabels()`, `loadPlaces()`, `loadCollections()`, `loadSavedItineraries()`.
8. `initMap()` — khởi tạo Leaflet, tile, cluster/heat layer.
9. `bindEvents()` — gắn toàn bộ sự kiện.
10. `render()` + `renderDataPanel()` + `refreshIcons()`.
11. `setupInstallPrompt()`, `registerServiceWorker()`, `handleSharedLaunch()`.
12. `initImages()` — async: nạp ảnh từ IndexedDB, hydrate, migrate, dọn ảnh mồ côi.
13. `maybeShowDiscoverHint()` — gợi ý lần đầu mở app.

---

## 5. Mô hình dữ liệu

### Place (quán)
```js
{
  id: string,
  name: string,
  type: string,            // key loại quán: cafe|food|sweet|drink|c-<custom>
  address: string,
  lat: number, lng: number,
  priceLevel: 1..4,
  ratings: { taste, quiet, power, date, work },  // mỗi mục 0..5
  tags: string[],          // tối đa 12
  notes: string,
  lastVisit: "YYYY-MM-DD",
  favorite: boolean,
  images: [{ id, category }],   // category: food|space|menu|other (KHÔNG chứa dataUrl khi lưu localStorage)
  openingHours: { days: number[0..6], open: "HH:MM", close: "HH:MM" },
  visits: [{ id, date, rating, note }],
  createdAt, updatedAt: number  // epoch ms
}
```
`normalizePlace()` chuẩn hóa mọi quán (điền mặc định, lọc giá trị hợp lệ). `isValidPlace()` yêu cầu có tên + lat/lng hữu hạn.

### Ảnh
- Trong bộ nhớ: `place.images[i]` có thêm `dataUrl` (base64 JPEG đã nén).
- Trong **localStorage**: chỉ lưu `{id, category}` (không dataUrl) → tránh đầy.
- Trong **IndexedDB** (`imageCache` mirror): `id → dataUrl`.
- `imageDataUrl(img)` = `img.dataUrl || imageCache.get(img.id) || ""`.

### Hằng số cấu hình (đầu app.js)
- `TYPES` (runtime, = `DEFAULT_TYPES` + loại tùy chỉnh), `PURPOSES`, `DAY_OPTIONS`, `PHOTO_CATEGORIES`.
- `PRICE_ESTIMATE_VND` (ước tính chi tiêu), `RANDOM_NEARBY_RADIUS`, `STALE_VISIT_DAYS`, `STALE_FAVORITE_DAYS`.
- `seedPlaces` — 5 quán mẫu khi chưa có dữ liệu.

---

## 6. Khóa lưu trữ

**localStorage:**
| Khóa | Nội dung |
|---|---|
| `quan-quen-map:places:v1` | Danh sách quán (ảnh đã strip) |
| `quan-quen-map:collections:v1` | Bộ sưu tập `[{id,name,placeIds}]` |
| `quan-quen-map:itineraries:v1` | Lịch trình đã lưu |
| `quan-quen-map:types:v1` | Loại quán tùy chỉnh |
| `quan-quen-map:theme:v1` / `:lang:v1` / `:sidebar-state:v1` | Tùy chọn giao diện |
| `quan-quen-map:gist-settings:v1` | token/gistId/lastSync |
| `quan-quen-map:backup-meta:v1` | lần backup gần nhất |
| `quan-quen-map:discover-hint:v1` | đã hiện gợi ý lần đầu chưa |

**IndexedDB:** DB `quan-quen-map-images`, store `images` (key = image id, value = dataUrl).

---

## 7. Các nhóm hàm chính (app.js)

**Trạng thái toàn cục:** `places`, `selectedId`, `activeTypes/activePurposes/activeTags/activeAreas`, `openNowOnly`, `priceRange`, `maxDistanceKm`, `itinerary`, `collections`, `savedItineraries`, `userLocation`, `map`, `markers`, `markerLayer`, `heatLayer`, `discoverMarkers`, `imageCache`, `lang`, ...

**Render (đồng bộ, gọi qua `render()`):**
- `render()` — điều phối: tính `getFilteredPlaces()` rồi gọi các render con.
- `renderList`, `renderMarkers`, `renderHeat`, `renderRoute`, `renderItinerary`, `renderCollections`, `renderPlaceDetail`, `renderStats`, `renderTagFilters`, `renderAreaFilters`, `renderRecommendations`, `renderFavoriteReminder`, `renderDataPanel`.

**Lọc & điểm số:**
- `getFilteredPlaces()` — áp tất cả bộ lọc + sắp xếp.
- `getFitScore()` — điểm hợp gu (hiển thị trên marker).
- `getMoodScore(place, mood)` — điểm theo mood gợi ý.
- `getOpeningStatus()` / `getOpeningStatusAt(place, day, minutes)` — trạng thái mở cửa.
- `getPlaceArea()` / `parseArea()` — suy ra quận/huyện từ địa chỉ.

**CRUD & editor:** `openEditor`, `closeEditor`, `savePlace`, `deleteCurrentPlace`, `markPlaceVisited`, `toggleFavorite`, `setFormCoordinates`, `handleCoordsPaste`/`parseCoordsString`.

**Ảnh:** `normalizeImages`, `handlePhotoSelection`, `readCompressedPhoto`, `renderEditorPhotos`, `renderDetailAlbums`, `openLightbox`/`closeLightbox`. IndexedDB: `openImageDb`, `loadImagesFromDb`, `writeImageToDb`, `deleteImageFromDb`, `persistImagesToDb`, `hydratePlaceImages`, `pruneOrphanImages`.

**Bản đồ & khám phá:** `initMap`, `createMarkerIcon`, `createPopup`, `locateUser`, `toggleHeatmap`, `pickRandomNearby`, `discoverArea`, `fetchNearbyPois`, `parseOverpassPois`, `guessTypeFromTags`, `poiToDraft`, `showDiscoveredPlaces`, `clearDiscoverMarkers`, `discoverAmenityFilter`.

**Định tuyến:** `renderRoute`, `fetchOsrmRoute`, `parseOsrmRoute`, `getItineraryDirectionsUrl`, `openExternalMap`, `getGoogleMapsUrl`, `getDirectionsUrl`, `getAppleMapsUrl`.

**Dữ liệu:** `createBackupPayload`, `exportPlainBackup`, `exportEncryptedBackup`, `encryptBackup`/`decryptBackup` (PBKDF2 + AES-GCM), `importPlaces`, `importCsvText`/`parseCsv`/`exportCsv`, `saveGistSettings`/`pushGistBackup`/`pullGistBackup`.

**i18n & theme:** `t(key, params)`, `applyTranslations`, `toggleLang`, `applyTheme`, `toggleTheme`, `typeLabel`, `purposeLabel`.

**Tiện ích mạng:** `fetchWithRetry(url, opts, attempts)` — thử lại khi 429/503, ném lỗi có cờ `rateLimited`.

---

## 8. i18n (đa ngôn ngữ)

- `i18n.js` định nghĩa `I18N_STRINGS = { vi: {...}, en: {...} }`.
- `t(key, params)` trả chuỗi theo `lang` hiện tại, fallback về `vi`, rồi về chính `key`. Hỗ trợ `{placeholder}` thay bằng `params`.
- **UI tĩnh**: gắn thuộc tính trong HTML: `data-i18n` (textContent), `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-aria`. `applyTranslations()` quét và điền.
- **Chuỗi động**: trong JS dùng `t("key")` trực tiếp (toast, nhãn render, nút...).
- Đổi ngôn ngữ: `toggleLang()` lưu localStorage, gọi `applyTranslations` + `hydrateStaticControls` + `render`.
- Thêm chuỗi mới: thêm cùng một key vào CẢ `vi` và `en`.

## 9. Theme & responsive (style.css)

- Biến màu ở `:root`; dark mode override ở `:root[data-theme="dark"]`.
- `applyTheme(next)` set `data-theme` trên `<html>`, đổi `<meta theme-color>`, đổi icon nút.
- Panel dưới bản đồ dùng grid hàng cao cố định (`grid-auto-rows`) + cuộn nội bộ để tránh đè.
- Media query cho mobile: xếp dọc, editor thành tấm trượt dưới.

## 10. Service worker (sw.js)

- `CACHE_VERSION` (vd `taste-map-v35`) — **bump mỗi lần đổi asset** để client nhận bản mới.
- `APP_SHELL` — danh sách file + thư viện CDN cache khi cài.
- Chiến lược fetch:
  - Nominatim / Overpass / OSRM → `fetch` thẳng (không cache, dữ liệu động).
  - Tile OSM → cache-first (giới hạn số lượng).
  - Điều hướng trang → network-first.
  - App shell / runtime → stale-while-revalidate.
- Nhận `SKIP_WAITING` để kích hoạt bản mới khi user bấm "Cập nhật".

> Lưu ý dev: do stale-while-revalidate, sau khi sửa code nên **Ctrl+F5** (hoặc Unregister SW trong DevTools) để chắc chắn thấy bản mới.

---

## 11. Chạy, kiểm tra, build

**Chạy local:**
```powershell
cd D:\AI_App\quan-quen-map
npm run serve        # http-server tại http://127.0.0.1:5178
# hoặc: python -m http.server 5178
```

**Kiểm tra tĩnh:**
```powershell
npm run check        # check encoding UTF-8 + node --check app.js/i18n.js/sw.js + parse manifest
```

**Test tự động (Playwright):**
```powershell
npm install          # lần đầu (cài @playwright/test)
npx playwright install   # cài trình duyệt nếu cần
npm test             # 45 test; tự khởi động server qua webServer trong playwright.config.js
```
Test gọi trực tiếp hàm trong app qua `page.evaluate` (vì là global scope) và mock `window.fetch` cho các test liên quan mạng (Overpass, OSRM, Gist).

**Không cần build**: deploy chính là các file tĩnh.

## 12. CI/CD (GitHub Actions)

- File `.github/workflows/ci.yml`. Khi push lên `main`:
  1. Job `checks`: `npm run check` + `npm test`.
  2. Job `deploy-pages`: chỉ chạy sau khi `checks` pass → deploy lên GitHub Pages.
- Trong repo Settings → Pages, chọn source = "GitHub Actions".
- Pages sẽ KHÔNG deploy nếu JS/manifest/encoding/test lỗi → tránh đẩy bản hỏng.

## 13. Bảo mật & riêng tư

- Dữ liệu chỉ ở máy người dùng (localStorage/IndexedDB). Không gửi đi đâu trừ khi bật Gist sync.
- GitHub token (quyền `gist`) lưu trong localStorage của trình duyệt người dùng — không gửi tới bên thứ ba nào khác ngoài api.github.com.
- Backup mã hóa: PBKDF2-SHA-256 (250k vòng) + AES-GCM, khóa dẫn xuất từ mật khẩu người dùng.
- Nội dung từ Overpass/Nominatim là dữ liệu ngoài → luôn chuẩn hóa (`normalizePlace`) và escape HTML (`escapeHtml`/`escapeAttr`) trước khi render.

---

## 14. Hướng dẫn mở rộng (recipes)

**Thêm một bộ lọc mới:**
1. Thêm control vào `index.html` (kèm `data-i18n` nếu cần).
2. Cache id trong `cacheElements`, thêm biến trạng thái.
3. Gắn sự kiện trong `bindEvents` → cập nhật biến → `render()`.
4. Thêm điều kiện trong `getFilteredPlaces()`.
5. Reset trong `resetFilters()`; đồng bộ UI trong `syncFilterButtons()`.

**Thêm trường mới cho quán:**
1. Thêm input vào form trong `index.html` (+ cache id).
2. Đọc/ghi trong `openEditor` và `savePlace`.
3. Thêm vào `normalizePlace` (chuẩn hóa + mặc định).
4. Hiển thị trong `renderPlaceDetail`/`renderList` nếu cần.

**Thêm chuỗi dịch:** thêm key vào cả `vi` và `en` trong `i18n.js`; dùng `t("key")` hoặc `data-i18n`.

**Thêm loại quán mặc định:** sửa `DEFAULT_TYPES` + thêm key `type.<key>` vào i18n. (Loại tùy chỉnh thì người dùng tự thêm trong UI.)

**Đổi asset (JS/CSS/HTML):** nhớ **bump `CACHE_VERSION`** trong `sw.js`.

## 15. Giới hạn đã biết

- Quán hiển thị là quán **đã lưu**; quán thật chỉ xuất hiện khi bấm "Khám phá khu này"/"Random gần tôi" và phụ thuộc dữ liệu OpenStreetMap khu đó.
- Overpass/OSRM/Nominatim là dịch vụ dùng chung, có thể chậm hoặc giới hạn tần suất (đã có `fetchWithRetry` + thông báo).
- `localStorage` ~5MB: ảnh đã chuyển sang IndexedDB nên dư địa lớn, nhưng dữ liệu text vẫn có giới hạn (có cảnh báo khi gần đầy).
- WCAG: đã xử lý ARIA/focus cơ bản; đánh giá đầy đủ cần test thủ công với screen reader.
- `app.js` là một file lớn (~4.200 dòng); nếu mở rộng nhiều nên cân nhắc tách ES modules + bundler.

## 16. Lịch sử & ghi chú

- Dự án phát triển tăng dần qua nhiều commit trên nhánh `main` (xem `git log`).
- Quy ước commit: mô tả ngắn gọn theo tính năng. Mỗi thay đổi asset đi kèm bump `CACHE_VERSION` và (nếu hợp lý) thêm/cập nhật test.
- Repo: `https://github.com/tridpt/taste-map.git`.
