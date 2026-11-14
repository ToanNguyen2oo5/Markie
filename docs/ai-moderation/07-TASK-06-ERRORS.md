# Task 06 — Chuẩn hóa mã lỗi

## Phụ thuộc và phạm vi

Task 01. Sở hữu `post/post/src/main/java/com/stewie/post/exception/ErrorCode.java` và test handler. Không sửa file này đồng thời với agent khác.

## Các bước

1. Đọc `AppException`, `ApiResponse` và `GlobalExceptionHandler` hiện tại.
2. Thêm đúng bốn enum/mã/status/thông báo trong bảng ở `01-SHARED-CONTRACT.md`: 1015, 1016, 1017, 1018. Kiểm tra không trùng ở checkout thực tế.
3. Giữ cơ chế `AppException` hiện có. Handler `handlingAppException` đã trả status từ enum; tận dụng thay vì thêm handler riêng không cần thiết.
4. Xác nhận validation lấy tên enum từ message annotation. Không dùng lỗi AI đi qua catch-all vì handler mặc định hiện trả bad request.
5. Nếu thật sự phải sửa handler, chỉ sửa phần cần thiết cho bốn mã mới, không refactor các lỗi cũ hoặc thay response chung.

## Kiểm thử bắt buộc

- `AppException(POST_CONTENT_REJECTED)` → HTTP 422, code 1015, message đúng.
- `AppException(MODERATION_UNAVAILABLE)` → HTTP 503, code 1016, message đúng.
- Validation messages mới → HTTP 400, code 1017/1018 sau Task 04.
- Response lỗi không chứa API key, stack trace hoặc response body nhà cung cấp.
- Thành công vẫn dùng code 1000; không đổi HTTP/status các lỗi khác.

## Bàn giao

Gửi bảng mã đã triển khai cho Task 03, 04, 05 và 07. Task 03/07 có thể bắt đầu khi enum/contract đã hợp nhất; kiểm thử validation cuối chờ Task 04.
