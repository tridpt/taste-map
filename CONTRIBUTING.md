# Đóng góp cho Quán quen

Cảm ơn bạn quan tâm! Dự án là web app tĩnh (vanilla JS, không bundler). Xem `DOCUMENTATION.md` để hiểu kiến trúc trước khi sửa.

## Quy trình
1. Tạo nhánh mới từ `main` (đừng commit thẳng `main` nếu gửi PR).
2. Sửa code; chạy kiểm tra cục bộ (xem dưới).
3. Mở Pull Request, mô tả thay đổi + cách đã test.

## Chạy & kiểm tra cục bộ
```powershell
npm install
npm run serve     # http://127.0.0.1:5178
npm run check     # encoding + cú pháp JS + manifest
npm test          # Playwright (tự khởi động server)
```

## Quy ước khi sửa
- **Đổi asset (app.js / i18n.js / style.css / index.html / sw.js):** bắt buộc bump `CACHE_VERSION` trong `sw.js` để client nhận bản mới.
- **Thêm chuỗi hiển thị:** thêm key vào CẢ `vi` và `en` trong `i18n.js`; UI tĩnh dùng `data-i18n`, chuỗi động dùng `t("key")`. Không hardcode tiếng Việt/Anh trong app.js.
- **Encoding:** lưu file UTF-8 (không BOM). `npm run check` sẽ chặn mojibake.
- **Test:** thêm/cập nhật test trong `tests/app.spec.js` cho logic mới. Hàm thuần nên tách để test trực tiếp; phần mạng (Overpass/OSRM/Gist) mock `window.fetch`.
- **Tài liệu:** cập nhật `README.md` / `FEATURES.md` khi thêm tính năng người dùng thấy được.
- **Commit:** mô tả ngắn gọn, theo từng thay đổi (ví dụ: "Add explore-this-area discovery").

## Chụp lại ảnh / GIF cho README
```powershell
npm run serve            # cửa sổ 1
npm run screenshots      # cửa sổ 2 — ảnh tĩnh vào screenshots/
npm run gif              # cửa sổ 2 — GIF demo vào screenshots/demo.gif
```

## Phong cách code
- Vanilla JS, hàm cấp cao, không thêm framework/bundler trừ khi có lý do rõ ràng.
- Giữ `"use strict"`, tránh phụ thuộc mới nếu không cần.
- Escape mọi dữ liệu ngoài khi render (`escapeHtml` / `escapeAttr`).
