# Chính sách bảo mật

## Phạm vi
Quán quen là web app tĩnh chạy hoàn toàn ở trình duyệt, không có backend. Dữ liệu người dùng (quán, ảnh, cấu hình) lưu cục bộ trong `localStorage` và `IndexedDB` của chính trình duyệt người dùng.

Dữ liệu chỉ rời khỏi máy người dùng trong các trường hợp họ chủ động bật:
- **Đồng bộ GitHub Gist**: token và dữ liệu chỉ gửi tới `api.github.com`. Token lưu trong trình duyệt người dùng.
- Gọi dịch vụ bản đồ công cộng (OpenStreetMap tiles, Nominatim, Overpass, OSRM) khi tìm/khám phá quán.

Backup mã hóa dùng PBKDF2-SHA-256 (250.000 vòng) + AES-GCM, khóa dẫn xuất từ mật khẩu người dùng.

## Báo lỗi bảo mật
Nếu phát hiện lỗ hổng, vui lòng **không tạo issue công khai**. Thay vào đó:
- Dùng tính năng **Report a vulnerability** trong tab **Security** của repo, hoặc
- Liên hệ riêng với người bảo trì repo (`tridpt`) qua GitHub.

Mô tả giúp: cách tái hiện, ảnh hưởng, và (nếu có) đề xuất khắc phục. Mình sẽ phản hồi sớm nhất có thể.

## Phiên bản được hỗ trợ
Dự án chỉ duy trì nhánh `main` (luôn là bản mới nhất). Vui lòng kiểm tra với bản mới nhất trước khi báo.
