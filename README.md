# Quán quen

Web app tĩnh để lưu quán ăn/cafe theo gu cá nhân: ngon, yên tĩnh, có ổ cắm, đi date, làm việc.

## Chạy local

```powershell
cd D:\AI_App\quan-quen-map
python -m http.server 5178
```

Mở `http://localhost:5178`.

App lưu dữ liệu trong `localStorage` của trình duyệt. Nút `Xuất` tạo file JSON sao lưu, nút `Nhập` khôi phục từ file JSON.

## Tính năng chính

- Lọc quán theo loại, gu, tag riêng và tìm kiếm tự do.
- Bấm vị trí hiện tại để hiện khoảng cách tới từng quán và sắp xếp `Gần tôi nhất`.
- Gợi ý `Hôm nay đi đâu?` theo mood: làm việc, đi date, yên tĩnh, ăn nhanh, ăn ngon, gần tôi.
- Lưu ảnh quán trực tiếp trong trình duyệt; ảnh được nén trước khi lưu vào `localStorage`.
- Lưu giờ mở cửa thủ công theo ngày trong tuần và hiển thị `Đang mở` / `Có thể đóng`.
- Lưu lịch sử ghé quán theo ngày, điểm và ghi chú.

## Dữ liệu và sao lưu

- App nhắc xuất backup nếu chưa backup hoặc đã quá 7 ngày.
- `Backup mã hóa` tạo file JSON dùng PBKDF2 + AES-GCM, cần mật khẩu để khôi phục.
- `JSON thường` tạo file backup không mã hóa để dễ kiểm tra/chỉnh tay.
- Có thể đồng bộ cloud tùy chọn qua GitHub Gist bằng token có quyền `gist`; token và Gist ID lưu trong trình duyệt của bạn.
- Các thao tác thêm/sửa/xóa/import/pull có nút `Hoàn tác` trong vài giây sau khi thực hiện.

## Nhập từ Google Maps

Dán URL Google Maps vào ô `Dán link Google Maps` trên bản đồ để app tự lấy tên và tọa độ khi URL có dạng đầy đủ. App hỗ trợ các URL có `@lat,lng`, `!3dlat!4dlng`, hoặc tham số `q/query=lat,lng`. Link rút gọn như `maps.app.goo.gl` cần mở ra trước rồi copy URL đầy đủ vì trình duyệt không cho app tự mở rộng link đó.

Có thể dán nhiều link, mỗi dòng một link; app sẽ tạo hàng chờ để xác nhận trước khi lưu. Nút clipboard đọc link đang copy trong trình duyệt hỗ trợ Clipboard API. Khi cài như PWA, app khai báo `share_target` để nhận link được chia sẻ từ điện thoại.

## PWA

App có `manifest.json` và `sw.js`, nên có thể cài như ứng dụng khi chạy qua HTTP/HTTPS. Service worker cache app shell, thư viện bản đồ, icon và các tile bản đồ đã xem. Khi offline, dữ liệu quán đã lưu vẫn dùng được; tìm địa điểm mới qua OpenStreetMap cần có mạng.

Khi trình duyệt hỗ trợ, nút `Cài app` sẽ hiện trên thanh công cụ. Khi service worker tải được bản mới, nút `Cập nhật` sẽ hiện để kích hoạt bản mới đúng lúc.

## Kiểm tra

```powershell
npm install
npm run check
npm test
```

Playwright test kiểm tra app render, import Google Maps, backup mã hóa, undo và PWA manifest. GitHub Actions tự chạy các bước này khi push lên `main`.
