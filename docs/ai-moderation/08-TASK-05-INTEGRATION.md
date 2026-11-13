# Task 05 — Tích hợp kiểm duyệt vào tạo bài

## Phụ thuộc

Task 03, 04, 06 đã có. Đọc `PostService.createPost()` thực tế trước khi sửa.

## File sở hữu

`post/post/src/main/java/com/stewie/post/service/PostService.java` và `post/post/src/test/java/com/stewie/post/service/PostServiceTest.java`. Không đổi schema, Kafka consumer hoặc controller ngoài điều thật sự bắt buộc.

## Các bước

1. Inject `ModerationService` bằng constructor theo phong cách hiện có (`@RequiredArgsConstructor`).
2. Trong `createPost`, giữ lấy userId từ SecurityContext; gọi `moderationService.assertAllowed(request.getContent())` trước khi xây/lưu bài hoặc thực hiện gọi ra Profile/Kafka.
3. Nếu service ném lỗi, để `AppException` đi ra handler. Không đặt lệnh duyệt vào khối `try/catch` hiện đang bỏ qua lỗi Kafka hoặc lấy hồ sơ.
4. Khi đạt, giữ nguyên logic tạo PostStats, thời gian tạo/sửa, MongoDB save, lấy username, gửi `PostSyncEvent.CREATED` lên `post.sync.events` và mapping response.
5. Không sửa nội dung sau khi AI kiểm duyệt; content lưu và phát sự kiện phải bằng content đã gửi duyệt.
6. Không tạo bài pending/rejected và không thêm field trạng thái. Giữ hành vi đọc bài cũ.

## Unit test bắt buộc với Mockito

- AI cho qua: bài được lưu một lần; event đúng topic/content và thành công trả response như cũ.
- Kiểm tra thứ tự bằng `InOrder`: moderation trước save; save trước send Kafka.
- AI chặn: đúng lỗi 1015; `postRepository.save`, `profileClient` và `kafkaTemplate.send` không được gọi.
- AI không sẵn sàng: đúng lỗi 1016 và không có các tác dụng phụ trên.
- Content qua moderation, bản ghi Mongo và event trùng nhau.
- Dùng authentication giả trong SecurityContext, dọn context sau mỗi test.

Không test mạng/database thật trong unit test. KafkaTemplate send có thể trả future; stub theo kiểu dữ liệu thực tế nếu cần. Không mở rộng task để sửa độ tin cậy Kafka hoặc thêm outbox.

## Nghiệm thu

Tạo bài chỉ có một đường lưu và đường đó nằm sau kiểm duyệt. Cả bài bị chặn và lỗi AI đều kết thúc trước khi có bản ghi/event mới. Bài đạt giữ response contract hiện tại.
