# Hợp đồng API bài viết có ảnh — I02

Chốt ngày 13/11/2026 (Asia/Saigon), baseline `5b6337b` trên
`feature/ai-image-moderation`, gốc văn bản `26a6120`. Đây là hợp đồng cho I03–I09;
I02 chỉ thêm enum và kiểm thử advice, chưa cung cấp endpoint ảnh hoạt động.
Đọc cùng [hợp đồng chung](01-SHARED-CONTRACT.md) và [ca kiểm thử](image-test-cases.md).

## Đối chiếu checkout

| Thành phần | Code hiện tại | Quyết định cho task sau |
|---|---|---|
| Post | `PostController` mapping `/create`, context `/post`; `PostRequest` dùng `@NotBlank`, `@Size(max=500)`; moderation trước save/Profile/Kafka | Mapping mới `/create-with-image` trong context hiện có; giữ nguyên route JSON |
| Response | `dto/ApiResponse` bỏ null ở envelope; `PostResponse` chưa có image và không có NON_NULL | I06 thêm image nullable, bài cũ trả `image: null` theo serialization mặc định của DTO; frontend cũng chấp nhận field vắng |
| File | Context `/file`; `/media/upload` nhận `file`, JWT; `/media/download/{fileName}` công khai; FileResponse không có fileId riêng | Tạo API/metadata/namespace post-media riêng; không sửa avatar/Saga cũ |
| Storage | `FileRepository` ghi đĩa rồi `FileService` lưu metadata Mongo; generic đọc path từ metadata | Namespace đĩa và collection metadata riêng cho post-media, không dùng generic lookup; cleanup riêng khi metadata fail |
| Gateway | Path `/post/**`, `/file/**` giữ nguyên context, không StripPrefix; public download chỉ cho generic; chưa chặn `/file/internal/**` | I05 bổ sung public GET post-media và chặn `/file/internal/**` từ ngoài; vẫn xác thực tại File khi gọi trực tiếp |
| Giới hạn | Post chưa cấu hình multipart; File đang `max-file-size: 5MB`, `max-request-size: 5MB`; Gateway không khai báo RequestSize | I05/I06 đặt file 5.242.880 B, tổng 6.291.456 B; Gateway/proxy phải cho phép request hợp lệ đủ 6 MiB, trả 413 an toàn khi vượt |
| Composer | `CreatePostCard.tsx` gửi JSON, chống submit lặp, giữ draft khi lỗi; chưa chọn ảnh; Vite proxy `/post` nhưng chưa `/file` | I07/I08 thêm FormData và preview local; dùng URL tuyệt đối do File backend sinh, không cần tự ghép/proxy đường ảnh |
| Lỗi | `ErrorCode` trước I02 kết thúc 1018; tìm 1019–1024 trong code toàn repo không có kết quả | Dành cố định sáu mã bên dưới cho Post; không refactor handler lỗi cũ |

## Request từ browser

`POST /post/create-with-image`, Authorization `Bearer <USER_JWT_PLACEHOLDER>`,
`multipart/form-data` có boundary. Gateway giữ path; gọi thẳng Post cũng dùng cùng
path (port mặc định 8083). Không thêm `/post` lần nữa vào mapping controller.

| Part | Kiểu và ràng buộc |
|---|---|
| `content` | Đúng một text field UTF-8 thông thường, không phải JSON/blob; bắt buộc, không blank theo `@NotBlank` hiện có, độ dài gốc 1–500 đơn vị UTF-16 (`String.length()` / JS `.length`); không trim/normalize nội dung trước AI/save |
| `image` | Đúng một file, không rỗng; JPEG hoặc PNG tĩnh; `0 < size <= 5.242.880` byte; `1 <= width,height <= 6.000`; `width * height <= 16.000.000` (nhân bằng long để tránh overflow) |

Chỉ nhận hai part trên; không nhận `ownerId`, `userId`, `imageUrl`, `fileId`, URL
hay mảng file. Binding text bằng `@RequestParam` hoặc `@ModelAttribute` với
validation tường minh; phải kiểm tra cardinality từ toàn bộ multipart, không để
binding một `MultipartFile` âm thầm lấy file đầu. Thiếu/blank content → 1017;
quá 500 → 1018. Thiếu image hoặc file 0 byte → 1019. Nhiều part image (kể cả
part rỗng/text) → 1023. Image là text thay vì file, content trùng/sai loại,
part ngoài hợp đồng hoặc multipart hỏng → 1021; không xử lý chúng như tham chiếu ảnh.
Media type request khác multipart → HTTP 415 theo HTTP contract, không gán thành
mã validation content. Các quy tắc mới chỉ áp dụng route mới.

