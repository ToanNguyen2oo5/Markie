# Hợp đồng chung — đọc trước mọi task

## 1. Phạm vi bản đầu

Chỉ kiểm duyệt `content` của bài đăng mới qua `POST /post/create`. Gọi AI đồng bộ tại Post Service, trước khi lưu MongoDB. Nội dung đạt mới đi tiếp đến luồng lấy hồ sơ, lưu/phát sự kiện theo cách hiện có. Giữ nguyên cấu trúc bài viết và cơ chế tìm kiếm.

Không kiểm duyệt bình luận, ảnh/video, bài cũ; không thêm chỉnh sửa bài, hàng đợi kiểm duyệt, dashboard hoặc xử lý khiếu nại trong đợt này.

## 2. Hiện trạng đã đọc

- Backend: Java 21, Spring Boot 3.2.5, MongoDB, Spring Kafka; có `spring-boot-starter-web`, validation và test.
- `post/post/src/main/java/com/stewie/post/controller/PostController.java`: `/create` chưa có `@Valid`.
- `.../dto/request/PostRequest.java`: `content` chưa có ràng buộc.
- `.../service/PostService.java`: `createPost()` lưu bài rồi gửi topic `post.sync.events`.
- `.../exception/ErrorCode.java`: mã hiện tại đến 1014.
- `.../exception/GlobalExceptionHandler.java`: đã xử lý `AppException` và validation. Handler mặc định không bảo đảm trả 503, nên lỗi AI phải được ánh xạ rõ ràng.
- `web-app/src/components/feed/CreatePostCard.tsx`: POST `/post/create`, giới hạn 500 ký tự, đã giữ nội dung khi lỗi và chỉ gọi `onPostCreated` khi thành công.
- `search-service/.../SearchSyncConsumer.java`: nhận sự kiện để lập chỉ mục. Không cần sửa consumer nếu bài bị chặn chưa được lưu/phát sự kiện.
- Chưa thấy endpoint sửa bài viết ở commit tham chiếu.

Trong các đường dẫn `...` ở trên, tiền tố là `post/post/src/main/java/com/stewie/post/`, trừ đường dẫn search đã chỉ rõ service.

## 3. Quyết định kiểm duyệt

| Tình huống | Hành vi |
|---|---|
| `results[0].flagged` là boolean `false` | Cho phép đăng |
| `results[0].flagged` là boolean `true` | Chặn bằng `POST_CONTENT_REJECTED` |
| Timeout, lỗi mạng, HTTP không thành công, JSON sai, `results` rỗng hoặc thiếu/null/sai kiểu `flagged` | Chưa đăng, trả `MODERATION_UNAVAILABLE` |
| Nội dung không hợp lệ | Từ chối trước khi gọi AI |

Không tự coi thiếu `flagged` là `false`. Không tự cho đăng khi AI lỗi. Không retry tự động trong request ở bản đầu. Không dùng nội dung bài viết làm chỉ dẫn hoặc prompt điều khiển; gửi như dữ liệu `input` của API kiểm duyệt.

## 4. Hợp đồng nội bộ

Tạo package `com.stewie.post.moderation` để gom phần tích hợp:

- `ModerationProperties`: cấu hình kiểu dữ liệu rõ ràng, được kiểm tra khi khởi động.
- `ModerationClient`: lớp gọi HTTP bằng Spring `RestClient`, đọc phản hồi AI. Phương thức `boolean isFlagged(String content)`; lỗi kỹ thuật hoặc phản hồi không hợp lệ ném `ModerationProviderException`.
- `ModerationProviderException`: exception nội bộ; không đưa thông tin nhà cung cấp ra giao diện.
- `ModerationService`: phương thức `void assertAllowed(String content)`. Nếu bị đánh dấu, ném `AppException(POST_CONTENT_REJECTED)`; lỗi provider chuyển thành `AppException(MODERATION_UNAVAILABLE)`; đạt thì trả về bình thường.

Không cần SDK AI hoặc Spring AI. Dùng thư viện có sẵn nếu đủ. Không đặt lệnh gọi AI trong controller hoặc frontend.

## 5. Cấu hình cố định giữa các task

