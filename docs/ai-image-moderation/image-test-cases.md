# Ma trận kiểm thử ảnh — I02

Đặc tả nghiệm thu cho [api-contract.md](api-contract.md); **không phải báo cáo đã
chạy** validator/storage/AI/UI. Trong I02 chỉ enum/advice và hồi quy text được
chạy; kết quả cụ thể xem [handoff](handoffs/I02.md). Mọi fixture ảnh phải được
tạo tổng hợp hoặc có quyền sử dụng; token/secret/provider response dùng giả lập.
Không gọi AI thật cho ca chặn, không dùng ảnh người dùng hoặc nội dung xâm hại trẻ em.

Quy ước: `S` = không AI/File/Post/Kafka; `A` = AI đã gọi nhưng không File/Post/Kafka;
`F` = có thể đã ghi File, chưa lưu Post/event. Kiểm tra số lần gọi bằng mock/spy,
không chỉ đối chiếu response. Ca transport cần test server multipart thật cục bộ
hoặc integration tương ứng; MockMvc multipart đơn thuần không chứng minh giới hạn
servlet/Gateway hoạt động.

## Request và validator (I03/I06)

| ID | Đầu vào / thao tác | Kỳ vọng |
|---|---|---|
| V01 | PNG tĩnh và JPEG tĩnh nhỏ + text hợp lệ | Chấp nhận validation; chính bytes đó được gửi AI/lưu/read, metadata đúng |
| V02 | Text 1 và 500 UTF-16; 250 emoji surrogate-pair | Chấp nhận; giữ nguyên text, khoảng trắng đầu/cuối không bị trim |
| V03 | Thiếu/null/rỗng/space-tab-newline content | 400/1017, S |
| V04 | Text 501 UTF-16 hoặc 251 emoji surrogate-pair | 400/1018, S |
| V05 | Không image hoặc file 0 byte | 400/1019, S |
| V06 | Hai image (kể cả một part rỗng hoặc text); mảng nhiều file | 400/1023 khi request còn trong tổng limit; S; không âm thầm lấy file đầu |
| V07 | File hợp lệ đúng 5.242.880 byte; request có overhead nhưng <=6.291.456 B | Qua byte limit ở Post, Gateway, File; kiểm tra với parser fixture hợp lệ |
| V08 | File 5.242.881 byte; request vẫn <=6 MiB | 413/1020 trước Base64/AI, S |
| V09 | Request tổng đúng 6.291.456 B và lớn hơn một byte | Đúng biên không bị từ chối bởi size layer (vẫn validate cấu trúc); vượt → 413 an toàn, S; Post có code 1020, proxy có thể không JSON |
| V10 | 6.000×1, 1×6.000, 4.000×4.000; bytes nhỏ đủ giới hạn | Chấp nhận chiều/pixel tại biên |
| V11 | 6.001×1, 1×6.001 | 400/1022, S; không decode toàn ảnh trước kiểm metadata |
| V12 | 4.001×4.000, mỗi chiều <=6.000 | 400/1022 do >16.000.000 pixel; S |
| V13 | Header kích thước rất lớn/overflow/0/âm | Không overflow/đọc cấp phát khổng lồ; kích thước hợp lệ nhưng quá limit →1022, metadata không hợp lệ →1021; S |
| V14 | JPEG/PNG thực nhưng extension/MIME sai hoặc thiếu | Parser xác nhận → dùng MIME thực, không tin extension; không dùng tên gốc làm path |
| V15 | Text/HTML/bytes ngẫu nhiên đặt .jpg và image/jpeg | 400/1021, S |
| V16 | PNG/JPEG corrupt/truncated (header đọc được nhưng decode fail) | 400/1021, S; không lưu ảnh chỉ vì có signature |
| V17 | GIF/WebP/SVG/video và file đổi đuôi thành PNG | 400/1021, S |
| V18 | APNG/ảnh đa khung/động, kể cả khung đầu hợp lệ | 400/1021, S |
| V19 | Image gửi text/URL, content blob/JSON, duplicate content, extra ownerId/fileId/imageUrl | 400/1021 theo hợp đồng route mới; S; không fetch URL |
| V20 | Multipart thiếu boundary/hỏng; request không phải multipart | Hỏng multipart →400/1021; sai media type →415; S; không catch-all 400/9999 |
| V21 | Content sai đồng thời image sai; request quá tổng đồng thời content sai | Trong limit: lỗi content trước; quá transport: 413 được ưu tiên |

