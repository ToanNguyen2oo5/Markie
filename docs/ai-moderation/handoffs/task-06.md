# Bàn giao Task 06 — Chuẩn hóa mã lỗi kiểm duyệt và validation

Trạng thái: **hoàn thành Task 06**, ngày 13/11/2026 (Asia/Saigon). Dừng ở Task 06; chưa thực hiện Task 03.

## Xác minh checkout và phụ thuộc

- Nhánh trước và sau khi làm: `feature/ai-post-moderation`; HEAD ban đầu `65267fbeedc7bfbad0c9e0e38422912a87bc88cc` (Task 04). Không tạo nhánh mới. `git status --short` ban đầu rỗng.
- Đã đọc START-HERE, hợp đồng chung, Task 06, handoff Task 04, `policy-and-cases.md` (báo cáo Task 01) và handoff Task 02. Các artifact Task 01–02 và Task 04 có đủ trên checkout. Không tìm thấy `AGENTS.md` trong repository hoặc các thư mục cha đến gốc ổ C.
- Đã đọc lại ErrorCode, AppException, ApiResponse, GlobalExceptionHandler, PostRequest, PostController và test validation. ErrorCode ban đầu chỉ đến 1014 (ngoài mã tổng quát 9999); tìm trong `post/post/src` không có mã 1015–1018 đã dùng.
- Chạy lại ba lớp test Task 02/04 trước khi sửa: **33 tests, 0 failures, 0 errors, 0 skipped**, BUILD SUCCESS lúc **13:39:15 +07:00**. Xác nhận HTTP 400 và không gọi PostService cho request invalid; assertion response 1017/1018 đúng là còn chờ Task 06.
- Khác commit tham chiếu `85957fe`: checkout đã có cấu hình Task 02 và validation Task 04. Không thiếu kết quả task trước, không có thay đổi chưa commit cần giữ riêng.

## File đã tạo/sửa

| File từ gốc repository | Mục đích |
|---|---|
| `post/post/src/main/java/com/stewie/post/exception/ErrorCode.java` | Thêm bốn enum theo hợp đồng; giữ nguyên tất cả enum cũ |
| `post/post/src/test/java/com/stewie/post/controller/PostControllerValidationTest.java` | Hoàn thiện assertion response 1017/1018, thông báo chính xác và JSON chỉ có code/message; giữ kiểm tra không gọi service và thành công 1000 |
| `post/post/src/test/java/com/stewie/post/exception/GlobalExceptionHandlerTest.java` | MockMvc với controller/advice thật, PostService mock; xác minh hai AppException moderation và hồi quy 13 enum cũ |
| `docs/ai-moderation/handoffs/task-06.md` | Bàn giao và kết quả kiểm thử |

Không cần sửa GlobalExceptionHandler: `handlingAppException` đã lấy HTTP status từ enum; `handlingValidation` đã dùng `ErrorCode.valueOf` với message annotation. Giữ nguyên AppException, ApiResponse, handler, DTO/controller production, luồng tạo bài và frontend. Không thay đổi hợp đồng chung.

## Hợp đồng đã triển khai

| Enum | Mã | HTTP | Thông báo |
|---|---:|---:|---|
| `POST_CONTENT_REJECTED` | 1015 | 422 | Nội dung bài viết chưa phù hợp. Vui lòng chỉnh sửa và thử lại. |
| `MODERATION_UNAVAILABLE` | 1016 | 503 | Chưa thể kiểm duyệt bài viết. Vui lòng thử lại sau. |
| `POST_CONTENT_REQUIRED` | 1017 | 400 | Vui lòng nhập nội dung bài viết. |
| `POST_CONTENT_TOO_LONG` | 1018 | 400 | Nội dung bài viết không được vượt quá 500 ký tự. |

Response lỗi giữ dạng `{"code":1015,"message":"..."}`; trường result null bị bỏ. Test so sánh JSON nghiêm ngặt để loại trừ trường dư, stack trace, cause hoặc chi tiết provider. Hai ca moderation gắn cause chứa key/body giả để xác minh chúng không lọt vào response; không dùng secret thật. Thành công giữ HTTP 200/code 1000 và result hiện có.

## Kiểm thử thực tế

