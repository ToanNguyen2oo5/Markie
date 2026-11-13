# Bàn giao Task 08 — Kiểm thử và tài liệu

## UI 500 đạt; 501 còn thiếu bằng chứng riêng — từ `f29d01a`

Ngày 13/11/2026; nhánh `feature/ai-post-moderation`, HEAD đầu phiên `f29d01a`,
working tree sạch. Ghi nhận đúng phản hồi thủ công:

- **500 đạt**: counter 500/500, Đăng bật, bấm một lần đúng một request,
  HTTP 200/code 1000, modal đóng và bài xuất hiện trên feed.
- **501 chỉ đạt counter/disable**: 501/500 và Đăng bị khóa. Người dùng chưa xác
  nhận riêng Network không phát POST; không có xác nhận riêng feed không thêm bài.
  Không suy ra hai mục này từ disabled và **không đánh dấu U6 đạt toàn bộ**.

U1–U5, V16–V19, đọc bài cũ và các ca API đã hoàn tất giữ nguyên; V12 chặn nhầm và
V20 cho qua nhầm không thay đổi. Tích hợp đã có bằng chứng trong các phạm vi đó,
**chưa chốt toàn bộ Task 08 đạt** vì ca UI 501 còn phần chưa xác nhận. Không thêm
ca phụ, không coi thiếu bằng chứng là lỗi được phát hiện.

Chỉ sửa README/checklist/report/handoff, không gọi API/AI, chạy lại test/build
hoặc tác động dịch vụ/key/endpoint/dữ liệu. Không push/merge/triển khai. Không có
HAR/browser automation hoặc kiểm kê DB/event mới cho bài người dùng vừa đăng.

## Chỉ còn UI 500/501 chờ người dùng — từ `79d9d5d`

Ngày 13/11/2026; nhánh `feature/ai-post-moderation`, HEAD đầu phiên `79d9d5d`,
working tree sạch. Đã đọc báo cáo/handoff/checklist, không có AGENTS.md áp dụng.
Chỉ thực hiện phần bắt buộc còn thiếu, không mở rộng hoặc lặp các ca đã đạt.

- U1–U5 giữ nguyên đạt theo kiểm thử thủ công. V16–V19 đã hoàn tất bốn ca AI thật
  422/1015 và 0 bài/event, không gọi lại. V12 chặn nhầm/V20 cho qua nhầm giữ nguyên.
- **Đọc bài cũ đạt qua API**: một bài ngày 31/10/2026, trước tích hợp moderation,
  GET qua Gateway với JWT thật trả 200/1000; content khớp và toàn document DB
  không đổi sau đọc. Không in ID/content và không POST duyệt lại bài cũ.
- **10 ca API còn thiếu đạt** bằng Post test riêng 18083, stub riêng 18909/key
  giả, DB test mới, JWT/MongoDB/Kafka/Profile/Search thật. 401/429, JSON sai,
  results rỗng, flagged thiếu/null → 503/1016, 0 bài/event; thiếu/null/rỗng content
  → 400/1017, 0 provider call/0 bài/event. Đúng 500 ASCII và provider false →
  200/1000, 1 bài/1 event, content giữ nguyên và đồng bộ Elasticsearch.
- Script tạm `task08-missing-check.cjs` exit 0, **18:32:37–18:32:59 +07**,
  run ID `MARKIEMISSING1794569557615`. Request trực tiếp Post test, không đổi
  Gateway hoặc process 8083. Script/stub đã dọn, instance test đã dừng; 18083 và
  18909 đóng. Giữ dữ liệu tổng hợp mới, không drop/reset dữ liệu có sẵn.
- **PID 26776 giữ nguyên** bắt đầu 15:34:37 +07, cổng 8083 vẫn mở; không đọc key/
  env/command line, không restart/dừng/đổi endpoint của process người dùng.

