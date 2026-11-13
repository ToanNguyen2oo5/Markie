# Báo cáo nghiệm thu Task 08

## Bài cũ và ma trận API bắt buộc đã bổ sung — từ `79d9d5d`

Ngày 13/11/2026 (Asia/Saigon), checkout đúng `feature/ai-post-moderation`, HEAD
đầu phiên `79d9d5d`, working tree sạch; đã đọc báo cáo/checklist và handoff trước
khi chạy. Không tìm thấy AGENTS.md áp dụng. **Chỉ thực hiện mục bắt buộc còn
thiếu**; không lặp U1–U5 hoặc ca AI thật V16–V19 và không mở rộng kiểm thử phụ.

### Trạng thái đã xác nhận

- **U1–U5 đạt theo người dùng**: chờ/khóa, chống gửi lặp, 422 giữ bản nháp và
  sửa/gửi lại; 503 giả lập trong tab giữ bản nháp, mở lại thao tác và thử lại
  nguyên nội dung thành công. Không đổi nguồn bằng chứng thành browser tự động.
- **V16–V19 hoàn tất**: cả bốn ca AI thật 422/1015, 0 bài/0 post event, fixture
  cố định và nhãn kỳ vọng chặn giữ nguyên. Không gọi lại AI để chọn kết quả.
- **V12 chặn nhầm, V20 cho qua nhầm giữ nguyên** là hạn chế mô hình so với nhãn
  người đánh giá; không phải lỗi chuyển HTTP hoặc kiểm soát save/event.

### Đọc bài cũ: đạt ở mức API với JWT thật

Chọn một bài trong database phát triển có `createdDate`
**31/10/2026 20:55:59.681 +07**, trước tích hợp moderation tại commit `b1f66fd`
(13/11/2026 13:56:23 +07). Truy vấn MongoDB chỉ đọc và giữ content/ID trong bộ nhớ,
không in hoặc đưa vào báo cáo. GET qua Gateway `/post/post/{postId}` với JWT
Keycloak hợp lệ trả **200/1000**, content khớp DB. Đọc lại DB sau GET: **toàn bộ
document không đổi**. Không POST lại bài hoặc gọi quy trình kiểm duyệt mới;
đường GET trong source không gọi ModerationService.

Đây là bằng chứng đọc **một bài cũ đại diện**, không phải duyệt lại toàn bộ bài
cũ hoặc kiểm tra render bài đó trong browser. Không thay dữ liệu cũ, không gán
trạng thái đã qua AI cho bài cũ. Mục Task 08 §3.5 đã có bằng chứng chức năng đọc.

### Bổ sung đúng biến thể API full stack còn thiếu: 10 ca đạt

Để giữ nguyên Post Service người dùng, chạy **instance test riêng cổng 18083**
từ classes hiện có, cấu hình key giả/base URL localhost:18909 chỉ trong process
test. Provider stub riêng chỉ nhận key giả; không gửi key thật tới stub. Database
test mới `markie_task08_missing_c732658583c345c781cba08228b7c3ca`; dùng MongoDB,
Kafka, Search/Elasticsearch, Profile và JWT Keycloak thật. Request trực tiếp vào
`http://localhost:18083/post/create`, **không đổi route Gateway hoặc process 8083**.
Không mock security/repository/KafkaTemplate hoặc thêm endpoint vào sản phẩm.

Lệnh script tạm `node post/post/target/task08-missing-check.cjs`, exit 0;
**18:32:37–18:32:59 +07**, run ID `MARKIEMISSING1794569557615`. Post test được
khởi động bằng `java -cp <classpath từ Surefire XML hiện có>
com.stewie.post.PostApplication --server.port=18083
--spring.data.mongodb.database=<DB test>` với biến môi trường key giả/model test/
base URL test trong shell con. Không in classpath/credential/key người dùng.

| Ca bổ sung | HTTP/code | Số gọi stub | DB / post event |
|---|---|---:|---:|
| Provider HTTP 401, body có flagged=false | 503/1016 | 1 | 0 / 0 |
| Provider HTTP 429, body có flagged=false | 503/1016 | 1 | 0 / 0 |
| JSON provider sai | 503/1016 | 1 | 0 / 0 |
| results rỗng | 503/1016 | 1 | 0 / 0 |
| flagged thiếu | 503/1016 | 1 | 0 / 0 |
| flagged null | 503/1016 | 1 | 0 / 0 |
| Content thiếu | 400/1017 | 0 | 0 / 0 |
| Content null | 400/1017 | 0 | 0 / 0 |
| Content rỗng | 400/1017 | 0 | 0 / 0 |
| Đúng 500 ASCII, provider false | 200/1000 | 1 | 1 / 1 |

Trong chín ca từ chối, DB test theo tài khoản thử vẫn 0 bài. Cuối lượt chỉ có
1 bài đúng 500 ký tự; input stub/response/save/event giữ nguyên. Console consumer
đọc được topic và lọc user tổng hợp trong bộ nhớ: đúng **1 event**, postId/content
khớp bài 500; không có event khác của user đó. Bài này đã có trong Elasticsearch
với đúng postId/content, vòng poll sau bộ request mất 42 ms (không phải latency
toàn trình). Không suy từ search tức thì ra không lưu. Các ca false/true/timeout/
HTTP500/flagged chuỗi/whitespace/quá dài đã có full stack ở các phiên trước;
không lặp lại các ca đã đủ bằng chứng.

Script/stub tạm đã dọn, không commit mã stub; kết quả phiên này không phải bộ
test mới có thể chạy lại từ commit. Giữ DB/account/profile và 1 bài/event/search
document tổng hợp mới, không drop/reset dữ liệu. Đã dừng **chỉ instance test do
phiên này tạo**; cổng 18083 và 18909 đóng. PID **26776**, thời điểm bắt đầu
15:34:37 +07 và cổng 8083 được giữ nguyên; không đọc key/env/command line hoặc
đổi endpoint/config tiến trình người dùng.

### Chỉ còn UI 500/501 chờ bằng chứng bắt buộc

Thử Chrome phiên này vẫn `The browser access host is unavailable`. Đã gửi người
dùng hai bước cụ thể và thêm [U6 trong checklist](ui-manual-checklist.md):
501/500 phải khóa Đăng, không request/không thêm feed; giảm còn 500/500 phải mở
Đăng và thử gửi đúng một lần, ghi kết quả API/UI thực tế. **Chưa nhận phản hồi,
không đánh dấu UI 500/501 đạt**. API 500 ở instance test không thay thế browser.

**Kết luận:** tích hợp backend đã có bằng chứng ba luồng đạt/chặn/lỗi, validation
và các biến thể bắt buộc còn thiếu đã bổ sung; đọc bài cũ đạt ở mức API. UI
U1–U5 đạt theo kiểm thử người dùng; **chưa chốt toàn bộ nghiệm thu Task 08 đạt chỉ
vì U6 500/501 chưa có xác nhận UI**. Hạn chế mô hình V12/V20 vẫn giữ nguyên,
không tự đổi policy hoặc tạo cổng “mọi mẫu phải đúng” cho nghiệm thu tích hợp.

UI mất mạng/response sai, refresh token lỗi riêng, emoji 250/251 vẫn chưa có
browser evidence nhưng là **ca phụ**, không thực hiện hoặc nâng thành điều kiện
mới trong phiên này. Không yêu cầu thêm pin model/browser/thiết bị/tải. Không
sửa mã sản phẩm, không chạy lại unit/build/lint; kết quả 96/96 và build/lint ở
lịch sử không bị mô tả là vừa chạy lại. Diff được kiểm tra trước commit; không
push/merge/triển khai. Các mục thiếu đã được giải quyết bên dưới nay là lịch sử.

## U5 được người dùng xác nhận — tiếp tục từ `e82358c`

Ngày 13/11/2026 (Asia/Saigon), đúng nhánh `feature/ai-post-moderation`, HEAD đầu
phiên `e82358c`, working tree sạch. Người dùng xác nhận các bước U5 đúng mô tả:
thông báo 1016, giữ modal/nội dung, hết chờ và mở lại thao tác, không thêm bài ở
lần lỗi; sau đó **không sửa nội dung, bấm Đăng lại thành công**.

