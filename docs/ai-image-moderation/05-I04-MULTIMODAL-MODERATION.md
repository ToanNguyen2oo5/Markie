# I04 — Mở rộng client/service AI hiện có

## Phụ thuộc

I02, I03. Sửa ModerationClient/Service và test hiện có, không tạo một bộ API key/client độc lập.

## Các bước

1. Đọc code client, bean RestClient, timeout và response parser đang chạy. Giữ nguyên phương thức text-only và regression test của nó.
2. Thêm overload hoặc phương thức rõ tên nhận content và ảnh đã validate I03. Tạo data URL từ MIME xác thực + Base64 của đúng byte ảnh.
3. Gửi một request `/v1/moderations` với input gồm text và image_url, model cấu hình hiện có. Không gửi local URL vì server AI không truy cập localhost máy người dùng.
4. Tái dùng parser nghiêm ngặt results[0].flagged, không mặc định false cho missing/null/wrong type. Không retry hoặc fallback khi lỗi.
5. Service cho qua → return; flagged → AppException 1015; provider failure → 1016. Không cố giải thích ảnh vi phạm nhóm nào bằng văn bản AI sinh ra.
6. Kiểm tra giới hạn bộ nhớ của Base64 (tăng dung lượng so với byte gốc); giới hạn file trước khi encode, không giữ nhiều bản copy không cần thiết.
7. Không log body request/response, Base64, ảnh, key hoặc exception chứa dữ liệu provider. Không đưa JWT/nội bộ secret đến OpenAI.

## Kiểm thử

- MockRestServiceServer/transport giả: đúng JSON hai input, MIME/data URL và byte khi decode lại, header key giả.
- True/false, HTTP lỗi/timeout, response thiếu/rỗng/sai kiểu đều ánh xạ đúng; không storage hoặc mạng thật.
- Cả text-only và overload ảnh dùng đúng cấu hình, không xung đột bean.
- Chạy test văn bản để xác nhận hành vi cũ không đổi.

Đối chiếu OpenAI Docs chính thức trước khi triển khai request. Chưa chạy ảnh thật trong task này. Bàn giao `handoffs/I04.md` với chữ ký phương thức, test và giới hạn. Chưa sửa PostService.
