# Checklist UI thủ công — đang chờ người dùng

Mở http://localhost:3000, đăng nhập tài khoản thử nghiệm. Chỉ dùng nội dung tổng
hợp. Mở DevTools → Network, lọc `/post/create`; không gửi key/token vào chat.

| Mục | Thao tác | Kết quả mong đợi | Kết quả người dùng |
|---|---|---|---|
| U1 | Gửi một lời chào có marker thử riêng; quan sát trong lúc refresh token/request còn chờ | Có “Đang kiểm duyệt…”, textarea/nút Đăng/nút đóng/backdrop bị khóa | Chưa nhận kết quả |
| U2 | Bấm Đăng nhanh nhiều lần trong U1 | Chỉ 1 POST `/post/create`; thành công chỉ thêm 1 bài vào feed | Chưa nhận kết quả |
| U3 | Thử một fixture V16–V19 trong file JSON test; kiểm tra trường hợp thực sự nhận 422/1015 | Giữ modal và nguyên nội dung, hiện lỗi phù hợp, không thêm bài vào feed; mở lại thao tác sau lỗi | Chưa nhận kết quả |
| U4 | Sửa bản nháp U3 thành lời chào vô hại rồi gửi lại | 200/1000, chỉ thêm 1 bài, modal đóng; mở composer lại có nội dung trống | Chưa nhận kết quả |

Fixture: [vietnamese-acceptance-fixtures.json](../../post/post/src/test/resources/moderation/vietnamese-acceptance-fixtures.json).
Đây là AI thật; `[BLOCK]` không phải quy tắc chặn. Nếu request quá nhanh để quan
sát U1, hoặc không nhận 422 ở U3, ghi **chưa thử/không quan sát được**, không suy
ra đạt. Không đổi key/endpoint hoặc dừng Post Service để tạo điều kiện thử.

Gửi kết quả theo mẫu `U1: đạt/lỗi/chưa thử; U2: ...; U3: ...; U4: ...`, kèm mô tả
lỗi ngắn nếu có. **Chỉ đánh dấu UI đạt sau khi nhận và rà soát kết quả của người
dùng**; các ca API và unit test không thay thế checklist này.