## Moderation (I04/I06)

| ID | Giả lập | Kỳ vọng |
|---|---|---|
| A01 | `flagged=false` boolean | Một request AI chứa cả text + data URL MIME thực/Base64 đúng bytes; chỉ sau đó gọi File |
| A02 | `flagged=true` cho text/ảnh | 422/1015, A; message cũ không đổi |
| A03 | Timeout/network/HTTP lỗi | 503/1016, A; không retry, không fallback đăng |
| A04 | JSON hỏng/results rỗng/flagged thiếu,null,string hoặc number | 503/1016, A |
| A05 | Provider trả category score 0 nhưng flagged=true | Vẫn 1015; không suy an toàn từ category không hỗ trợ ảnh |
| A06 | Nội dung có dấu/quote/newline + PNG/JPEG | Serializer tạo JSON hợp lệ; không thay nội dung; không log text/Base64/token; JWT/secret nội bộ không tới AI |
| A07 | Luồng text `isFlagged(String)`, `assertAllowed(String)` | Test cũ tiếp tục đạt, request text không bị bắt có image |

## File, xác thực và ranh giới (I05/I06)

| ID | Giả lập / thao tác | Kỳ vọng |
|---|---|---|
| F01 | JWT hợp lệ + secret đúng, ảnh đã duyệt | Create 200/code1000/metadata đủ; owner từ sub; ID server sinh, immutable |
| F02 | JWT thiếu/sai/hết hạn với secret đúng | File 401, không ghi/xóa; public Post thiếu JWT 401/1006 |
| F03 | JWT đúng nhưng secret thiếu/sai | File 403, không ghi/xóa, kể cả gọi trực tiếp bỏ Gateway |
| F04 | Thiếu/blank cấu hình internal secret tại Post hoặc File | Fail startup, không chế độ bỏ auth; test dùng fake secret |
| F05 | Client gửi owner khác trong part/header | Không gán owner đó; route mới reject extra part; delete owner khác với JWT đúng + secret đúng →403 |
| F06 | Browser gửi header secret giả; gọi File/Profile/AI khác nhau | Post dùng credential cấu hình riêng, không forward secret browser; JWT chỉ relay tới File; không secret nội bộ tới Profile/AI/browser |
| F07 | File write lỗi trước metadata | Post 503/1024, F, không save Post/event; không lộ lỗi/path nội bộ |
| F08 | File metadata save chắc chắn fail sau ghi đĩa | Dọn đúng bytes vừa ghi; Post 1024; cleanup fail được log an toàn để đối soát |
| F09 | File create timeout (server có thể đã lưu), không có ID | Post 1024, không save Post/event, không retry/đoán ID; correlation phục vụ đối soát |
| F10 | File trả 401/403/500, envelope lỗi, JSON hỏng hoặc metadata thiếu/sai MIME/size/chiều/URL | Post 503/1024, không relay body nội bộ; không dùng metadata đó để save hoặc xóa ID tùy ý |
| F11 | Delete đúng owner + secret; delete lại/ID không tồn tại | 204 rỗng idempotent; kiểm cả hai credential ngay cả ID vắng |
| F12 | Generic upload rồi gắn fileId/URL vào JSON/multipart | Không tạo liên kết ảnh trong Post; không được xem là đã duyệt |
| F13 | Generic download/Saga đoán đúng ID hoặc path post-media | Không truy cập/xóa kho post-media; generic và avatar vẫn hoạt động với kho cũ |
| F14 | Public post-media GET ID generic hoặc traversal | Không trả byte generic/đường tùy ý; ID vắng →404; không lộ path/owner |
| F15 | GET ảnh đã duyệt không JWT qua Gateway và gọi thẳng | 200 bytes nguyên bản, MIME/length đúng, nosniff; không chứa secret |
| F16 | External gọi `/file/internal/**` qua Gateway | 403; gọi thẳng File vẫn cần JWT+secret; tên internal không thay auth |
| F17 | Multipart File đủ 5 MiB + overhead | Qua tổng limit 6 MiB; không làm đổi nghiệp vụ upload/avatar cũ |

