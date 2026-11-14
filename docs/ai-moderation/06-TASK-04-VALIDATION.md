# Task 04 — Kiểm tra nội dung tại backend

## Phụ thuộc và file sở hữu

Task 01. Chỉ sửa `post/post/src/main/java/com/stewie/post/dto/request/PostRequest.java`, `.../controller/PostController.java` và test liên quan. Task 06 sở hữu `ErrorCode.java`; nếu chưa có enum thì phối hợp theo hợp đồng, không tự sửa cùng file.

## Các bước

1. Thêm `@NotBlank(message = "POST_CONTENT_REQUIRED")` và `@Size(max = 500, message = "POST_CONTENT_TOO_LONG")` vào `content` bằng Jakarta Validation.
2. Thêm `@Valid` vào tham số `@RequestBody PostRequest` của endpoint tạo bài. Không đổi route, response hoặc yêu cầu xác thực.
3. Giữ nguyên nội dung gửi vào, không cắt/trim để biến bài không hợp lệ thành hợp lệ. Giao diện vẫn được dùng `trim()` để phát hiện bài trống trước khi gửi.
4. Dùng message enum cố định; handler hiện chỉ thay placeholder `min`, vì vậy không dùng `{max}` trong thông báo mới và không cần sửa handler cho task này.
5. Kiểm tra null, thiếu content, chuỗi rỗng, chỉ khoảng trắng, 500 ký tự và 501 ký tự. Dùng ký tự đơn giản cho test ranh giới; thêm emoji để ghi rõ quy tắc UTF-16 nếu cần.

## Kiểm thử

- Bean Validation test cho tất cả trường hợp trên.
- MVC slice hoặc standalone controller test với validator thật: invalid request trả HTTP 400 và mã 1017/1018 sau khi Task 06 có mặt; `PostService` mock không được gọi.
- Giữ cấu hình bảo mật sản phẩm. Nếu cô lập filter trong test, chỉ thực hiện trong test và giải thích phạm vi; không chỉnh SecurityConfig để test qua.
- Valid content được chuyển nguyên văn đến `PostService`.

## Nghiệm thu

Gọi API trực tiếp cũng bị giới hạn; frontend không phải nơi duy nhất kiểm tra. Task 05 không cần lặp lại logic validation đã có trong API cho phạm vi hiện tại.
