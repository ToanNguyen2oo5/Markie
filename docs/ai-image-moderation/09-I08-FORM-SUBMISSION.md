# I08 — Gửi bài có ảnh và giữ bản nháp khi lỗi

## Phụ thuộc

I06, I07. Đọc contract route/error và composer hiện tại.

## Các bước

1. Không có ảnh → giữ JSON `/post/create` hiện có. Có ảnh → FormData gồm content và image đến `/post/create-with-image`.
2. Không đặt Content-Type multipart thủ công. Giữ JWT và refresh token hiện có, không gửi key/credential nội bộ từ frontend.
3. Dùng cùng submittingRef để khóa đồng bộ cả hai route. Khóa textarea, chọn/xóa ảnh, Đăng, nút đóng/backdrop trong khi request.
4. Gỡ chặn submit tạm của I07. Hiển thị trạng thái kiểm duyệt rõ ràng, không hứa tiến độ phần trăm khi backend chưa có thông tin.
5. Map lỗi 1015/1016 và mã file/storage mới theo hợp đồng. Non-JSON, mạng lỗi và status không biết phải có thông báo fallback, finally luôn giải phóng khóa.
6. Khi lỗi: giữ content và File/preview, không thêm bài vào feed, cho thay ảnh/sửa nội dung/thử lại. Khi success 1000/result hợp lệ: callback đúng một lần, clear text+File+input+preview, revoke URL và đóng modal.
7. Không tự thêm bài optimistic trước backend. Không tự retry request tạo bài vì có nguy cơ bài đã được lưu nhưng response thất lạc.
8. Giữ giới hạn 500/501 ký tự trên cả nhánh ảnh và text. Văn bản rỗng với ảnh vẫn bị từ chối theo phạm vi đã chốt.

## Kiểm tra

Request text-only cũ; multipart đúng file; nhấn nhanh nhiều lần; AI block/unavailable; file error; storage error; mạng/non-JSON; sửa ảnh rồi gửi lại; success clear draft. Nếu giả lập response phải chặn request trước server, tránh lưu bài thật rồi đổi response sau đó.

Không vượt bảo vệ Console. Nếu browser không khả dụng, ghi chưa thử UI và dùng test harness/test hiện có cho phần logic, không thay nhãn E2E. Build/lint, bàn giao `handoffs/I08.md`.