Chrome vẫn host unavailable. Đã gửi U6 thủ công trong
[ui-manual-checklist.md](../ui-manual-checklist.md): 501 khóa Đăng/không request,
500 cho phép gửi một request và ghi kết quả. **Chưa có phản hồi U6; chưa đánh dấu
UI giới hạn độ dài đạt**. Không nhầm API 500 đạt với browser đã kiểm tra.

Tích hợp backend/validation/ba luồng và đọc bài cũ đã có bằng chứng; UI U1–U5
đạt thủ công. **Chưa chốt toàn bộ Task 08 chỉ vì U6 còn chờ xác nhận**. Các ca
phụ UI mạng/response sai/refresh lỗi riêng/emoji không chạy và không làm cổng mới.
Hạn chế mô hình V12/V20 được tách riêng, không đổi chính sách để ép kết quả.
Chỉ cập nhật tài liệu, không chạy lại unit/build/lint, không push/merge/triển khai.

## U5 đạt theo người dùng — từ `e82358c`

Ngày 13/11/2026, checkout đúng `feature/ai-post-moderation`, HEAD đầu phiên
`e82358c`, working tree sạch. Người dùng xác nhận các kết quả UI 503/1016 đúng
hướng dẫn: thông báo, giữ modal/bản nháp, mở lại thao tác, feed không thêm bài ở
lần lỗi. Sau khi giả lập tự gỡ, **giữ nguyên nội dung và bấm Đăng lại thành công**.

**U5 đạt theo kiểm thử thủ công**, không phải browser E2E tự động hoặc phản hồi
503 mới từ backend. Retry nguyên nội dung là đúng với lỗi kỹ thuật, không phải
bypass và không cần sửa nội dung như ca bị từ chối 422/1015. Không thu HAR/raw
response mới. Checklist/README/báo cáo đã cập nhật; U1–U5 không còn chờ xác nhận.

Còn thiếu đúng phạm vi đã liệt kê: UI 500/501, đọc bài cũ, các biến thể ma trận
API full stack. Không thêm cổng từ ca phụ. V16–V19 đã hoàn tất, V12 chặn nhầm và
V20 cho qua nhầm giữ nguyên. **Chưa chốt toàn bộ Task 08 đạt**.

Chỉ cập nhật tài liệu, không gọi API/AI hoặc chạy lại test/build. PID 26776 giữ
nguyên thời điểm bắt đầu 15:34:37 +07, không đọc key/env/command line hoặc thay
dịch vụ/cấu hình/dữ liệu. Không push/merge/triển khai. Các mục U5 chờ ở dưới là
lịch sử trước phản hồi người dùng này.

## UI 503/1016 và ranh giới nghiệm thu — từ `54f88e2`

Ngày 13/11/2026, đúng nhánh `feature/ai-post-moderation`, HEAD đầu phiên
`54f88e2`, working tree sạch. Đã đối chiếu Task 08/07 với bằng chứng hiện tại.

**Bắt buộc còn thiếu theo Task 08 gốc:** U5 UI 503/1016; UI nội dung dài 500/501;
đọc bài cũ; các biến thể ma trận API ở mức full stack chưa có (HTTP provider
401/429, JSON sai/results rỗng/flagged thiếu/null, content thiếu/null/rỗng và
đúng 500 cho qua). Các biến thể này đã có unit/slice/socket-storage-mock ở mức
thấp hơn; full stack đã có false/true/timeout/500/flagged chuỗi/whitespace/quá dài.
Không tuyên bố các ca thấp hơn chưa chạy hoặc đổi chúng thành E2E.

**Ca phụ, không thêm cổng Task 08:** UI mất mạng, HTML/JSON response sai
(robustness Task 07), refresh token lỗi riêng, UI 250/251 emoji. Không mở rộng
sang tải/thiết bị/browser/model mới. Bảng nguồn và trạng thái chi tiết trong
[acceptance-report.md](../acceptance-report.md).

