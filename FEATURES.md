# Tính năng — Quán quen (Taste Map)

Web app tĩnh (HTML/CSS/JS thuần + Leaflet), PWA, không backend. Dữ liệu lưu trong trình duyệt (localStorage + IndexedDB). Song ngữ VI/EN.

Quy mô: ~8.200 dòng code, 42 test Playwright tự động.

---

## 1. Bản đồ
- Bản đồ Leaflet + tile OpenStreetMap.
- Marker mỗi quán hiển thị điểm "hợp gu".
- Gom cụm marker (Leaflet.markercluster) khi nhiều quán gần nhau; bấm cụm để tách.
- Lớp heatmap mật độ quán (leaflet.heat), bật/tắt.
- Popup quán: tên, địa chỉ, loại, giá, khoảng cách, trạng thái mở cửa.
- Chế độ Ghim: click bản đồ để chọn tọa độ cho quán mới.
- Định vị người dùng (Geolocation) + marker vị trí, hiển thị khoảng cách tới từng quán.

## 2. Khám phá quán thật (OpenStreetMap / Overpass)
- "Khám phá khu này": quét quanh tâm bản đồ, hiện tất cả quán tìm được (tới 200), không cần định vị.
- "Random gần tôi": gợi ý quán quanh vị trí, ưu tiên quán chưa lưu.
- Lọc theo loại: tất cả / cafe / quán ăn / bar-pub / ngọt-bánh.
- Thanh trượt bán kính khám phá 1–10km.
- Marker khám phá riêng (ghim ✨) + popup có nút "Lưu quán" (điền sẵn form).
- Đoán loại quán từ tag OSM (amenity/cuisine).

## 3. Định tuyến & chỉ đường
- Lịch trình nhiều điểm dừng, sắp xếp lên/xuống, xóa.
- Vẽ tuyến đường thật theo đường phố qua OSRM (fallback đường chim bay khi offline).
- Hiển thị quãng đường + thời gian thực tế.
- Mở chỉ đường đa điểm trên Google Maps.
- Chỉ đường tới 1 quán: Google Maps, Apple Maps.

## 4. Lọc, tìm kiếm & sắp xếp
- Tìm kiếm tự do theo tên / khu vực / ghi chú / loại.
- Lọc theo loại quán (đa chọn).
- Lọc theo "gu" (ngon, yên tĩnh, ổ cắm, đi date, làm việc).
- Lọc theo tag riêng.
- Lọc theo khu vực (tự gom quận/huyện từ địa chỉ).
- Lọc theo bộ sưu tập.
- Thanh trượt khoảng giá (₫–₫₫₫₫).
- Thanh trượt bán kính (cần định vị).
- Lọc "đang mở cửa" ngay bây giờ, hoặc theo ngày + giờ định đi.
- Sắp xếp: hợp gu / gần tôi / mới cập nhật / giá thấp / tên A-Z.
- Nút Đặt lại toàn bộ bộ lọc.

## 5. Quản lý quán (CRUD)
- Thêm / sửa / xóa quán.
- Trường: tên, loại, giá (4 mức), địa chỉ, tọa độ, ghi chú, tag riêng.
- Đánh giá 5 tiêu chí (ngon/yên tĩnh/ổ cắm/date/làm việc) bằng thanh trượt.
- Giờ mở cửa theo ngày trong tuần + giờ mở/đóng (hỗ trợ qua đêm).
- Lịch sử ghé: ngày + điểm + ghi chú.
- Đánh dấu quán ruột (favorite).
- Hoàn tác (undo) cho thêm/sửa/xóa/import/đổi tag... trong vài giây.

## 6. Ảnh
- Thêm nhiều ảnh, nén trước khi lưu.
- Phân loại theo album: món / không gian / menu / khác; đổi album từng ảnh.
- Lưu ảnh trong IndexedDB (localStorage chỉ giữ id+album → tránh đầy).
- Tự dọn ảnh mồ côi khi khởi động.
- Cảnh báo khi localStorage gần đầy.
- Panel chi tiết hiển thị ảnh theo từng album.
- Lightbox: bấm ảnh để xem phóng to (đóng bằng X / nền / Esc).

## 7. Tổ chức & cá nhân hóa
- Bộ sưu tập tùy chỉnh (tạo/xóa, gắn/bỏ quán, lọc theo bộ sưu tập).
- Quản lý tag: đổi tên / xóa đồng loạt trên mọi quán.
- Loại quán tùy chỉnh ngoài 4 loại mặc định (thêm/xóa; xóa thì quán về Cafe).

