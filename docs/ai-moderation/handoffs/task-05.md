# Bàn giao Task 05 — Tích hợp kiểm duyệt vào tạo bài

Trạng thái: **hoàn thành Task 05**, ngày 13/11/2026 (Asia/Saigon). Dừng sau Task 05; chưa thực hiện Task 07.

## Xác minh trước khi sửa

- Repository thực tế: `C:/Users/LMT/Documents/University/Nam4/N4_HK1/DACN/Markie`, xác minh bằng `Get-Location` và `git rev-parse --show-toplevel`.
- Nhánh trước và sau: `feature/ai-post-moderation`; HEAD ban đầu `3c0199e` (Task 03). `git status --short` ban đầu rỗng. Không tạo nhánh hoặc ghi đè thay đổi khác.
- Đã đọc START-HERE, hợp đồng chung, Task 05 và handoff Task 02/03/04/06. Không tìm thấy `AGENTS.md` trong repository (kể cả file ẩn, ngoài `.git`/`node_modules`) hoặc các thư mục cha đến gốc ổ C.
- Không thiếu kết quả phụ thuộc: có cấu hình/RestClient Task 02, client/service Task 03, `@Valid` và ràng buộc content Task 04, enum/handler và test response Task 06. Khác commit tham chiếu `85957fe`: các kết quả này đã có; PostService trước Task 05 vẫn chưa gọi kiểm duyệt. Đã đọc lại mã thực tế trước khi tích hợp.

## File thay đổi và luồng xử lý

| File từ gốc repository | Thay đổi |
|---|---|
| `post/post/src/main/java/com/stewie/post/service/PostService.java` | Import và inject `ModerationService` qua field final do `@FieldDefaults` và constructor do `@RequiredArgsConstructor`; gọi `assertAllowed(request.getContent())` ngay sau khi lấy userId trong `createPost()` |
| `post/post/src/test/java/com/stewie/post/service/PostServiceTest.java` | Mockito unit test luồng thành công và hai lỗi moderation, authentication giả, dọn SecurityContext trong `@AfterEach` |
| `docs/ai-moderation/handoffs/task-05.md` | Báo cáo bàn giao |

Thứ tự: validation API hiện có → lấy userId từ SecurityContext → kiểm duyệt → xây Post với PostStats/thời gian như cũ → MongoDB save → lấy username qua Profile → gửi `PostSyncEvent.CREATED` tới `post.sync.events` → mapper trả PostResponse.

Lời gọi kiểm duyệt ở ngoài mọi khối catch Profile/Kafka. `AppException` từ ModerationService truyền nguyên vẹn ra handler: bị chặn 1015/HTTP 422, provider lỗi 1016/HTTP 503. Cả hai kết thúc trước khi xây/lưu bài, gọi Profile hoặc gửi Kafka. Không thêm catch, retry hoặc đường lưu khác.

Nội dung gửi kiểm duyệt, dùng xây Post và phát event được giữ nguyên; không trim/cắt/sửa. Luồng đạt giữ nguyên save, Profile, event và mapping; username lấy từ Profile vẫn chỉ dùng cho event, PostResponse tạo bài vẫn có username null theo mapper hiện có. Không đổi schema, trạng thái, controller, Kafka consumer, frontend hoặc xử lý bài cũ. Không thay hợp đồng chung.

## Kiểm thử thực tế