Chạy từ `post/post`, JDK 21.0.12.1, Maven 3.9.16 trong cache:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$taskMaven = "$env:USERPROFILE\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd"
# Baseline trước sửa: 33/33, exit 0.
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" '-Dtest=PostRequestValidationTest,PostControllerValidationTest,ModerationConfigurationTest' test
# Sau sửa: clean compile và kiểm thử Task 02, 04, 06.
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" '-Dtest=PostRequestValidationTest,PostControllerValidationTest,ModerationConfigurationTest,GlobalExceptionHandlerTest' clean test
```

Kết quả cuối lúc **13:40:55 +07:00**: exit 0, **BUILD SUCCESS; 48 tests, 0 failures, 0 errors, 0 skipped**. Biên dịch lại 32 file main và 5 file test; chỉ thực thi bốn lớp được chọn.

| Lớp | Số ca | Kết quả |
|---|---:|---|
| `ModerationConfigurationTest` (Task 02) | 15 | Đạt; cấu hình/key giả và mock transport, không gọi mạng AI |
| `PostRequestValidationTest` (Task 04) | 9 | Đạt; ràng buộc nội dung, giới hạn UTF-16 và giữ nguyên chuỗi |
| `PostControllerValidationTest` (Task 04/06) | 9 | Đạt; 4 ca thiếu/null/rỗng/khoảng trắng trả 400/1017; 2 ca quá dài ASCII/emoji trả 400/1018; cả 6 không gọi PostService; 3 ca hợp lệ giữ 200/1000 và nội dung nguyên văn |
| `GlobalExceptionHandlerTest` (Task 06) | 15 | Đạt; 422/1015, 503/1016 và thông báo đúng; 13 enum cũ giữ nguyên HTTP/code/message và cấu trúc response |

Mỗi dữ liệu invalid chỉ vi phạm một ràng buộc; không kiểm thử thứ tự lỗi khi vi phạm nhiều constraint. Hai lỗi moderation được kiểm thử bằng PostService mock ném AppException qua endpoint đọc bài hiện có, không thêm endpoint hoặc triển khai service AI.

Lần `clean test` đầu exit 1 tại compile vì sandbox không đọc được dependency cache `spring-security-crypto-6.2.4.jar`, chưa chạy test. Chạy lại cùng lệnh offline với quyền đọc cache bổ sung đạt kết quả cuối trên; không tải dependency. Còn cảnh báo Lombok/MapStruct/unchecked handler và Java agent Mockito có sẵn, không sửa ngoài phạm vi. WARN của test cấu hình sai là dự kiến.

`git diff --check` và kiểm tra staged diff đạt; rà soát đúng bốn file Task 06, không có secret thật hoặc thay đổi ngoài phạm vi.

Chưa kiểm tra: full suite, `PostApplicationTests.contextLoads`, package, ứng dụng đang chạy, JWT/Gateway, frontend/E2E hoặc AI thật. Standalone MVC không nạp security filter chain hay context path `/post`. Không thay đổi/xóa/disable test context; các chặn hạ tầng Task 00 chưa được xác minh lại. Không kiểm thử lại catch-all hay mọi nhánh validation cũ; mã handler và enum cũ giữ nguyên, hồi quy AppException của toàn bộ enum cũ đã đạt.

## Thông tin cho task tiếp theo

- **Task 03:** dùng `new AppException(ErrorCode.POST_CONTENT_REJECTED)` khi bị đánh dấu và `new AppException(ErrorCode.MODERATION_UNAVAILABLE)` cho lỗi provider; handler tự trả 422/1015 hoặc 503/1016. Không đưa lỗi AI qua catch-all (hiện trả HTTP 400). Cấu hình RestClient Task 02 vẫn sẵn có theo handoff Task 02. Chưa có ModerationClient/ModerationService hoặc tích hợp luồng tạo bài trong Task 06.
- **Task 04/05:** phần response validation còn chờ của Task 04 đã được xác minh đầy đủ 1017/1018; invalid không gọi PostService. Việc chặn save/Profile/Kafka bởi moderation vẫn là công việc tích hợp sau.
- **Task 07:** dùng đúng bảng mã/thông báo trên; giữ bản nháp, không gọi callback tạo bài khi có lỗi; thành công vẫn code 1000. Có thể dùng response giả lập cho 1015/1016 vì backend chưa tích hợp AI. Không suy luận bài đã qua kiểm duyệt chỉ từ việc Task 06 hoàn thành.

Chỉ commit bốn file Task 06 trên nhánh hiện tại. Không push, triển khai, reset, xóa thay đổi hoặc thực hiện Task 03.
