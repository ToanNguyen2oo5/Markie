# I07 — Chọn, xem trước và thay ảnh

## Phạm vi

Đọc I02; sửa CreatePostCard và component nhỏ liên quan nếu cần. Không thêm thư viện UI mới. Task này chưa gửi multipart (I08), nhưng không để nút Đăng hoạt động với ảnh được chọn rồi âm thầm chỉ gửi text.

## Các bước

1. Nút Ảnh/video mở file picker chỉ cho JPEG/PNG, không bật multiple. Dùng label/aria cho input và nút xóa ảnh.
2. Lưu File object trong state, tạo object URL để preview local. Không upload ngay khi chọn hoặc gửi Base64 vào state/log/localStorage.
3. Kiểm tra số lượng, type và size ở UI để báo lỗi sớm; browser accept không thay validation server. Hiển thị tối đa 1 ảnh, 5 MiB.
4. Cho xóa/thay ảnh, chọn lại cùng file sau xóa; reset input value phù hợp. Thu hồi object URL khi thay/xóa/unmount; không revoke trước khi preview dùng xong.
5. Khóa chọn/xóa ảnh khi submitting theo ref/state hiện có. Giữ bản nháp khi đóng/mở theo hành vi đã chốt, không vô tình mất ảnh khi content lỗi.
6. Trong commit trung gian trước I08, nếu ảnh đã chọn thì chặn submit và hiển thị trạng thái chức năng gửi ảnh chưa nối, hoặc dùng cách đóng tính năng tạm rõ ràng. Không gọi route text-only với ảnh đang hiển thị. I08 phải gỡ chặn tạm này.

## Kiểm tra

Chọn JPEG/PNG, ảnh lớn, type sai, xóa, thay, chọn lại cùng ảnh, preview, đổi content và component unmount. Kiểm tra không có upload request khi chọn, không rò object URL. Build/lint; không cần dựng test framework mới cho tác vụ này.

Ghi `handoffs/I07.md` với state/callback để I08 dùng, phần chặn submit tạm và kiểm UI đã thực sự chạy. Không coi build là kiểm thử trình duyệt.
