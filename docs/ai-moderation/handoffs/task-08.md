# Bàn giao Task 08 — Kiểm thử và tài liệu

## Cập nhật tiếp tục từ `191c2f3` — 13/11/2026

**Đã sửa E11000 và nghiệm thu các luồng backend chính với hạ tầng thật/provider
giả lập; chưa nghiệm thu toàn luồng vì chưa chạy UI và AI thật.** Nội dung từ
“Lịch sử bàn giao” phía dưới là phiên cũ, không ghi đè cập nhật này.

Checkout đầu phiên đúng `feature/ai-post-moderation`, HEAD `191c2f3`, working tree
sạch; không tìm thấy AGENTS.md áp dụng. JDK 21.0.12.1, Maven cache 3.9.16,
Node 24.22.0/npm 11.19.1. Không đổi nhánh hay ghi đè công việc khác.

### File và nguyên nhân

- `post/post/src/main/java/com/stewie/post/entity/Like.java`: unique index
  `uniq_post_user_like` thêm partial filter `post_id exists`. Index cũ định tạo
  trên `post-service.likes` coi post_id thiếu như null, gây E11000 với 2 bản ghi
  schema target_type/target_id/user_id. DB đã có unique index target_* riêng.
  Lỗi nằm ở createIndexes trong MongoTemplate lúc khởi tạo context, trước request
  AI. Khai báo gây lỗi giống `git show 85957fe:.../entity/Like.java`, có trước AI.
  Không kết luận nguồn tạo dữ liệu; không drop/sửa bản ghi/index hiện có.
- `post/post/src/test/java/com/stewie/post/PostApplicationTests.java`: giữ
  contextLoads, dùng MongoDB thật với DB ngẫu nhiên riêng, seed fixture target_*
  trước tạo index; thêm test filter và unique post_id/user_id vẫn từ chối trùng.
  Key giả/localhost trong test; không mock MongoDB hay tắt auto-index/context.
- `README.md`: cập nhật chặn MongoDB đã giải quyết, test isolation và trạng thái.
- `acceptance-report.md` và handoff này: bổ sung bằng chứng phiên tiếp tục,
  checklist UI, cấu hình key tại máy và giới hạn nghiệm thu.

Sửa index nhằm tương thích khởi động, không mở rộng chức năng likes. Nếu sau này
thêm ghi likes hỗn hợp phải thiết kế riêng vì unique target_* hiện có vẫn ràng
buộc các bản ghi legacy. Nếu DB khác đã có index non-partial cùng tên, không tự
drop/rebuild; cần phương án chuyển index được duyệt. Môi trường hiện tại trước
sửa chưa có index này; sau khởi động thêm đúng partial index, 2 likes giữ nguyên.

### Kết quả thực thi mới

| Kiểm tra | Kết quả |
|---|---|
| Tái hiện context lỗi trước sửa | Exit 1; 1 test, 1 error E11000, 14:38:03 +07 |
| Maven offline `clean test` sau sửa | **96/96**, 0 failure/error/skipped, 14:40:12 +07; đối chiếu XML |
| Full suite trên mã cuối | **96/96**, exit 0, 14:50:28 +07; URI test mặc định đọc từ YAML hiện có |
| Selector bảy lớp nghiệp vụ `test` | **94/94**, exit 0, 14:46:32 +07 |
| Frontend build/lint chạy lại | Exit 0; build còn warning chunk >500 kB, lint không in warning |
| Post application.yaml phát triển | Tomcat 8083 khởi động 14:40:44 +07 trên DB cũ, không E11000 |
| Gateway/Profile/Search thật | Khởi động bằng Maven offline với quyền đọc cache bổ sung |
| API JWT + MongoDB/Kafka/search thật | Các ca chính đạt, provider riêng vẫn là stub/key giả |

Lệnh Maven và selector đầy đủ ở acceptance-report. Full suite không cần key
thật; context test cần MongoDB và issuer theo cấu hình. Có thể đặt
`MARKIE_TEST_MONGODB_URI`; test luôn dùng DB `markie_context_test_<uuid>`, không
seed vào DB phát triển. Không drop DB test, giữ fixture tổng hợp.

API thử nghiệm qua Gateway dùng tài khoản tổng hợp mới, JWT Keycloak-issued qua
authorization code + PKCE; không đổi client/realm, không bật direct grants.
Script tạm `node .task08-real.cjs` exit 0, đã dọn và không commit.
Marker `MARKIEACCEPT1794555829679`:

- false → 200/1000, 1 provider call, 1 bản ghi MongoDB; my-posts trả đúng bài;
  search HTTP 200 có đúng postId/content, poll đầu hoàn tất 736 ms sau bắt đầu
  truy vấn (không phải số đo latency Kafka tổng thể).
- true → 422/1015; HTTP 500/flagged chuỗi/read timeout 6500 ms so với read timeout
  client 5000 ms → 503/1016. Mỗi ca gọi provider 1 lần, MongoDB exact-content 0.
- whitespace → 400/1017, quá 500 → 400/1018; provider 0, MongoDB 0.
- Kafka console consumer thật, timeout hữu hạn: đúng 1 event mang marker, là
  bài đạt; input provider/save/event giữ nguyên. Không có event marker của lỗi/
  chặn/quá dài, và 0 event có content whitespace invalid. Không suy từ search
  tức thì ra “không lưu”. Không JWT trực tiếp tới Post → 401.

Không dùng 19/19 mock-storage của phiên trước để thay thế bằng chứng hệ thống
thật phiên này. Script/stub hiện tại cũng không là bộ test tái chạy từ commit;
96 test backend có source là bằng chứng tái chạy được.

### Còn thiếu và dọn môi trường

- Đã gọi lại browser inventory, host vẫn unavailable. Chưa thao tác UI; checklist
  cụ thể trong acceptance-report: thành công/1015/1016, giữ/sửa/gửi lại, disabled
  textarea/Đăng/đóng/backdrop, nhiều lần bấm trong refresh token/request, biên
  UTF-16, đọc bài cũ. Dùng trình duyệt hỗ trợ hoặc người dùng thao tác.
- Chưa có key OpenAI thử nghiệm cấu hình, chưa AI thật. Báo cáo có lệnh nhập key
  bằng Read-Host -AsSecureString trong PowerShell rồi export môi trường process;
  không gửi key vào chat/repo, không trỏ key thật tới stub. V01–V14 chưa chạy;
  V15–V20 cần fixture cụ thể; ghi nhận false positive/negative, không ép policy.
- Chưa chạy mọi biến thể HTTP provider và biên validation trên hệ thống thật;
  xem danh sách phân tầng bằng chứng ở acceptance-report.
- Stub đã đóng; bốn service do phiên này tạo đã dừng, probe
  8081/8083/8085/8888/18908 đều đóng. Không thay YAML/env bền vững hay container.
  Không xóa dữ liệu cũ; giữ 1 user/profile/post/event/search tổng hợp mới và DB
  fixture test. Không commit dữ liệu, log, token/key hoặc stub.

Commit cập nhật là commit chứa mục này, SHA và working tree cuối được báo trong
phản hồi cuối. Không push/merge/triển khai. MongoDB không còn là chặn hiện tại;
**UI và AI thật vẫn là điều kiện nghiệm thu còn thiếu**.

## Lịch sử bàn giao tại `191c2f3`

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