Chạy từ `post/post`, JDK 21.0.12.1 và Maven 3.9.16 trong cache:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$taskMaven = "$env:USERPROFILE\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd"
# Lần đầu trong sandbox: exit 1 tại testCompile, chưa chạy test.
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" '-Dtest=PostServiceTest' test
# Chạy lại với quyền đọc dependency cache bổ sung, clean compile:
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" '-Dtest=PostServiceTest' clean test
# Test mới và toàn bộ bộ test liên quan Task 02/03/04/06:
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" '-Dtest=PostServiceTest,ModerationClientTest,ModerationServiceTest,ModerationConfigurationTest,PostRequestValidationTest,PostControllerValidationTest,GlobalExceptionHandlerTest' test
```

- Lần đầu không đọc được cache `spring-security-crypto-6.2.4.jar`, chưa thực thi test. Hai lần sau chạy offline với quyền đọc cache bổ sung; không tải dependency.
- **13:54:39 +07:00: clean test exit 0, BUILD SUCCESS; 5 tests, 0 failures/errors/skipped.** Biên dịch 35 file main và 8 file test, chỉ chạy PostServiceTest.
- **13:55:04 +07:00: bộ liên quan exit 0, BUILD SUCCESS; 94 tests, 0 failures/errors/skipped.** Lần này không clean; dùng classes vừa biên dịch ở lần trên. Đã đối chiếu cả báo cáo Surefire XML.

| Lớp | Số test | Kết quả |
|---|---:|---|
| PostServiceTest (mới) | 5 | Đạt |
| ModerationClientTest | 36 | Đạt |
| ModerationServiceTest | 5 | Đạt |
| ModerationConfigurationTest | 15 | Đạt |
| PostRequestValidationTest | 9 | Đạt |
| PostControllerValidationTest | 9 | Đạt |
| GlobalExceptionHandlerTest | 15 | Đạt |

PostServiceTest gồm 3 ca đạt (tiếng Việt; khoảng trắng/tab/newline/quote/backslash/emoji; 500 ký tự), 1 ca bị chặn và 1 ca AI lỗi. Dùng InOrder xác minh moderation → save → Profile → Kafka → mapper, mỗi bước đúng một lần. ArgumentCaptor đối chiếu content duyệt/save/event nguyên văn, topic, ID/userId/username/thời gian/event type; kiểm tra PostStats khởi tạo và response bằng mapper MapStruct thật được spy. Hai ca lỗi xác minh chính AppException ban đầu và mã 1015/1016, không tương tác repository/Profile/Kafka/mapper. Tất cả dịch vụ ngoài được mock; Kafka trả future đã hoàn thành giả lập.

`git diff --check` và staged diff được rà soát trước commit; chỉ ba file Task 05. Fixture là dữ liệu giả, không có key/token/nội dung thật. Cảnh báo Lombok/MapStruct/unchecked handler/Mockito agent có sẵn; WARN context của các ca cấu hình sai là dự kiến.

## Phần chưa kiểm tra

Không chạy full suite, `PostApplicationTests.contextLoads`, package, ứng dụng thật, JWT/Gateway, frontend/E2E hoặc AI thật. Không sửa/xóa/disable test context. Unit test không phải bằng chứng E2E; chưa xác minh MongoDB, Profile, Kafka/search hoặc provider đang chạy. Các chặn hạ tầng Task 00 chưa được kiểm tra lại. Các catch Profile/Kafka và độ tin cậy gửi event giữ nguyên, ngoài phạm vi Task 05.

## Thông tin cho Task 07

Backend đã nối kiểm duyệt đồng bộ vào `POST /post/create`; validation vẫn chạy trước PostService. Response thành công giữ HTTP 200, ApiResponse code 1000 và result hiện có.

| Code | HTTP | Thông báo |
|---|---:|---|
| 1015 | 422 | Nội dung bài viết chưa phù hợp. Vui lòng chỉnh sửa và thử lại. |
| 1016 | 503 | Chưa thể kiểm duyệt bài viết. Vui lòng thử lại sau. |
| 1017 | 400 | Vui lòng nhập nội dung bài viết. |
| 1018 | 400 | Nội dung bài viết không được vượt quá 500 ký tự. |

Lỗi giữ cấu trúc `{"code":1015,"message":"..."}`, không yêu cầu result. Task 07 cần giữ bản nháp khi lỗi, chỉ gọi callback tạo bài sau thành công và xử lý trạng thái chờ request đồng bộ. Giới hạn 500 đơn vị UTF-16 vẫn như cũ. Muốn thử backend thật cần key/cấu hình/hạ tầng hợp lệ; có thể mock response khi làm frontend. Chưa sửa frontend hoặc thực hiện Task 07 trong phiên này.

Không push, triển khai, reset hoặc xóa thay đổi. Chỉ commit các thay đổi Task 05 trên nhánh hiện tại.
