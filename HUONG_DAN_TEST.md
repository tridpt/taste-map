# Hướng dẫn test chi tiết — Quán quen

Tài liệu này mô tả từng tính năng, **các bước test cụ thể** và **kết quả mong đợi**.

## Chuẩn bị
1. Chạy server: `npm run serve` (hoặc `npx http-server . -a 127.0.0.1 -p 5178 -c-1`).
2. Mở `http://127.0.0.1:5178`.
3. Nhấn **Ctrl + F5** để chắc chắn lấy bản mới nhất.
4. Nếu app dùng service worker cache bản cũ: F12 → Application → Service Workers → Unregister → tải lại.

Ký hiệu: ✅ = kết quả mong đợi.

---

## 1. Khởi động & dữ liệu mẫu
**Bước:**
1. Mở app lần đầu (hoặc xóa localStorage rồi mở lại).

**Mong đợi:**
- ✅ Bản đồ hiện quanh khu trung tâm TP.HCM.
- ✅ Có 5 quán mẫu trong "Quán đã lưu", mỗi quán 1 marker có số (điểm hợp gu).
- ✅ Header hiện "5 quán đã lưu".

---

## 2. Tìm kiếm & lọc cơ bản
**Bước:**
1. Gõ vào ô tìm kiếm trên cùng (ví dụ tên một quán mẫu).
2. Bỏ chọn vài loại quán ở "Loại quán".
3. Bấm một chip ở "Gu hôm nay" và một "Tag quen".
4. Bấm **Đặt lại**.

**Mong đợi:**
- ✅ Danh sách + marker lọc theo từ khóa ngay khi gõ.
- ✅ Bỏ loại nào thì quán loại đó biến mất khỏi danh sách/bản đồ.
- ✅ Số "filtered count" cập nhật.
- ✅ Đặt lại → quay về đủ 5 quán, ô tìm kiếm trống.

---

## 3. Lọc nâng cao (giá, bán kính, khu vực, giờ)
**Bước:**
1. Kéo slider **Khoảng giá** (Từ/Đến).
2. Bấm nút định vị (mũi tên) → cho phép vị trí → kéo slider **Bán kính**.
3. Bấm một chip ở "Khu vực".
4. Bật **Đang mở cửa**, chọn ngày + giờ trong khung dưới.

**Mong đợi:**
- ✅ Nhãn giá đổi theo (₫–₫₫₫₫), danh sách lọc đúng khoảng giá.
- ✅ Sau khi định vị, mỗi quán hiện "Cách bạn ...m/km"; slider bán kính lọc theo khoảng cách.
- ✅ Chip khu vực lọc quán theo quận.
- ✅ "Đang mở cửa" + giờ → chỉ hiện quán mở vào khung giờ đó.

---

## 4. Thêm / sửa / xóa quán
**Bước:**
1. Bấm **Quán mới**.
2. Nhập tên, chọn loại, giá, địa chỉ; nhập tọa độ hoặc bật Ghim rồi click bản đồ.
3. Kéo các thanh đánh giá (ngon/yên tĩnh/ổ cắm/date/làm việc).
4. Đặt giờ mở cửa (chọn ngày + giờ Mở/Đóng).
5. Thêm 1 dòng lịch sử ghé (ngày + điểm + ghi chú).
6. Bật "Đánh dấu quán ruột". Lưu.
7. Mở lại quán vừa tạo, sửa tên, lưu.
8. Xóa quán → bấm **Hoàn tác** trong toast.

**Mong đợi:**
- ✅ Lưu xong quán hiện trong danh sách + marker trên bản đồ.
- ✅ Quán ruột có nhãn "Quán ruột".
- ✅ Sửa tên cập nhật ngay.
- ✅ Xóa → quán biến mất; Hoàn tác → quán trở lại.

---

## 5. Bàn phím & accessibility (form)
**Bước:**
1. Bấm **Quán mới**.
2. Nhấn Tab nhiều lần; nhấn Shift+Tab.
3. Nhấn **Esc**.

**Mong đợi:**
- ✅ Khi mở form, con trỏ tự vào ô "Tên quán".
- ✅ Tab/Shift+Tab chỉ chạy quẩn trong form (không ra nền sau).
- ✅ Esc đóng form và focus trở lại nút "Quán mới".

---

## 6. Ảnh & album & lightbox
**Bước:**
1. Mở/ tạo một quán → ở "Ảnh quán" chọn album (Món/Không gian/Menu/Khác) rồi Thêm ảnh.
2. Thêm vài ảnh ở các album khác nhau; đổi album của 1 ảnh; xóa 1 ảnh. Lưu.
3. Chọn quán đó → kéo xuống cuối panel "Chi tiết quán".
4. Bấm vào 1 thumbnail ảnh.
5. Nhấn Esc (hoặc click nền / nút X).

