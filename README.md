# Quán quen

Web app tĩnh để lưu quán ăn/cafe theo gu cá nhân: ngon, yên tĩnh, có ổ cắm, đi date, làm việc.

## Chạy local

```powershell
cd D:\AI_App\quan-quen-map
python -m http.server 5178
```

Mở `http://localhost:5178`.

App lưu dữ liệu trong `localStorage` của trình duyệt. Nút `Xuất` tạo file JSON sao lưu, nút `Nhập` khôi phục từ file JSON.

## PWA

App có `manifest.json` và `sw.js`, nên có thể cài như ứng dụng khi chạy qua HTTP/HTTPS. Service worker cache app shell, thư viện bản đồ, icon và các tile bản đồ đã xem. Khi offline, dữ liệu quán đã lưu vẫn dùng được; tìm địa điểm mới qua OpenStreetMap cần có mạng.
