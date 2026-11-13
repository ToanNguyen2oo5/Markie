# I10 — Nghiệm thu mở rộng ảnh

## Chuẩn bị

Đọc mọi báo cáo I01–I09, hợp đồng và image-test-cases.md. Kiểm tra checkout/nhánh, không coi báo cáo cũ là kết quả phiên bản hiện tại. Dùng ảnh tổng hợp/hợp lệ có quyền sử dụng; key, JWT và secret chỉ ở môi trường thử, không đưa vào repo hoặc log.

## 1. Kiểm tra tự động

- Chạy test Post, File Service và Search liên quan; xác nhận có test thực sự chạy trong report.
- Chạy lại bộ kiểm duyệt văn bản và full suite khi hạ tầng đủ. Không disable context test hoặc xóa dữ liệu để lấy kết quả xanh.
- Frontend build/lint; ghi warning/lỗi có sẵn riêng.
- Kiểm tra git diff không có placeholder bypass, fake provider, secret, console script hoặc chặn submit tạm I07 còn sót.

## 2. Tích hợp với provider giả lập, storage/event thật

| Ca | Điều cần xác minh |
|---|---|
| Văn bản + JPEG/PNG, AI false | 1 file, 1 Post có image, sự kiện chứa metadata, search/feed hiện ảnh |
| AI true | 422/1015, không file mới/Post/event |
| AI timeout/HTTP lỗi/response sai | 503/1016, không file mới/Post/event |
| File sai/quá size/quá pixel/ảnh động/nhiều file | Mã lỗi đúng, không gọi provider/storage |
| File Service lỗi | 503/1024, không Post/event |
| Save Post thất bại rõ ràng sau upload | Dọn đúng ảnh mới hoặc ghi nhận cleanup thất bại |
| Save không rõ kết quả, Post đã commit | Không xóa ảnh bài đã tồn tại |
| JWT thiếu/sai, secret thiếu/sai, cross-owner delete | Từ chối, không sửa file |
| Upload chung hoặc URL/fileId gửi từ client | Không thể gắn vào bài có ảnh để né duyệt |
| Text-only, bài cũ, avatar, generic media | Giữ hành vi đã có |

Không thử lỗi bằng xóa/chỉnh dữ liệu thật. Dùng test double/fault injection trong môi trường riêng. Không coi test mock repository là bằng chứng Mongo/Kafka/search thật.

Kiểm tra trực tiếp endpoint file qua Gateway và cổng service; route tên internal không đủ chứng minh được bảo vệ. Kiểm tra URL download cũ không đọc kho post-media. Sau test dọn chỉ fixture do phiên test tạo theo quyền được giao, không xóa dữ liệu người dùng.

## 3. AI thật

Chỉ chạy khi có key thử nghiệm và kết nối đã chuẩn bị; không in hoặc lấy key của người dùng từ tiến trình. Dùng endpoint thật và ảnh test hợp lệ, ghi model/ngày/fixture ID, flagged và kết quả thực tế an toàn. Đánh giá riêng ảnh và text+ảnh, không tuyên bố provider hỗ trợ mọi category ảnh.

Ca block kỹ thuật có thể dùng stub; nếu không có ảnh thật phù hợp để tạo flagged, ghi chưa kiểm tra nhánh provider thật đó, không tạo fixture nguy hại hoặc tự ép kết quả. Giữ nguyên hạn chế mô hình văn bản trước đó nếu chưa đánh giá lại.

## 4. Checklist UI bắt buộc

1. Chọn/preview/xóa/thay ảnh đúng; chưa gửi request upload khi chọn.
2. File sai hoặc quá 5MiB được báo; server vẫn từ chối khi gọi trực tiếp.
3. Đăng text+ảnh đạt: đúng một request, một bài có ảnh, đóng modal, mở lại trống.
4. Chặn/lỗi AI: giữ text+ảnh, không thêm bài, hết khóa và thử lại được.
5. Khi chờ: khóa textarea, picker/xóa, đóng/backdrop, Đăng; nhấn nhanh không gửi lặp.
6. Text-only và 500/501 giữ hành vi cũ; bài cũ đọc/render bình thường.
7. Feed/profile/search hiển thị ảnh, layout nhỏ không tràn, ảnh lỗi có fallback.

Nếu browser bị chặn, cung cấp thao tác thủ công để người dùng xác nhận, không tự gắn nhãn đạt. Không yêu cầu bỏ bảo vệ DevTools.

## 5. Tài liệu và kết luận

Cập nhật README: phạm vi 1 JPEG/PNG, giới hạn byte/pixel, API key dùng lại, secret nội bộ hai service, cấu hình proxy/multipart, lỗi, luồng cleanup và cách chạy/test. Không ghi secret thật hoặc ngụ ý chỉ clone là chạy được.

Tạo `docs/ai-image-moderation/acceptance-report.md`, `ui-manual-checklist.md`, `handoffs/I10.md`: commit kiểm tra, môi trường, test/fixture IDs, số thực tế, kết quả UI, giới hạn mô hình, phần chưa chạy và hành vi lỗi từng bước.

Chỉ kết luận nghiệm thu đạt trong phạm vi bằng chứng có thật. Nếu thiếu key/browser/hạ tầng, báo triển khai xong nhưng phần tương ứng chưa nghiệm thu. Không mở rộng tiêu chí sang video/nhiều ảnh/OCR.

Commit trên nhánh tính năng; không push/merge/triển khai. Không dừng service người dùng đã chạy, chỉ dọn tiến trình/config thử do chính phiên tạo và không còn cần.
