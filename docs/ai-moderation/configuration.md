# Cấu hình kiểm duyệt — Task 02

Ngày: 13/11/2026 (Asia/Saigon). Task này chỉ chuẩn bị cấu hình và HTTP client; luồng tạo bài chưa gọi kiểm duyệt.

## Biến môi trường và giá trị

| Thuộc tính `app.moderation` | Biến môi trường | Mặc định / yêu cầu |
|---|---|---|
| `api-key` | `OPENAI_API_KEY` | Bắt buộc, không trống; không có key mặc định |
| `base-url` | `OPENAI_MODERATION_BASE_URL` | `https://api.openai.com`, không trống |
| `model` | `OPENAI_MODERATION_MODEL` | `omni-moderation-latest`, không trống |
| `connect-timeout-ms` | Không có placeholder riêng | `2000`, số nguyên dương, milliseconds |
| `read-timeout-ms` | Không có placeholder riêng | `5000`, số nguyên dương, milliseconds |

Hai timeout là giới hạn riêng cho kết nối và đọc; không bảo đảm tổng thời gian request là 5 giây. Có thể ghi đè bằng cấu hình Spring, ví dụ tham số `--app.moderation.connect-timeout-ms=2000 --app.moderation.read-timeout-ms=5000`. Không dùng 0 hoặc số âm vì chúng có thể mang nghĩa chờ vô hạn trong transport.

`ModerationProperties` được validation khi tạo application context. Thiếu key (kể cả placeholder `${OPENAI_API_KEY}` chưa resolve), key/model/base URL trống hoặc timeout không dương làm context khởi động thất bại. Không có công tắc bỏ qua kiểm duyệt. Base URL chỉ lấy từ cấu hình máy chủ; test được phép dùng URL stub.

## Chạy Post Service bằng PowerShell

Từ thư mục gốc repository, dùng JDK 21 và Maven. Thiết lập trong **cùng phiên PowerShell** chạy service:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$env:OPENAI_API_KEY = '<API_KEY_CUA_BAN>'
$env:OPENAI_MODERATION_BASE_URL = 'https://api.openai.com'
$env:OPENAI_MODERATION_MODEL = 'omni-moderation-latest'
Set-Location post/post
.\mvnw.cmd spring-boot:run
```

Giá trị trong dấu `<...>` chỉ là chỗ điền, không phải key sử dụng được. Không lưu key thật vào source, YAML, tài liệu, lệnh test hoặc log; không in toàn bộ properties/header. Spring Boot **không tự đọc `.env`** khi dự án chưa có cơ chế nạp file đó. Biến `$env:...` chỉ truyền cho tiến trình con của phiên hiện tại.

Wrapper trên máy kiểm tra Task 00 gặp lỗi `Cannot index into a null array`. Có thể dùng Maven đã cài trên PATH: `mvn.cmd spring-boot:run`, hoặc Maven cache đã xác minh:

```powershell
$taskMaven = "$env:USERPROFILE\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd"
& $taskMaven "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" spring-boot:run
```

Đường dẫn cache là phương án riêng của máy hiện tại. Kiểm tra `java -version` và Maven `-version` đều chọn Java 21. Cấu hình hạ tầng được giữ nguyên: Post cổng 8083, context `/post`, MongoDB 27018, Kafka 9094, issuer Keycloak 8280 và Profile 8081. Xem [báo cáo môi trường](environment-report.md) trước khi khởi động: Task 00 ghi nhận lỗi unique index MongoDB `E11000`; Task 02 không xử lý dữ liệu/index và không xác nhận Post khởi động đầy đủ thành công.

## Bean bàn giao cho Task 03

- `ModerationConfiguration` nằm trong package `com.stewie.post.moderation`, được component scan của `PostApplication` phát hiện. `@EnableConfigurationProperties(ModerationProperties.class)` là nơi đăng ký properties duy nhất; không thêm `@Component` hoặc đăng ký lặp.
- Bean properties có tên Spring Boot `app.moderation-com.stewie.post.moderation.ModerationProperties`; inject theo kiểu `ModerationProperties`. Getter: `getApiKey()`, `getBaseUrl()`, `getModel()`, `getConnectTimeoutMs()`, `getReadTimeoutMs()`. Không sinh `toString()` chứa key.
- Bean singleton **`moderationRestClient`**, kiểu `RestClient`, đã cấu hình base URL, `Authorization: Bearer <key>`, `Content-Type: application/json` và `SimpleClientHttpRequestFactory` riêng với connect/read timeout milliseconds. Request factory là đối tượng nội bộ của client, không phải bean riêng. Không thay đổi Feign `ProfileClient`; không có interceptor chuyển JWT người dùng hoặc cơ chế retry được thêm vào.

Ví dụ constructor của lớp Task 03 sẽ tạo:

```java
public ModerationClient(
        @Qualifier("moderationRestClient") RestClient restClient,
        ModerationProperties properties) {
    this.restClient = restClient;
    this.properties = properties;
}
```

Import `org.springframework.beans.factory.annotation.Qualifier` và `org.springframework.web.client.RestClient`. Dùng lại bean này; không tạo client mỗi bài hoặc bean cùng tên. Task 03 sẽ gửi `POST /v1/moderations`, body `model` từ properties và `input` là content, rồi xử lý phản hồi theo hợp đồng chung. Chưa có `ModerationClient`, `ModerationService` hoặc provider exception trong Task 02. Task 03 còn phụ thuộc Task 06.

## Kiểm thử cấu hình độc lập

Chạy từ `post/post`, không cần khai báo key thật hoặc khởi động hạ tầng:

```powershell
.\mvnw.cmd '-Dtest=ModerationConfigurationTest' test
# Nếu wrapper gặp lỗi trên máy hiện tại, sau khi thiết lập JAVA_HOME và taskMaven:
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" '-Dtest=ModerationConfigurationTest' clean test
```

Test loại bỏ property source môi trường/JVM để không đọc key trên máy, dùng key giả, `ApplicationContextRunner` và `MockRestServiceServer`. Kiểm tra YAML thật, defaults/overrides, validation, singleton, timeout đã gắn vào factory và URL/header qua mock transport. Không kiểm tra thời gian timeout trên socket thực hoặc API AI thật. Lệnh chọn test riêng không thay đổi/disable `PostApplicationTests.contextLoads`; toàn bộ context và E2E vẫn chưa được xác minh trong Task 02.
