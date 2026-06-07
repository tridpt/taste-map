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

## Nhập từ Google Maps

Dán URL Google Maps vào ô `Dán link Google Maps` trên bản đồ để app tự lấy tên và tọa độ khi URL có dạng đầy đủ. App hỗ trợ các URL có `@lat,lng`, `!3dlat!4dlng`, hoặc tham số `q/query=lat,lng`. Link rút gọn như `maps.app.goo.gl` cần mở ra trước rồi copy URL đầy đủ vì trình duyệt không cho app tự mở rộng link đó.

## PWA

App có `manifest.json` và `sw.js`, nên có thể cài như ứng dụng khi chạy qua HTTP/HTTPS. Service worker cache app shell, thư viện bản đồ, icon và các tile bản đồ đã xem. Khi offline, dữ liệu quán đã lưu vẫn dùng được; tìm địa điểm mới qua OpenStreetMap cần có mạng.