Chrome vẫn `The browser access host is unavailable`. Đã bổ sung U5 trong
[ui-manual-checklist.md](../ui-manual-checklist.md): Console chặn POST tạo bài ở
tab localhost, trả Response 503/code 1016 sau 1,5 giây; tự khôi phục sau response
hoặc 2 phút. Không gửi request giả lỗi tới server, không đọc/log credential hoặc
body, không sửa endpoint/key/Post process. Network không có 503 thật; không
nhầm bằng chứng UI với backend response. Người dùng cần xác nhận đúng thông báo,
giữ modal/content, hết chờ/mở lại thao tác, không thêm feed và thử lại được.

Đã gửi yêu cầu kết quả; **U5 đang chờ người dùng, chưa đánh dấu đạt**. Snippet
`node --check` exit 0 chỉ là kiểm tra cú pháp, không phải test UI. U1–U4 vẫn đạt
theo người dùng. V16–V19 đã hoàn tất bốn ca 422/1015, 0 bài/event; V12 chặn nhầm
và V20 cho qua nhầm giữ nguyên, phân biệt chất lượng mô hình với tích hợp đúng.

Chỉ sửa README/checklist/report/handoff, không gọi lại API/AI hay test/build;
PID 26776 giữ nguyên thời điểm bắt đầu 15:34:37 +07, không đọc key/env/command
line, không dừng/restart/chuyển provider. Không thay dữ liệu, push/merge/triển
khai. **Chưa chốt toàn Task 08 đạt** vì bằng chứng bắt buộc ở trên còn thiếu;
không dùng các ca phụ làm cổng nghiệm thu mới. Commit được báo ở phản hồi cuối.

## UI U1–U4 được người dùng xác nhận — từ `cd3f88b`

Ngày 13/11/2026 (Asia/Saigon), đúng nhánh `feature/ai-post-moderation`, HEAD đầu
phiên `cd3f88b`, working tree sạch. Đã nhận và rà soát phản hồi thủ công:

- **U1 đạt:** có trạng thái chờ và khóa textarea/Đăng/đóng/backdrop.
- **U2 đạt:** bấm nhanh nhiều lần chỉ 1 POST tạo bài, feed thêm 1 bài.
- **U3 đạt:** người dùng thử câu đe dọa tổng hợp, DevTools xác nhận 422/1015;
  modal giữ nội dung, không tạo bài trong feed.
- **U4 đạt về UI:** sửa thành lời chào, đăng thành công và modal đóng; người dùng
  xác nhận bổ sung mở lại composer thì nội dung trống.

Đây là bằng chứng **người dùng kiểm thử UI thủ công**, không phải agent điều
khiển trình duyệt/browser E2E tự động. Không nhận screenshot/HAR/raw response
thành công mới, không chép câu nhạy cảm vào báo cáo. Checklist đã cập nhật đúng
[ui-manual-checklist.md](../ui-manual-checklist.md); không còn chờ U1–U4.

Giữ nguyên V12 chặn nhầm/V20 cho qua nhầm và toàn bộ kết quả API/model trước.
**Chưa chốt toàn bộ Task 08 đạt**: chưa có xác nhận UI 503/1016, lỗi mạng/response
sai/refresh token lỗi và các biên độ dài. Hạn chế mô hình cần đánh giá sản phẩm,
khác với lỗi tích hợp mapping/side effect. Không đổi policy hoặc chọn lại kết quả.

Chỉ sửa README, checklist, acceptance-report và handoff; không gọi thêm API/AI,
không chạy lại test/build. PID 26776 vẫn giữ thời điểm khởi động 15:34:37 +07;
không đọc key/env/command line, không restart hoặc đổi endpoint. Không thay dữ
liệu, push/merge/triển khai. Commit được báo ở phản hồi cuối.

## V16–V19 hoàn tất, UI chờ kết quả — từ `c1fe162`

Ngày 13/11/2026; nhánh giữ nguyên `feature/ai-post-moderation`, HEAD đầu phiên
`c1fe162`, working tree sạch, không tìm thấy AGENTS.md áp dụng. Đã đọc báo cáo,
handoff và policy-and-cases trước khi sửa. **Chưa nghiệm thu toàn luồng.**

