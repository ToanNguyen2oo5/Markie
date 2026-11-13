# Báo cáo nghiệm thu Task 08

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