```yaml
app:
  moderation:
    api-key: ${OPENAI_API_KEY}
    base-url: ${OPENAI_MODERATION_BASE_URL:https://api.openai.com}
    model: ${OPENAI_MODERATION_MODEL:omni-moderation-latest}
    connect-timeout-ms: 2000
    read-timeout-ms: 5000
```

Ghép vào nhánh `app` có sẵn trong `application.yaml`; không khai báo trùng khóa YAML. Timeout kết nối và đọc là hai giới hạn riêng, không hứa tổng thời gian bằng 5 giây. Thiếu key hoặc timeout không dương phải báo lỗi cấu hình rõ ràng khi khởi động, không âm thầm tắt kiểm duyệt. Kiểm thử dùng key giả và server giả lập; không cần key thật để chạy unit test.

HTTP ra ngoài: `POST {base-url}/v1/moderations`, header `Authorization: Bearer <key>` và `Content-Type: application/json`, body gồm `model` và `input` là chuỗi content. Không chuyển JWT người dùng sang nhà cung cấp AI. Base URL chỉ là cấu hình máy chủ để test, không nhận từ request người dùng.

Tài liệu chính thức đã đối chiếu: https://developers.openai.com/api/docs/guides/moderation và https://developers.openai.com/api/reference/resources/moderations/methods/create . Agent triển khai cần đối chiếu lại nếu API thay đổi.

## 6. Hợp đồng API cho frontend

| Enum | Mã ứng dụng | HTTP | Thông báo |
|---|---:|---:|---|
| Thành công hiện có | 1000 | Giữ nguyên | Giữ response hiện có |
| `POST_CONTENT_REJECTED` | 1015 | 422 | Nội dung bài viết chưa phù hợp. Vui lòng chỉnh sửa và thử lại. |
| `MODERATION_UNAVAILABLE` | 1016 | 503 | Chưa thể kiểm duyệt bài viết. Vui lòng thử lại sau. |
| `POST_CONTENT_REQUIRED` | 1017 | 400 | Vui lòng nhập nội dung bài viết. |
| `POST_CONTENT_TOO_LONG` | 1018 | 400 | Nội dung bài viết không được vượt quá 500 ký tự. |

Lỗi giữ cấu trúc `ApiResponse`: `{"code":1015,"message":"..."}`; không yêu cầu `result` khi lỗi. Nếu mã số đã được dùng trong checkout mới, thống nhất lại bảng này và frontend trước khi viết mã, không để trùng.

Nội dung: `@NotBlank`, `@Size(max = 500)`. Độ dài tính theo Java `String.length()` và JavaScript `.length` (đơn vị UTF-16), kể cả khoảng trắng; không thay quy tắc đếm ký tự trong đợt này. Kiểm tra, kiểm duyệt và lưu cùng nội dung; không tự cắt ngắn hoặc sửa nội dung sau kiểm duyệt.

## 7. Bảo đảm không công khai nội dung chưa duyệt

Trong `createPost()`, xác thực vẫn giữ cơ chế hiện có. Kiểm tra hợp lệ tại API trước; `assertAllowed` phải chạy trước `postRepository.save`, gọi Profile Service và `kafkaTemplate.send`.

Không có bản ghi pending/rejected. Bài cũ vẫn hoạt động như trước và chưa được kiểm duyệt lại. Không dùng trạng thái frontend để quyết định một bài đã qua duyệt.

## 8. Cách kiểm tra

Unit test backend phải chạy không phụ thuộc hạ tầng hoặc key thật. Dùng JUnit/Mockito và `MockRestServiceServer` nếu phù hợp với `RestClient`; kiểm tra lỗi timeout bằng transport giả lập ném exception. Kiểm tra timeout thực tế bằng server stub nếu cần, có thời gian chờ hữu hạn.

Test `PostApplicationTests.contextLoads` hiện có dùng `@SpringBootTest` có thể cần môi trường. Không xóa/disable test này để lấy kết quả xanh. Báo riêng kết quả unit test và kiểm tra toàn bộ dự án.

Không ghi key, JWT, toàn văn bài hoặc response AI vào log. Chỉ log trạng thái kỹ thuật tối thiểu như timeout/HTTP status. Không thêm endpoint kiểm duyệt công khai.
