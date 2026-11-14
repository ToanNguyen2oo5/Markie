# Task 07 — Giao diện đăng bài và thông báo kiểm duyệt

## Phụ thuộc và phạm vi

Có bảng mã lỗi Task 06. Có thể phát triển với phản hồi giả lập, kiểm thử thật sau Task 05. Sở hữu `web-app/src/components/feed/CreatePostCard.tsx`.

## Hiện trạng cần giữ

Component đã có `submitting`, `error`, `content`; gọi API qua Gateway bằng `/post/create`; chỉ đóng modal và xóa nội dung khi `res.ok && data.code === 1000`. Giữ cơ chế refresh token và callback `onPostCreated`.

## Các bước

1. Dùng trạng thái `submitting` hiện có, hiển thị nhãn “Đang kiểm duyệt…” trong khi chờ phản hồi. Khóa nút Đăng và ngăn gửi lặp trong handler; có thể dùng ref nếu cần chống hai lần bấm trước khi state cập nhật.
2. Khóa textarea khi request đang chạy để tránh người dùng thay nội dung trong lúc request đang xử lý. Giữ cơ chế ngăn đóng modal khi chờ.
3. Đọc JSON và xử lý code 1015, 1016, 1017, 1018 theo thông báo hợp đồng. Có thể ưu tiên message backend với fallback tiếng Việt tương ứng; không đưa phản hồi kỹ thuật ra UI.
4. Bị chặn hoặc lỗi AI: giữ modal, giữ content, hiện lỗi, bật lại nút sau khi request kết thúc; không gọi `onPostCreated`.
5. Đạt: callback một lần với result hiện có, xóa content và đóng modal như cũ. Không tự thêm bài vào feed trước khi server xác nhận.
6. Xử lý response không phải JSON và lỗi mạng bằng thông báo chung; `finally` phải mở lại trạng thái thao tác. Không giả định mọi HTTP 503 đều có JSON.
7. Giữ giới hạn 500 theo `.length`; không gọi OpenAI hoặc đặt API key trong frontend. Không thêm dependency UI/test chỉ cho thay đổi nhỏ này.

## Kiểm tra

- Response 1000: một bài xuất hiện, modal đóng.
- 422/1015: giữ bài, sửa nội dung rồi đăng lại được.
- 503/1016: giữ bài, báo thử lại.
- 400 validation: hiện thông báo.
- HTML/error body, mất mạng: không crash, nút được bật lại.
- Bấm nhanh hai lần: chỉ gửi một request khi đang chờ.
- Chạy `npm run build` và `npm run lint` trong `web-app`; báo riêng lỗi có sẵn.

Có thể kiểm thử thao tác bằng browser/request interception hoặc mock tạm không commit. Không để chế độ giả lập/bypass kiểm duyệt trong sản phẩm. Nếu không có môi trường trình duyệt, ghi rõ phần kiểm tra UI chưa thực hiện.
