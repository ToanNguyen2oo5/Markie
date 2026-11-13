# I02 — Chốt hợp đồng và mã lỗi

## Phụ thuộc

I01. Đọc và đối chiếu `01-SHARED-CONTRACT.md` với checkout thực tế.

## Công việc

1. Chốt route multipart, part content/image, giới hạn byte/pixel, trường image trong PostResponse, mã lỗi và thứ tự xử lý.
2. Kiểm tra 1019–1024 chưa trùng. Thêm enum mới ở Post Service, test response bằng handler hiện có. Không đổi 1015–1018 hay logic văn bản.
3. Chốt giao tiếp File Service: đường dẫn nội bộ, header credential, JWT relay có phạm vi hẹp, response metadata và delete bù. Đề xuất `POST /internal/post-media` multipart và `DELETE /internal/post-media/{id}`; đọc công khai `GET /post-media/{id}` trong context `/file`.
4. Chốt ownership do JWT quyết định; create/delete yêu cầu credential nội bộ. File Service có thể dùng mã nội bộ riêng; Post Service phải ánh xạ lỗi storage sang 1024 thay vì trả nguyên response nội bộ.
5. Chốt generic upload/download và avatar không truy cập/bỏ qua kiểm duyệt kho post-media. Chốt cách xác minh Post sau save lỗi không rõ trạng thái trước khi cleanup.
6. Tạo `docs/ai-image-moderation/api-contract.md`: request curl không có key thật, JSON success/error, ma trận lỗi, các endpoint và ví dụ field image null cho bài cũ.
7. Tạo bộ ca `image-test-cases.md`: ảnh hợp lệ, MIME/extension giả, quá byte, quá pixel, corrupt/truncated, ảnh động, nhiều part, AI true/false/lỗi, file save fail, Post save fail, JWT/secret sai, API cũ, UI giữ ảnh.

## Không làm

Không triển khai AI/storage hoặc endpoint create-with-image hoạt động trong task này. Không tự thay thiết kế lớn ngoài hợp đồng; nếu cần điều chỉnh, cập nhật tài liệu chung và nêu lý do.

## Kiểm tra và bàn giao

Test mã lỗi không cần gọi provider/database. Bảng mã không trùng, hợp đồng đủ để agent sau không tự chọn cấu trúc khác. Tạo `handoffs/I02.md`, commit và dừng.
