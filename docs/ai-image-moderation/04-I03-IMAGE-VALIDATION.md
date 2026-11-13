# I03 — Nhận dạng và kiểm tra ảnh

## Phụ thuộc và phạm vi

I02. Tạo validator/value object trong Post Service, cấu hình multipart và test. Chưa mở route đăng bài có ảnh khi chưa có I06.

## Các bước

1. Tạo đối tượng ảnh đã validate chứa byte bất biến hoặc defensive copy, MIME xác thực, size, width, height; chỉ validator tạo đối tượng hợp lệ. Không để log/toString in bytes/Base64.
2. Kiểm tra số lượng file ở lớp binding/validation bằng danh sách multipart; không để framework im lặng lấy file đầu nếu gửi nhiều image. File rỗng → required/invalid theo hợp đồng.
3. Chặn file >5.242.880 byte trước khi readAllBytes hoặc Base64. Cấu hình Spring multipart file/request 5MiB/6MiB; xác minh đơn vị thực tế framework, không dùng nhầm 5 triệu byte. Ánh xạ oversized multipart thành 413 an toàn, không log body.
4. Kiểm tra signature JPEG/PNG và parser thực tế. Dùng ImageReader đọc metadata chiều rộng/cao trước full decode. Tính pixel bằng long để tránh overflow; mỗi chiều <=6000 và tích <=16 triệu.
5. Xác minh nội dung ảnh decode được; giới hạn số frame, từ chối APNG theo cấu trúc PNG, không chỉ dựa ImageIO có thể bỏ qua animation. Không thêm định dạng ngoài JPEG/PNG. Không sửa byte sau validate.
6. Xác định rõ chính sách MIME/extension không khớp: không chấp nhận file giả; MIME gửi provider/lưu trữ phải là MIME đã xác thực. Tài liệu hóa nếu browser dùng MIME rỗng/generic.
7. Đồng bộ request size ở Gateway/File Service nếu có cấu hình cần thiết; không thay giới hạn avatar toàn cục mà không đánh giá tác động.

## Test bắt buộc

- JPEG/PNG nhỏ hợp lệ, file trống, ảnh hỏng, non-image đổi đuôi PNG, định dạng không hỗ trợ, APNG, nhiều part.
- Ranh giới byte đúng/vượt bằng test thích hợp, biên dimension/pixel và overflow; dùng mock reader cho metadata cực lớn nếu cần, không tạo ảnh khổng lồ làm cạn RAM.
- Oversized multipart đến controller test không thành lỗi 9999.
- Không gọi AI/storage trong các ca file sai.

Không thêm dependency chỉ để test; nếu cần parser/library mới, chọn rõ mục đích và kiểm tra tài liệu chính thức. Bàn giao `handoffs/I03.md` gồm API validator, cấu hình, test, hạn chế parser nếu có. Không giảm giới hạn/chấp nhận file sai để test xanh.