Signature + parser quyết định loại ảnh thực tế; MIME/extension không phải bằng
chứng. JPEG/PNG hợp lệ nhưng MIME/extension khai báo thiếu/sai vẫn được nhận nếu
parser xác nhận định dạng hỗ trợ; metadata/response dùng MIME đã xác thực
`image/jpeg` hoặc `image/png`, không dùng tên/MIME client. Bytes giả JPEG/PNG,
corrupt/truncated, APNG/đa khung/động, GIF/WebP/SVG/video đều → 1021. Đọc metadata
trước decode toàn ảnh; chặn byte/request trước Base64. Không đổi bytes sau duyệt.

Thứ tự lỗi nếu request có nhiều lỗi: xác thực → giới hạn transport/multipart →
content → số lượng image → thiếu/rỗng/sai cấu trúc → byte → định dạng → chiều/pixel
→ AI. Transport có thể từ chối trước validation nghiệp vụ; không hứa ưu tiên content
cho request vượt giới hạn.

Ví dụ chỉ dùng file giả lập do bộ test tạo và token placeholder:

```sh
curl -X POST 'http://localhost:8888/post/create-with-image' \
  -H 'Authorization: Bearer <USER_JWT_PLACEHOLDER>' \
  -F 'content=Nội dung minh họa hợp lệ.' \
  -F 'image=@<SYNTHETIC_PNG_PATH>;type=image/png'
```

Frontend dùng `FormData.append('content', content)` và
`FormData.append('image', file)` đúng một lần; không tự đặt Content-Type/boundary,
không upload ngay khi chọn ảnh. Không gửi credential nội bộ từ frontend.

## Response công khai

Thành công HTTP **200**, code **1000**, envelope hiện có. I06 thêm DTO image
và lưu snapshot metadata này trong Post; không nhận snapshot từ browser.

| Trường image | Kiểu / nguồn |
|---|---|
| `fileId` | string ID opaque do File Service sinh, không phải filename/path |
| `url` | string URL tuyệt đối do backend sinh từ public base URL tin cậy, route `/file/post-media/{fileId}`; HTTPS ngoài localhost |
| `contentType` | `image/jpeg` hoặc `image/png` đã xác thực |
| `size` | integer byte của đúng nội dung duyệt/lưu |
| `width`, `height` | integer pixel gốc đã xác thực |

```json
{
  "code": 1000,
  "result": {
    "id": "example-post-id",
    "userId": "example-user-id",
    "username": null,
    "content": "Nội dung minh họa hợp lệ.",
    "stats": {"likeCount": 0, "commentCount": 0, "shareCount": 0},
    "createdDate": "2026-11-13T12:00:00Z",
    "modifiedDate": "2026-11-13T12:00:00Z",
    "image": {
      "fileId": "example-media-id",
      "url": "http://localhost:8888/file/post-media/example-media-id",
      "contentType": "image/png",
      "size": 12345,
      "width": 800,
      "height": 600
    }
  }
}
```

Bài cũ/thuần văn bản sau I06 (không migration):

```json
{
  "code": 1000,
  "result": {
    "id": "example-old-post-id",
    "userId": "example-user-id",
    "username": null,
    "content": "Bài chỉ có văn bản.",
    "stats": {"likeCount": 0, "commentCount": 0, "shareCount": 0},
    "createdDate": "2026-11-13T11:00:00Z",
    "modifiedDate": "2026-11-13T11:00:00Z",
    "image": null
  }
}
```

`POST /post/create` vẫn nhận JSON `{"content":"Bài chỉ có văn bản."}` và
kiểm duyệt text như cũ, không tạo liên kết ảnh từ field lạ. Giữ field/status cũ,
chỉ bổ sung image tùy chọn. Feed/my-posts/detail và Kafka/search sau này dùng cùng
metadata tùy chọn, không có bytes/Base64/path đĩa/owner nội bộ/credential.

## Mã lỗi công khai

