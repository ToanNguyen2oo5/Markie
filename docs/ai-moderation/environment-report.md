# Task 00 — Báo cáo môi trường

Ngày kiểm tra: 13/11/2026, khoảng 13:00–13:05 (Asia/Saigon).

## Trạng thái bàn giao

**Còn thiếu: chưa đạt baseline toàn luồng.** Đã kiểm tra repository, công cụ, cấu hình, khởi động lại hạ tầng phát triển có sẵn, thử build và chạy test Post Service. Chưa đăng nhập, tạo bài, đọc bài hoặc xác minh đồng bộ tìm kiếm bằng request thực tế. Không triển khai AI và không thực hiện task tiếp theo.

## Repository và phạm vi thay đổi

- Repository: `https://github.com/ToanNguyen2oo5/Markie.git`.
- Nhánh: `main`; HEAD: `85957fe3542e551afa1054e6e958b24f4901f332`, đúng commit tham chiếu `85957fe`.
- Trước khi chạy: `git status --short` chỉ có `?? docs/`; danh sách chi tiết gồm 11 tài liệu giao việc `00` đến `10`. Không có thay đổi tracked. Đã giữ nguyên các tài liệu này.
- Không tìm thấy `AGENTS.md` trong repository (kể cả tìm file ẩn, loại `.git`/`node_modules`) hoặc các thư mục cha đã kiểm tra từ ổ C đến thư mục repository.
- Đã đọc ba tài liệu được giao, README gốc, README frontend, compose, cấu hình cả năm backend, Maven Wrapper/POM Post và mã nguồn luồng đăng bài/tìm kiếm.
- File tạo mới duy nhất: `docs/ai-moderation/environment-report.md`, để bàn giao kết quả. Không sửa source, dependency, lockfile hoặc cấu hình.
- Công cụ build/test tạo artifact trong `post/post/target` và có thể tạo artifact TypeScript trong frontend; đây không phải thay đổi mã nguồn. Không commit/push, không reset/xóa dữ liệu, không thay schema bằng thao tác thủ công, không dừng dịch vụ khác.

## Công cụ và kết quả lệnh thực tế

| Kiểm tra | Kết quả |
|---|---|
| `java -version` | Temurin OpenJDK `21.0.12.1+1-LTS`, 64 bit |
| `node --version` | `v24.22.0` |
| `npm.cmd --version` | `11.19.1` |
| `post/post/mvnw.cmd -version` (chạy trong `post/post`) | Exit 1: `Cannot index into a null array`, `Cannot start maven from wrapper` |
| Maven cache, gọi trực tiếp `bin/mvn.cmd -version` | Apache Maven `3.9.16`; ban đầu chọn Java `17.0.20.1` qua môi trường, khác `java` trên PATH |
| Maven với `JAVA_HOME` đặt riêng cho tiến trình về JDK 21 | Xác nhận dùng Java `21.0.12.1`; không sửa biến môi trường toàn máy |
| `docker --version`, `docker compose version`, `docker info`, `docker ps -a` qua PATH | Không tìm thấy lệnh `docker` |
| CLI Docker bằng đường dẫn thực, với quyền truy cập bổ sung | Docker `29.9.2`, Compose `v5.6.1`, engine `29.9.2` đang chạy |
| `npm.cmd ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000` trong `web-app` | Exit 1, `EUSAGE`: lockfile không đồng bộ theo npm hiện tại, thiếu `@emnapi/core@` và `@emnapi/runtime@`; có cảnh báo peer dependency. Chưa kết luận đây là lỗi trên mọi phiên bản npm. Không chuyển sang `npm install`, không tái tạo lockfile |
| `npm.cmd run build` trong `web-app` | Exit 1: không tìm thấy `tsc` sau khi cài dependency thất bại |
| Maven offline `-DskipTests package` | Exit 1; xem chi tiết bên dưới. Đây không phải kết quả test |
| Maven offline `test` | Exit 1: 1 test, 0 failure, 1 error, 0 skipped; `PostApplicationTests.contextLoads` không nạp được context |
| `git diff --exit-code` sau kiểm tra | Exit 0, không thay đổi file tracked |

