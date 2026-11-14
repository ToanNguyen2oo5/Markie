# Task 03 — Viết client và service kiểm duyệt

## Phụ thuộc

Task 02 (config) và Task 06 (enum lỗi). Đọc hợp đồng chung trước khi triển khai.

## File dự kiến

Trong `post/post/src/main/java/com/stewie/post/moderation/`: `ModerationClient.java`, `ModerationService.java`, `ModerationProviderException.java`, DTO phản hồi nếu cần. Test tương ứng trong `post/post/src/test/java/com/stewie/post/moderation/`.

## Các bước

1. Dùng `RestClient` với timeout từ Task 02, gửi POST `/v1/moderations`, header Bearer key và JSON `{ "model": "<configured-model>", "input": "<content>" }`. Dùng JSON serializer, không nối chuỗi JSON thủ công.
2. Đọc `results[0].flagged`. DTO phải phân biệt thiếu/null với false, ví dụ dùng `Boolean` thay vì `boolean`. Bảo đảm chuỗi `"false"`, số hoặc kiểu sai không được serializer âm thầm chuyển thành kết quả hợp lệ; có thể dùng Jackson tree kiểm tra `isBoolean()`.
3. `ModerationClient.isFlagged(content)` chỉ trả boolean khi response hợp lệ. Response lỗi/không hợp lệ ném `ModerationProviderException`. Có thể bỏ qua các field bổ sung của nhà cung cấp; không yêu cầu model trả lời văn bản giải thích.
4. Bao phủ HTTP 401/403/429/5xx, lỗi kết nối, read timeout, body trống/JSON sai/results thiếu/rỗng/flagged thiếu hoặc sai kiểu. Không retry tự động và không coi lỗi là đạt.
5. `ModerationService.assertAllowed(content)` gọi client: false → trả về; true → `AppException(POST_CONTENT_REJECTED)`; provider exception → `AppException(MODERATION_UNAVAILABLE)`.
6. Không bọc nhầm `AppException` bị chặn thành lỗi dịch vụ. Không bắt `Exception` quá rộng đến mức che lỗi lập trình nếu không cần.
7. Không log nội dung/key/body response. Nếu ghi log, chỉ ghi loại lỗi/status an toàn; kiểm tra exception message từ HTTP client trước khi log nguyên exception vì có thể chứa response body.

## Kiểm thử bắt buộc

- Request đúng endpoint, method, header và nội dung JSON, dùng key giả.
- `flagged=false`: service không ném lỗi.
- `flagged=true`: đúng error enum 1015.
- Provider exception: đúng enum 1016.
- HTTP lỗi và các response không hợp lệ đều không cho qua.
- Exception timeout từ transport được ánh xạ đúng, không gọi lại request.
- Không gọi mạng thật trong unit test. Ưu tiên `MockRestServiceServer.bindTo(RestClient.Builder)` nếu phù hợp; inject mock client vào service test.

## Nghiệm thu và bàn giao

Backend compile được; unit test lớp mới chạy độc lập. Cung cấp cho Task 05 chữ ký `void assertAllowed(String content)` và cách inject. Chưa sửa `PostService`, controller hoặc frontend trong task này.
