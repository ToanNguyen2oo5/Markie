# I09 — Hiển thị ảnh và đồng bộ tìm kiếm

## Phụ thuộc

I06, I08. Kiểm tra PostData/types và các component đang dùng PostResponse trước khi sửa.

## Các bước

1. Bổ sung image nullable/optional trong types feed, profile, detail và search phù hợp model backend. Không ép bài cũ phải có image.
2. Hiển thị ảnh trong PostCard với kích thước hợp lý, object-fit không làm vỡ layout, alt mô tả trung tính. Không tự đưa path đĩa hoặc Base64 vào HTML.
3. Cập nhật nơi profile/detail thực tế tái sử dụng card hoặc render riêng; không tạo page mới nếu dự án chưa có.
4. Kiểm tra response url đi được qua Vite/Gateway và khi dùng frontend build. Sửa proxy nếu cần, không hardcode localhost:8084 trong component.
5. Bổ sung image metadata tùy chọn trong cả bản PostSyncEvent phía Post và Search, PostDocument và response/search card. Chỉ đồng bộ ID/URL/metadata cần hiển thị, không byte ảnh/secret.
6. Consumer đọc được event cũ không image, event mới có image; kiểm tra mapper/index serialization. Không bật chế độ chặt khiến event thiếu field cũ thất bại.
7. Search vẫn chỉ tìm content như cũ; không thêm tìm ảnh/OCR. Bài cũ ES không có image vẫn hiển thị text, không tự reindex toàn bộ.
8. Ảnh download lỗi hiển thị fallback có thể hiểu được, không ảnh hưởng text hoặc vòng lặp tải lại vô hạn. Không đánh dấu bài cũ “đã duyệt”.

## Test/QA

Event old/new, PostDocument field tùy chọn, feed/profile/search ảnh mới và text cũ, ảnh portrait/landscape, URL 404, viewport hẹp. Đối chiếu Mongo metadata/event/ES không có Base64 hoặc path máy chủ.

Chạy test service liên quan, frontend build/lint; chỉ ghi browser đạt khi quan sát thật. Bàn giao `handoffs/I09.md` và route/type thực tế.
