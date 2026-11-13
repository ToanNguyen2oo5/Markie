# I06 — Tạo bài có ảnh và xử lý lỗi từng bước

## Phụ thuộc

I03–I05. Tái sử dụng PostService, PostMapper, validation content và error handler hiện có.

## Các bước

1. Thêm field image tùy chọn vào Post, PostResponse và mapping theo hợp đồng. Không bắt buộc migration bài cũ. Không nhận metadata image từ client rồi lưu nguyên văn.
2. Thêm route multipart `/create-with-image`, áp dụng xác thực và validation content như route cũ. Chỉ chấp nhận đúng part đã chốt, không âm thầm bỏ file thứ hai.
3. Tạo phương thức service nhận content và ảnh validated. Trình tự: moderation text+image → FileClient lưu → Post save → profile/event/response như luồng hiện có. Profile lookup không cần xảy ra trước AI.
4. Giữ `/create` JSON nguyên hợp đồng, không cho nhánh này nhận image URL để né duyệt. Chia sẻ phần tạo bài bằng helper nếu hữu ích nhưng không refactor rộng.
5. Moderation lỗi/chặn phải thoát trước storage/Post/Kafka. FileClient lỗi ánh xạ 1024, không Post/event.
6. Post save fail sau upload: delete bù đúng file vừa tạo nếu chắc bài chưa lưu. Đối với save không rõ trạng thái, xác minh bằng ID Post tạo trước/tra cứu tham chiếu trước cleanup; không xóa ảnh của bài đã commit. Ghi rõ giới hạn khi DB vẫn không truy vấn được.
7. Nếu delete bù lỗi, ghi log an toàn/correlation để xử lý file mồ côi và phản hồi lỗi an toàn, không làm lộ provider hoặc secret. Không thêm worker dọn file tự động chưa có quy tắc ownership/references.
8. Giữ cách xử lý Kafka lỗi sau save, không xóa bài/ảnh khi event lỗi. Không hứa exactly-once hoặc tạo bài idempotent toàn hệ thống.
9. Mở rộng PostSyncEvent tùy chọn image theo hợp đồng, giữ payload bài text cũ. I09 hoàn thiện consumer/search.

## Test bắt buộc

Mock moderation, FileClient, PostRepository, Profile và Kafka; SecurityContext fake được dọn sau test. Kiểm tra thứ tự gọi và content/bytes/metadata đúng.

- Đạt: storage → save → event, đúng response.
- Chặn/lỗi AI: không gọi storage/save/profile/Kafka.
- Lưu ảnh lỗi: không save/Kafka.
- Save Post lỗi: cleanup đúng file; cleanup lỗi có ghi nhận, không giả thành success.
- Save không rõ trạng thái nhưng tìm được Post: không xóa ảnh.
- Kafka lỗi sau save: không delete ảnh.
- Route text cũ và bài cũ không image tiếp tục chạy.

Thêm MVC test multipart với validation thật, tránh tắt security trong sản phẩm. Bàn giao `handoffs/I06.md`, nêu rõ endpoint sẵn sàng và giới hạn consistency.