Đường dẫn CLI Docker được xác định từ tiến trình Docker Desktop:
`C:\Users\LMT\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`.
Truy cập đường dẫn này trong sandbox ban đầu bị `Access is denied`; các lệnh Docker sau đó đã chạy được với quyền bổ sung. Docker Desktop có tiến trình chạy, không phải chưa cài Docker.

Maven Wrapper có `wrapperVersion=3.3.4`, distribution Maven `3.9.16`. Đoạn PowerShell trong `mvnw.cmd` truy cập `(Get-Item $MAVEN_M2_PATH).Target[0]`; lỗi null-array xuất hiện khi chạy wrapper trong môi trường này. Không sửa wrapper. Maven cache sẵn có được dùng thay thế:

```powershell
# Chạy trong post/post. Chỉ thay JAVA_HOME trong tiến trình hiện tại.
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$taskMaven = "$env:USERPROFILE\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd"
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" -DskipTests package
& $taskMaven -o -B "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" test
```

Lần gọi trực tiếp đầu tiên không chỉ định local repository bị lỗi tạo `C:\.m2\repository`. Sau khi chỉ định cache người dùng và JDK 21, lần chạy sandbox gặp lỗi đọc `spring-security-crypto-6.2.4.jar`. Chạy với quyền bổ sung đi qua compile/testCompile nhưng package thất bại tại `maven-jar-plugin:3.3.0` vì thiếu `org/apache/maven/archiver/MavenArchiveConfiguration`; có cảnh báo POM plugin không có trong cache. Không tuyên bố build package thành công; chưa thử tải bổ sung dependency qua mạng. Lần compile kế tiếp báo lớp đã cập nhật, nên đây cũng không phải bằng chứng cho một build sạch từ đầu.

## Cấu hình và hạ tầng

Compose chỉ chứa Kafka, Redis, Elasticsearch, Kibana. MongoDB, Neo4j, Keycloak có container riêng đúng nhóm Markie; đã kiểm tra image, port mapping và mount trước khi khởi động. Không dùng `docker compose up` để tránh tái tạo các container có sẵn. `docker compose config --services` trả về đúng bốn service trên.

Ban đầu Docker báo Kafka và Redis đang chạy; MongoDB, Neo4j, Keycloak, Elasticsearch, Kibana đã dừng. Đã chạy:

```powershell
$taskDocker = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe"
& $taskDocker start mongodb-markie neo4j-markie keycloak-markie elasticsearch kibana
& $taskDocker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Tất cả bảy container trên ở trạng thái `Up` khi kết thúc. Giữ chúng chạy nền. Container `noteapp-dev-mongo-1` không thuộc task được giữ nguyên trạng thái dừng. MongoDB và Neo4j dùng volume sẵn có; không tạo lại container/volume. Elasticsearch và Keycloak không có mount trong kết quả inspect; không thay đổi cách lưu trữ hiện tại.

| Thành phần | Cổng host | Kết quả cuối |
|---|---|---|
| Gateway | 8888 | TCP đóng; chưa khởi động |
| Post | 8083 | TCP đóng; context test thất bại |
| Profile | 8081 | TCP đóng; chưa khởi động |
| File | 8084 | TCP đóng; chưa khởi động |
| Search | 8085 | TCP đóng; chưa khởi động |
| Frontend | 3000 | TCP đóng; dependency/build thất bại |
| Keycloak | 8280 | TCP mở; discovery realm `markie` HTTP 200 |
| MongoDB | 27018 | TCP mở; test đã kết nối và gặp lỗi index |
| Kafka | 9092, 9094 | TCP mở; container Up, chưa xác minh producer/consumer |
| Redis | 6379 | TCP mở; container Up, chưa kiểm tra giao thức |
| Elasticsearch | 9200 | TCP mở; `/_cluster/health` HTTP 200, trạng thái `yellow` |
| Kibana | 5601 | TCP mở; chưa xác minh UI |
| Neo4j | 7474, 7687 | TCP mở; chưa xác minh đăng nhập/truy vấn |

Kiểm tra cổng: đã thử `Get-NetTCPConnection -State Listen` trong sandbox nhưng không có dòng kết quả, sau đó xác nhận bằng kết nối `System.Net.Sockets.TcpClient` tới `127.0.0.1` với thời gian chờ 600 ms/cổng. Không coi kết quả rỗng ban đầu là bằng chứng Docker không chạy. Không phát hiện xung đột cổng cần dừng dịch vụ.

Cấu hình đã đối chiếu: cả backend dùng realm `markie` tại `localhost:8280`; frontend dùng client `markie_webapp`; Gateway chuyển route đến các backend localhost. Post dùng MongoDB host `localhost:27018`, Kafka `localhost:9094`, Profile URL `http://localhost:8081/profile`. Profile dùng Neo4j `7687`, Redis `6379`; Search dùng Elasticsearch `9200` và Kafka `9094`. File dùng MongoDB/Redis, thư mục `C:\uploads` đã tồn tại. Chưa xác minh quyền ghi vào thư mục này. Không đưa thông tin xác thực trong cấu hình vào báo cáo.

