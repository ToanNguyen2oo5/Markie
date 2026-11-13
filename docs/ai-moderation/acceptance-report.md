# Báo cáo nghiệm thu Task 08

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
