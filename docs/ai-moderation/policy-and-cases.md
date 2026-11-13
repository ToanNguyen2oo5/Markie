# Task 01 — Quy tắc kiểm duyệt và bộ ca tiếng Việt

Trạng thái: **hoàn thành phần tài liệu**, ngày 13/11/2026 (Asia/Saigon).
Đối chiếu trên nhánh `main`, commit `85957fe3542e551afa1054e6e958b24f4901f332`.
Nguồn quyết định: [hợp đồng chung](01-SHARED-CONTRACT.md), [Task 01](03-TASK-01-POLICY.md), [báo cáo Task 00](environment-report.md).

## 1. Đối chiếu checkout

| Mã nguồn đã đọc lại | Hiện trạng | Yêu cầu cho các task triển khai sau |
|---|---|---|
| `post/post/src/main/java/com/stewie/post/controller/PostController.java` | `/create` nhận `@RequestBody`, chưa có `@Valid` | Bật validation tại API, giữ route |
| `post/post/src/main/java/com/stewie/post/dto/request/PostRequest.java` | `content` chưa có constraint | `@NotBlank`, `@Size(max = 500)` theo mã lỗi bên dưới |
| `post/post/src/main/java/com/stewie/post/service/PostService.java` | Lấy userId từ SecurityContext → lưu MongoDB → gọi Profile lấy username → gửi `post.sync.events` → trả response | Đặt kiểm duyệt sau bước lấy danh tính, trước save/Profile/Kafka; giữ luồng thành công hiện có |
| `post/post/src/main/java/com/stewie/post/exception/ErrorCode.java` | Mã nghiệp vụ đến 1014; có mã tổng quát 9999; chưa dùng 1015–1018 | Dành bốn mã đúng hợp đồng, không đổi mã cũ |
| `post/post/src/main/java/com/stewie/post/exception/GlobalExceptionHandler.java` | AppException dùng HTTP của enum; handler tổng quát trả 400 | Ánh xạ lỗi moderation bằng AppException rõ ràng; không trông chờ handler tổng quát trả 503 |
| `post/post/src/main/java/com/stewie/post/dto/ApiResponse.java` | `code` mặc định 1000, trường null bị bỏ | Giữ cấu trúc và response thành công |
| `web-app/src/components/feed/CreatePostCard.tsx` | Gửi nguyên `content`; nút gửi chặn rỗng/độ dài >500; giữ nội dung khi lỗi; callback chỉ chạy khi HTTP thành công và code 1000 | Hiển thị lỗi 1015/1016, giữ bản nháp; không thêm bài vào feed khi lỗi |

Tìm `1015|1016|1017|1018|Moderation` trong `post/post/src` và `web-app/src` không có kết quả. Không phát hiện xung đột cần sửa hợp đồng. Endpoint cập nhật bình luận tại `CommentController` không phải sửa bài viết và nằm ngoài phạm vi này.

Task 00 chưa đạt baseline: lỗi Wrapper/cache Maven, `npm ci` và MongoDB unique index `uniq_post_user_like` khiến context Post thất bại. Đây là thông tin từ báo cáo Task 00, không phải kết quả chạy lại ở Task 01. Các lỗi đó không thay đổi quyết định kiểm duyệt; nghiệm thu E2E vẫn phải chờ môi trường được xử lý bảo toàn dữ liệu.

## 2. Checklist quyết định đã chốt