**U5 đạt theo kiểm thử UI thủ công của người dùng.** Giữ nguyên bản nháp và gửi
lại sau 503/1016 là hành vi đúng: lỗi kỹ thuật không phải quyết định nội dung bị
cấm. Giả lập trong tab tự gỡ sau lần lỗi; lần thử lại đi qua backend/provider
thật. Không cần sửa content để cho phép thử lại, không phải bypass moderation.
Không coi phản hồi 503 mô phỏng là lỗi backend thật, không có raw response/HAR
mới và agent không tự điều khiển được browser.

U1–U5 đã có xác nhận UI thủ công. **Chưa chốt toàn bộ Task 08 đạt**: còn UI nội
dung dài 500/501, đọc bài cũ và các biến thể ma trận API full stack đã liệt kê
ở mục dưới. Ca phụ vẫn chỉ là ca phụ, không thêm điều kiện nghiệm thu mới.
V16–V19 đã hoàn tất; V12 chặn nhầm/V20 cho qua nhầm giữ nguyên là hạn chế mô hình,
không thay chính sách hoặc coi lần thử lại U5 là sửa được hai sai lệch này.

Chỉ cập nhật tài liệu, không gọi lại API/AI/test/build. PID 26776 vẫn bắt đầu
15:34:37 +07; không đọc key/env/command line, restart/dừng hoặc đổi endpoint.
Không thay dữ liệu, push/merge/triển khai. Các mục “U5 chờ” dưới đây là lịch sử.

## Đối chiếu phạm vi và UI 503/1016 — tiếp tục từ `54f88e2`

Ngày 13/11/2026 (Asia/Saigon), checkout `feature/ai-post-moderation`, HEAD đầu
phiên `54f88e2`, working tree sạch. Đã đọc báo cáo/checklist, Task 08 và Task 07
để phân loại đúng phạm vi; không thêm điều kiện nghiệm thu ngoài yêu cầu gốc.

### Chính xác các bằng chứng còn thiếu

“Còn thiếu” dưới đây nói về **mức kiểm tra**, không khẳng định tính năng bị lỗi.
Các ca unit/slice hoặc socket với storage mock đã chạy không bị bỏ qua, nhưng
không được đổi nhãn thành kiểm thử hệ thống thật/browser.

| Ca | Phân loại và nguồn | Trạng thái hiện tại |
|---|---|---|
| UI API trả 503/code 1016: đúng thông báo, giữ modal/content, hết chờ, không thêm feed, thử lại được | **Bắt buộc**, Task 08 §3.3 và điều kiện ba luồng UI | **Chờ người dùng U5**; browser host vẫn unavailable |
| UI nội dung dài, giới hạn 500 | **Bắt buộc**, Task 08 §3.4 | Chưa xác nhận UI 500/501 ASCII; backend validation đã có unit và ca quá dài qua API thật |
| Đọc bài đã tồn tại trước tích hợp AI; không tuyên bố đã duyệt lại | **Bắt buộc**, Task 08 §3.5 | Chưa có kiểm tra bài cũ được ghi nhận; my-posts/search bài mới không thay thế mục này |
| Provider giả lập HTTP 401 và 429 qua backend + DB/event thật | **Bắt buộc trong ma trận API**, Task 08 §2 | Unit/socket-storage-mock đã có; chưa chạy hai biến thể với full stack. HTTP 500, timeout và quyết định true/false đã có full stack |
| Provider JSON sai, results rỗng, flagged thiếu/null qua backend + DB/event thật | **Bắt buộc trong ma trận API**, Task 08 §2 | Unit/socket-storage-mock đã có; full stack đã thử flagged sai kiểu chuỗi, chưa thử riêng các biến thể vừa liệt kê |
| Content thiếu/null/rỗng và đúng 500 được cho qua qua API + DB/event thật | **Bắt buộc trong ma trận API**, Task 08 §2 | Unit/slice/socket-storage-mock đã có; full stack đã thử whitespace và quá 500, chưa ghi nhận các biến thể vừa liệt kê |
| UI lỗi mạng và HTML/JSON response sai | **Ca phụ với nghiệm thu Task 08**; robustness được Task 07 nhắc | Chưa browser hiện tại; harness cũ đã dọn không là bằng chứng tái chạy. Không nâng thành cổng Task 08 mới |
| Refresh token lỗi riêng; UI 250/251 emoji | **Ca phụ** ngoài các tình huống Task 08 gọi tên riêng | Chưa browser hiện tại; UTF-16/backend đã có kiểm tra mức thấp hơn. Không thêm cổng nghiệm thu mới |

Các biến thể provider/validation còn thiếu cần môi trường test riêng hoặc chặn
request phía test; **không được đổi endpoint/key/restart PID 26776** để thực hiện.
Phiên này chỉ chuẩn bị UI 503/1016 theo yêu cầu, chưa chạy thêm ma trận backend
khác. Không yêu cầu bổ sung tải, thiết bị, trình duyệt khác, pin model snapshot
hay quy tắc phân loại mới để hoàn thành Task 08.

### UI 503/1016: hướng dẫn đã cung cấp, chưa có kết quả

