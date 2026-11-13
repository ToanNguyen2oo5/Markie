# Task 02 — Cấu hình kết nối AI

## Phụ thuộc và phạm vi

Task 01 hoàn thành. Sửa `post/post/src/main/resources/application.yaml`; tạo `com.stewie.post.moderation.ModerationProperties` và cấu hình bean liên quan nếu cần. Chưa gọi API hoặc sửa `PostService`.

## Các bước

1. Thêm nhánh `app.moderation` đúng `01-SHARED-CONTRACT.md`, giữ nguyên `app.services.profile` và mọi cấu hình hiện có.
2. Bind bằng `@ConfigurationProperties(prefix = "app.moderation")`, đăng ký bean theo cách phù hợp Spring Boot hiện tại. Kiểm tra key/model/base URL không trống và timeout dương. Tránh Lombok `@Data`/`toString` làm lộ key.
3. Tạo `RestClient` dành riêng cho moderation hoặc cung cấp cấu hình để Task 03 tạo client. Đặt tên bean rõ nếu có nhiều client; không đổi cấu hình HTTP của Profile Service.
4. Dùng request factory hỗ trợ timeout rõ ràng. Với `SimpleClientHttpRequestFactory`, cấu hình connect/read timeout theo đơn vị milliseconds. Không tạo client mới cho từng bài.
5. Không thêm công tắc bỏ qua AI hoặc giá trị key thật mặc định. Cho phép base URL server stub từ cấu hình test, không cho request người dùng thay URL.
6. Tạo `docs/ai-moderation/configuration.md`: biến môi trường, ví dụ PowerShell `$env:OPENAI_API_KEY = '<API_KEY_CUA_BAN>'`, cách chạy Post Service trong cùng phiên, model và timeout. Nêu Spring Boot không tự đọc `.env` nếu chưa có cơ chế nạp.
7. Thêm test binding/validation nhẹ, không cần full application hoặc hạ tầng, dùng giá trị giả. Kiểm tra thiếu key, timeout 0/âm và cấu hình hợp lệ.

## Nghiệm thu

- Không có secret trong Git/log; không in toàn bộ cấu hình moderation.
- Bean/config được nạp đúng một lần và không xung đột.
- Thiếu cấu hình báo lỗi khởi động rõ; test không đòi key thật.
- Không thêm dependency nếu Spring Web/Validation hiện có đã đủ.

## Bàn giao cho Task 03

Tên bean, trường cấu hình, cách inject, kiểm thử đã chạy. Nếu bean `RestClient` sẽ được tạo tại Task 03, ghi rõ để tránh hai agent tạo trùng.
