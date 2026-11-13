# Bàn giao Task 08 — Kiểm thử và tài liệu

Ngày 13/11/2026 (Asia/Saigon). **Triển khai xong nhưng chưa nghiệm thu toàn luồng.**
Chi tiết lệnh, ma trận và giới hạn bằng chứng trong
[acceptance-report.md](../acceptance-report.md).

## Checkout và file bàn giao

- Nhánh giữ nguyên `feature/ai-post-moderation`, HEAD đầu phiên `7ee92d7`,
  working tree sạch. Không có `AGENTS.md` áp dụng được tìm thấy.
- `web-app/src/pages/ProfilePage.tsx`: chỉ bổ sung X/Check từ Phosphor; lỗi build
  có sẵn đã tái hiện và xác minh export/import thực tế trước sửa. Không refactor.
- `README.md`: phạm vi bài mới, pipeline, mã lỗi, cấu hình backend/model/timeout,
  hướng dẫn chạy/test, fail closed và bài cũ chưa duyệt lại.
- `docs/ai-moderation/configuration.md`: ghi chú lịch sử Task 02 để tránh hiểu
  nhầm rằng trạng thái hiện tại chưa tích hợp moderation.
- `docs/ai-moderation/acceptance-report.md`: môi trường, bằng chứng phiên này,
  lỗi/chặn, kết luận và các bước nghiệm thu tiếp theo.
- `docs/ai-moderation/handoffs/task-08.md`: bàn giao này.

Không đổi hợp đồng: 200/1000; 422/1015; 503/1016; 400/1017,1018.
Nội dung giữ nguyên, không save/send khi validation hoặc moderation từ chối.
Phần sau được kiểm tra qua mock/unit/socket experiment, chưa xác minh trên DB/
broker thật. Không đổi backend, policy, schema, xác thực, endpoint hay dependency.

## Kết quả kiểm tra thực tế

Windows; JDK 21.0.12.1; Maven 3.9.16 cache; Node 24.22.0/npm 11.19.1.

| Kiểm tra | Kết quả |
|---|---|
| Maven offline, selector bảy lớp Task 02/03/04/05/06 | 94/94 đạt; lần cuối `clean test` kết thúc 14:29:00 +07, 0 failure/error/skipped; kiểm tra XML |
| Maven offline full `test`, key giả chỉ trong process con | 95 test, 1 error ở contextLoads do MongoDB E11000; không disable/xóa test |
| `npm.cmd run build` | Trước sửa exit 1 thiếu X/Check; sau sửa exit 0, còn cảnh báo JS chunk >500 kB |
| `npm.cmd run lint` | Exit 0, không warning được in sau sửa; dùng npm.cmd vì npm.ps1 bị policy chặn |
| Thử nghiệm provider socket riêng hiện tại | 19/19 đạt; controller/validation/handler/service/client thật, SecurityContext và repo/Profile/Kafka giả |
| `git diff --check` | Đạt trước bàn giao |

Thử nghiệm socket gồm 2 ca cho qua/content không đổi/500 ký tự, 1 ca chặn,
4 HTTP lỗi, 6 response sai, 1 read timeout thật, 4 content bắt buộc, 1 quá dài.
Kiểm tra số lần gọi provider/save/send; lỗi không tương tác repo/Profile/Kafka,
invalid không gọi provider. Không có endpoint stub trong sản phẩm; key luôn giả.
Lần compile đầu sandbox không đọc được JAR cache, chạy lại có quyền đọc cache đạt.

Mã thử nghiệm/stub đã dọn, không commit theo yêu cầu. **19/19 là quan sát một lần,
không phải bộ test tái chạy từ commit bàn giao**, không coi là API thật/E2E. Harness
14/14 cũ của Task 07 không được dùng làm bằng chứng đạt trong phiên này.

## Chặn nghiệm thu và bước tiếp theo

1. MongoDB E11000 tại unique index `uniq_post_user_like`, collection likes,
   `post_id: null` được tái hiện qua full context. Cần xử lý bảo toàn dữ liệu theo
   phương án được duyệt rồi chạy full suite; không reset/xóa hoặc tắt index.
2. Chưa chạy API HTTP thật qua JWT/Gateway/Post, kiểm kê MongoDB/event Kafka,
   `/post/my-posts`, search sau đồng bộ hoặc đọc bài cũ. Backend/Gateway đóng cổng;
   không có thông tin đăng nhập tài khoản thử nghiệm được cung cấp cho phiên này.
   Xem ma trận và giới hạn chờ search 30 giây trong báo cáo nghiệm thu.
3. Đã thử công cụ trình duyệt phiên này: host unavailable; thử native Cốc Cốc bị
   Computer Use dừng vì chưa hỗ trợ URL policy enforcement. Chưa kiểm tra UI
   thành công/chặn/lỗi, giữ bản nháp/sửa/gửi lại, chống gửi lặp và khóa khi chờ.
   Cần trình duyệt được hỗ trợ hoặc người dùng thao tác theo checklist báo cáo.
4. Không có OPENAI_API_KEY ở process/User/Machine; không gọi AI thật. V01–V14
   chưa đánh giá; V15–V20 còn thiếu fixture cụ thể. Cấu hình key thử nghiệm ngoài
   chat/repo và ghi nhận chặn nhầm/cho qua nhầm, không thay policy để ép kết quả.

## Dọn môi trường và Git

Không sửa application.yaml hoặc biến môi trường bền vững; key/base URL giả chỉ
ở process con và đối tượng test. Stub/executor dừng trong teardown, Vite do phiên
này tạo đã dừng; probe cổng 3000 đóng. Không dừng tiến trình có sẵn, không tạo bài
thật hoặc xóa/reset dữ liệu. Clean compile xác nhận không còn source/class thử
nghiệm tạm. Không commit secret/token/dữ liệu thật/mã stub hay artifact build.

Commit bàn giao là commit chứa file này, tra bằng
`git log -1 -- docs/ai-moderation/handoffs/task-08.md`; mã commit cụ thể và trạng
thái working tree sau commit được báo ở phản hồi cuối. Không push, merge,
triển khai hoặc tạo nhánh mới. Chỉ khi có bằng chứng E2E/UI/AI thật còn thiếu
mới cập nhật kết luận thành nghiệm thu đạt.