## Save Post, cleanup và event (I06)

| ID | Giả lập | Kỳ vọng |
|---|---|---|
| P01 | AI false → File success → Post save success | Đúng thứ tự, Post ID tạo trước save, image metadata đúng; chỉ sau save mới Profile/event/response 200/1000 |
| P02 | Post save chắc chắn fail, xác nhận không có tham chiếu | Delete bù đúng ID vừa tạo + cùng JWT/secret; không event; lỗi save theo handler cũ, không đổi thành1024 |
| P03 | P02 nhưng delete timeout/403/500 | Giữ lỗi save gốc; ghi fileId/postId/correlation đã lọc, báo mồ côi; không xóa file khác/retry vô hạn |
| P04 | Save ném lỗi nhưng primary đọc lại thấy đúng Post ID + owner + fileId | Giữ ảnh; coi đã lưu, xử lý success, event sau xác minh; không xóa bài đã commit |
| P05 | Save không rõ; read lỗi/vắng/different image; write còn có thể commit | Không xóa; không event khi chưa xác nhận; lỗi save hiện có + đối soát; không coi read vắng một lần là rollback |
| P06 | Kafka/Profile fail sau save | Giữ Post/ảnh, best-effort như text hiện tại; không storage error, không cleanup |
| P07 | File metadata write không rõ kết quả | Xác minh trước cleanup bytes; không xóa bytes đã có metadata commit |
| P08 | AI chặn, validation fail hoặc File fail | Chứng minh không có side effect bước sau; không event, không Post save |

## Tương thích và UI (I07–I10)

| ID | Thao tác | Kỳ vọng |
|---|---|---|
| C01 | JSON `/post/create` text hợp lệ/invalid/AI chặn/lỗi | Giữ status/code 1000,1015–1018, cấu trúc cũ; không yêu cầu ảnh |
| C02 | Đọc bài cũ không image trong Mongo; event/search cũ thiếu image | Không migration, không crash; API image null, consumer/UI chấp nhận null hoặc vắng |
| C03 | Bài có image trong feed/my-posts/detail/search hiện có | Cùng metadata; URL backend; tìm kiếm vẫn theo text; không thêm page ngoài scope |
| C04 | Chọn/thay/xóa/unmount/success | Preview object URL local, không upload sớm; thu hồi URL đúng lúc |
| C05 | 1015–1024/network/413 không JSON/response không rõ | Giữ content và File; hiển thị lỗi an toàn; không tự retry; đổi ảnh xóa lỗi ảnh cũ |
| C06 | Đang submit, double-click trước refresh token | Chỉ một request; khóa text/chọn/xóa ảnh/đóng/backdrop/submit; mở lại sau kết thúc |
| C07 | Có ảnh / không ảnh | Có: FormData content+image, browser đặt boundary; không: JSON route cũ; không gửi secret nội bộ |
| C08 | So sánh bytes AI input, File stored, public GET | Bằng nhau; không crop/resize sau duyệt |

## Kiểm thử thực thi trong I02

`GlobalExceptionHandlerTest` thêm sáu ca HTTP/status/message/JSON chính xác qua
controller có sẵn với PostService mock và cause nhạy cảm giả; strict JSON loại
trừ result/cause/owner/path/secret. Thêm một ca đảm bảo không trùng code trong
enum Post. Các ca này chứng minh **mapping AppException**, không chứng minh
route multipart, security filter hoặc multipart resolver đã hoạt động. Chạy lại
7 lớp hồi quy text như I01 bằng Java 21; không provider/database thật.
