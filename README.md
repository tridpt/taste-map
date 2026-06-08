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
- Quản lý tag: đổi tên hoặc xóa tag đồng loạt trên tất cả quán.
- Lọc theo khoảng giá (₫–₫₫₫₫) và bán kính khoảng cách bằng thanh trượt, kèm lọc theo khu vực (tự gom theo quận/huyện từ địa chỉ).
- Lập lịch trình nhiều quán: thêm quán vào lịch trình, sắp xếp thứ tự, xem tuyến nối trên bản đồ, mở chỉ đường đa điểm trên Google Maps và lưu lịch trình theo tên để dùng lại.
- Gom quán thành bộ sưu tập tùy chỉnh (đi date, làm việc...) và lọc theo bộ sưu tập.
- Bật lớp heatmap để xem mật độ quán trên bản đồ thay cho marker.
- Lọc nhanh `Đang mở cửa` để chỉ hiện quán đang mở ngay lúc này dựa trên giờ mở cửa đã lưu, hoặc chọn ngày và giờ định đi để xem quán nào mở vào khung giờ đó.
- Nút chỉ đường mở thẳng Google Maps hoặc Apple Maps từ vị trí hiện tại tới quán.
- Nút `Chia sẻ` dùng Web Share API trên điện thoại, tự fallback copy thông tin quán kèm link Google Maps trên máy tính.
- Nút đổi giao diện sáng/tối trên thanh công cụ; lựa chọn được lưu trong trình duyệt và tự theo cài đặt hệ thống ở lần đầu.
- Bấm vị trí hiện tại để hiện khoảng cách tới từng quán và sắp xếp `Gần tôi nhất`.
- Nút `Random gần tôi` chọn ngẫu nhiên một quán quanh bạn (theo bộ lọc đang bật) để đỡ phải phân vân.
- Marker trên bản đồ tự gom cụm khi nhiều quán nằm gần nhau, bấm vào cụm để phóng to xem từng quán.
- Gợi ý `Hôm nay đi đâu?` theo mood: làm việc, đi date, yên tĩnh, ăn nhanh, ăn ngon, gần tôi, và `Mới chưa thử` để ưu tiên quán chưa ghé lần nào.
- Nhắc các quán ruột đã lâu chưa ghé ngay trong khu gợi ý.
- Lưu ảnh quán trực tiếp trong trình duyệt; ảnh được nén trước khi lưu vào `localStorage` và phân loại theo album (món, không gian, menu, khác).
- Lưu giờ mở cửa thủ công theo ngày trong tuần và hiển thị `Đang mở` / `Có thể đóng`.
- Lưu lịch sử ghé quán theo ngày, điểm và ghi chú.
- Form nhập quán là hộp thoại có quản lý bàn phím: tự đưa focus vào form, giữ focus trong form khi bấm Tab, đóng bằng Escape và trả focus về nút mở.
- Panel `Thống kê` tổng hợp tổng số lần ghé, quán ghé nhiều nhất, điểm trung bình theo loại quán và biểu đồ số lần ghé 6 tháng gần đây.

## Dữ liệu và sao lưu

- App nhắc xuất backup nếu chưa backup hoặc đã quá 7 ngày.
- `Backup mã hóa` tạo file JSON dùng PBKDF2 + AES-GCM, cần mật khẩu để khôi phục.
- `JSON thường` tạo file backup không mã hóa để dễ kiểm tra/chỉnh tay.
- `Nhập CSV` / `Xuất CSV` cho phép nhập hàng loạt và xuất danh sách quán ra file CSV (cột: name, type, address, lat, lng, price, tags, notes, favorite).
- Có thể đồng bộ cloud tùy chọn qua GitHub Gist bằng token có quyền `gist`; token và Gist ID lưu trong trình duyệt của bạn.
- Các thao tác thêm/sửa/xóa/import/pull có nút `Hoàn tác` trong vài giây sau khi thực hiện.

## Nhập từ Google Maps

Dán URL Google Maps vào ô `Dán link Google Maps` trên bản đồ để app tự lấy tên và tọa độ khi URL có dạng đầy đủ. App hỗ trợ các URL có `@lat,lng`, `!3dlat!4dlng`, hoặc tham số `q/query=lat,lng`. Link rút gọn như `maps.app.goo.gl` cần mở ra trước rồi copy URL đầy đủ vì trình duyệt không cho app tự mở rộng link đó.

Có thể dán nhiều link, mỗi dòng một link; app sẽ tạo hàng chờ để xác nhận trước khi lưu. Nút clipboard đọc link đang copy trong trình duyệt hỗ trợ Clipboard API. Khi cài như PWA, app khai báo `share_target` để nhận link được chia sẻ từ điện thoại.

## PWA

App có `manifest.json` và `sw.js`, nên có thể cài như ứng dụng khi chạy qua HTTP/HTTPS. Service worker cache app shell, thư viện bản đồ, plugin gom cụm marker, icon và các tile bản đồ đã xem. Khi offline, dữ liệu quán đã lưu vẫn dùng được; tìm địa điểm mới qua OpenStreetMap cần có mạng.

Khi trình duyệt hỗ trợ, nút `Cài app` sẽ hiện trên thanh công cụ. Khi service worker tải được bản mới, nút `Cập nhật` sẽ hiện để kích hoạt bản mới đúng lúc.

## Kiểm tra
```powershell
npm install
npm run check
npm test
```

Playwright test kiểm tra app render, import Google Maps, backup mã hóa, undo, đổi giao diện sáng/tối, lọc đang mở cửa, lọc giá/khu vực, lịch trình, thống kê chi tiêu, nhập CSV, bộ sưu tập, heatmap và PWA manifest. `npm run check` cũng kiểm tra UTF-8 để tránh lưu nhầm mojibake.

GitHub Actions tự chạy các bước này khi push lên `main`. Job `deploy-pages` chỉ chạy sau khi `checks` pass, nên Pages không deploy nếu JavaScript, manifest, encoding hoặc Playwright test bị lỗi. Trong Settings -> Pages, chọn source là `GitHub Actions` để dùng luồng deploy có kiểm tra này.