## 8. Gợi ý & thống kê
- "Hôm nay đi đâu?" gợi ý theo mood: làm việc, đi date, yên tĩnh, ăn nhanh, ăn ngon, gần tôi, mới chưa thử.
- Nút Random lại (reroll) có trọng số, tránh quán vừa ghé.
- Nhắc các quán ruột đã lâu chưa ghé.
- Thống kê: tổng lần ghé, quán ghé nhiều nhất.
- Chi tiêu ước tính 6 tháng + trung bình/tháng (từ mức giá × số lần ghé).
- Biểu đồ lần ghé & chi tiêu theo 6 tháng gần đây.
- Mục "Lâu chưa ghé" (bấm để chọn quán).

## 9. Nhập / xuất dữ liệu
- Nhập từ Google Maps: dán link (1 hoặc nhiều dòng), hàng chờ xác nhận, lưu/sửa/bỏ từng cái.
- Đọc link từ clipboard; nhận link chia sẻ từ điện thoại (share_target).
- Xuất / nhập backup JSON thường.
- Backup mã hóa (PBKDF2 + AES-GCM, cần mật khẩu).
- Nhập / xuất CSV.
- Đồng bộ cloud qua GitHub Gist (token + Gist ID, đẩy lên / kéo về).
- Nhắc xuất backup định kỳ.

## 10. Giao diện
- Dark mode / light mode, lưu lựa chọn, tự theo hệ thống lần đầu.
- Song ngữ Tiếng Việt / English (nhãn tĩnh + thông báo động), lưu lựa chọn.
- Thu gọn thanh bên.
- Thanh cuộn hợp tông, layout panel dưới bản đồ cân đối.
- Thông báo dạng toast (có nút hành động như Hoàn tác / Cập nhật).

## 11. Accessibility
- Form nhập là hộp thoại (role=dialog, aria-modal) có focus trap, tự focus, Esc đóng, trả focus về nút mở.
- Lightbox quản lý aria-hidden + focus.
- Nhãn ARIA cho các nút icon, control động.
- Thumbnail mở lightbox được bằng bàn phím (Enter/Space).
- Lưu ý: đánh giá WCAG đầy đủ vẫn cần test thủ công với screen reader và rà soát chuyên môn về tương phản màu.

## 12. PWA & hiệu năng
- manifest.json + service worker → cài như ứng dụng.
- Cache app shell, thư viện bản đồ, plugin, icon, và tile bản đồ đã xem.
- Hoạt động offline với dữ liệu đã lưu (tìm quán mới cần mạng).
- Nút "Cài app" và "Cập nhật" khi có bản service worker mới.
- Responsive cho màn hình nhỏ (panel xếp dọc, editor dạng tấm trượt).

## 13. Chất lượng & hạ tầng
- 42 test Playwright tự động (render, import, backup, undo, theme, i18n, lọc, lịch trình, OSRM, thống kê, CSV, bộ sưu tập, heatmap, IndexedDB, dọn ảnh mồ côi, Gist mock, lightbox, khám phá khu...).
- `npm run check`: kiểm tra cú pháp JS, manifest JSON, và encoding UTF-8 (tránh mojibake).
- GitHub Actions CI: chạy check + test, chỉ deploy GitHub Pages khi pass.
- Tài liệu: `README.md`, `TEST_CHECKLIST.md` (checklist nhanh), `HUONG_DAN_TEST.md` (hướng dẫn test từng bước), `FEATURES.md` (file này).

---

## Lưu trữ (khóa trong trình duyệt)
- `quan-quen-map:places:v1` — danh sách quán (không gồm ảnh).
- `quan-quen-map-images` (IndexedDB) — ảnh quán.
- `quan-quen-map:collections:v1`, `:itineraries:v1`, `:types:v1` — bộ sưu tập, lịch trình đã lưu, loại tùy chỉnh.
- `quan-quen-map:theme:v1`, `:lang:v1`, `:sidebar-state:v1` — tùy chọn giao diện.
- `quan-quen-map:gist-settings:v1`, `:backup-meta:v1` — đồng bộ & backup.

## Phụ thuộc ngoài (CDN)
- Leaflet 1.9.4, Leaflet.markercluster 1.5.3, leaflet.heat 0.2.0, Lucide icons.
- Dịch vụ: OpenStreetMap tiles, Nominatim (tìm/đảo địa chỉ), Overpass (khám phá quán), OSRM (định tuyến), GitHub Gist (đồng bộ tùy chọn).