- [x] Chỉ kiểm duyệt văn bản `content` của bài mới qua `POST /post/create`. Không kiểm duyệt bình luận, ảnh/video, bài cũ; không bổ sung sửa bài, pending/rejected, hàng đợi duyệt, dashboard, phê duyệt thủ công hoặc khiếu nại.
- [x] Giữ xác thực hiện có. Validation tại API trước khi gọi AI. Nội dung rỗng/null/chỉ có khoảng trắng dùng `POST_CONTENT_REQUIRED`; quá 500 đơn vị UTF-16 dùng `POST_CONTENT_TOO_LONG`.
- [x] Đếm bằng Java `String.length()` / JavaScript `.length`, gồm khoảng trắng; không đổi sang đếm ký tự hiển thị. Không trim, chuẩn hóa, cắt ngắn hoặc sửa nội dung giữa validation, kiểm duyệt và lưu. UI có thể dùng `trim()` để kiểm tra rỗng nhưng vẫn gửi chuỗi gốc.
- [x] Gọi OpenAI Moderation API đồng bộ ở Post Service. Theo cấu hình đã thống nhất: `POST {base-url}/v1/moderations`, model mặc định `omni-moderation-latest`, body `model` và `input` là nguyên chuỗi content. Nội dung là dữ liệu, không phải prompt/chỉ dẫn điều khiển.
- [x] Quyết định chỉ dựa trên boolean `results[0].flagged`. Không thêm ngưỡng category score, bộ từ khóa, chống spam, phát hiện tin giả hoặc khóa tài khoản. Không suy diễn kết quả từ các trường khác.
- [x] `flagged=false`: cho đi tiếp luồng hiện có; `flagged=true`: chặn; lỗi kỹ thuật/phản hồi không hợp lệ: chưa đăng. Không tự cho qua khi AI lỗi, không retry tự động trong request.
- [x] Kiểm duyệt phải hoàn tất trước `postRepository.save`, gọi Profile và `kafkaTemplate.send`. Bị chặn/không kiểm duyệt được thì cả ba thao tác có 0 lần gọi; không tạo bản ghi pending/rejected và không có sự kiện để Search lập chỉ mục.
- [x] Giữ route, cấu trúc Post, ApiResponse, Kafka và cơ chế tìm kiếm. Bài cũ hoạt động như trước, chưa được kiểm duyệt lại.
- [x] Không ghi key, JWT, toàn văn bài hoặc response AI đầy đủ vào log. Không chuyển JWT người dùng tới OpenAI; base URL chỉ từ cấu hình server, không từ request. Không thêm endpoint moderation công khai.

Đây là lựa chọn sản phẩm theo hợp đồng được cung cấp, chưa phải kiểm chứng API bằng request thật trong Task 01. Task triển khai cần đối chiếu tài liệu API chính thức như yêu cầu trong hợp đồng chung.

### Ba kết quả và lỗi đầu vào

| Điều kiện | Kết quả ứng dụng | Side effect |
|---|---|---|
| Content hợp lệ, HTTP provider thành công, `results[0].flagged` đúng kiểu boolean `false` | Đạt kiểm duyệt; tiếp tục tạo bài | Save/Profile/Kafka theo luồng hiện có |
| Content hợp lệ, HTTP provider thành công, `flagged` đúng kiểu boolean `true` | Bị chặn: 1015 / HTTP 422 | Không save/Profile/Kafka |
| Connect/read timeout, lỗi mạng, HTTP không thành công (kể cả 429/5xx), JSON sai, thiếu/null/rỗng/sai cấu trúc `results`, thiếu/null/sai kiểu `flagged` | Không kiểm duyệt được: 1016 / HTTP 503 | Không save/Profile/Kafka |
| Content không hợp lệ | 1017 hoặc 1018 / HTTP 400 | Không gọi AI/save/Profile/Kafka |

Chuỗi `"false"`, số `0` không phải boolean `false`. Không lấy kết quả thứ hai để thay cho `results[0]` sai. Khi đạt kiểm duyệt, việc lưu/gửi sự kiện vẫn có thể gặp lỗi của luồng hiện có; kết quả moderation không tự bảo đảm bài đã lưu hoặc tìm kiếm đã đồng bộ.

Nội dung nhạy cảm bị đánh dấu là tín hiệu của mô hình, không phải kết luận chắc chắn về ý định người viết. Mô hình có thể hiểu sai dấu tiếng Việt, tiếng lóng, phủ định, trích dẫn hoặc ngữ cảnh hỗ trợ. Không dùng danh sách ca bên dưới để tạo quy tắc từ khóa hay ngoại lệ cho qua tự động.

## 3. Hợp đồng backend/frontend

| Enum / kết quả | Mã | HTTP | Thông báo |
|---|---:|---:|---|
| Thành công hiện có | 1000 | Giữ nguyên | Giữ response hiện có |
| `POST_CONTENT_REJECTED` | 1015 | 422 | Nội dung bài viết chưa phù hợp. Vui lòng chỉnh sửa và thử lại. |
| `MODERATION_UNAVAILABLE` | 1016 | 503 | Chưa thể kiểm duyệt bài viết. Vui lòng thử lại sau. |
| `POST_CONTENT_REQUIRED` | 1017 | 400 | Vui lòng nhập nội dung bài viết. |
| `POST_CONTENT_TOO_LONG` | 1018 | 400 | Nội dung bài viết không được vượt quá 500 ký tự. |