| Enum | Code | HTTP | Message cố định |
|---|---:|---:|---|
| POST_CONTENT_REJECTED | 1015 | 422 | Nội dung bài viết chưa phù hợp. Vui lòng chỉnh sửa và thử lại. |
| MODERATION_UNAVAILABLE | 1016 | 503 | Chưa thể kiểm duyệt bài viết. Vui lòng thử lại sau. |
| POST_CONTENT_REQUIRED | 1017 | 400 | Vui lòng nhập nội dung bài viết. |
| POST_CONTENT_TOO_LONG | 1018 | 400 | Nội dung bài viết không được vượt quá 500 ký tự. |
| POST_IMAGE_REQUIRED | 1019 | 400 | Vui lòng chọn một ảnh. |
| POST_IMAGE_TOO_LARGE | 1020 | 413 | Ảnh không được vượt quá 5 MiB. |
| POST_IMAGE_INVALID | 1021 | 400 | Ảnh không hợp lệ. Chỉ hỗ trợ ảnh JPEG hoặc PNG tĩnh. |
| POST_IMAGE_DIMENSIONS_EXCEEDED | 1022 | 400 | Kích thước ảnh vượt giới hạn cho phép. |
| POST_IMAGE_COUNT_EXCEEDED | 1023 | 400 | Mỗi bài viết chỉ được đính kèm một ảnh. |
| POST_MEDIA_STORAGE_UNAVAILABLE | 1024 | 503 | Chưa thể lưu ảnh. Vui lòng thử lại sau. |

```json
{"code":1020,"message":"Ảnh không được vượt quá 5 MiB."}
```

Không có `result`, cause, stacktrace, token, header nội bộ hoặc provider response
trong lỗi. JWT thiếu/sai/hết hạn → 401/1006 theo entrypoint hiện có. I06 phải bắt
`MaxUploadSizeExceededException` trước catch-all: file vượt giới hạn → 413/1020.
Vượt tổng 6 MiB tại Post → cũng 413/1020 (message chung cho upload, không cam kết
xác định part). Gateway/proxy có thể trả 413 chung an toàn không có mã JSON;
frontend ưu tiên nhận diện HTTP 413 và giữ draft. I02 **chưa** thêm mapping exception
multipart; đây là tiêu chí bắt buộc trước mở route ở I06. Không đổi catch-all cũ.

## Post–File Service

Base URL client riêng: `http://localhost:8084/file` khi local; cấu hình backend
tin cậy ở môi trường khác, không lấy từ request. Không gọi qua browser/Gateway.

| Method / mapping trong context File | URL đầy đủ local | Request / response |
|---|---|---|
| POST `/internal/post-media` | `http://localhost:8084/file/internal/post-media` | Multipart đúng một file part `image`, bytes đã duyệt; HTTP 200 `{"code":1000,"result":{fileId,url,contentType,size,width,height}}` theo schema image bên trên |
| DELETE `/internal/post-media/{id}` | `http://localhost:8084/file/internal/post-media/example-media-id` | Không body; đúng ID từ create; thành công HTTP 204 không body; idempotent khi đã xóa/không tồn tại (vẫn cần cả hai credential) |
| GET `/post-media/{id}` | `http://localhost:8888/file/post-media/example-media-id` qua Gateway | Công khai, HTTP 200 raw bytes, Content-Type xác thực, Content-Length đúng, `X-Content-Type-Options: nosniff`; ID không tồn tại → 404 |

Create và delete bắt buộc đồng thời:

- `Authorization: Bearer <USER_JWT_PLACEHOLDER>` lấy từ JWT người dùng đã xác thực
  trong SecurityContext của request tạo bài; File xác minh lại JWT và dùng `sub`
  (authentication name mặc định hiện tại) làm owner. Không nhận owner/user từ part/header khác.
- `X-Post-Media-Internal-Secret: <INTERNAL_SECRET_PLACEHOLDER>` do client File riêng
  của Post gắn từ `POST_MEDIA_INTERNAL_SECRET` của backend. Hai backend dùng cùng
  credential riêng, không dùng key OpenAI. Thiếu/blank cấu hình → fail startup
  tại I05/I06; test dùng secret giả, không có chế độ bỏ xác thực.
- Không relay header nội bộ từ browser, không dùng interceptor toàn cục; chỉ
  relay JWT tới File create/delete, không gửi JWT tới AI hoặc thêm secret vào
  Profile/OpenAI. Không theo redirect làm rò credential; ngoài localhost dùng
  kênh nội bộ được bảo vệ. Không log credential/request body/ảnh/Base64.