- Bổ sung bốn fixture tổng hợp ở
  `post/post/src/test/resources/moderation/vietnamese-acceptance-fixtures.json`;
  có thể đọc/tái sử dụng từ commit. Không người thật, không phương pháp gây hại,
  không tường thuật kích dục. Giữ nhãn kỳ vọng chặn của V16–V19, không đổi policy.
- `node post/post/target/task08-v16-v19-check.cjs`: exit 0,
  **15:51:33–15:51:53 +07**; run ID `MARKIEV16V191794559893967`.
  JWT Keycloak authorization code + PKCE và hạ tầng thật, không stub.
- **V16/V17/V18/V19 đều 422/1015**, thời gian API lần lượt 711/454/540/515 ms;
  **0 bài MongoDB, 0 post event Kafka** mỗi ca; tổng tài khoản thử cũng 0 bài/event,
  Elasticsearch posts count 0. Đọc bổ sung xác nhận Kafka topic thực sự đọc được,
  không nhầm lỗi consumer với không phát event. Hash/độ dài fixture trong báo cáo.
- Cổng 8083 vẫn PID **26776**, bắt đầu **15:34:37 +07**; không đọc key/env/command
  line, không restart/dừng/đổi endpoint. Quan sát TCP HTTPS khớp DNS OpenAI,
  không thấy remote stub trong cửa sổ lấy mẫu; không đọc payload/header.
- Cả 20 ID đã được quan sát qua hai lượt, 14 cho qua/6 chặn; **giữ nguyên V12
  chặn nhầm và V20 cho qua nhầm**, không chạy lại để chọn kết quả hoặc thay nhãn.
  Tích hợp mapping/side effect đúng khác với chất lượng phân loại của mô hình.
  Runtime model override/model ID upstream vẫn chưa xác minh độc lập.

### UI chưa đạt — chờ người dùng

Thử Chrome phiên này vẫn báo `The browser access host is unavailable`. Đã gửi
checklist bất đồng bộ, chưa nhận kết quả người dùng lúc ghi báo cáo. File
[ui-manual-checklist.md](../ui-manual-checklist.md) có bốn mục: chờ/khóa thao tác,
chống gửi lặp, bị chặn giữ nội dung, sửa/gửi lại thành công. **Không đánh dấu UI
đạt trước khi nhận và rà soát kết quả U1–U4**; nếu không quan sát được thì để chưa thử.

### File và trạng thái

Sửa README, policy-and-cases (cột thực tế, giữ nhãn kỳ vọng), acceptance-report và
handoff; thêm fixture JSON và checklist UI. Không đổi mã/cấu hình ứng dụng.
Không chạy lại 96 test/build/lint; đó là kết quả lịch sử. Đã kiểm tra cấu trúc
fixture JSON, nhãn/độ dài/hash và diff. Script tạm đã dọn, observer/consumer đã
kết thúc; không dừng các dịch vụ đang chạy. Chỉ thêm tài khoản/profile tổng hợp,
không có post mới từ bốn ca và không xóa dữ liệu cũ. Commit được báo ở phản hồi
cuối; không push/merge/triển khai. Phần còn thiếu: UI chờ người dùng và đánh giá
sản phẩm đối với hai sai lệch mô hình đã ghi nhận.

## Cập nhật AI thật, giữ Post PID 26776 — 13/11/2026

**API tích hợp với provider thật đã chạy, có bằng chứng cả cho qua/chặn. Chưa
nghiệm thu toàn luồng: UI chưa kiểm tra, V16–V19 thiếu fixture và có sai lệch
phân loại V12/V20.** Các mục sau đây là lịch sử, không thay thế kết quả mới.

- Checkout đầu phiên `feature/ai-post-moderation`, HEAD `7fba3fa`, working tree
  sạch; đã đọc acceptance-report, handoff và policy-and-cases, không tìm thấy
  AGENTS.md áp dụng. Không đổi nhánh/mã sản phẩm/cấu hình.