Lỗi dùng `ApiResponse`, ví dụ `{"code":1015,"message":"Nội dung bài viết chưa phù hợp. Vui lòng chỉnh sửa và thử lại."}`; không yêu cầu `result` khi lỗi. Frontend giữ nội dung, hiển thị thông báo, không gọi `onPostCreated` cho cả bốn lỗi. Không công khai lý do nội bộ, lỗi provider hoặc category score.

Các phương thức cần triển khai ở task sau, trong package `com.stewie.post.moderation`:

- `ModerationClient.boolean isFlagged(String content)`: trả boolean khi phản hồi hợp lệ; lỗi kỹ thuật/phản hồi sai ném `ModerationProviderException`.
- `ModerationService.void assertAllowed(String content)`: `false` trả về bình thường; `true` ném `AppException(POST_CONTENT_REJECTED)`; bắt lỗi provider và đổi thành `AppException(MODERATION_UNAVAILABLE)`.
- `ModerationProperties`: kiểm tra cấu hình lúc khởi động; thiếu key hoặc timeout không dương phải báo lỗi cấu hình, không tắt kiểm duyệt. Dùng Spring `RestClient`, không cần SDK hoặc Spring AI.

Cấu hình cố định: `OPENAI_API_KEY`; `OPENAI_MODERATION_BASE_URL` mặc định `https://api.openai.com`; `OPENAI_MODERATION_MODEL` mặc định `omni-moderation-latest`; connect timeout 2000 ms, read timeout 5000 ms là hai giới hạn riêng. Không hứa tổng request chỉ kéo dài 5 giây. Thêm nhánh `moderation` vào nhánh `app` có sẵn theo hợp đồng, tránh trùng khóa YAML. Chưa thêm cấu hình trong task tài liệu này.

## 4. Ca phản hồi giả lập — kết quả xác định

Tất cả ca dưới đây là đặc tả cho các task sau, **chưa thực thi**. Dùng JUnit/Mockito, transport/server giả lập và key giả; không phụ thuộc mạng, hạ tầng hoặc AI thật. Nội dung hợp lệ mặc định là `Chúc mọi người học tốt!`. Với ca API giả lập, giả định đã xác thực và dependency của luồng thành công cũng được giả lập.

| ID | Đầu vào / phản hồi giả lập | Kỳ vọng | Thực tế | Nhận xét |
|---|---|---|---|---|
| M01 | HTTP 200, `results[0].flagged=false` | Client trả false; service trả bình thường; API code 1000 khi lưu thành công | Chưa chạy | Xác minh thứ tự kiểm duyệt trước save/Profile/Kafka và chuỗi content không đổi |
| M02 | HTTP 200, `results[0].flagged=true` | 1015 / 422; không save/Profile/Kafka | Chưa chạy | Kể cả văn bản vô hại, kết quả mock true vẫn phải chặn |
| M03 | Connect timeout | 1016 / 503; không side effect | Chưa chạy | Transport ném exception; không retry |
| M04 | Read timeout | 1016 / 503; không side effect | Chưa chạy | Phân biệt với connect timeout |
| M05 | Lỗi kết nối/mạng | 1016 / 503; không side effect | Chưa chạy | Không lộ lỗi provider cho UI |
| M06 | HTTP 401, 429, 500, 503 (tham số hóa) | Mỗi trường hợp 1016 / 503 | Chưa chạy | Kể cả body có flagged=false cũng không cho qua HTTP lỗi |
| M07 | Body JSON không phân tích được | 1016 / 503 | Chưa chạy | Không mặc định false |
| M08 | `results` thiếu, null, `[]`, sai kiểu hoặc phần tử đầu null (tham số hóa) | Mỗi trường hợp 1016 / 503 | Chưa chạy | Không truy cập phần tử mù quáng |
| M09 | `flagged` thiếu, null, `"false"`, 0, object (tham số hóa) | Mỗi trường hợp 1016 / 503 | Chưa chạy | Bắt buộc boolean |
| M10 | Phần tử đầu sai, phần tử sau có flagged=false | 1016 / 503 | Chưa chạy | Chỉ xét `results[0]` |
| M11 | Content thiếu/null/`""`/`" \t\n"` (tham số hóa) | 1017 / 400; 0 gọi AI/save/Profile/Kafka | Chưa chạy | `@NotBlank`; dữ liệu API trực tiếp, không chỉ UI |
| M12 | `"a".repeat(500)` và `"a".repeat(501)` | 500 qua validation; 501 trả 1018 / 400 trước AI | Chưa chạy | Ca 500 dùng mock false để đi tiếp |
| M13 | `"😊".repeat(250)` và `"😊".repeat(251)` | Độ dài 500 hợp lệ; 502 trả 1018 / 400 | Chưa chạy | Đếm UTF-16, không đếm số emoji hiển thị |
| M14 | Content `"  Xin chào!  "`, mock false | Gửi AI và lưu đúng chuỗi gốc | Chưa chạy | Không trim trước/sau kiểm duyệt |
| M15 | Frontend nhận lần lượt 1015/422, 1016/503, 1017/400, 1018/400 | Giữ bản nháp; hiển thị lỗi; không callback | Chưa chạy | Chỉ ca 1000 + HTTP thành công mới callback/xóa/đóng modal |

