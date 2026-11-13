# Bàn giao Task 04 — Validation nội dung bài viết

Ngày: 13/11/2026 (Asia/Saigon). Hoàn thành phần triển khai và kiểm thử độc lập Task 04; kiểm thử mã lỗi response còn phụ thuộc Task 06.

## Checkout và kết quả task trước

- Repository: `C:/Users/LMT/Documents/University/Nam4/N4_HK1/DACN/Markie`.
- Nhánh trước và sau khi làm: `feature/ai-post-moderation`; HEAD ban đầu `893e182aef812ad8efc2a439274497e2c7220e9a`, kế thừa `6a47f6a6cfd67d33adebde0245cbadc653f7128c`. Không tạo nhánh mới.
- `git status --short` ban đầu rỗng. Không có công việc chưa commit cần tránh ghi đè.
- Đã đọc START-HERE, hợp đồng chung, Task 04, policy-and-cases, environment-report và handoff Task 02. Không tìm thấy `AGENTS.md` trong repository hoặc các thư mục cha từ checkout đến gốc ổ C.
- Task 00/01 có báo cáo và policy; Task 02 có YAML, `ModerationProperties`, `ModerationConfiguration`, test và tài liệu. Đã đối chiếu lại DTO, controller, handler, ErrorCode và POM tại checkout hiện tại. So với commit tham chiếu `85957fe`, checkout đã có cấu hình Task 02; DTO/controller vẫn chưa bật validation, ErrorCode vẫn chỉ đến 1014.

## File và hành vi

| File | Thay đổi |
|---|---|
| `post/post/src/main/java/com/stewie/post/dto/request/PostRequest.java` | Thêm `@NotBlank(message = "POST_CONTENT_REQUIRED")` và `@Size(max = 500, message = "POST_CONTENT_TOO_LONG")` cho content |
| `post/post/src/main/java/com/stewie/post/controller/PostController.java` | Thêm `@Valid` vào request tạo bài |
| `post/post/src/test/java/com/stewie/post/dto/request/PostRequestValidationTest.java` | 9 ca Bean Validation thật, deserialize JSON bằng Jackson |
| `post/post/src/test/java/com/stewie/post/controller/PostControllerValidationTest.java` | 9 ca standalone MockMvc, validator và GlobalExceptionHandler thật, PostService mock |
| `docs/ai-moderation/handoffs/task-04.md` | Báo cáo này |

Giữ route `POST /post/create` (mapping `/create` cộng context path `/post`), xác thực và cấu trúc ApiResponse. Không trim, cắt ngắn hoặc biến đổi nội dung. Nội dung không hợp lệ bị chặn trước PostService; chuỗi hợp lệ đến service nguyên văn. Độ dài theo đơn vị UTF-16 của Java String.

Không sửa ErrorCode, handler, PostService, frontend hoặc cấu hình Task 02. Không tích hợp/gọi AI thật, không thao tác MongoDB/Kafka/Profile hay dữ liệu thật.

## Kiểm thử đã chạy

Chạy từ `post/post`, JDK 21.0.12.1 và Maven 3.9.16 trong cache:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$taskMaven = "$env:USERPROFILE\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd"
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" '-Dtest=PostRequestValidationTest,PostControllerValidationTest,ModerationConfigurationTest' clean test
```

Kết quả lúc **13:34:10 +07:00**: exit 0, **BUILD SUCCESS; 33 tests, 0 failures, 0 errors, 0 skipped**. Clean build biên dịch 32 file main và 4 file test. Chỉ chọn ba lớp test trên để không khởi động context/hạ tầng thật.

| Lớp | Số ca | Kết quả thực tế |
|---|---:|---|
| PostRequestValidationTest | 9 | Thiếu content, null, rỗng, chỉ khoảng trắng bị NotBlank; 501 ký tự ASCII và 251 emoji (502 đơn vị UTF-16) bị Size; 500 ASCII, 250 emoji (500 đơn vị) và chuỗi có khoảng trắng/tab/newline ở hai đầu hợp lệ |
| PostControllerValidationTest | 9 | Cùng sáu ca invalid trả HTTP 400, có MethodArgumentNotValidException đúng message constraint, không gọi PostService; ba ca valid trả HTTP 200/code 1000, giữ result và chuyển nguyên chuỗi đến service |
| ModerationConfigurationTest (Task 02, không sửa) | 15 | Tất cả đạt với key giả và mock transport |

Standalone MVC dùng đường dẫn mapping `/create`, không nạp servlet context path hoặc JWT filter chain. Đây là kiểm thử validation/controller, chưa xác minh xác thực, Gateway hoặc HTTP qua ứng dụng đang chạy. Không thay SecurityConfig để kiểm thử.

Lần chạy đầu với cùng danh sách test nhưng chỉ goal `test` trong sandbox: exit 1 tại testCompile do không đọc được dependency cache `spring-security-crypto-6.2.4.jar`, chưa thực thi test. Chạy lại offline với quyền đọc cache bổ sung và `clean test` đạt kết quả trên. Không tải dependency mới. Còn cảnh báo Lombok/MapStruct/unchecked handler có sẵn và cảnh báo Java agent của Mockito; không sửa ngoài phạm vi.

`git diff --check` đạt trước bàn giao. Không chạy toàn bộ suite, `PostApplicationTests.contextLoads`, package hoặc E2E; giữ nguyên test context có sẵn. Chặn MongoDB E11000 và vấn đề môi trường khác vẫn theo Task 00, chưa kiểm chứng lại trong phiên này.

## Phụ thuộc Task 06 và phần còn lại

- Chưa có enum `POST_CONTENT_REQUIRED`/`POST_CONTENT_TOO_LONG`. Handler hiện tại fallback sang `INVALID_KEY` (1001) khi không tìm được enum; Task 04 không thay đổi hành vi mapping này.
- **Chưa chạy assertion HTTP 400 + response code 1017/1018 và thông báo tiếng Việt theo hợp đồng.** HTTP 400, message constraint nội bộ và việc không gọi service đã được kiểm thử thật; không coi đó là xác minh đầy đủ response lỗi.
- Sau Task 06, bổ sung assertion response code 1017 cho thiếu/null/rỗng/khoảng trắng và 1018 cho quá giới hạn, cùng thông báo và ApiResponse. Các test hiện tại không khóa mã fallback 1001.
- Chưa có kiểm duyệt AI trong luồng tạo bài; validation không đồng nghĩa bài đã được kiểm duyệt.

Không thay đổi hợp đồng chung. Chỉ commit năm file Task 04 kể trên trên nhánh hiện tại; không push, triển khai, reset hoặc thực hiện task tiếp theo.