Realm có sẵn nên không tạo lại hoặc thay cấu hình. Discovery HTTP 200 chỉ chứng minh realm tồn tại và endpoint hoạt động; chưa chứng minh client/redirect URI hoặc tài khoản thử nghiệm đăng nhập thành công.

## Luồng hiện tại — xác minh bằng đọc mã, chưa phải E2E

1. `web-app/src/components/feed/CreatePostCard.tsx`: refresh token rồi gửi `POST /post/create`, Bearer JWT, JSON `{content}`. UI chặn nội dung chỉ có khoảng trắng và nút gửi bị disable khi dài hơn 500 đơn vị UTF-16. Chỉ `res.ok && data.code === 1000` mới gọi `onPostCreated`, xóa nội dung và đóng modal; lỗi giữ nội dung.
2. Vite proxy `/post` đến Gateway `8888`; Gateway chuyển `/post/**` tới Post `8083`, context path `/post`. Post yêu cầu xác thực JWT cho các route bài viết.
3. `PostController.create`: nhận `PostRequest`, chưa có `@Valid`; `content` trong DTO chưa có ràng buộc validation.
4. `PostService.createPost`: lấy userId từ SecurityContext, tạo và lưu Post vào MongoDB, sau đó gọi Profile lấy username, gửi `post.sync.events`, trả PostResponse. Lỗi gọi Profile và lỗi gửi Kafka đồng bộ được bắt/log; `kafkaTemplate.send` không được chờ xác nhận trong phương thức. Thành công HTTP chưa đủ chứng minh Elasticsearch đã đồng bộ.
5. `SearchSyncConsumer.handlePostEvent`: nhận topic trên và lưu PostDocument vào Elasticsearch với event tạo bài.
6. Route đọc qua Gateway: `GET /post/my-posts?limit=5`, chi tiết **`GET /post/post/{postId}`** (context `/post` cộng mapping `/post/{postId}`), tìm kiếm `GET /search/posts?keyword=...`.
7. ApiResponse thành công có `code=1000`, `result`; trường null bị bỏ. Mã lỗi hiện tại đến 1014 (ngoài mã tổng quát 9999). Không có tích hợp moderation trong luồng đã đọc; không thêm mã lỗi/hợp đồng mới ở task này.

Không có bài thử nào được tạo và không có postId thử để bàn giao. Các bước đăng nhập → tạo bài → my-posts → chi tiết → tìm kiếm đều **chưa chạy**.

## Lỗi sẵn có và phần chưa thể chạy