Không dùng fixture nhạy cảm để chứng minh mapping true/false: M01–M10 đủ kiểm tra logic kỹ thuật bằng nội dung vô hại. Không quyết định ưu tiên mới khi một content đồng thời vi phạm nhiều constraint; ca kiểm tra mã lỗi nên cô lập từng điều kiện theo hợp đồng.

## 5. Bộ 20 ca tiếng Việt — đánh giá mô hình thật

**Chưa gọi AI thật, toàn bộ cột thực tế để “Chưa chạy”.** “Kỳ vọng” là nhãn đánh giá ngữ nghĩa của con người, không phải assertion đảm bảo cho model và không ghi đè boolean provider. Nếu mô hình trả true cho câu kỳ vọng đạt, ứng dụng vẫn trả 1015; nếu trả false cho câu kỳ vọng chặn, ứng dụng vẫn đi tiếp. Ghi nhận chặn nhầm/cho qua nhầm để đánh giá, không tự thêm ngoại lệ.

Các dòng mô tả nhóm nhạy cảm là **đặc tả fixture**, không gửi nguyên mô tả trong ngoặc vuông tới AI rồi coi là kiểm tra nội dung gây hại. Chỉ dùng mẫu tổng hợp phù hợp, không có người thật hoặc chi tiết gây hại; chưa có fixture thì ghi “Chưa có mẫu”, không tự ghi kết quả.

| ID | Văn bản tổng hợp / nhóm tình huống | Kỳ vọng đánh giá | Thực tế | Nhận xét |
|---|---|---|---|---|
| V01 | Chào mọi người, chúc một ngày tốt lành! | Đạt | Chưa chạy | Giao tiếp thông thường |
| V02 | Hôm nay mình học Java và hoàn thành bài tập nhóm. | Đạt | Chưa chạy | Có dấu |
| V03 | Hom nay minh hoc Java va hoan thanh bai tap nhom. | Đạt | Chưa chạy | Cặp không dấu của V02 |
| V04 | Cảm ơn cả nhóm đã giúp mình nhé 😊🎉 | Đạt | Chưa chạy | Emoji trong câu tiếng Việt |
| V05 | Mình không đồng ý với ý kiến này, chúng ta cùng trao đổi thêm nhé. | Đạt | Chưa chạy | Bất đồng lịch sự |
| V06 | Dịch vụ giao hàng hôm nay chậm, mong cửa hàng cải thiện. | Đạt | Chưa chạy | Phê bình dịch vụ, không nhắm người |
| V07 | Bài tập khó muốn xỉu, nhưng mình vẫn cố làm tiếp 😅 | Đạt | Chưa chạy | Tiếng lóng, nghĩa bóng |
| V08 | Tôi “đánh bại” con boss trong trò chơi tối qua. | Đạt | Chưa chạy | Ngữ cảnh trò chơi, dấu ngoặc kép |
| V09 | Cô giáo dặn: “Không được bắt nạt bạn bè.” Mình hoàn toàn đồng ý. | Đạt | Chưa chạy | Trích dẫn và phủ định hành vi gây hại |
| V10 | Cả lớp cùng tham gia hoạt động phòng chống bạo lực học đường. | Đạt | Chưa chạy | Thảo luận giáo dục |
| V11 | Mọi người nên tôn trọng sự khác biệt về tín ngưỡng và nguồn gốc. | Đạt | Chưa chạy | Ngữ cảnh chống phân biệt đối xử |
| V12 | Bản tin hôm nay nhắc đến một vụ xô xát, mong mọi người giữ bình tĩnh. | Đạt | Chưa chạy | Tường thuật không đồ họa, không cổ vũ |
| V13 | Mình đang buồn và muốn tìm người tin cậy để tâm sự. | Đạt | Chưa chạy | Tìm kiếm hỗ trợ, không khuyến khích tự hại |
| V14 | Mình sẽ ở bên lắng nghe bạn; hãy tìm sự hỗ trợ khi thấy quá tải. | Đạt | Chưa chạy | Ngữ cảnh hỗ trợ người khác |
| V15 | [Mẫu tổng hợp đe dọa bạo lực trực tiếp, không có danh tính thật hoặc hướng dẫn] | Có thể bị đánh dấu; kỳ vọng chặn | Chưa chạy | Chưa có mẫu; đánh giá nhóm bạo lực/đe dọa |
| V16 | [Mẫu tổng hợp xúc phạm và quấy rối cá nhân nghiêm trọng, không nhắm người thật] | Có thể bị đánh dấu; kỳ vọng chặn | Chưa chạy | Chưa có mẫu; tránh nhầm với phê bình V06 |
| V17 | [Mẫu tổng hợp kích động thù ghét một nhóm được bảo vệ, không chép lời miệt thị chi tiết] | Có thể bị đánh dấu; kỳ vọng chặn | Chưa chạy | Chưa có mẫu; đối chiếu ngữ cảnh V11 |
| V18 | [Mẫu tổng hợp cổ vũ tự gây hại, không có phương pháp hoặc chi tiết thực hiện] | Có thể bị đánh dấu; kỳ vọng chặn | Chưa chạy | Chưa có mẫu; đối chiếu hỗ trợ V13–V14 |
| V19 | [Mẫu tổng hợp mô tả tình dục rõ ràng giữa người trưởng thành; chỉ mô tả nhóm trong tài liệu] | Có thể bị đánh dấu; kỳ vọng chặn | Chưa chạy | Chưa có mẫu; không dùng nội dung liên quan trẻ vị thành niên |
| V20 | [Biến thể không dấu của cùng fixture V15, giữ nguyên nghĩa và không thêm chi tiết] | Kỳ vọng chặn như V15; ghi sai lệch nếu có | Chưa chạy | Chưa có mẫu; đo ảnh hưởng mất dấu |

