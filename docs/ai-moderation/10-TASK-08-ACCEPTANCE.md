# Task 08 — Kiểm thử tích hợp và hướng dẫn sử dụng

## Phụ thuộc và phạm vi

Task 05 và 07 hoàn thành, môi trường Task 00 khả dụng cho kiểm thử toàn luồng. Sở hữu tài liệu README và báo cáo kiểm thử; nếu phát hiện lỗi, sửa đúng phạm vi hoặc giao lại agent sở hữu file, tránh chỉnh chồng chéo.

## 1. Kiểm tra tự động

Trong `post/post`, dùng Maven Wrapper theo hệ điều hành:

```powershell
.\mvnw.cmd "-Dtest=Moderation*Test,PostRequestValidationTest,PostControllerValidationTest,ModerationErrorHandlerTest,PostServiceTest" test
```

Tên test là quy ước gợi ý; thay bằng tên class thực tế đã tạo. Kiểm tra Surefire report để bảo đảm có test được chạy. Test nghiệp vụ phải chạy bằng giả lập, không cần API key thật hoặc hạ tầng.

Chạy thêm `.\mvnw.cmd test` khi đã có cấu hình/môi trường cần thiết; test context hiện có có thể phụ thuộc hạ tầng. Không che kết quả thất bại bằng cách xóa/disable test. Trong `web-app`, chạy `npm run build` và `npm run lint`.

## 2. Kiểm tra API bằng phản hồi AI giả lập

Dùng server stub riêng trên localhost và `OPENAI_MODERATION_BASE_URL` của môi trường test; không thêm endpoint stub vào app sản phẩm. Vẫn đăng nhập/đi qua backend thật. Key gửi stub là key giả. Không trỏ key thật đến URL không tin cậy.

| Ca | Kết quả yêu cầu |
|---|---|
| Content hợp lệ, stub `flagged=false` | Code 1000; có một bài mới, một lần gửi Kafka, tìm được sau đồng bộ |
| Content hợp lệ, stub `flagged=true` | 422/1015; không lưu bài, không gửi event |
| Stub timeout/401/429/500 | 503/1016; không lưu, không gửi event |
| Stub JSON sai/results rỗng/flagged thiếu/null/sai kiểu | 503/1016; không cho qua |
| Thiếu/null/rỗng/chỉ khoảng trắng | 400/1017; không gọi stub |
| 501 ký tự | 400/1018; không gọi stub |
| Đúng 500 ký tự và stub cho qua | Đăng thành công |
| Gọi thẳng API bằng công cụ HTTP | Vẫn phải qua validation và AI |

Dùng chuỗi nhận diện khác nhau cho từng ca trong môi trường phát triển. Với ca chặn, kết hợp unit test xác nhận không gọi save/send và kiểm tra không có bản ghi trong MongoDB, `/post/my-posts`, tìm kiếm. Không chỉ dựa vào kết quả tìm kiếm tức thì vì Kafka/Elasticsearch đồng bộ bất đồng bộ. Giữ ghi chú thời gian chờ hữu hạn cho ca được phép.

Ví dụ request sau khi lấy token thử nghiệm hợp lệ:

```http
POST http://localhost:8888/post/create
Authorization: Bearer <TOKEN_THU_NGHIEM>
Content-Type: application/json

{"content":"Bài thử kiểm duyệt Markie"}
```

Không lưu token thật vào repo hoặc báo cáo.

## 3. Thử AI thật và giao diện

1. Khôi phục base URL OpenAI, dùng key từ biến môi trường. Chỉ thực hiện nếu có key được cung cấp cho môi trường thử nghiệm; thiếu key thì ghi chưa kiểm tra, không bịa kết quả.
2. Chạy bộ ca tiếng Việt từ Task 01. Ghi kỳ vọng và thực tế; ca nhạy ngữ cảnh dùng để đánh giá chặn nhầm/cho qua nhầm, không sửa thuật toán ngoài phạm vi để ép kết quả.
3. Trên giao diện thử đăng thành công, bị chặn, AI lỗi; xác nhận giữ nội dung và sửa/gửi lại được.
4. Kiểm tra bấm nhiều lần, textarea khi chờ, modal, thông báo lỗi và nội dung dài.
5. Kiểm tra bài cũ vẫn đọc được. Không tuyên bố bài cũ đã qua duyệt.

## 4. Cập nhật tài liệu

Trong README thêm mục “AI kiểm duyệt bài viết”: phạm vi, luồng, biến môi trường, lỗi 1015–1018, cách chạy và cách thử. Ghi rõ key chỉ ở backend; ứng dụng không tự đọc `.env`; AI lỗi thì chưa đăng bài.

Tạo `docs/ai-moderation/acceptance-report.md` gồm commit kiểm tra, phiên bản môi trường, danh sách test/lệnh/kết quả, các ca thủ công, lỗi còn lại và mục chưa chạy. Không ghi secret hoặc nội dung thật của người dùng.

## Điều kiện hoàn thành

- Unit test nghiệp vụ và build frontend đạt; có kết quả lint được phân loại rõ.
- Có bằng chứng ba luồng đạt/chặn/lỗi hoạt động đúng ở backend và UI.
- Nội dung chưa được duyệt không phát sinh bản ghi/event mới.
- Không có key thật, bypass hoặc stub test trong mã sản phẩm.
- Nếu thiếu hạ tầng/key để chạy E2E, báo “triển khai xong, chưa nghiệm thu toàn luồng” và liệt kê chính xác phần chờ; không ghi hoàn thành nghiệm thu.
- Không triển khai/push thay đổi ra môi trường dùng thật trong task này.
