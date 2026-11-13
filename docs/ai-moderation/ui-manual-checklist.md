# Checklist UI thủ công — U1–U4 được người dùng xác nhận

Ngày ghi nhận: 13/11/2026 (Asia/Saigon), sau commit `cd3f88b`. Nguồn bằng chứng:
người dùng trực tiếp kiểm thử và trả lời trong phiên chat; agent không điều
khiển được trình duyệt, không nhận screenshot/HAR hoặc tự chạy browser E2E.

Mở http://localhost:3000, đăng nhập tài khoản thử nghiệm. Chỉ dùng nội dung tổng
hợp. Mở DevTools → Network, lọc `/post/create`; không gửi key/token vào chat.

| Mục | Thao tác | Kết quả mong đợi | Kết quả người dùng |
|---|---|---|---|
| U1 | Gửi bài vô hại; quan sát khi request còn chờ | Có “Đang kiểm duyệt…”, textarea/nút Đăng/nút đóng/backdrop bị khóa | **Đạt theo người dùng**: xác nhận có trạng thái chờ và khóa thao tác |
| U2 | Bấm Đăng nhanh nhiều lần trong U1 | Chỉ 1 POST `/post/create`; thành công chỉ thêm 1 bài vào feed | **Đạt theo người dùng**: xác nhận đúng cả request và bài được thêm |
| U3 | Gửi câu đe dọa tổng hợp; kiểm tra response thực tế | Giữ modal/nguyên nội dung khi 422/1015, không thêm bài vào feed | **Đạt theo người dùng**: DevTools xác nhận HTTP 422/code 1015, modal giữ nội dung, không có bài mới |
| U4 | Sửa bản nháp U3 thành lời chào vô hại rồi gửi lại | Đăng thành công, modal đóng; mở composer lại có nội dung trống | **Đạt theo người dùng**: xác nhận đăng thành công/đóng modal, sau đó xác nhận riêng mở lại nội dung trống |

Fixture: [vietnamese-acceptance-fixtures.json](../../post/post/src/test/resources/moderation/vietnamese-acceptance-fixtures.json).
Đây là AI thật; `[BLOCK]` không phải quy tắc chặn. Nếu request quá nhanh để quan
sát U1, hoặc không nhận 422 ở U3, ghi **chưa thử/không quan sát được**, không suy
ra đạt. Không đổi key/endpoint hoặc dừng Post Service để tạo điều kiện thử.

Người dùng đã hoàn tất phản hồi U1–U4 và xác nhận bổ sung phần bản nháp trống.
Không chép câu đe dọa vào báo cáo; người dùng dùng mẫu tổng hợp riêng, không coi
đó là lần chạy lại nguyên fixture V16–V19. Không thay ghi nhận mô hình V12/V20.

**UI đạt trong phạm vi U1–U4, không phải mọi nhánh UI đã được kiểm tra.** Chưa có
xác nhận cho lỗi AI 503/1016, mạng/response sai, refresh token lỗi hoặc từng biên
UTF-16. Không gây lỗi bằng đổi key/endpoint hoặc dừng Post Service người dùng.