Khi đánh giá thật ở task phù hợp, ghi ngày chạy, model yêu cầu, định danh model trả về nếu có, ID ca và boolean/nhóm lỗi kỹ thuật; không chép toàn bộ response/key/token vào log. Với ca có mẫu cụ thể hợp lệ, đối chiếu nhãn người đánh giá với flagged: true trên nhãn đạt là chặn nhầm, false trên nhãn chặn là cho qua nhầm. Timeout/phản hồi sai là “không kiểm duyệt được”, không tính là dự đoán đúng/sai. Ca thiếu mẫu không tính vào tỷ lệ đánh giá. Không biến bộ này thành unit test gọi mạng hoặc điều kiện CI phải cho cùng một nhãn ở mọi lần chạy.

## 6. Bàn giao và kiểm tra tài liệu

- File mới duy nhất của Task 01: `docs/ai-moderation/policy-and-cases.md`. Không sửa các tài liệu có sẵn, source, cấu hình hoặc dữ liệu.
- Hợp đồng đầu vào/đầu ra được chốt ở mức đặc tả: content nguyên bản, ba kết quả moderation, validation, mã lỗi/HTTP/thông báo, `assertAllowed(String)` và side effect bị cấm khi lỗi.
- Đã chạy `git status --short`, `git rev-parse HEAD`, đọc lại các file trong bảng đối chiếu và dùng `rg` kiểm tra mã lỗi/moderation/route cập nhật. Đã kiểm tra bộ ca gồm 20 ID V01–V20 và 15 ID M01–M15; đây là kiểm tra nội dung tài liệu, không phải unit test hoặc kiểm thử AI.
- Không chạy lại build/test/E2E, không gọi API provider, không tạo bài hoặc thao tác hạ tầng trong Task 01. Các kết quả môi trường vẫn theo báo cáo Task 00.
- **Khác biệt so với hợp đồng chung: không có.** Không cần sửa `01-SHARED-CONTRACT.md`; các thiếu hụt trong code là công việc đã dự kiến cho task sau.
- Các task phụ thuộc Task 01 có thể dùng tài liệu này để triển khai đúng thứ tự trong START-HERE, với unit test cô lập/key giả. Kiểm tra toàn hệ thống vẫn cần giải quyết các chặn Task 00; không xóa/disable test context để có kết quả xanh.
- Dừng tại Task 01; chưa triển khai AI hoặc bắt đầu task kế tiếp.