**Mong đợi:**
- ✅ Ảnh nhóm theo từng album kèm số lượng (trong form và trong panel chi tiết).
- ✅ Bấm thumbnail → ảnh phóng to toàn màn (lightbox).
- ✅ Esc / X / click nền → đóng lightbox.
- ✅ Tải lại trang → ảnh vẫn còn (lưu trong IndexedDB).

---

## 7. Chi tiết quán & chia sẻ / chỉ đường
**Bước:**
1. Bấm một quán trong danh sách hoặc marker.
2. Bấm lần lượt: Google Maps, Chỉ đường, Apple Maps.
3. Bấm **Chia sẻ**.
4. Bấm **Đã ghé**.

**Mong đợi:**
- ✅ Panel chi tiết hiện ảnh, điểm, tag (bấm tag để lọc), album.
- ✅ Google Maps/Chỉ đường/Apple Maps mở tab mới đúng tọa độ.
- ✅ Chia sẻ: trên máy tính copy thông tin + link (toast báo đã copy); trên điện thoại mở khay chia sẻ.
- ✅ Đã ghé: ghi nhận lần ghé hôm nay (bấm lại trong ngày báo đã ghi nhận).

---

## 8. Lịch trình & định tuyến
**Bước:**
1. Mở chi tiết 1 quán → bấm **Thêm lịch trình**. Lặp với quán thứ 2, thứ 3.
2. Ở panel "Lịch trình", dùng nút lên/xuống để đổi thứ tự; xóa 1 điểm.
3. Quan sát bản đồ (cần mạng cho tuyến thật).
4. Bấm **Chỉ đường lịch trình**.
5. Bấm **Lưu**, đặt tên. Bấm **Xóa hết**. Nạp lại lịch trình đã lưu.

**Mong đợi:**
- ✅ Mỗi quán thêm vào hiện trong panel theo thứ tự đánh số.
- ✅ ≥2 quán: bản đồ vẽ tuyến; hiện "Quãng đường thực tế + thời gian" (mạng tốt) hoặc "đường chim bay" (offline).
- ✅ Chỉ đường lịch trình mở Google Maps đa điểm.
- ✅ Lưu → xuất hiện ở "Lịch trình đã lưu"; nạp lại đúng các điểm.

---

## 9. Bộ sưu tập
**Bước:**
1. Ở panel "Bộ sưu tập" bấm **＋ Mới**, đặt tên (ví dụ "Đi date").
2. Mở chi tiết 1 quán → bấm chip bộ sưu tập để gắn quán vào.
3. Bấm chip bộ sưu tập ở panel để lọc.
4. Bấm nút X trên chip để xóa bộ sưu tập.

**Mong đợi:**
- ✅ Bộ sưu tập mới hiện ở panel với số đếm 0.
- ✅ Gắn quán → số đếm tăng; lọc theo bộ sưu tập chỉ hiện quán thuộc nhóm.
- ✅ Xóa bộ sưu tập → chip biến mất, lọc trở về tất cả.

---

## 10. Gợi ý & thống kê
**Bước:**
1. Ở "Hôm nay đi đâu?" đổi mood (gồm "Mới chưa thử"); bấm **Random lại**.
2. Đánh dấu "Đã ghé" cho vài quán (ngày khác nhau nếu muốn).
3. Xem panel "Thống kê".
4. Nếu có quán ruột lâu chưa ghé → xem banner nhắc.

**Mong đợi:**
- ✅ Danh sách gợi ý đổi theo mood; "Mới chưa thử" ưu tiên quán chưa ghé.
- ✅ Thống kê hiện: tổng lần ghé, quán ghé nhiều nhất, chi tiêu ước tính + trung bình/tháng.
- ✅ Biểu đồ lần ghé & chi tiêu 6 tháng; mục "Lâu chưa ghé".
- ✅ Banner nhắc quán ruột hiện số ngày là số nguyên; bấm chọn được quán.

---

## 11. Khám phá quán thật (OpenStreetMap)
**Bước:**
1. Bấm nút định vị (tùy chọn) hoặc kéo bản đồ tới khu muốn xem.
2. Chọn loại ở dropdown (Tất cả/Cafe/Quán ăn/Bar/Ngọt) và chỉnh **Bán kính**.
3. Bấm **Khám phá khu này**.
4. Bấm một marker khám phá (ghim vàng ✨) → bấm **Lưu quán** trong popup.
5. Thử **Random gần tôi**.

**Mong đợi:**
- ✅ Sau 1–3 giây hiện nhiều marker quán thật quanh khu đang xem (theo loại + bán kính).
- ✅ Bấm marker → popup tên/loại/khoảng cách + nút Lưu.
- ✅ Lưu quán → mở form điền sẵn tên, loại, tọa độ, địa chỉ.
- ✅ Random gần tôi cũng hiện các quán quanh bạn để chọn.
- ⚠️ Overpass là dịch vụ dùng chung, có thể chậm/giới hạn nếu bấm dồn dập — đợi rồi thử lại.