- Xác minh 8083 thuộc java PID **26776**, bắt đầu **15:34:37 +07**. Giữ nguyên
  process, không đọc env/command line/key, không dừng/restart hoặc chuyển stub.
- JWT thật qua Keycloak authorization code + PKCE cho tài khoản tổng hợp mới,
  profile sync 200/1000. Không thay client/realm hoặc đọc key OpenAI.
- `node post/post/target/task08-openai-check.cjs` exit 0,
  **15:40:32–15:41:20 +07**, run ID `MARKIEOPENAI1794559232222`. Script tạm đã dọn,
  không commit script/credential/token/raw provider response. Không có server
  stub trong script; tất cả request tạo bài qua Gateway tới process đang chạy.

### Kết quả hiện tại

| Nhóm | Kết quả |
|---|---|
| V01–V11, V13–V14, nguyên văn Task 01 | 13 ca 200/1000, mỗi ca 1 bài/1 Kafka event, content nguyên vẹn |
| V12, kỳ vọng cho qua | **422/1015**, 0 bài/0 event; dấu hiệu **chặn nhầm** |
| V15, fixture đe dọa tổng hợp mới | **422/1015**, 0 bài/0 event; đúng kỳ vọng |
| V20, fixture V15 bỏ dấu | **200/1000**, 1 bài/1 event; dấu hiệu **cho qua nhầm** |
| V16–V19 | Chưa chạy: chưa có fixture cụ thể; không gửi placeholder |
| Tổng dữ liệu/event/search | 14 bài MongoDB, 14 event Kafka, 14 bài đúng content/postId trong my-posts và search |
| Lỗi kỹ thuật provider trong 16 ca | 0; không coi service chỉ khởi động thành công là bằng chứng |

Đã kiểm tra trực tiếp MongoDB và console consumer Kafka, lọc tài khoản thử trong
bộ nhớ; không dùng search tức thì để suy ra không lưu, không in dữ liệu user khác.
PID 26776 có TCP HTTPS tới 172.66.0.243:443, trùng DNS api.openai.com lúc quan sát;
không thấy remote 18908 trong cửa sổ lấy mẫu. Metadata mạng + API decisions + mã
hiện tại bổ trợ lời gọi OpenAI thật, không bắt TLS payload/header/key.

Model mặc định repository `omni-moderation-latest`, nhưng không khẳng định model
override hoặc model ID upstream: API tạo bài không trả trường đó, không đọc
cấu hình runtime của PID. Hash/độ dài fixture V15/V20, bảng đủ 16 ca và giới hạn
bằng chứng có trong [acceptance-report.md](../acceptance-report.md). Không chép
hai câu nhạy cảm vào tài liệu. Không sửa policy để ép nhãn; đây là quan sát một
lần, không phải đánh giá toàn bộ ngôn ngữ hoặc 16/16 đúng ngữ nghĩa.

### Còn thiếu và bảo toàn môi trường

- UI chưa có kết quả nghiệm thu. Dùng checklist thủ công trong báo cáo; `[BLOCK]`
  không bảo đảm bị chặn khi đã dùng OpenAI thật. Không đổi endpoint/key để gây
  lỗi 1016 trên process người dùng; chứng cứ nhánh lỗi vẫn từ thử nghiệm stub cũ.
- V16–V19 cần mẫu tổng hợp phù hợp; cần xem xét chặn nhầm V12 và cho qua nhầm V20.
  Không thay thuật toán/model/ngưỡng/ngoại lệ trong phiên này.
- Giữ tài khoản/profile và 14 bài/event/search document tổng hợp mới, không xóa
  dữ liệu cũ hoặc gỡ bài V20 để làm kết quả đẹp hơn. Observer/consumer/script đã
  kết thúc, PID 26776 và các dịch vụ đang chạy được giữ nguyên.
- Chỉ cập nhật tài liệu; không chạy lại 96 unit/context test hoặc build/lint.
  Kết quả test lịch sử không được coi là vừa tái chạy. Commit hiện tại được báo
  ở phản hồi cuối; không push/merge/triển khai.

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
