# Checklist test thủ công — Quán quen

Chạy local: `npm run serve` rồi mở `http://127.0.0.1:5178`. Nhớ refresh cứng (Ctrl+F5) sau khi cập nhật.

## Bản đồ & marker
- [ ] Bản đồ load, hiện marker (số trên marker = điểm hợp gu).
- [ ] Nhiều quán gần nhau gom thành cụm; bấm cụm để phóng to tách ra.
- [ ] Nút Heatmap: bật → marker ẩn, hiện lớp nhiệt; tắt → marker hiện lại.
- [ ] Nút Ghim: bấm rồi click bản đồ → mở form quán mới với tọa độ đã chọn.
- [ ] Nút vị trí (định vị): cho phép → hiện khoảng cách "Cách bạn..." ở mỗi quán.
- [ ] Nút Random gần tôi: tìm quán mới quanh bạn từ OpenStreetMap, có nút "Lưu quán".

## Bộ lọc & sắp xếp
- [ ] Lọc theo loại quán, gu, tag, khu vực.
- [ ] Slider khoảng giá (Từ/Đến ₫) lọc đúng.
- [ ] Slider bán kính (cần định vị) lọc theo khoảng cách.
- [ ] Toggle "Đang mở cửa" + chọn ngày/giờ → lọc theo khung giờ.
- [ ] Đổi Sắp xếp (hợp gu / gần tôi / mới / giá / tên).
- [ ] Nút Đặt lại xóa hết bộ lọc.
- [ ] Tìm kiếm tự do theo tên/khu vực/ghi chú.

## Thêm / sửa / xóa quán
- [ ] "Quán mới": nhập tên, loại, giá, địa chỉ, tọa độ, lưu được.
- [ ] Thêm ảnh, chọn album (món/không gian/menu/khác), đổi album, xóa ảnh.
- [ ] Đặt giờ mở cửa → quán hiện "Đang mở"/"Có thể đóng".
- [ ] Thêm lịch sử ghé (ngày + điểm + ghi chú).
- [ ] Đánh dấu quán ruột.
- [ ] Sửa quán, xóa quán; thử nút Hoàn tác (toast vài giây).
- [ ] Bàn phím: mở form thì focus vào ô tên, Tab quẩn trong form, Esc đóng và trả focus.

## Chi tiết quán & chia sẻ
- [ ] Chọn quán → panel chi tiết hiện ảnh, điểm, tag (bấm tag để lọc), album ảnh theo nhóm.
- [ ] Nút Google Maps, Chỉ đường, Apple Maps mở đúng.
- [ ] Nút Chia sẻ (desktop copy thông tin + link; mobile mở share sheet).
- [ ] Nút Đã ghé ghi nhận lần ghé hôm nay.

## Lịch trình
- [ ] Thêm lịch trình từ chi tiết quán; sắp xếp lên/xuống, xóa điểm dừng.
- [ ] ≥2 quán → vẽ tuyến đường thật (cần mạng), hiện quãng đường + thời gian; offline → đường chim bay.
- [ ] Chỉ đường lịch trình mở Google Maps đa điểm.
- [ ] Lưu lịch trình theo tên → nạp lại / xóa.

## Bộ sưu tập
- [ ] Tạo bộ sưu tập mới.
- [ ] Trong chi tiết quán, gắn/bỏ quán vào bộ sưu tập.
- [ ] Bấm bộ sưu tập để lọc; xóa bộ sưu tập.

## Gợi ý & thống kê
- [ ] "Hôm nay đi đâu?" đổi mood (gồm "Mới chưa thử"); nút Random lại.
- [ ] Banner nhắc quán ruột lâu chưa ghé (số ngày là số nguyên).
- [ ] Sau vài lần "Đã ghé": tổng lần ghé, quán ghé nhiều nhất, chi tiêu ước tính + trung bình/tháng.
- [ ] Biểu đồ lần ghé & chi tiêu 6 tháng; mục "Lâu chưa ghé".

## Quản lý dữ liệu
- [ ] Quản lý tag: đổi tên / xóa đồng loạt.
- [ ] Quản lý loại quán: thêm loại mới (hiện trong filter + form), xóa loại (quán về Cafe).
- [ ] Xuất/Nhập JSON; Backup mã hóa (nhập mật khẩu, khôi phục lại).
- [ ] Nhập CSV / Xuất CSV (kiểm tra round-trip).
- [ ] Gist sync: lưu token + Gist ID, đẩy lên / kéo về (cần token GitHub quyền `gist`).

## Giao diện & PWA
- [ ] Nút dark/light, lưu lựa chọn, reload vẫn giữ.
- [ ] Nút VI/EN đổi ngôn ngữ (tĩnh + thông báo động), reload vẫn giữ.
- [ ] Thu gọn thanh bên.
- [ ] Layout không bị đè ở các panel dưới bản đồ.
- [ ] Cài app (PWA) khi trình duyệt hỗ trợ; chạy offline vẫn xem được quán đã lưu.
- [ ] Nút Cập nhật xuất hiện khi có bản service worker mới.

## Nhập từ Maps
- [ ] Dán link Google Maps (có `@lat,lng` hoặc `!3d!4d`) → vào hàng chờ; lưu hoặc sửa từng cái.
- [ ] Dán nhiều link mỗi dòng; nút clipboard đọc link đang copy.

## Mobile (màn nhỏ)
- [ ] Bản đồ và các panel xếp dọc, không bị cắt nội dung.
- [ ] Editor panel mở dạng tấm dưới, cuộn được.

## Tự động hóa
- [ ] `npm run check` pass.
- [ ] `npm test` (Playwright) toàn bộ pass.
