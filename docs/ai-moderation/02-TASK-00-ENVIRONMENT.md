# Task 00 — Chuẩn bị và xác minh môi trường

## Mục tiêu và phụ thuộc

Chạy được chức năng đăng bài hiện có trước khi sửa. Đọc `01-SHARED-CONTRACT.md`. Task này không triển khai AI.

## Các bước

1. Xác định đúng repository Markie, nhánh và commit; đọc README và mọi `AGENTS.md` áp dụng. Kiểm tra thay đổi chưa commit, không ghi đè.
2. Kiểm tra Java 21 bằng `java -version`; Maven Wrapper tại `post/post/mvnw.cmd`; Node/npm bằng `node --version`, `npm --version`; Docker Desktop đang hoạt động.
3. Đọc `docker-compose.yml` và cấu hình từng service trước khi chạy. Compose ở commit tham chiếu chỉ dựng một phần hạ tầng; không giả định đã có MongoDB, Neo4j, Keycloak. Theo README để chuẩn bị các thành phần còn thiếu.
4. Kiểm tra cổng theo cấu hình: Gateway 8888, Post 8083, Profile 8081, Search 8085, frontend 3000, Keycloak 8280, MongoDB 27018, Kafka 9094 từ máy host. Xử lý xung đột mà không dừng dịch vụ không thuộc task.
5. Khởi động hạ tầng, sau đó Keycloak/cấu hình realm `markie`, các backend, Gateway và frontend theo README. Giữ cửa sổ/tiến trình chạy nền theo cách phù hợp môi trường.
6. Nếu có `package-lock.json` dùng `npm ci` trong `web-app`; nếu không có thì dùng `npm install` và báo thay đổi lockfile. Không tự nâng phiên bản dependency.
7. Đăng nhập bằng tài khoản thử nghiệm. Đăng một bài vô hại có chuỗi nhận diện riêng và xác minh qua `/post/my-posts`, xem chi tiết, sau đó tìm kiếm khi Kafka đã đồng bộ.
8. Ghi kết quả vào `docs/ai-moderation/environment-report.md`: phiên bản, commit, service hoạt động, kiểm tra đã chạy, lỗi có sẵn. Không lưu mật khẩu/token.

## Kiểm tra và nghiệm thu

- Phân biệt lỗi có trước khi tích hợp AI và lỗi sẽ phát sinh sau thay đổi.
- Nếu không thể chạy toàn hệ thống, vẫn ghi kết quả build/đọc cấu hình khả dụng và nêu rõ điều kiện còn thiếu. Không tự tuyên bố baseline đạt.
- Chỉ tạo dữ liệu thử nghiệm ở môi trường phát triển. Không reset database hoặc xóa dữ liệu cũ.

## Bàn giao

Environment report và hướng dẫn tái hiện ngắn gọn. Task 01 có thể chốt phạm vi khi môi trường còn thiếu; kiểm thử toàn luồng cuối cùng vẫn phải chờ môi trường đủ.