---

## 12. Nhập từ Google Maps
**Bước:**
1. Dán một link Google Maps đầy đủ (có `@lat,lng` hoặc `!3d...!4d...`) vào ô "Nhập từ Maps".
2. Bấm nút nhập (đũa phép) — hoặc dán nhiều link mỗi dòng một link.
3. Với hàng chờ: bấm Lưu từng quán, hoặc Sửa, hoặc "Lưu tất cả".
4. Thử nút clipboard (cho phép trình duyệt đọc clipboard).

**Mong đợi:**
- ✅ Link đơn → mở form điền sẵn tên + tọa độ.
- ✅ Nhiều link → vào "Chờ xác nhận"; lưu/sửa/bỏ từng cái hoạt động.
- ✅ Link rút gọn (maps.app.goo.gl) báo cần mở ra lấy URL đầy đủ.

---

## 13. Dữ liệu: backup / CSV / Gist
**Bước:**
1. Bấm **JSON thường** (tải file), rồi **Nhập** lại file đó.
2. Bấm **Backup mã hóa**, đặt mật khẩu ≥8 ký tự; thử Nhập lại và nhập đúng mật khẩu.
3. Bấm **Xuất CSV**; sửa nhẹ file rồi **Nhập CSV**.
4. (Tùy chọn) Nhập GitHub token (quyền `gist`) + để trống Gist ID → **Đẩy lên**; sau đó **Kéo về**.

**Mong đợi:**
- ✅ Xuất/nhập JSON khôi phục đúng số quán.
- ✅ Backup mã hóa: nhập sai mật khẩu thì lỗi, đúng thì khôi phục được.
- ✅ CSV round-trip giữ tên/loại/tọa độ/giá/tag/ghi chú.
- ✅ Gist: đẩy lên tạo gist và lưu Gist ID; kéo về thay dữ liệu (có xác nhận).

---

## 14. Giao diện: dark mode & song ngữ
**Bước:**
1. Bấm nút mặt trăng/mặt trời (đổi dark/light); tải lại trang.
2. Bấm nút **VI/EN**; tải lại trang.
3. Thu gọn thanh bên (nút panel trái).

**Mong đợi:**
- ✅ Dark/light đổi ngay; tải lại vẫn giữ lựa chọn; bản đồ + popup hợp tông.
- ✅ VI/EN đổi cả nhãn tĩnh lẫn thông báo động; tải lại vẫn giữ; `<html lang>` đổi theo.
- ✅ Thu gọn thanh bên mở rộng vùng bản đồ.

---

## 15. PWA & offline
**Bước:**
1. Khi trình duyệt hỗ trợ, bấm **Cài app** (hoặc cài qua thanh địa chỉ).
2. Tắt mạng (DevTools → Network → Offline) rồi tải lại.
3. Khi có bản service worker mới, để ý nút **Cập nhật**.

**Mong đợi:**
- ✅ Cài được như ứng dụng (PWA).
- ✅ Offline: vẫn xem được app + quán đã lưu + tile bản đồ đã xem; tìm quán mới (Overpass/Nominatim) thì cần mạng.
- ✅ Có bản mới → hiện nút Cập nhật, bấm để kích hoạt.

---

## 16. Bản đồ: cluster & heatmap
**Bước:**
1. Thu nhỏ bản đồ để nhiều marker gần nhau.
2. Bấm vào một cụm số.
3. Bấm **Heatmap**; bấm lại để tắt.

**Mong đợi:**
- ✅ Nhiều quán gần nhau gom thành cụm có số; bấm cụm → phóng to tách ra.
- ✅ Heatmap bật → marker ẩn, hiện lớp nhiệt mật độ; tắt → marker trở lại.

---

## 17. Mobile (màn nhỏ)
**Bước:**
1. F12 → bật chế độ thiết bị di động (hoặc thu hẹp cửa sổ < 700px).
2. Cuộn qua các panel dưới bản đồ.
3. Mở form "Quán mới".

**Mong đợi:**
- ✅ Bản đồ và các panel xếp dọc, không bị cắt/đè nội dung.
- ✅ Form mở dạng tấm trượt từ dưới, cuộn được.

---

## 18. Test tự động
**Bước:**
```powershell
npm run check
npm test
```

**Mong đợi:**
- ✅ `npm run check`: encoding ok + manifest ok (không lỗi cú pháp).
- ✅ `npm test`: toàn bộ Playwright test pass (hiện tại 42 test).

---

## Ghi chú khi báo lỗi
Khi gặp lỗi, ghi lại: **mục số mấy**, **bước nào**, **hiện tượng thực tế** so với "Mong đợi", và (nếu có) lỗi trong Console (F12). Như vậy mình khoanh vùng và sửa nhanh hơn.
