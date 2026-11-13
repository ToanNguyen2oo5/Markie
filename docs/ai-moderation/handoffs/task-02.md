# Bàn giao Task 02 — Cấu hình kết nối AI

Trạng thái: **hoàn thành Task 02**, ngày 13/11/2026 (Asia/Saigon). Dừng ở Task 02.

## Đối chiếu trước khi sửa

- HEAD `85957fe3542e551afa1054e6e958b24f4901f332`, đúng commit tham chiếu. `git status --short` ban đầu chỉ có `?? docs/`; không có thay đổi tracked. Giữ nguyên tài liệu/công việc Task 00 và 01.
- Đã đọc START-HERE, hợp đồng chung, Task 02, `policy-and-cases.md`, `environment-report.md`, POM, application YAML, `PostApplication`, cấu hình bảo mật, Profile Feign client và test context hiện có. Không có báo cáo Task 00/01 riêng trong `handoffs/`; bàn giao nằm trong hai báo cáo/tài liệu trên.
- Không tìm thấy `AGENTS.md` trong repository (kể cả file ẩn, loại `.git`/`node_modules`) hoặc các thư mục cha từ gốc ổ C đến repository.
- Chưa có package moderation/RestClient/configuration properties tương ứng trước Task 02. Profile Service dùng Feign, giữ nguyên.

## File đã tạo/sửa

| File (từ gốc repository) | Thay đổi và mục đích |
|---|---|
| `post/post/src/main/resources/application.yaml` | Thêm `moderation` vào nhánh `app` duy nhất; giữ nguyên `app.services.profile` và mọi cấu hình cũ |
| `post/post/src/main/java/com/stewie/post/moderation/ModerationProperties.java` | Bind và validation thuộc tính, dùng Lombok getter/setter, không sinh `toString` chứa secret |
| `post/post/src/main/java/com/stewie/post/moderation/ModerationConfiguration.java` | Đăng ký properties và singleton HTTP client riêng cho kiểm duyệt |
| `post/post/src/test/java/com/stewie/post/moderation/ModerationConfigurationTest.java` | 15 ca test cấu hình độc lập với key giả, môi trường cô lập và mock transport |
| `docs/ai-moderation/configuration.md` | Biến môi trường, PowerShell, chạy Post, timeout, bean/injection và kiểm thử |
| `docs/ai-moderation/handoffs/task-02.md` | Báo cáo bàn giao này |

Không sửa POM/dependency, `PostService`, frontend hoặc test context có sẵn. Maven tạo lại artifact trong `post/post/target`, không phải source bàn giao.

## Cấu hình và bean đã triển khai

- Prefix `app.moderation`: `api-key=${OPENAI_API_KEY}` (không mặc định), `base-url=${OPENAI_MODERATION_BASE_URL:https://api.openai.com}`, `model=${OPENAI_MODERATION_MODEL:omni-moderation-latest}`, `connect-timeout-ms=2000`, `read-timeout-ms=5000`.
- `@Validated` + `@ConfigurationProperties`: key/model/base URL phải không trống; cả hai timeout phải là số nguyên dương. Key còn bị từ chối nếu là placeholder `${...}` chưa resolve, vì `@NotBlank` đơn thuần có thể chấp nhận chuỗi placeholder. Lỗi làm application context thất bại, không tạo client hoặc âm thầm tắt kiểm duyệt.
- `ModerationConfiguration` được component scan; chỉ dùng `@EnableConfigurationProperties(ModerationProperties.class)` để đăng ký properties một lần. Bean properties: `app.moderation-com.stewie.post.moderation.ModerationProperties`, inject theo kiểu.
- **`moderationRestClient`**: singleton `org.springframework.web.client.RestClient`, cấu hình base URL, Bearer key và Content-Type JSON. `SimpleClientHttpRequestFactory` riêng, đặt connect/read timeout milliseconds; factory là đối tượng nội bộ, không phải bean riêng. Không thêm interceptor JWT hoặc retry; không đổi Profile Feign client.
- Timeout là hai giới hạn riêng; không cam kết tổng thời gian request 5 giây. Không thêm cơ chế bỏ qua, endpoint công khai, client tạo theo từng bài hoặc API key thật.