- JWT thiếu/sai → 401; JWT hợp lệ nhưng secret thiếu/sai hoặc delete khác owner
  → 403, không ghi/xóa/đọc byte. GET công khai không cho biết owner. File có thể
  dùng mã lỗi nội bộ riêng; Post ánh xạ mọi create failure, kể cả 401/403,
  non-2xx, timeout, JSON/metadata sai, sang 1024, không relay lỗi nội bộ.

File tự xác thực bytes/metadata bằng validator tương đương I03, không tin MIME,
filename, width/height từ caller. Post kiểm tra response đủ trường, size/MIME/chiều
khớp ảnh đã duyệt và URL thuộc public base/route tin cậy trước save Post; sai →
1024. Chỉ cleanup ID có nguồn gốc chắc chắn từ lần create đó, không dùng ID lấy
từ response không đáng tin. Không tự retry create/AI/submit; chưa có idempotency API.

Post-media immutable, ID server sinh, lưu bytes ở namespace riêng và metadata ở
collection riêng. Generic upload chỉ ghi kho cũ; generic download và Saga avatar
chỉ tìm kho cũ, không fallback sang post-media dù đoán đúng ID/path. GET post-media
chỉ tìm kho mới; không đọc file generic chưa duyệt. JSON create không nhận fileId
làm chứng nhận duyệt. Gateway phải chặn external `/file/internal/**` và cho phép
GET `/file/post-media/{id}` không JWT; việc chặn Gateway không thay thế xác thực
File Service khi gọi thẳng. Không sửa luồng avatar trong đợt này.

Giới hạn Post/File: file 5.242.880 B, request 6.291.456 B. I05 áp dụng mức tổng
6 MiB tại File để không loại ảnh 5 MiB vì overhead, giữ nguyên mức file generic
5 MiB; không đổi nghiệp vụ avatar. Gateway hiện không có RequestSize; I05/I06
phải kiểm tra route/proxy không buffer/chặn thấp hơn và phản hồi 413 trước khi
đọc Base64/AI. Không coi giới hạn buffer codec là giới hạn kích thước upload.

## Cụ thể hóa triển khai File trong I05

Không đổi schema hay endpoint I02. ID thực tế là UUID v4 chữ thường, server sinh;
ID sai cú pháp trả 404 ở API post-media, ID đúng cú pháp nhưng vắng trả 404 khi
GET và 204 khi DELETE có đủ credential. DELETE lưu tombstone ownership trong
collection `post_media`: retry cùng owner trả 204, owner khác vẫn 403 kể cả đã
xóa. Không tái sử dụng ID và không có API cập nhật bytes. GET dùng `no-store`
để việc xóa bù không để cache tiếp tục phục vụ ảnh.

File dùng mã nội bộ 1025/403 (forbidden), 1026/404 (not found); các mã này chỉ
thuộc enum File, không thêm mã công khai Post. FileClient ánh xạ lỗi thành
Post 1024/503, kiểm code1000, UUID, URL chính xác dưới public base cấu hình và
MIME/size/width/height khớp ảnh đã duyệt. HTTP redirect bị từ chối.

`app.post-media.internal-secret` ở cả hai backend đọc `POST_MEDIA_INTERNAL_SECRET`;
thiếu/blank/unresolved khiến bean khởi tạo thất bại. File có
`POST_MEDIA_STORAGE_DIR` (mặc định `C:/uploads-post-media`), nằm tách rời và không
lồng vào generic root; không dùng root có symlink/junction/alias. Post có
`POST_MEDIA_FILE_BASE_URL` (mặc định `http://localhost:8084/file`). Cả hai dùng
`POST_MEDIA_PUBLIC_BASE_URL` (mặc định `http://localhost:8888/file/post-media`).
Base URL không có trailing slash, query, fragment hoặc user-info; dùng HTTPS,
chỉ localhost được dùng HTTP trong triển khai này. Không lấy base URL từ request.

File dùng `insert` metadata sau CREATE_NEW bytes. Lỗi bị từ chối chắc chắn
(`DataIntegrityViolationException`, `InvalidDataAccessApiUsageException`) dọn
đúng file mới. Với lỗi khác, kiểm metadata theo ID để ghi nhận tình trạng nhưng
giữ bytes để đối soát, kể cả read vắng/lỗi: write có thể còn hoàn tất. Không
diễn giải read vắng một lần thành chứng minh rollback. Lỗi cleanup chỉ log ID,
không log exception/path/credential. Đây là cụ thể hóa F08/P07, tránh xóa bytes
của metadata có thể đã commit; chưa có worker xử lý file mồ côi.

