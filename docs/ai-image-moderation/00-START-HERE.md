# Markie — Mở rộng kiểm duyệt hình ảnh

## Sử dụng

Chép toàn bộ các file Markdown trong bộ này vào `docs/ai-image-moderation/` của repository Markie. Đây là hướng dẫn giao việc; chưa có mã triển khai tính năng ảnh.

Mỗi phiên agent đọc `01-SHARED-CONTRACT.md`, file task được giao và báo cáo task phụ thuộc. Đường dẫn mã trong tài liệu tính từ gốc repository. Đọc AGENTS.md áp dụng; kiểm tra trạng thái Git trước khi sửa; không ghi đè công việc có sẵn.

Tính năng này mở rộng bộ kiểm duyệt văn bản hiện có. Không xây lại client, cấu hình, UI hay kiến trúc từ đầu. Không gọi công cụ điều khiển trình duyệt nếu người dùng chưa yêu cầu kiểm UI trong phiên đó.

## Thứ tự cho một agent

**I01 → I02 → I03 → I04 → I05 → I06 → I07 → I08 → I09 → I10.**

| Task | File | Phụ thuộc |
|---|---|---|
| I01 | 02-I01-BRANCH-BASELINE.md | Không |
| I02 | 03-I02-API-CONTRACT.md | I01 |
| I03 | 04-I03-IMAGE-VALIDATION.md | I02 |
| I04 | 05-I04-MULTIMODAL-MODERATION.md | I02, I03 |
| I05 | 06-I05-FILE-STORAGE.md | I02, I03 |
| I06 | 07-I06-POST-INTEGRATION.md | I03–I05 |
| I07 | 08-I07-IMAGE-PICKER.md | I02; thực hiện sau I06 nếu chỉ một agent |
| I08 | 09-I08-FORM-SUBMISSION.md | I06, I07 |
| I09 | 10-I09-DISPLAY-SEARCH.md | I06, I08 |
| I10 | 11-I10-ACCEPTANCE.md | I01–I09 |

I03 chưa nối route vào luồng đăng bài chưa hoàn chỉnh. Chỉ thêm endpoint hoạt động sau I06 để tránh có đường đăng ảnh chưa được kiểm duyệt.

## Nhánh và báo cáo

Tất cả task trên cùng nhánh `feature/ai-image-moderation`, tạo từ phiên bản chứa đầy đủ kiểm duyệt văn bản. Không tự mặc định main đã có tính năng đó. Kết quả Task 08 văn bản được người dùng báo commit cuối `6e5e447`; kiểm tra thực tế, không coi mã commit này là bằng chứng hiện diện ở mọi clone.

Mỗi task ghi `docs/ai-image-moderation/handoffs/Ixx.md`: nhánh/commit, file sửa, hợp đồng cung cấp, test và kết quả thực tế, phần chưa chạy, điều kiện task sau. Commit đúng thay đổi liên quan; không commit key, token, ảnh người dùng, trạng thái đăng nhập hay file thử tạm. Không push/merge/triển khai nếu chưa được yêu cầu.

## Prompt giao việc

> Đọc `docs/ai-image-moderation/00-START-HERE.md`, `01-SHARED-CONTRACT.md`, file task Ixx và báo cáo các task phụ thuộc. Kiểm tra checkout chứa kết quả trước, tiếp tục trên `feature/ai-image-moderation`. Chỉ thực hiện task được giao, tái sử dụng bộ kiểm duyệt văn bản. Chạy kiểm tra phù hợp, tạo báo cáo bàn giao Ixx.md, commit phần liên quan rồi dừng. Không push, merge, triển khai hoặc tự làm task tiếp theo. Không báo phần chưa chạy là đạt.

## Quy tắc phối hợp

I02 sở hữu bảng mã lỗi và hợp đồng; I03 sở hữu validation; I04 sở hữu client/service AI; I05 sở hữu File Service; I06 sở hữu tạo bài/model; I07–I08 sở hữu composer; I09 sở hữu hiển thị/search. Nếu task sau cần chỉnh hợp đồng, cập nhật cả tài liệu và test liên quan, ghi rõ lý do. Không thêm nhiều ảnh, video, OCR hoặc duyệt thủ công trong đợt này.