Thử trực tiếp Chrome bằng công cụ `createBrowserTab` vẫn trả
`The browser access host is unavailable`, không có tab để agent thao tác.
Đã bổ sung [hướng dẫn U5 cụ thể](ui-manual-checklist.md#u5--http-503code-1016-giả-lập-trong-tab-đang-chờ-người-dùng)
và gửi yêu cầu kết quả bất đồng bộ cho người dùng.

Đoạn Console chỉ chặn POST cùng origin `/post/create` ở tab localhost:3000,
đợi 1,5 giây rồi trả `Response` HTTP 503/JSON code 1016 trong bộ nhớ. Không gửi
request tạo bài lỗi tới server, không đọc/log token/header/body; tự khôi phục
fetch sau response hoặc tối đa 2 phút. Vì thế **không có request 503 thật trong
Network và không có bằng chứng backend lỗi mới**. Lần thử lại sau tự gỡ đi qua
backend/provider thật và có thể lưu bài thử. Có lệnh khôi phục thủ công/tải lại
tab; không sửa ứng dụng, cấu hình, key hoặc process Post.

Thông báo mong đợi đối chiếu trực tiếp mã component/hợp đồng:
**“Chưa thể kiểm duyệt bài viết. Vui lòng thử lại sau.”** Người dùng cần xác nhận
giữ nguyên modal/content, giải phóng trạng thái chờ và khóa, feed không thêm bài,
có thể thử lại. **Chưa nhận kết quả tại thời điểm ghi báo cáo; U5 chưa đạt.**
Đoạn mã được trích từ tài liệu và `node --check` exit 0; đây chỉ là kiểm tra cú
pháp, không phải chạy UI hoặc assertion hành vi React.

### Kết luận và bảo toàn bằng chứng

V16–V19 **đã hoàn tất** ở phiên `cd3f88b`: bốn ca AI thật 422/1015, mỗi ca 0 bài
MongoDB/0 post event Kafka; fixture vẫn giữ nhãn chặn. Không còn thiếu các ca
này và không gọi lại AI trong phiên hiện tại. **V12 chặn nhầm và V20 cho qua
nhầm giữ nguyên**: đó là hạn chế phân loại của mô hình, không phải lỗi mapping
HTTP/save/event. Không đổi policy hoặc yêu cầu kết quả mô hình phải hoàn hảo như
một cổng nghiệm thu tích hợp mới.

U1–U4 đạt theo kiểm thử thủ công người dùng; backend luồng đạt/chặn/lỗi đã có
bằng chứng phân tầng từ các phiên trước. **Triển khai tích hợp đã có kiểm chứng
luồng chính, chưa chốt toàn bộ Task 08 đạt** vì các mục bắt buộc còn thiếu ở bảng
trên, đặc biệt U5 chưa nhận kết quả. Các ca phụ được ghi nhận trung thực nhưng
không dùng làm lý do kéo dài nghiệm thu sau khi các yêu cầu gốc đã hoàn tất.

Chỉ sửa tài liệu; không gọi thêm API/AI, không chạy lại unit/build/lint. PID
26776 vẫn bắt đầu 15:34:37 +07; không đọc key/env/command line, không restart,
dừng hoặc thay endpoint. Không thêm server stub vào ứng dụng/Git, không thay dữ
liệu. Kiểm tra cú pháp snippet và diff trước commit; không push/merge/triển khai.

## Người dùng xác nhận UI U1–U4 — tiếp tục từ `cd3f88b`

Ngày ghi nhận **13/11/2026 (Asia/Saigon)**. **U1–U4 đạt theo kiểm thử UI thủ công
của người dùng**, gồm trạng thái chờ/khóa thao tác, chống gửi lặp, bài bị chặn
giữ bản nháp và sửa/gửi lại thành công. Người dùng đã xác nhận riêng mở composer
lại thì nội dung trống. Không còn chờ kết quả của bốn mục này.

| Mục | Bằng chứng người dùng cung cấp |
|---|---|
| U1 | Xác nhận có “Đang kiểm duyệt…” và khóa textarea/nút Đăng/nút đóng/backdrop khi chờ |
| U2 | Xác nhận bấm nhanh nhiều lần chỉ 1 POST `/post/create` và feed thêm 1 bài |
| U3 | Với câu đe dọa tổng hợp tự thử: modal giữ nội dung, feed không có bài mới; DevTools xác nhận HTTP 422 và code 1015 |
| U4 | Sửa thành lời chào vô hại: đăng thành công, modal đóng; phản hồi bổ sung xác nhận mở lại composer nội dung trống |

Nguồn: hai phản hồi trực tiếp của người dùng trong chat. Không có screenshot/HAR
hoặc browser E2E tự động; agent vẫn không điều khiển được trình duyệt. Không
chép nội dung đe dọa vào báo cáo. Mẫu U3 do người dùng chọn, không coi là chạy
lại nguyên fixture V16–V19 hoặc bằng chứng thay đổi kết quả V12/V20. Response
thành công của lần gửi lại được xác nhận qua UI; không có raw response body mới
được cung cấp cho bước này.

**Phân loại hiện tại:** tích hợp backend với hạ tầng/provider thật đã có bằng
chứng và UI luồng chính U1–U4 đã được người dùng xác nhận. **Chưa chốt toàn bộ
nghiệm thu Task 08 đạt**: nhánh UI AI lỗi 503/1016 chưa được xác nhận, các nhánh
mạng/response sai/refresh token lỗi và biên độ dài còn thiếu kiểm tra UI. Các ca
backend/provider giả lập không thay thế bằng chứng UI cho những nhánh đó.
V12 chặn nhầm và V20 cho qua nhầm giữ nguyên như hạn chế mô hình, không gọi là
lỗi mapping tích hợp và không tự đổi policy để ép kết quả. Cần quyết định sản
phẩm riêng về hai sai lệch; không suy ra mọi nội dung tiếng Việt đều được phân
loại đúng từ U1–U4.

Checkout đầu phiên `feature/ai-post-moderation`, HEAD `cd3f88b`, working tree
sạch. Chỉ cập nhật tài liệu/checklist, không chạy thêm API hoặc gọi AI và không
chạy lại unit/context/build/lint. `git diff --check` trước commit đạt. PID 26776
vẫn có thời điểm bắt đầu **15:34:37 +07**, không đọc key/env/command line,
không restart/dừng/đổi provider hoặc thay dữ liệu. Không push/merge/triển khai.
Chi tiết các lượt kiểm thử trước được giữ ở phần lịch sử bên dưới.

## Hoàn tất V16–V19, UI chờ người dùng — tiếp tục từ `c1fe162`

**Đã chạy bổ sung V16–V19 với AI thật; cả bốn ca trả 422/1015, không lưu bài hoặc
phát post event. UI chưa nghiệm thu: Chrome vẫn bị chặn, đang chờ kết quả
checklist thủ công của người dùng. Giữ nguyên ghi nhận V12 chặn nhầm và V20
cho qua nhầm.** Các mục tiếp theo là lịch sử, không thay thế cập nhật này.

### Phạm vi và fixture bổ sung

Ngày 13/11/2026, checkout `feature/ai-post-moderation`, HEAD đầu phiên `c1fe162`,
working tree sạch. Đã đọc báo cáo/handoff Task 08 và định nghĩa V16–V19 trong
policy-and-cases; không có AGENTS.md áp dụng được tìm thấy trong repository hoặc
các thư mục cha. Không thay kỳ vọng, chính sách, thuật toán hoặc mã ứng dụng.

Bổ sung fixture có thể đọc lại từ commit tại
[vietnamese-acceptance-fixtures.json](../../post/post/src/test/resources/moderation/vietnamese-acceptance-fixtures.json).
File chỉ chứa mẫu tổng hợp cho nghiên cứu đánh giá, không có người thật/dữ liệu
cá nhân; không phải nội dung được tán thành hoặc khuyến nghị. V16 là quấy rối
nghiêm trọng người nhận hư cấu; V17 loại trừ theo tôn giáo, không chép lời miệt
thị chi tiết; V18 cổ vũ tự hại, không phương pháp; V19 mô tả lâm sàng hoạt động
tình dục giữa hai người 30 tuổi đồng thuận, không tường thuật kích dục. Bốn nhãn
kỳ vọng **chặn** được giữ từ Task 01, không chỉnh fixture sau khi thấy kết quả.
Không chép toàn văn mẫu nhạy cảm vào báo cáo/checklist.

### Tiến trình, lệnh và kết quả thực tế

Cổng 8083 vẫn thuộc **PID 26776**, java bắt đầu **15:34:37 +07**. Không đọc/in
key, không đọc env/command line của process, không restart/dừng hoặc đổi endpoint
về stub. Dùng Gateway/Profile/Keycloak/MongoDB/Kafka/Elasticsearch thật đang chạy.
JWT qua authorization code + PKCE, tài khoản tổng hợp mới; profile sync 200/1000.
Không sửa client/realm, không in token, cookie, mật khẩu hoặc raw provider response.

Lệnh `node post/post/target/task08-v16-v19-check.cjs`, exit 0, chạy
**15:51:33–15:51:53 +07**, run ID `MARKIEV16V191794559893967`.
Đây là script tạm gọi API, không có server stub; đã dọn sau kiểm tra. Fixture
JSON được giữ trong source để tái sử dụng; không tuyên bố script tạm còn có thể
chạy lại từ commit.

| ID | Kỳ vọng | HTTP/code | Thời gian API | MongoDB / post Kafka event |
|---|---|---|---:|---:|
| V16 | Chặn | 422/1015 | 711 ms | 0 / 0 |
| V17 | Chặn | 422/1015 | 454 ms | 0 / 0 |
| V18 | Chặn | 422/1015 | 540 ms | 0 / 0 |
| V19 | Chặn | 422/1015 | 515 ms | 0 / 0 |

Hash SHA-256 UTF-8 để đối chiếu đúng mẫu đã gửi, không phải placeholder nhóm:

| ID | Độ dài UTF-16 | SHA-256 |
|---|---:|---|
| V16 | 120 | `00d38c7636df69681735064643641f0711a708b834f5a666925cd217ef0b88f1` |
| V17 | 101 | `3336a1abe75a28af57e670f22b0529d8e98a1c5718c78ac2c3f2cacd8887aaa5` |
| V18 | 65 | `083387c5bf246fa639e8dd8e98551d715e871750aa10480c1178e62524205915` |
| V19 | 104 | `13360b8ea8635c5b14c368d2a0ad440d80ccaff7a9f15b3594db6b5c0cbfba5f` |

Truy vấn MongoDB trực tiếp theo tài khoản thử và exact-content từng fixture:
mỗi ca 0 bài, tổng tài khoản 0 bài. Console consumer Kafka thật đọc được topic
`post.sync.events` có các event hiện hữu, lọc tài khoản thử trong bộ nhớ: 0 event
cho từng ca và tổng 0. Đã chạy bước đọc bổ sung để phân biệt “topic đọc được,
user không có event” với lỗi công cụ/không đọc được topic. Elasticsearch posts
`_count` theo user thử cũng 0; không dùng việc chưa có kết quả search tức thì làm
bằng chứng duy nhất không lưu. Không in dữ liệu các tài khoản khác.

Quan sát metadata TCP PID 26776 trong 40 giây: HTTPS tới 172.66.0.243:443, trùng
DNS api.openai.com lúc kiểm tra; không thấy kết nối remote 18908 trong cửa sổ
lấy mẫu. Kết hợp đường gọi mã và API response hợp lệ, phù hợp với provider thật
theo cấu hình người dùng. Không đọc TLS payload/header/key. Model mặc định source
`omni-moderation-latest`; runtime override/model ID provider vẫn chưa được xác
minh độc lập vì API tạo bài không trả metadata này.

**Bốn ca mới đúng nhãn kỳ vọng, 0 lỗi kỹ thuật provider.** Cộng với phiên trước,
20 ID đã có quan sát thực tế qua hai lượt: 14 cho qua, 6 chặn. **V12 chặn nhầm,
V20 cho qua nhầm vẫn giữ nguyên**; không retry/chọn lại kết quả hoặc đổi nhãn.
Mapping HTTP/side effect tích hợp đúng không đồng nghĩa mô hình phân loại hoàn
hảo. Một mẫu mỗi nhóm và model snapshot chưa xác minh không đủ suy rộng tỷ lệ
chất lượng cho mọi nội dung tiếng Việt.

### UI: đang chờ, không đánh dấu đạt

Đã gọi trực tiếp công cụ `createBrowserTab("chrome", "http://localhost:3000", ...)`
phiên này; lỗi **`The browser access host is unavailable`**, chưa có trang/tab để
thao tác. Đã gửi người dùng checklist qua công cụ hỏi bất đồng bộ; chưa nhận
kết quả tại thời điểm cập nhật này. Không coi API hoặc fixture mới là bằng chứng UI.

[Checklist ngắn U1–U4](ui-manual-checklist.md) yêu cầu:

1. Thấy trạng thái chờ và khóa textarea/Đăng/đóng/backdrop trong request.
2. Bấm nhanh nhiều lần chỉ có 1 request và 1 bài được thêm.
3. Thực sự nhận 422/1015 thì giữ modal/nội dung, không thêm bài vào feed.
4. Sửa bản nháp thành lời chào và gửi lại thành công; mở composer lại trống.

Nếu quá nhanh để quan sát hoặc chưa có response bị chặn thì ghi chưa thử, không
suy ra đạt. Không đổi key/endpoint hoặc tạo lỗi trên process người dùng. Chỉ cập
nhật UI thành đạt **sau khi nhận và rà soát kết quả người dùng**; còn chờ cả U1–U4.

### Bàn giao và dọn môi trường

Chỉ cập nhật fixture test JSON và tài liệu; không sửa Java/frontend/config,
không chạy lại unit/context suite/build/lint vì không đổi logic ứng dụng. 96/96
vẫn là kết quả lịch sử, không phải vừa chạy lại. Kiểm tra JSON, nhãn/kích thước
fixture, đối chiếu hash và `git diff --check` được thực hiện trước commit.

Script kiểm tra/đọc bổ sung và observer đã kết thúc, source script tạm đã dọn.
Giữ tài khoản/profile tổng hợp mới; không có bài mới từ bốn ca này, không xóa
hoặc reset dữ liệu cũ. Giữ nguyên PID 26776 và dịch vụ người dùng để tiếp tục thử
UI. Không push/merge/triển khai. **Kết luận vẫn chưa nghiệm thu toàn luồng**:
UI đang chờ bằng chứng, và hai sai lệch mô hình cần người phụ trách xem xét.

## Cập nhật AI thật trên Post PID 26776 — 13/11/2026

**Đã kiểm tra API với JWT, MongoDB/Kafka/search thật và lời gọi kiểm duyệt qua
Post Service do người dùng cấu hình key. Chưa nghiệm thu toàn luồng: UI chưa
được kiểm tra, V16–V19 chưa có fixture cụ thể, và có cả chặn nhầm/cho qua nhầm
trong bộ ca đã chạy.** Các mục tiếp theo là lịch sử các phiên trước.

### Bảo toàn tiến trình và thông tin xác thực

- Nhánh `feature/ai-post-moderation`, HEAD đầu phiên `7fba3fa`, working tree sạch;
  đã đọc báo cáo, handoff, policy-and-cases và hướng dẫn áp dụng; không tìm thấy
  AGENTS.md trong repository hoặc các thư mục cha. Không thay mã sản phẩm.
- Xác minh cổng 8083 có OwningProcess **26776**, process java bắt đầu lúc
  **15:34:37 +07**. Không dừng/restart tiến trình, không đọc command line/env/key
  của nó, không ghi đè key/base URL/model và không chuyển về stub.
- Gateway/Profile/Search/frontend và hạ tầng đang có sẵn được giữ nguyên. Stub
  từ phiên chạy thủ công còn cổng 18908, nhưng script phiên này **không gọi stub**
  hoặc gửi key thật tới đó.
- Tạo một tài khoản tổng hợp mới; JWT thật từ Keycloak qua authorization code +
  PKCE của markie_webapp, profile sync 200/1000. Không thay client/realm, không bật
  direct grants. Mật khẩu ngẫu nhiên/JWT/cookie/code xác thực chỉ trong bộ nhớ,
  không in hoặc đưa vào báo cáo/Git. Không truy cập API key OpenAI.

### Thực thi và bằng chứng gọi AI

Lệnh từ gốc repository: `node post/post/target/task08-openai-check.cjs`, chạy
**15:40:32–15:41:20 +07**, exit 0. Run ID tổng hợp
`MARKIEOPENAI1794559232222`. Script tạm không có server stub, chỉ gọi API hiện có,
đọc DB/event/search; đã dọn sau khi lấy kết quả. Bảng kết quả dưới đây là bằng
chứng phiên này, không biến script đã dọn thành bộ test có thể chạy lại từ commit.

Không dùng việc service khởi động thành công để kết luận key hoạt động. Thực tế:

- POST qua Gateway `http://localhost:8888/post/create` với JWT hợp lệ đã nhận
  200/1000 và 422/1015; mã nguồn hiện tại chỉ sinh các nhánh này sau khi đọc
  flagged boolean hợp lệ. **16 quyết định, 0 lỗi 503/1016 hoặc HTTP bất ngờ.**
- Quan sát chỉ metadata TCP của PID 26776 trong khoảng 55 giây bao trùm request:
  có kết nối remote **172.66.0.243:443**; DNS api.openai.com lúc kiểm tra trả về
  địa chỉ này (và 162.159.140.245). Không quan sát thấy remote port 18908 của PID
  đó trong khoảng lấy mẫu. Không đọc header, TLS payload hoặc key. Metadata TCP
  là bằng chứng bổ trợ đường ra HTTPS, không phải bản ghi HTTP upstream.
- Kết hợp kết quả API, đường gọi trong mã và metadata mạng phù hợp với việc
  Post gọi provider OpenAI thật theo cấu hình người dùng. Không có lỗi kỹ thuật
  cần suy đoán là key sai/quota lỗi. Không đọc/in raw response OpenAI.
- Model mặc định trong cấu hình repository là `omni-moderation-latest`.
  **Chưa xác minh độc lập model override của process hoặc model snapshot trả về**:
  API tạo bài không trả metadata provider, và phiên này không đọc cấu hình/key
  runtime. Không trình bày tên mặc định như thể đã thu được model ID upstream.

### Bộ ca tiếng Việt: kết quả quan sát một lần

V01–V14 dùng **nguyên văn fixture Task 01**, không thêm marker vào content để tránh
đổi ngữ cảnh. Tài khoản tổng hợp riêng giúp lọc dữ liệu/event mà không sửa câu.
V15 dùng một câu đe dọa trực tiếp tổng hợp, không danh tính thật/hướng dẫn gây hại;
V20 là cùng câu bỏ dấu tiếng Việt, giữ nguyên nghĩa. Không chép hai câu này vào
báo cáo. Hash SHA-256 UTF-8 để đối chiếu fixture:

- V15: `c8ee5f0dd2cc83e527fb05e1c9b361288526ecef2367972c553d3f33030fa707`.
- V20: `34daa34a507eb0b59ba5c083f5af8a8ceb67a7fac08896e92b5740bd8b4bbe3a`.
- Mỗi fixture mới dài 28 đơn vị UTF-16. Đây là fixture phiên nghiệm thu bổ sung,
  không phải câu đã có sẵn ở các placeholder V15/V20 trong tài liệu Task 01.

| ID | Nhãn kỳ vọng | HTTP/code thực tế | MongoDB / Kafka | Đánh giá |
|---|---|---|---|---|
| V01 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V02 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V03 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V04 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V05 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V06 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V07 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V08 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V09 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V10 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V11 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V12 | Cho qua | **422/1015** | **0 / 0** | **Dấu hiệu chặn nhầm**: fixture tường thuật không cổ vũ bạo lực |
| V13 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V14 | Cho qua | 200/1000 | 1 / 1 | Đúng kỳ vọng |
| V15 | Chặn | **422/1015** | **0 / 0** | Đúng kỳ vọng với fixture mới |
| V20 | Chặn như V15 | **200/1000** | **1 / 1** | **Dấu hiệu cho qua nhầm** ở biến thể không dấu |
| V16–V19 | Chặn (nhãn nhóm) | Chưa chạy | Không áp dụng | Task 01 chưa có mẫu cụ thể; không gửi placeholder như mẫu thật |

Tổng: **16 ca thực thi, 14 cho qua, 2 chặn, 0 lỗi kỹ thuật; 1 chặn nhầm và 1 cho
qua nhầm so với nhãn đánh giá**. Không suy rộng chất lượng mô hình từ mẫu nhỏ,
không báo 16/16 đúng ngữ nghĩa. Ứng dụng vẫn tuân thủ hợp đồng flagged của
provider; đây là khác biệt giữa mapping tích hợp đúng và chất lượng phân loại.
Không retry để chọn kết quả mong muốn, không đổi policy/model/ngưỡng/ngoại lệ.

### Đối chiếu dữ liệu, sự kiện và search

- Truy vấn MongoDB trực tiếp theo user_id của **tài khoản tổng hợp mới** và
  exact-content từng ca: đúng 14 bài; V12/V15 mỗi ca 0 bản ghi. Không dựa vào
  tìm kiếm tức thì để kết luận không lưu.
- Đọc topic `post.sync.events` thật bằng Bitnami console consumer từ đầu, timeout
  5 giây; chỉ lọc trong bộ nhớ các event của user thử: **14 event**, mỗi bài đạt
  đúng 1 event có cùng postId/content; V12/V15 **0 event**. Không in event hoặc
  dữ liệu của tài khoản khác.
- Cả 14 bài đạt có content nguyên văn trong response tạo bài, MongoDB, event,
  `/post/my-posts` và Elasticsearch `_doc/<postId>`. Search API qua Gateway trả
  200 và tìm được đúng postId từng bài. Không quan sát được raw input provider
  ở mạng HTTPS; việc gửi nguyên content tới provider đã có source/unit test
  phiên trước, không được mô tả như đã bắt payload OpenAI phiên này.
- Poll Elasticsearch tối đa 30 giây, thực tế tất cả đã có khi kiểm tra, vòng
  đối chiếu hoàn tất trong 375 ms sau bộ request. Đây không phải độ trễ Kafka
  toàn trình. Thời gian request API 394–1614 ms trong 16 mẫu, không là cam kết SLA.
- Giữ lại tài khoản/profile và 14 bài/event/search document **tổng hợp mới** để
  kiểm tra; không xóa/reset hoặc chỉnh dữ liệu có sẵn. V20 được lưu vì provider
  cho qua, không tự gỡ bài để làm kết quả đánh giá đẹp hơn.

### Phần còn thiếu và trạng thái bàn giao

UI **chưa được kiểm tra trong phiên này**; người dùng chưa cung cấp kết quả
checklist thủ công, và các lần thử công cụ browser trước đều bị host unavailable.
Giữ checklist bên dưới để thử success/1015/1016, bản nháp/sửa/gửi lại, khóa thao
tác/chống gửi lặp, refresh token và biên UTF-16. Với provider thật, chuỗi `[BLOCK]`
không còn là điều kiện giả lập bảo đảm bị chặn; không dùng quy tắc stub để kết
luận chất lượng OpenAI. Không cố gây lỗi OpenAI bằng thay key/endpoint của PID
26776 để thử 1016; bằng chứng lỗi kỹ thuật từ các phiên stub vẫn được phân tầng.

V16–V19 cần fixture tổng hợp cụ thể, phù hợp để đánh giá thêm. Chưa có model ID
upstream để ghim snapshot, và hai sai lệch V12/V20 cần được người phụ trách sản
phẩm xem xét; không tự sửa chính sách nhằm ép nhãn. Chưa tuyên bố nghiệm thu
toàn luồng hoặc chất lượng kiểm duyệt mọi nội dung tiếng Việt đạt.

Không sửa Java/frontend/config; không chạy lại suite 96 test/build/lint vì phiên
này chỉ cập nhật tài liệu. Các kết quả đó vẫn thuộc lần kiểm tra `7fba3fa` ở phần
lịch sử, không phải test vừa chạy lại. Script tạm đã dọn, observer TCP/consumer
đã kết thúc; không tạo hay thay tiến trình Post. PID 26776 và thời điểm bắt đầu
được xác minh lại cuối phiên, giữ nguyên dịch vụ hiện có để người dùng thử UI.
Không push/merge/triển khai. Commit cập nhật tài liệu được nêu trong phản hồi cuối.

## Cập nhật tiếp tục từ `191c2f3` — 13/11/2026

**Kết luận hiện tại: đã sửa lỗi khởi động MongoDB và kiểm tra tích hợp backend
với hạ tầng thật/provider giả lập; chưa nghiệm thu toàn luồng vì thiếu UI và AI
thật.** Phần lịch sử phía dưới mô tả phiên trước, không phải trạng thái hiện tại.

Checkout xác minh tại repository Markie, nhánh `feature/ai-post-moderation`, HEAD
đầu phiên `191c2f3`, working tree sạch; không có AGENTS.md áp dụng được tìm thấy
trong repository hoặc các thư mục cha. Không đổi nhánh, reset hoặc ghi đè thay đổi.
Môi trường vẫn JDK 21.0.12.1, Maven 3.9.16 cache, Node 24.22.0/npm 11.19.1.
Docker đọc được bằng quyền bổ sung: MongoDB, Keycloak, Neo4j, Redis, Kafka,
Elasticsearch, Kibana đang chạy. Không tạo lại/restart/reset container.

### Nguyên nhân và sửa MongoDB

- Tái hiện bằng Maven `-Dtest=PostApplicationTests test`, key giả và base URL
  `http://127.0.0.1:1`: exit 1, 1 test/1 error, kết thúc 14:38:03 +07.
- Đã đọc chuỗi exception đầy đủ: CommentController → CommentService →
  CommentRepository → MongoTemplate → MongoPersistentEntityIndexCreator →
  DefaultIndexOperations.ensureIndex → driver CreateIndexesOperation → E11000.
  Đây là thao tác **createIndexes lúc khởi tạo context**, không phải insert bài
  hoặc lỗi provider AI. Test cũ dùng application.yaml trực tiếp, tức DB phát triển.
- Đích: database `post-service`, collection `likes`, index định tạo
  `uniq_post_user_like`, unique `{post_id:1,user_id:1}`. Truy vấn chỉ đọc cho thấy
  2 bản ghi đều có `target_type/target_id/user_id/created_at`, đều thiếu `post_id`.
  Nhóm theo `(post_id,user_id)` có 1 nhóm trùng. Trước sửa chỉ có `_id_`,
  `uniq_target_user_like` (unique target_type/target_id/user_id), `idx_target_recent`;
  chưa có `uniq_post_user_like`. Không xuất ID, nội dung hay giá trị user_id.
- Nguyên nhân: schema dữ liệu `target_*` và khai báo index schema `post_id` không
  tương thích; missing post_id được tính như null trong index unique. Đối chiếu
  [MongoDB unique indexes](https://www.mongodb.com/docs/manual/core/index-unique/)
  và [partial indexes](https://www.mongodb.com/docs/manual/core/index-partial/).
- `git show 85957fe:post/post/src/main/java/com/stewie/post/entity/Like.java`
  có cùng khai báo gây lỗi; Like.java không bị các task AI sửa trước phiên này.
  Có schema target_* trong commit `b949c10` ở nhánh lịch sử khác, nhưng commit đó
  **không phải ancestor** của baseline. Chỉ kết luận bất tương thích có sẵn trước
  AI; không kết luận ai/tiến trình nào đã tạo dữ liệu hiện tại.
- Sửa nhỏ trong `Like.java`: giữ tên/keys/unique của index, thêm
  `partialFilter = "{'post_id': {'$exists': true}}"`. Ràng buộc post-like áp dụng
  cho bản ghi có post_id; bản ghi target_* tiếp tục do unique index hiện có quản
  lý. Không cherry-pick tính năng like từ nhánh khác, không đổi policy moderation.
- Không xóa/drop/sửa dữ liệu hoặc index. Post khởi động thật trên **cùng DB phát
  triển** sau sửa, Tomcat 8083 `/post` lúc 14:40:44 +07. Kiểm tra lại: vẫn 2 likes,
  ba index cũ giữ nguyên, thêm partial unique index đúng cấu hình. Vì vậy không
  chỉ đổi DB test để che lỗi khởi động thực tế.
- Sửa `PostApplicationTests`: contextLoads giữ nguyên và thêm assertion tên DB;
  dùng DB ngẫu nhiên `markie_context_test_<uuid>` với MongoDB thật, seed hai tài
  liệu target_* tổng hợp trước khi context tạo index. Thêm test partial filter,
  chấp nhận hai post khác nhau và từ chối duplicate `(post_id,user_id)`. Key giả
  và URL localhost chỉ trong test; không gọi provider. Không mock MongoTemplate,
  không disable test hoặc auto-index. DB test không bị drop, chỉ chứa dữ liệu giả.

Giới hạn sửa: hỗ trợ **khởi động và ràng buộc index post_id** khi collection có
schema khác; không phải triển khai đầy đủ thao tác like cho cả hai schema. Checkout
hiện không có luồng ghi Like. Index unique target_* vẫn có thể ràng buộc các lần
ghi legacy post_id nếu sau này thêm tính năng like; cần thiết kế/migration riêng
trước khi mở tính năng đó. Nếu môi trường khác đã có index non-partial cùng tên,
phải lập phương án chuyển index được duyệt; bản sửa không tự drop/rebuild index.

### Lệnh và kết quả phiên tiếp tục

Dùng `$env:JAVA_HOME` và `$taskMaven` theo đoạn lệnh lịch sử bên dưới, từ `post/post`:

```powershell
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" clean test
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" '-Dtest=PostServiceTest,ModerationClientTest,ModerationServiceTest,ModerationConfigurationTest,PostRequestValidationTest,PostControllerValidationTest,GlobalExceptionHandlerTest' test
```

| Kiểm tra hiện tại | Kết quả thực tế |
|---|---|
| Full suite clean compile sau sửa, 14:40:12 +07 | Exit 0, **96 test**, 0 failure/error/skipped: 94 nghiệp vụ + 2 context/index; đối chiếu Surefire XML |
| Full suite trên mã test cuối, 14:50:28 +07 | Exit 0, **96/96**, 0 failure/error/skipped; test đọc URI mặc định từ YAML có sẵn, không lặp credential trong source |
| Chạy lại riêng bộ liên quan sau sửa, 14:46:32 +07 | Exit 0, **94/94**, 0 failure/error/skipped |
| Frontend `npm.cmd run build`, `npm.cmd run lint` | Cả hai exit 0; build còn warning chunk JS 584.36 kB; lint không in warning |
| Post với application.yaml phát triển | Khởi động thành công, không E11000 |
| Gateway/Profile/Search `spring-boot:run` | Khởi động thành công bằng Maven offline/cache với quyền đọc bổ sung |

Các lần compile Gateway/Search ban đầu trong sandbox không đọc được JAR
spring-security-crypto; chạy lại có quyền đọc cache đã khởi động được. Không đổi
dependency để bỏ lỗi. Cảnh báo Neo4j về thuộc tính chưa tồn tại trên fixture mới
không chặn profile sync. Không sửa các cảnh báo ngoài phạm vi.

Full context hiện cần MongoDB thật và Keycloak/discovery của cấu hình hiện có.
Có thể đặt `MARKIE_TEST_MONGODB_URI` cho Mongo test server khác; test luôn chọn
database mới ngẫu nhiên, không seed vào database của URI. Không tự dọn/drop các
DB test theo yêu cầu bảo toàn dữ liệu. 94 unit/slice/service test vẫn không cần
hạ tầng ngoài hoặc key thật.

### API tích hợp trên hệ thống thật — provider vẫn giả lập

Đã chạy script tạm `node .task08-real.cjs` (exit 0) lúc khoảng 14:43–14:45 +07.
Script/stub không commit, đã dọn; đây là bằng chứng thực thi phiên này, không là
bộ test tái chạy được từ commit. Marker tổng hợp: `MARKIEACCEPT1794555829679`.

Keycloak thật cấp JWT qua authorization code + PKCE của `markie_webapp` cho tài
khoản tổng hợp mới; mật khẩu tạo ngẫu nhiên và token chỉ ở bộ nhớ, không lưu/
in/commit. Không bật direct grants, không sửa realm/client/roles hoặc dùng JWT
giả. Profile sync qua Gateway trả 200/1000. Request không JWT trực tiếp đến Post
trả 401 và không gọi provider.

Post thật dùng key giả, base URL `http://127.0.0.1:18908`; server stub riêng bind
localhost và chỉ nhận đúng Bearer key giả. MongoDB/Kafka/Profile/Search/Gateway/
Keycloak/Elasticsearch thật, không mock repository/event/security. Timeout runtime
giữ read timeout 5000 ms; stub chờ 6500 ms ở ca timeout.

| Ca HTTP qua Gateway `localhost:8888/post/create` | HTTP/code | Provider | MongoDB exact-content |
|---|---|---:|---:|
| false, tiếng Việt/emoji/newline/khoảng trắng giữ nguyên | 200/1000 | 1 | 1 |
| true | 422/1015 | 1 | 0 |
| HTTP 500, dù body có false | 503/1016 | 1 | 0 |
| flagged sai kiểu chuỗi | 503/1016 | 1 | 0 |
| read timeout thật | 503/1016 | 1 | 0 |
| chỉ whitespace | 400/1017 | 0 | 0 |
| quá 500 UTF-16 | 400/1018 | 0 | 0 |

Đối chiếu input stub, MongoDB và event Kafka: content giống nhau. `/post/my-posts`
trả đúng postId/nội dung bài đạt. Search qua Gateway HTTP 200 có đúng postId và
content; lần poll đầu thành công, mất 736 ms từ lúc bắt đầu truy vấn search sau
các ca API, **không phải số đo toàn bộ độ trễ Kafka**. Giới hạn poll 30 giây.

Đọc topic `post.sync.events` thật từ đầu bằng console consumer có timeout 5 giây,
lọc marker trong bộ nhớ: đúng **1 event**, content là ca cho qua; không có event
marker của ca chặn/lỗi/quá dài. Đọc bổ sung: **0 event** có content whitespace
invalid. Kết hợp truy vấn MongoDB trực tiếp và unit test không save/send; không
dựa vào tìm kiếm tức thì để kết luận “không lưu”. Đường dẫn tool đúng của image
là `/opt/bitnami/kafka/bin/kafka-console-consumer.sh`; thử `/opt/kafka/bin` không
đọc được và không được coi là bằng chứng event.

Chưa chạy toàn bộ biến thể provider của bảng Task 08 trên hệ thống thật (401/429,
mọi dạng results/flagged sai, biên 500/emoji); các ca đó còn do bộ test tự động
hiện có và thử nghiệm phiên trước bao phủ ở mức thấp hơn.

### UI, AI thật và phần còn thiếu

Inventory CUA đã gọi lại: `The browser access host is unavailable`, browsers rỗng;
native Cốc Cốc vẫn hiện diện. Phiên trước đã xác định native browser bị chặn vì
URL policy enforcement; không dùng đường khác để vượt chặn. **Chưa thao tác UI**.

Checklist thủ công sau khi khởi động frontend/backend trong môi trường test:

1. Đăng nhập tài khoản thử, mở DevTools Network lọc `/post/create`, mở composer.
2. Provider false: nhập marker riêng, bấm Đăng; khi chờ thấy “Đang kiểm duyệt…”,
   textarea/nút Đăng/nút đóng/backdrop bị khóa. Bấm nhanh nhiều lần: chỉ 1 request
   (cả lúc refresh token). Thành công thêm 1 bài, đóng modal; mở lại bản nháp rỗng.
3. Provider true: nhận 422/1015, modal và nội dung giữ nguyên; sửa nội dung, chuyển
   stub sang false, gửi lại thành công đúng 1 lần. Không có bài tạm trong feed.
4. Provider timeout/HTTP lỗi: 503/1016, giữ bản nháp, mở lại thao tác; thử lại khi
   provider phục hồi. Thử mạng lỗi/response sai và xác nhận không thêm bài.
5. Thử rỗng/whitespace, 500/501 ASCII và 250/251 emoji; kiểm tra giới hạn UTF-16.
   API trực tiếp vẫn trả validation, không gọi provider cho dữ liệu sai.
6. Đọc lại bài cũ, đối chiếu DB/Kafka/search cho marker mới; không coi bài cũ đã duyệt.

Chưa có key OpenAI thử nghiệm ở process/User/Machine, chỉ kiểm tra presence,
không gọi AI thật. Cấu hình tại máy bằng PowerShell trong **cùng phiên chạy Post**:

```powershell
$taskSecureKey = Read-Host 'OpenAI test key (không gửi vào chat)' -AsSecureString
$env:OPENAI_API_KEY = [Net.NetworkCredential]::new('', $taskSecureKey).Password
$env:OPENAI_MODERATION_BASE_URL = 'https://api.openai.com'
$env:OPENAI_MODERATION_MODEL = 'omni-moderation-latest'
# Từ post/post, với JAVA_HOME/Maven đã cấu hình:
& $taskMaven spring-boot:run
# Sau khi dừng service:
Remove-Item Env:OPENAI_API_KEY
Remove-Item Env:OPENAI_MODERATION_BASE_URL
Remove-Item Env:OPENAI_MODERATION_MODEL
Remove-Variable taskSecureKey
```

Không chạy stub trong phiên cấu hình key thật, không in key, không đặt key vào
frontend/.env/repo. Chạy V01–V14; V15–V20 cần fixture tổng hợp cụ thể trước.
Ghi model/ID ca/flagged/lỗi và chặn nhầm/cho qua nhầm; không đổi policy ép kết quả.

### Dọn môi trường, bàn giao hiện tại

Đã dừng cả bốn backend/Gateway do phiên này tạo; probe 8081/8083/8085/8888/18908
đều đóng. Stub tự đóng server/connections; script tạm đã dọn. Không đổi YAML,
biến môi trường bền vững, container, dữ liệu/index có sẵn. Giữ lại dữ liệu tổng
hợp mới: 1 tài khoản Keycloak, 1 profile, 1 post/event/search document và DB context
test có fixture; không tự xóa. Không commit log, token/key, mã stub hoặc dữ liệu.

File sửa hiện tại: Like.java, PostApplicationTests.java, README.md,
acceptance-report.md, handoffs/task-08.md. Commit bàn giao là commit chứa cập nhật
này, SHA được nêu ở phản hồi cuối; không push/merge/triển khai. E11000 đã giải
quyết trên môi trường này; phần còn thiếu là UI, AI thật và các biến thể API thật
đã liệt kê, không còn coi MongoDB là chặn hiện tại.

## Lịch sử: phiên Task 08 trước commit `191c2f3`

Ngày 13/11/2026, Asia/Saigon. Kết luận: **triển khai xong nhưng chưa nghiệm thu
toàn luồng**. Unit test/build đạt không thay thế kiểm thử JWT, MongoDB, Kafka,
search, UI và AI thật.

## Phiên bản và phạm vi sửa

- Repository `C:/Users/LMT/Documents/University/Nam4/N4_HK1/DACN/Markie`;
  nhánh trước/sau `feature/ai-post-moderation`; HEAD đầu phiên
  `7ee92d7` (Task 07). Working tree đầu phiên sạch. Không tạo nhánh mới.
- Mã backend được kiểm tra là mã tại `7ee92d7`, không sửa backend. Bản frontend
  được kiểm tra gồm mã đó và sửa import bên dưới. Commit bàn giao là commit
  chứa báo cáo này, tra bằng `git log -1 -- docs/ai-moderation/acceptance-report.md`.
- Đọc START-HERE, hợp đồng chung, Task 08, tất cả handoff Task 02–07,
  policy-and-cases, configuration và environment-report. Không tìm thấy
  `AGENTS.md` trong repository (kể cả file ẩn, ngoài Git/node_modules) hoặc các
  thư mục cha đến gốc ổ C.
- Sửa `web-app/src/pages/ProfilePage.tsx`: chỉ thêm `X, Check` vào import
  `@phosphor-icons/react`. Đây là lỗi có sẵn để mở đường nghiệm thu, không sửa UI
  Profile. Đối chiếu cách import trong CreatePostCard/CommentModal và export thực
  tế `dist/index.d.ts` của package đã cài; không đoán thư viện.
- README: thêm phạm vi, luồng, lỗi, cấu hình, cách chạy/test và giới hạn nghiệm thu.
  Configuration: bổ sung ghi chú phân biệt thời điểm Task 02 và trạng thái hiện tại.
  Tạo báo cáo này và `handoffs/task-08.md`.

## Môi trường đã kiểm tra

Windows/PowerShell; JDK Temurin 21.0.12.1; Maven cache 3.9.16;
Node v24.22.0; npm 11.19.1; Vite thực chạy v8.1.5. Dùng dependency đã cài/cache,
không nâng package hay sửa lockfile. `npm.ps1` bị execution policy chặn nên dùng
`npm.cmd`, không thay policy. Maven Wrapper có vấn đề đã ghi ở configuration;
phiên này dùng trực tiếp Maven cache, không tuyên bố đã kiểm tra lại Wrapper.

TCP probe 127.0.0.1, timeout 600 ms/cổng: 8280/27018/9094 mở;
3000/5173/8888/8083/8081/8085 đóng trước thử nghiệm. Cổng mở không chứng minh
dịch vụ sẵn sàng toàn phần. Docker CLI không trên PATH; đường dẫn Docker Desktop
bị sandbox từ chối đọc, chưa xác nhận danh sách/trạng thái container.
Không sửa hay khởi động lại container.

Không có `OPENAI_API_KEY` ở process/User/Machine (chỉ kiểm tra có/không,
không in giá trị). Không có key thử nghiệm hợp lệ được cấu hình để gọi AI thật.

## Lệnh và kết quả thực tế

Từ `post/post`, đặt JDK 21 và Maven cache trong phiên chạy lệnh:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$taskMaven = "$env:USERPROFILE\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd"
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" '-Dtest=PostServiceTest,ModerationClientTest,ModerationServiceTest,ModerationConfigurationTest,PostRequestValidationTest,PostControllerValidationTest,GlobalExceptionHandlerTest' test
# Full suite: chỉ trong process con, key giả và URL localhost không phục vụ AI.
$env:OPENAI_API_KEY = 'task08-fake-key-not-real'
$env:OPENAI_MODERATION_BASE_URL = 'http://127.0.0.1:1'
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" test
```

| Kiểm tra phiên này | Kết quả |
|---|---|
| Bộ liên quan, kết thúc 14:22:10 +07 | Exit 0; 94 test, 0 failure/error/skipped; dùng classes hiện có |
| Full suite, kết thúc 14:23:09 +07 | Exit 1; 95 test, 0 failure, 1 error, 0 skipped; 94 test nghiệp vụ đạt |
| `npm.cmd run build` trước sửa | Exit 1, TS2304 thiếu X tại dòng 522 và Check tại dòng 566 của ProfilePage |
| `npm.cmd run build` sau sửa | Exit 0, tsc và Vite build đạt; cảnh báo JS chunk 584.36 kB > 500 kB |
| `npm.cmd run lint` sau sửa | Exit 0; không có warning được in; hai warning cũ đã hết sau sửa import |
| Thử nghiệm socket độc lập, kết thúc 14:28:12 +07 | Exit 0; 19 test, 0 failure/error/skipped; phân loại riêng bên dưới |
| Bộ liên quan `clean test` sau dọn thử nghiệm, kết thúc 14:29:00 +07 | Exit 0; biên dịch lại 35 file main/8 file test; 94 test, 0 failure/error/skipped; đã đối chiếu XML |

Đối chiếu số thực tế qua Surefire XML, không chỉ dựa vào exit code.
Lệnh cuối dùng cùng selector như trên với goal `clean test` và quyền đọc Maven
cache bổ sung. Clean xóa artifact thử nghiệm tạm và báo cáo build cũ; báo cáo
Surefire cuối chỉ còn bảy lớp/94 test nghiệp vụ. Full suite thất bại vẫn được
ghi riêng ở đây, không đổi thành đạt vì lần chạy chọn lọc sau đó xanh.

| Lớp test trong repository | Số ca |
|---|---:|
| ModerationConfigurationTest (Task 02) | 15 |
| ModerationClientTest (Task 03) | 36 |
| ModerationServiceTest (Task 03) | 5 |
| PostRequestValidationTest (Task 04) | 9 |
| PostControllerValidationTest (Task 04/06) | 9 |
| GlobalExceptionHandlerTest (Task 06) | 15 |
| PostServiceTest (Task 05) | 5 |
| Tổng nghiệp vụ | 94 |
| PostApplicationTests.contextLoads | 1 error trong full suite |

Full context thất bại do MongoDB `E11000` khi tạo unique index
`uniq_post_user_like` trên collection `post-service.likes`, khóa trùng có
`post_id: null`. Không chép dữ liệu/định danh bản ghi vào báo cáo. Đây là chặn
đã gặp ở Task 00 và được tái hiện phiên này; không sửa dữ liệu, index hoặc tắt
auto-index để lấy kết quả xanh. Không xóa/bỏ qua/disable test context.

## Thử nghiệm provider HTTP riêng — không phải E2E

Đã chạy `Task08SocketExperimentTest` tạm bằng Maven với
`-Dtest=Task08SocketExperimentTest test`. Lần đầu lỗi testCompile vì sandbox không
đọc được JAR `spring-security-crypto-6.2.4.jar`, chưa chạy test; chạy lại với quyền
đọc dependency cache đạt 19/19. Server JDK HttpServer bind `127.0.0.1` cổng động,
riêng khỏi ứng dụng; key giả `task08-fake-key-not-real`, model test. Không gửi
request/key tới OpenAI. Client dùng ModerationConfiguration thật, connect/read
timeout test 500/300 ms.

Nối controller + Bean Validation + handler + PostService + ModerationService +
ModerationClient + RestClient/HTTP socket thật. Đầu vào API dùng MockMvc `/create`,
SecurityContext giả; **không có JWT/filter/Gateway/server Post đang chạy**.
PostRepository/ProfileClient/KafkaTemplate được mock, mapper MapStruct thật.

| Ca phiên này | Số | Kết quả quan sát |
|---|---:|---|
| false, chuỗi tiếng Việt/khoảng trắng/tab/newline/quote/backslash/emoji; đúng 500 ASCII | 2 | 200/1000; provider 1 lần trước save; save/send mỗi thứ 1 lần; input/save/event bằng nhau; kiểm tra method/path/model/Bearer key giả/Content-Type |
| true | 1 | 422/1015; provider 1 lần, không tương tác repo/Profile/Kafka |
| HTTP 401/429/500/503 dù body false | 4 | 503/1016; provider 1 lần, không tương tác repo/Profile/Kafka |
| JSON sai, thiếu results, results rỗng, thiếu/null/chuỗi flagged | 6 | 503/1016; provider 1 lần, không tương tác repo/Profile/Kafka |
| Read timeout: server đợi 1500 ms, client 300 ms | 1 | 503/1016; thời gian request nằm trong assertion 200–1400 ms; không tương tác repo/Profile/Kafka, không retry |
| Thiếu/null/rỗng/chỉ khoảng trắng | 4 | 400/1017; provider 0 lần, không tương tác repo/Profile/Kafka |
| 501 ASCII | 1 | 400/1018; provider 0 lần, không tương tác repo/Profile/Kafka |

Không dùng tìm kiếm tức thì để suy ra không lưu. Assertion không side effect ở
đây là trên mock, **chưa phải kiểm kê MongoDB hoặc topic Kafka thật**. Chưa đo
connect timeout trên socket; unit test hiện có dùng transport ném exception.

Mã thử nghiệm/stub tạm đã dọn theo yêu cầu không commit stub; server và executor
dừng trong teardown. Đây là quan sát một lần của phiên hiện tại, **không phải
bộ kiểm thử có thể chạy lại từ commit bàn giao** và không là căn cứ nghiệm thu
E2E. Bộ 94 test có source trong repository là bằng chứng có thể chạy lại.
Không dùng kết quả harness 14/14 của Task 07 để tuyên bố phiên này đạt UI.

## Trình duyệt, UI và AI thật

Đã gọi inventory CUA phiên này: browser host báo
`The browser access host is unavailable`, nhưng có cửa sổ Cốc Cốc native.
Đã thử chọn cửa sổ đó: Computer Use dừng vì chưa hỗ trợ browser URL policy
enforcement trên Windows browser hiện tại. Không tiếp tục thao tác UI hoặc tìm
cách vượt chặn. Do đó **chưa kiểm thử UI**, không kết luận trình duyệt vắng mặt
chỉ dựa vào báo cáo phiên trước.

Vite đã chạy thử localhost:3000, báo ready; sau đó dừng tiến trình do phiên này
tạo và probe lại cổng đóng. Chưa mở/quan sát được trang, chưa đăng nhập hay tạo
bài. Không có bài thử hoặc dữ liệu thật nào được ghi vào MongoDB bởi thử nghiệm.

AI thật: V01–V14 **chưa chạy vì thiếu key thử nghiệm được cấu hình**;
V15–V20 **chưa chạy, đồng thời Task 01 chưa có fixture cụ thể**. Không gửi các
mô tả trong ngoặc vuông như thể đó là mẫu gây hại. Chưa có số liệu chặn nhầm/
cho qua nhầm; không thay policy/model để ép kết quả.

## Các bước cần làm tiếp để nghiệm thu

1. Xử lý dữ liệu/index MongoDB theo phương án bảo toàn dữ liệu được duyệt;
   chạy lại full suite nguyên vẹn và khởi động Post. Không xóa/reset dữ liệu.
2. Chạy Profile/Gateway/Search và xác minh Kafka/Elasticsearch, tài khoản thử
   nghiệm/JWT hợp lệ. Không có credential thử nghiệm được cung cấp trong phiên
   này. Không coi TCP mở là xác thực tích hợp thành công.
3. Với stub riêng và key giả, đi qua API HTTP thật bằng token thử nghiệm. Chạy
   đầy đủ ma trận Task 08: false/true, timeout, HTTP 401/429/500, JSON/results/
   flagged sai, thiếu/null/rỗng/khoảng trắng, 500/501 và biên UTF-16. Mỗi ca dùng
   marker tổng hợp riêng; xác minh trực tiếp MongoDB, `/post/my-posts` và event
   Kafka. Ca đạt có một post/event, content giống input provider; chờ search tối
   đa 30 giây, poll 1 giây, đối chiếu postId. Ca chặn/lỗi không có record/event;
   kết hợp kiểm kê DB/event và unit test, không chỉ tìm kiếm tức thì. Giữ dữ liệu
   có sẵn; không reset/xóa để chạy test.
4. Trên trình duyệt được công cụ hỗ trợ hoặc do người dùng thao tác: thành công
   chỉ thêm một bài, modal đóng/xóa; 1015 giữ nội dung rồi sửa/gửi lại; 1016 giữ
   nội dung và thử lại; lỗi 1017/1018, mạng/response sai. Bấm nhanh nhiều lần
   trong refresh token/request; kiểm tra một request, textarea/nút đóng/backdrop
   bị khóa và nhãn “Đang kiểm duyệt…”. Mở lại modal, kiểm tra giới hạn độ dài.
   Đọc lại bài cũ; không gán nhãn đã duyệt cho bài cũ.
5. Cấu hình key thử nghiệm OpenAI ở backend ngoài chat/repo; khôi phục base URL
   OpenAI, chạy V01–V14 và chuẩn bị fixture tổng hợp thích hợp cho V15–V20.
   Ghi ngày/model yêu cầu/model trả về nếu có, ID ca/flagged/lỗi, chặn nhầm/cho
   qua nhầm; không lưu key/token/body đầy đủ. Không đổi chính sách để ép nhãn.
6. Khôi phục cấu hình tạm, dừng stub/tiến trình test; cập nhật báo cáo với bằng
   chứng rồi mới kết luận nghiệm thu đạt.

Không có thay đổi YAML/env bền vững, dependency, route, chính sách hay kiến trúc.
Không push/merge/triển khai. Các mục E2E và AI thật còn thiếu là điều kiện nghiệm
thu, không được coi là đã đạt bởi build hoặc mock.
