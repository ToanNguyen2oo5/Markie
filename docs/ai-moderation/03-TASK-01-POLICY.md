# Task 01 — Chốt quy tắc và hợp đồng thực hiện

## Mục tiêu

Chuyển các quyết định trong `01-SHARED-CONTRACT.md` thành checklist để backend/frontend triển khai thống nhất. Đây là task tài liệu, không viết chức năng AI.

## Đầu vào

Hợp đồng chung, báo cáo Task 00 nếu có và mã nguồn hiện tại. Kiểm tra lại `PostService`, `PostController`, `PostRequest`, `ErrorCode`, `CreatePostCard`.

## Các bước

1. Xác nhận phạm vi: chỉ văn bản bài đăng mới, gọi đồng bộ trước khi lưu, không lưu bài bị chặn.
2. Xác nhận OpenAI Moderation API, model cấu hình mặc định `omni-moderation-latest`, quy tắc dựa trên boolean `flagged`; không tự đặt ngưỡng điểm hoặc thêm bộ từ khóa.
3. Xác nhận ba kết quả: đạt, bị chặn, không kiểm duyệt được. Nội dung nhạy cảm được đánh dấu là tín hiệu mô hình, không bảo đảm hiểu đúng mọi ngữ cảnh tiếng Việt.
4. Kiểm tra mã 1015–1018 chưa trùng; ghi hợp đồng lỗi và phương thức `ModerationService.assertAllowed(String)`.
5. Lập 15–20 ca tiếng Việt vô hại hoặc mẫu kiểm thử tổng hợp: giao tiếp bình thường, có dấu/không dấu, emoji, trích dẫn, nội dung có thể bị đánh dấu. Với nội dung nhạy cảm, mô tả nhóm tình huống hoặc dùng mẫu phù hợp; không cần tạo nội dung gây hại chi tiết.
6. Chia rõ: test phản hồi giả lập phải xác định kết quả; test AI thật là đánh giá mô hình, có thể chặn nhầm/cho qua nhầm. Không ép tất cả câu kỳ vọng thành unit test phụ thuộc mạng.
7. Tạo `docs/ai-moderation/policy-and-cases.md` gồm quyết định, bảng mã lỗi và bộ ca với cột kỳ vọng, thực tế, nhận xét.

## Nghiệm thu

- Đủ thông tin để các agent khác làm việc mà không tự chọn quy tắc riêng.
- Chốt rõ bài cũ và bình luận nằm ngoài phạm vi.
- Nếu phát hiện khác biệt checkout cần thay hợp đồng, cập nhật `01-SHARED-CONTRACT.md` và ghi rõ; không chỉ sửa trong báo cáo riêng.

## Không làm

Không xây dashboard, phê duyệt thủ công, khóa tài khoản, chống spam hoặc phát hiện tin giả. Không yêu cầu người dùng duyệt lại các quyết định đã được hợp đồng này xác định, trừ khi thực tế có xung đột không thể giải quyết.
