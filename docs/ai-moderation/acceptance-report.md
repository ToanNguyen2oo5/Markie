# Báo cáo nghiệm thu Task 08

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