## Kiểm thử thực tế

JDK 21.0.12.1, Maven cache 3.9.16. Chạy từ `post/post`:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$taskMaven = "$env:USERPROFILE\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd"
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" '-Dtest=ModerationConfigurationTest' clean test
```

**Kết quả cuối lúc 13:22:08: exit 0, BUILD SUCCESS, 15 tests, 0 failures, 0 errors, 0 skipped.** Clean build biên dịch 32 file main và 2 file test bằng Java release 21. Còn cảnh báo có sẵn của Lombok/MapStruct/unchecked exception handler; không sửa ngoài phạm vi.

Test bao phủ:

- Bind YAML thật: key giả, base URL/model mặc định, timeout 2000/5000 và Profile URL được giữ nguyên.
- Ghi đè placeholder base URL/model bằng giá trị test cho server stub.
- Thiếu key ở cả cấu hình nhỏ và YAML thật khi thiếu `OPENAI_API_KEY` phải lỗi; lỗi có thông tin trường cấu hình.
- Key/model/base URL rỗng hoặc chỉ có khoảng trắng (6 ca); connect/read timeout 0 hoặc âm (4 ca).
- Context hợp lệ có đúng một properties bean và một RestClient bean; lấy lại client trả cùng instance; `toString` properties không chứa key giả.
- Factory thực sự là `SimpleClientHttpRequestFactory`, hai timeout đã nhận giá trị khác nhau 123/456 ms; dùng reflection trong test để kiểm tra wiring vì factory không có public getter timeout.
- Mock transport xác minh URL `/v1/moderations`, Bearer key giả và Content-Type JSON. Không mở socket hoặc gửi request tới AI.

Các lần chạy trước và sửa lỗi:

- Lệnh `test` trong sandbox ban đầu exit 1 ở compiler do không đọc được `spring-security-crypto-6.2.4.jar` trong cache người dùng. Chạy lại với quyền bổ sung đọc dependency đã có: 15 test đạt.
- Lần `clean test` đầu biên dịch được nhưng có 2 lỗi test tìm `application.yaml` bằng classloader mặc định. Đã sửa test dùng classloader của chính lớp test, sau đó chạy lại `clean test` với kết quả cuối ở trên. Không thay YAML/production logic để bỏ qua lỗi test.
- `git diff --check` đạt; diff tracked chỉ thêm 6 dòng moderation vào YAML. Các file source/test/documentation mới được kiểm tra riêng. Không phát hiện key thật trong các file Task 02 tạo/sửa; fixture chỉ dùng key giả.

Chưa kiểm tra trong Task 02:

- Không chạy `PostApplicationTests.contextLoads`, toàn bộ suite, package hoặc khởi động Post thực tế; không xóa/disable test cũ. Task 00 đã báo MongoDB `E11000` khi tạo unique index và vấn đề package plugin cache. Không thay dữ liệu/index hoặc khởi động lại hạ tầng để giải quyết trong task này.
- Không đo timeout qua socket/server thật, không gọi API AI thật, không xác minh model/provider, không E2E đăng bài. Unit test xác minh cấu hình timeout và request mặc định qua mock.
- Chưa có tích hợp moderation vào tạo bài; không kết luận bài đăng hiện tại đã được kiểm duyệt.

## Bàn giao cho Task 03

Inject `@Qualifier("moderationRestClient") RestClient restClient` và `ModerationProperties properties` bằng constructor; ví dụ đầy đủ trong [configuration.md](../configuration.md). Client đã có base URL và header; không đăng ký bean/client trùng, không tạo mới theo từng bài. Getter properties: `getApiKey()`, `getBaseUrl()`, `getModel()`, `getConnectTimeoutMs()`, `getReadTimeoutMs()`.

Task 03 sẽ dùng `POST /v1/moderations` với `model` và `input`, triển khai `ModerationClient.isFlagged`, provider exception và `ModerationService.assertAllowed` theo hợp đồng chung. Các lớp đó chưa được tạo ở đây. Task 03 chỉ bắt đầu sau khi có cả Task 02 **và Task 06**; các chặn E2E/hạ tầng vẫn theo Task 00.

Không có thay đổi hợp đồng chung. Không push, triển khai hoặc làm task kế tiếp.
