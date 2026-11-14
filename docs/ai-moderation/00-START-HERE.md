# Markie — Bộ task tích hợp AI kiểm duyệt bài viết

## Cách dùng bộ hướng dẫn

Đưa thư mục này vào `docs/ai-moderation/` trong checkout Markie mà các agent sẽ sửa. Đây là tài liệu giao việc; chưa có thay đổi chức năng trong mã nguồn.

Mã nguồn tham chiếu: https://github.com/ToanNguyen2oo5/Markie — commit `85957fe` được đọc ngày 13/11/2026. Nếu checkout khác commit, agent phải đọc lại các file liên quan và ghi rõ khác biệt trước khi triển khai.

Mỗi agent phải đọc `01-SHARED-CONTRACT.md` và file task được giao. Mọi đường dẫn mã nguồn trong tài liệu tính từ thư mục gốc repository Markie, không phải thư mục chứa tài liệu.

## Danh sách và thứ tự

| Thứ tự | Tài liệu | Phụ thuộc |
|---|---|---|
| 0 | `02-TASK-00-ENVIRONMENT.md` | Không |
| 1 | `03-TASK-01-POLICY.md` | Task 00 |
| 2A | `04-TASK-02-CONFIG.md` | Task 01 |
| 2B | `06-TASK-04-VALIDATION.md` | Task 01 |
| 2C | `07-TASK-06-ERRORS.md` | Task 01 |
| 3A | `05-TASK-03-MODERATION-SERVICE.md` | Task 02 và 06 |
| 3B | `09-TASK-07-FRONTEND.md` | Task 06; có thể dùng phản hồi giả lập khi backend chưa xong |
| 4 | `08-TASK-05-INTEGRATION.md` | Task 03, 04, 06 |
| 5 | `10-TASK-08-ACCEPTANCE.md` | Task 05 và 07 |

Số task giữ theo kế hoạch ban đầu; Task 06 phải làm trước Task 03 và 05 vì cung cấp mã lỗi dùng chung.

Nếu chỉ có một agent, làm tuần tự: **00 → 01 → 02 → 04 → 06 → 03 → 05 → 07 → 08**.

Nếu giao nhiều agent: giao trực tiếp từng task theo phụ thuộc; mỗi task cần có kết quả kiểm tra trước khi bàn giao. Không giao toàn bộ kế hoạch cho mọi agent cùng sửa. Nếu có các checkout riêng, hợp nhất kết quả của task phụ thuộc trước khi bắt đầu task kế tiếp. Nếu dùng chung checkout, tránh sửa cùng file và không chạy thao tác Git làm mất thay đổi của agent khác.

## Quy tắc cho mọi agent

1. Đọc `AGENTS.md` áp dụng trong checkout, nếu có. Kiểm tra thay đổi có sẵn trước khi sửa.
2. Chỉ làm task được giao; không triển khai task kế tiếp hoặc thêm tính năng ngoài phạm vi.
3. Giữ các route, định dạng `ApiResponse` và luồng đăng nhập hiện có.
4. Không commit API key, token, nội dung bài thật hoặc phản hồi AI đầy đủ vào tài liệu/log.
5. Không thay kiến trúc Kafka, thêm microservice, bảng quản trị, trạng thái duyệt hay migration dữ liệu.
6. Không triển khai lên máy chủ, push hoặc tạo dữ liệu trên môi trường dùng thật nếu chưa được yêu cầu.
7. Không báo kiểm thử thành công khi chỉ đọc mã. Thiếu môi trường phải ghi rõ phần đã kiểm tra và phần chưa chạy.

## Mẫu giao cho agent

> Hãy đọc `docs/ai-moderation/01-SHARED-CONTRACT.md` và `docs/ai-moderation/<tên-file-task>.md`, sau đó thực hiện đúng task đó trong repository Markie. Kiểm tra các task phụ thuộc đã có trước khi sửa. Giữ phạm vi đơn giản theo hợp đồng chung. Kết thúc bằng danh sách file sửa, hành vi thay đổi, kiểm thử đã chạy, kết quả và vấn đề còn lại. Không tự mở rộng sang task khác.

## Báo cáo bàn giao bắt buộc

- Task và trạng thái: hoàn thành / còn thiếu.
- File tạo hoặc sửa và mục đích.
- Hợp đồng đầu vào/đầu ra đã thực hiện.
- Lệnh kiểm tra, kết quả thực tế; lỗi môi trường nếu có.
- Điều kiện để agent kế tiếp bắt đầu.
- Các thay đổi so với tài liệu, kèm lý do nếu thật sự cần.