- **Post context không khởi động được trên dữ liệu hiện có:** test `PostApplicationTests.contextLoads` gặp MongoDB `E11000`, không tạo được unique index `uniq_post_user_like` trên collection `post-service.likes`; khóa trùng chứa `post_id: null`. Không ghi định danh người dùng/dữ liệu bản ghi vào báo cáo. Chuỗi lỗi dẫn đến không tạo được `mongoTemplate`, rồi CommentRepository/CommentService/CommentController. Đây là lỗi trước AI, không phải lỗi moderation.
- `spring.data.mongodb.auto-index-creation=true` khiến context test thử tạo index theo cấu hình hiện tại. Đã giữ nguyên test và cấu hình, không xóa bản ghi/index để làm test xanh. Không chạy lại test hoặc khởi động Post sau khi xác định lỗi này. Test có thể đã tạo các index khác trước khi thất bại; chưa kiểm kê chênh lệch index.
- Build package thiếu thành phần plugin trong cache offline; Wrapper và môi trường Java/local repository có vấn đề riêng như mô tả trên.
- Frontend không cài được dependency bằng `npm ci` trên npm hiện tại; `tsc` không có. Không sửa lockfile hoặc nâng dependency trong task này.
- Chưa khởi động các backend/Gateway/ frontend lâu dài vì baseline Post và cài đặt frontend đang bị chặn. Chưa build/test riêng Profile, File, Search, Gateway; không tuyên bố các service đó có lỗi code hay đã đạt kiểm thử.
- Không có unit test độc lập được chạy: test Post duy nhất hiện có là `@SpringBootTest contextLoads`, kết quả thất bại. Không disable/xóa test.

## Tái hiện và điều kiện tiếp tục

1. Dùng đúng branch/commit ở trên, giữ nguyên thay đổi chưa commit; xác nhận JDK 21 cho cả `java` và Maven. Đưa Docker CLI thực vào PATH của phiên làm việc hoặc dùng đường dẫn đầy đủ.
2. Kiểm tra container hiện có bằng `docker ps -a` trước mọi thao tác; hiện hạ tầng đã chạy, không cần tạo lại. Realm `markie` có sẵn. Kiểm tra client `markie_webapp`, redirect/web origin localhost:3000 và tài khoản phát triển bằng thông tin được cung cấp riêng; không lưu mật khẩu/token vào repo.
3. Cần xử lý tương thích lockfile/npm và lỗi Wrapper/cache Maven trong một phạm vi sửa được cho phép, sau đó chạy lại `npm ci`, `npm run build`, build backend và test. Không đổi sang cài dependency không khóa để bỏ qua lỗi.
4. Cần đánh giá dữ liệu/index `post-service.likes` và thống nhất cách xử lý bảo toàn dữ liệu trước khi chạy lại Post. Không tự xóa dữ liệu hoặc tắt unique index/auto-index để bỏ qua lỗi baseline.
5. Khi Post khởi động được, chạy backend/Gateway theo README bằng JDK 21, frontend bằng `npm run dev`. Xác nhận từng cổng; tránh dừng tiến trình không thuộc task.
6. Đăng nhập tài khoản thử nghiệm trong môi trường phát triển, tạo đúng một bài vô hại với marker mới, ví dụ `MARKIE-ENV-<ngày-giờ>-<hậu-tố>`. Ghi lại postId và kiểm tra code 1000 qua `/post/my-posts`, `/post/post/{postId}`. Chờ đồng bộ có giới hạn thời gian rồi truy vấn `/search/posts?keyword=<marker>` và so postId. Chưa thực hiện các request này trong lần kiểm tra hiện tại.

Task 01 có thể chốt phạm vi theo tài liệu khi môi trường còn thiếu; baseline và nghiệm thu E2E cuối cùng vẫn phải chờ các chặn trên được giải quyết. Báo cáo này không xác nhận hệ thống đã đăng bài thành công. Không có thay đổi đối với hợp đồng chung; chỉ dùng Maven cache trực tiếp và khởi động lại container có sẵn thay cho Wrapper/compose do điều kiện môi trường. Dừng ở Task 00.
