# I01 — Nhánh và baseline

## Mục tiêu

Chuẩn bị nhánh mở rộng dựa trên tính năng kiểm duyệt văn bản đã hoàn thành. Không sửa chức năng trong task này.

## Các bước

1. Đọc tài liệu chung và AGENTS.md. Xác định checkout thật, nhánh, trạng thái thay đổi và remote. Không mặc định thư mục hiện tại là worktree hợp lệ.
2. Kiểm tra có ModerationClient/Service, test, UI và báo cáo nghiệm thu văn bản. Đọc kết quả thay vì chỉ dựa vào tên branch hoặc commit được báo trong chat.
3. Nếu main chưa có kiểm duyệt văn bản, tạo `feature/ai-image-moderation` từ tip nhánh `feature/ai-post-moderation` chứa kết quả đầy đủ. Nếu main đã chứa kết quả, có thể dùng main làm gốc. Nếu nhánh ảnh đã có, kiểm tra để tiếp tục, không reset/recreate.
4. Giữ toàn bộ thay đổi có sẵn; không tự stash/reset/clean hoặc lấy nhầm việc ngoài scope. Không cần checkout/worktree riêng nếu current checkout phù hợp.
5. Kiểm tra Java/Maven Java 21, frontend build/lint, bộ test văn bản. Chỉ chạy kiểm tra có môi trường, không khởi động lại service người dùng đang chạy hoặc lấy key từ tiến trình.
6. Lập danh sách file cần mở rộng: moderation, Post request/entity/response, File Service storage/security/controller, composer, PostCard/profile/search/event.

## Nghiệm thu

- Nhánh đúng và chứa tính năng văn bản.
- Có baseline thực tế và lỗi có sẵn nếu có.
- Chưa thêm ảnh/video, chưa push hoặc merge.

## Bàn giao

`handoffs/I01.md`: commit gốc, nhánh, test thực tế, file liên quan và khoảng trống môi trường. Nếu không tìm thấy mã nguồn văn bản hoàn chỉnh, ghi thiếu phụ thuộc, không xây lại tự phát.
