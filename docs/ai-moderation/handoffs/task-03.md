# Bàn giao Task 03 — Client và service kiểm duyệt AI

Trạng thái: **hoàn thành Task 03**, ngày 13/11/2026 (Asia/Saigon). Chưa thực hiện Task 05.

## Checkout và phụ thuộc

- Nhánh ban đầu và nhánh bàn giao: `feature/ai-post-moderation`; HEAD ban đầu `b180e0f` (Task 06). `git status --short` ban đầu rỗng. Không đổi nhánh, không ghi đè công việc khác.
- Đã đọc START-HERE, hợp đồng chung, Task 03, configuration và handoff Task 02/04/06. Không tìm thấy `AGENTS.md` trong repository (kể cả file ẩn, ngoài `.git`) hoặc các thư mục cha đến gốc ổ C.
- Đối chiếu thực tế: Task 02 có properties và bean `moderationRestClient` với timeout riêng; Task 04 có validation; Task 06 có đủ enum 1015–1018. Không thiếu kết quả phụ thuộc. So với commit tham chiếu `85957fe`, các thay đổi Task 02/04/06 đã hiện diện; giữ nguyên.
- Đã đối chiếu [OpenAI Create moderation API reference](https://developers.openai.com/api/reference/resources/moderations/methods/create) ngày 13/11/2026: POST `/v1/moderations`, Bearer authentication, JSON model/input dạng chuỗi và `results[].flagged` kiểu boolean phù hợp hợp đồng. Chỉ đọc tài liệu; không gọi API AI.

## File tạo mới

| File từ gốc repository | Mục đích |
|---|---|
| `post/post/src/main/java/com/stewie/post/moderation/ModerationClient.java` | Component gọi RestClient và kiểm tra phản hồi bằng Jackson tree |
| `post/post/src/main/java/com/stewie/post/moderation/ModerationProviderException.java` | Exception nội bộ với thông báo cố định, không lưu cause/body/key/content |
| `post/post/src/main/java/com/stewie/post/moderation/ModerationService.java` | Service ánh xạ kết quả và lỗi provider sang AppException |
| `post/post/src/test/java/com/stewie/post/moderation/ModerationClientTest.java` | 36 test request, phản hồi và transport giả lập |
| `post/post/src/test/java/com/stewie/post/moderation/ModerationServiceTest.java` | 5 test service, mã lỗi, một lần gọi và Spring wiring |
| `docs/ai-moderation/handoffs/task-03.md` | Báo cáo bàn giao này |

Không sửa file có sẵn, cấu hình Task 02, POM/dependency, PostService, controller hoặc frontend. Không tạo endpoint hay cơ chế bỏ qua kiểm duyệt.

## Injection và chữ ký cho Task 05

`ModerationClient` có `@Component`, constructor:

```java
public ModerationClient(
        @Qualifier("moderationRestClient") RestClient restClient,
        ModerationProperties properties)
```

Dùng lại singleton của Task 02, gồm base URL, Authorization, Content-Type và connect/read timeout; không đăng ký bean RestClient/properties khác hoặc tạo client theo từng bài. Test wiring có thêm một RestClient khác để xác minh qualifier vẫn chọn đúng bean.

`ModerationService` có `@Service`, constructor `public ModerationService(ModerationClient client)`. Task 05 inject `ModerationService` theo kiểu qua constructor (hoặc field final với constructor Lombok theo quy ước service hiện có), rồi gọi:

```java
public void assertAllowed(String content)
```

Client cung cấp `public boolean isFlagged(String content)`. Cùng nội dung được gửi nguyên vẹn bằng JSON serializer trong `input`; model lấy từ properties. Không trim/cắt/sửa nội dung, không lấy JWT từ security context, không retry.

Task 05 vẫn cần tích hợp `assertAllowed(content)` trước Profile/save/Kafka theo hợp đồng. Task 03 chưa thay đổi hành vi tạo bài hiện tại; không kết luận bài đã được kiểm duyệt.

## Kiểm tra phản hồi và lỗi

- Chỉ HTTP 2xx được đọc như kết quả; status khác ném `ModerationProviderException`.
- Đọc `JsonNode`: body phải có `results` là array không rỗng, phần tử đầu phải có `flagged.isBoolean()`. Thiếu/null, chuỗi, số, object/array đều bị từ chối. Không tìm phần tử sau để thay thế phần tử đầu sai. Field bổ sung được bỏ qua.
- HTTP, lỗi kết nối/I/O, timeout và lỗi giải mã/media type từ RestClient được đổi thành provider exception. Không giữ exception gốc vì message/cause có thể chứa dữ liệu nhạy cảm; không log request/body/key/response.
- Service: false trả bình thường; true ném `AppException(POST_CONTENT_REJECTED)` (1015, HTTP 422); chỉ bắt `ModerationProviderException` để ném `AppException(MODERATION_UNAVAILABLE)` (1016, HTTP 503). Lỗi bị chặn nằm ngoài catch nên không bị đổi thành lỗi dịch vụ. Không bắt rộng lỗi lập trình.
- Không thay hợp đồng chung, không thêm SDK/dependency hoặc retry.

## Kiểm thử thực tế

Từ `post/post`, JDK 21.0.12.1 và Maven 3.9.16 đã có trong cache:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$taskMaven = "$env:USERPROFILE\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd"
# Lần chạy riêng ban đầu: 40/40, trước khi thêm test Spring wiring.
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" '-Dtest=ModerationClientTest,ModerationServiceTest' test
# Kết quả cuối: clean compile và toàn bộ test liên quan Task 02/03/04/06.
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" '-Dtest=ModerationClientTest,ModerationServiceTest,ModerationConfigurationTest,PostRequestValidationTest,PostControllerValidationTest,GlobalExceptionHandlerTest' clean test
```

Lần đầu trong sandbox exit 1 tại compile vì không đọc được cache `spring-security-crypto-6.2.4.jar`, chưa chạy test. Chạy lại offline với quyền đọc cache bổ sung: **40 tests, 0 failures/errors/skipped**, BUILD SUCCESS lúc **13:47:34 +07:00**. Sau đó bổ sung test wiring và chạy clean toàn bộ danh sách trên.

**Kết quả cuối lúc 13:48:22 +07:00: exit 0, BUILD SUCCESS; 89 tests, 0 failures, 0 errors, 0 skipped.** Clean build biên dịch 35 file main và 7 file test. Không tải dependency hoặc gọi AI/hạ tầng thật.

| Lớp | Số test | Kết quả |
|---|---:|---|
| ModerationClientTest | 36 | Đạt |
| ModerationServiceTest | 5 | Đạt |
| ModerationConfigurationTest (Task 02) | 15 | Đạt |
| PostRequestValidationTest (Task 04) | 9 | Đạt |
| PostControllerValidationTest (Task 04/06) | 9 | Đạt |
| GlobalExceptionHandlerTest (Task 06) | 15 | Đạt |

41 test Task 03 gồm:

- Hai boolean true/false: POST, endpoint, đúng một Authorization với key backend giả dù có token người dùng giả trong SecurityContext; Content-Type JSON; model cấu hình và input nguyên vẹn với tiếng Việt, quote, backslash, newline/tab, emoji và khoảng trắng. Đọc phần tử đầu, bỏ qua field bổ sung.
- Tám status 302/401/403/429/500/502/503/504: kể cả body có flagged=false cũng không cho qua.
- 22 body không hợp lệ: trống/khoảng trắng/JSON sai/null/root sai kiểu; results thiếu/null/sai kiểu/rỗng; phần tử đầu null/sai kiểu; flagged thiếu/null/chuỗi true hoặc false/số 0 hoặc 1/array/object; phần tử sau hợp lệ không cứu phần tử đầu sai.
- Một response HTML không hỗ trợ; ba transport ném ConnectException, IOException, SocketTimeoutException. Tất cả thất bại có thông báo cố định, không cause/suppressed; mỗi ca chỉ có một request kỳ vọng, retry làm test thất bại.
- Năm ca service/wiring: false, true đúng 1015, provider lỗi đúng 1016, lỗi lập trình không bị che, inject đúng bean có qualifier mà không tạo trùng. Service được verify chỉ gọi client một lần.

`git diff --check` và staged diff được rà soát trước commit; chỉ sáu file Task 03, fixture dùng key/token/nội dung giả. Còn cảnh báo Lombok/MapStruct/unchecked handler và Mockito Java agent có sẵn; WARN của test cấu hình sai là dự kiến.

## Phần chưa kiểm tra

Không chạy full suite, `PostApplicationTests.contextLoads`, package, ứng dụng thật, JWT/Gateway, frontend/E2E hoặc OpenAI thật. Không sửa/xóa/disable test context. Timeout được kiểm tra bằng transport giả ném exception, không đo thời gian socket; cấu hình timeout thực tế vẫn do test Task 02 xác minh. Các chặn hạ tầng Task 00 chưa được kiểm tra lại. Chưa xác minh ngăn Profile/save/Kafka trong luồng tạo bài vì thuộc Task 05.

Dừng sau Task 03; không push, triển khai, reset hoặc xóa thay đổi. Task 05 có thể bắt đầu với service và mã lỗi hiện có, nhưng chưa được thực hiện trong phiên này.