Gateway chặn `/file/internal/**`, public GET `/file/post-media/{id}` và đếm body
stream ở `/post/**`, `/file/**` tối đa 6 MiB, cả Content-Length và chunked,
trả 413 chung an toàn. File/Tomcat drain body bị từ chối như Post để có thể trả
413 đầy đủ; giới hạn nhận vẫn 5/6 MiB. URL ảnh tuyệt đối đi qua Gateway giữ
context `/file`; Vite hiện không proxy `/file` và không cần proxy mới cho dạng
URL này. Không hardcode URL/cổng trong component.

## Thứ tự xử lý và thất bại

| Bước / kết quả | Hành động và kết quả API |
|---|---|
| 1. JWT + validation | Không đạt → lỗi tương ứng ở trên; không AI/File/Post/event |
| 2. Duyệt text + đúng bytes ảnh trong một request | `flagged=true` → 1015/422; provider lỗi/timeout/boolean thiếu,null,sai kiểu → 1016/503; không File/Post/event, không retry/fallback |
| 3. File create sau `flagged=false` | Fail/timeout/response sai → 1024/503, không save Post/event. File dọn bytes nếu metadata save thất bại; lỗi dọn ghi fileId/correlation an toàn cho xử lý file mồ côi |
| 4. Nhận metadata hợp lệ, tạo trước Post ID rồi save | Save thành công → giữ ảnh; dùng snapshot metadata từ File, không đổi bytes |
| 5. Save Post chắc chắn thất bại, xác minh không có tham chiếu | Delete bù đúng file vừa tạo bằng JWT + secret; trả lỗi save Post theo hành vi cũ, không đổi thành 1024, không event |
| 6. Save không rõ kết quả (timeout/write concern/network) | Tra Post bằng ID tạo trước, đối chiếu owner + image.fileId; thấy đúng bài → coi đã lưu, không xóa; có thể tiếp tục trả success/phát event theo đường thành công |
| 7. Tra lại vắng/khác metadata hoặc tra lỗi khi save chưa rõ | Không suy absence một lần là rollback: write có thể còn hoàn tất. Giữ ảnh, log postId/fileId/correlation cho đối soát; trả lỗi save hiện có, không event trong request chưa xác nhận thành công |
| 8. Delete bù fail/timeout/JWT đã hết hạn | Không che lỗi save gốc; log ID/correlation + loại lỗi đã lọc, báo file mồ côi; không xóa ID khác, không retry vô hạn |
| 9. Sau save thành công | Profile best-effort, Kafka như hiện tại; Kafka fail không xóa bài/ảnh và không biến thành lỗi storage; response success. Không outbox/exactly-once |

Cleanup chỉ khi có bằng chứng write đã kết thúc không commit và không có tham
chiếu; read phải dùng primary/nhất quán phù hợp, không secondary có độ trễ.
Đối soát sau này chỉ xóa khi xác minh không còn write đang treo/tham chiếu, không
thêm worker/outbox trong I02. Timeout File create có thể đã lưu nhưng chưa trả ID:
không đoán ID, không retry tạo, ghi correlation để File đối soát. Nếu metadata save
của File cũng không rõ kết quả thì áp dụng cùng nguyên tắc xác minh trước xóa bytes.

Lỗi save Post vẫn đi qua handler hiện tại: exception runtime thông thường đang
trả HTTP 400/code 9999/message `Uncategorized error`; `AppException` dùng mã/status
sẵn có. Đây là ghi nhận tương thích, không sửa thành 500 ở I02. Không dùng 1024
cho DB Post hoặc delete bù thất bại. Ảnh đã duyệt có thể công khai ngắn hạn trước
cleanup khi Post fail; không tuyên bố transaction nguyên tử hoặc exactly-once.

UI I07/I08 giữ File/content khi mọi lỗi (kể cả 413 không JSON và kết quả chưa rõ),
không tự gửi lại; khóa textarea/chọn/xóa ảnh/đóng/backdrop/submit khi gửi, giải
phóng object URL khi thay/xóa/unmount/success. Bài không ảnh tiếp tục route JSON.
