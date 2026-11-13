# I05 — Lưu ảnh bài viết đã duyệt bằng File Service

## Phụ thuộc

I02, I03. Không chuyển trách nhiệm gọi AI vào File Service; Post Service chỉ gọi endpoint mới sau duyệt đạt.

## Các bước

1. Đọc storage/avatar/generic upload hiện có. Tạo kho post-media riêng với metadata/namespace phân biệt rõ; không để download cũ đọc được metadata mới.
2. Thực hiện endpoint create/delete theo hợp đồng I02; create nhận đúng một ảnh và trả fileId/url/MIME/size/width/height. File Service kiểm tra lại size/định dạng để bảo vệ storage, không tin metadata từ request.
3. Create/delete yêu cầu JWT hợp lệ và credential nội bộ riêng. Test user JWT thông thường không có secret bị từ chối kể cả gọi trực tiếp 8084 hoặc qua Gateway. Lấy ownerId từ JWT, delete chỉ đúng chủ sở hữu.
4. Đọc secret backend từ biến môi trường, không hardcode/commit. Không dùng key OpenAI, không bật permitAll cho route nội bộ, không chỉ dựa route bị ẩn.
5. Server sinh ID/path, kiểm tra path nằm trong storage root, không dùng filename/path người gửi làm đường dẫn. Không overwrite file tồn tại; file immutable.
6. Ghi file và metadata có xử lý rollback cục bộ: metadata fail → dọn file vừa tạo. Không xóa file có sẵn khi cleanup lỗi.
7. Delete bù idempotent cho file vừa tạo; không xóa ảnh khác chỉ vì client truyền ID. Public GET chỉ phục vụ file post-media tồn tại, MIME xác thực và header phù hợp, không lộ path máy chủ.
8. Tạo Post-side FileClient có JWT relay hẹp và thêm credential nội bộ từ cấu hình, không forward header này từ browser. Test bằng stub. Không cấu hình interceptor toàn cục ảnh hưởng client AI/Profile.
9. Bổ sung proxy `/file` ở frontend nếu trả URL relative qua Gateway; kiểm tra cấu hình thực tế, không tự hardcode cổng vào component.

## Nghiệm thu

- File sai/unauthorized/secret sai/cross-owner đều không ghi/xóa.
- Test storage ở thư mục temp, không đụng thư mục upload thật hoặc database người dùng.
- Generic upload/download, avatar Saga tiếp tục hoạt động; không đánh dấu ảnh upload chung là đã duyệt.
- Kiểm tra lỗi save metadata/delete bù, file not found và traversal.
- Test context không đòi secret thật; dùng fake cấu hình test. Bàn giao cách cấu hình secret hai backend, route, response, cleanup và test trong `handoffs/I05.md`.
