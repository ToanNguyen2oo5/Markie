# Hợp đồng chung — mở rộng từ kiểm duyệt văn bản

## Hiện trạng đã đọc

Ở checkout đã tham khảo, `PostRequest` chỉ có content bắt buộc, tối đa 500 ký tự; `PostService` gọi ModerationService trước lưu bài. ModerationClient dùng RestClient, model và API key cấu hình sẵn, kiểm tra nghiêm ngặt boolean flagged. Composer đã xử lý chờ, ref chống gửi lặp và lỗi 1015–1018.

File Service có `/media/upload`, `/media/download/{fileName}` và storage đĩa/MongoDB. Download đang công khai, upload chỉ cần người dùng đăng nhập. FileResponse hiện chưa trả ID riêng. Bài chưa có liên kết ảnh; nút Ảnh/video chưa thực sự chọn file.

Agent phải kiểm tra lại checkout hiện tại trước khi dựa vào mô tả. Không sửa luồng avatar hoặc biến upload chung thành cơ chế chứng nhận ảnh đã duyệt.

## Phạm vi và giới hạn

- Bài chỉ văn bản vẫn dùng `POST /post/create` JSON như cũ.
- Bài có ảnh: tối đa 1 ảnh, văn bản bắt buộc 1–500 đơn vị UTF-16, không chỉ khoảng trắng.
- Chỉ JPEG/PNG tĩnh; tối đa **5 MiB = 5.242.880 byte**. Giới hạn mỗi chiều 6.000 pixel, tổng tối đa 16.000.000 pixel. Đây là giới hạn sản phẩm đề xuất, không phải giới hạn nhà cung cấp.
- Không SVG, GIF, WebP, APNG, video, URL tùy ý, nhiều ảnh, OCR hay cập nhật bài.
- File phải được xác nhận định dạng bằng signature và parser thực tế; đọc kích thước bằng metadata trước khi decode toàn ảnh. Từ chối ảnh lỗi, đa khung/động và file giả mạo. Giới hạn request trước khi đọc Base64; không tin riêng extension/MIME.
- Không crop/resize nội dung ảnh sau kiểm duyệt. Ảnh gửi AI là đúng byte ảnh được lưu/hiển thị. Nếu cần chuẩn hóa ảnh trong tương lai thì phải duyệt chính phiên bản cuối.

## Request và response

Route mới `POST /post/create-with-image`, `multipart/form-data`:

- Part `content`: trường văn bản thông thường, binding bằng @RequestParam hoặc @ModelAttribute có validation rõ ràng.
- Part `image`: đúng một file bắt buộc. Reject nhiều part image; không nhận imageUrl/fileId từ client để bỏ qua kiểm duyệt.
- JWT như route cũ. Frontend dùng FormData, không tự đặt Content-Type vì browser cần boundary.
- Success code 1000, PostResponse thêm `image` nullable: `{fileId,url,contentType,size,width,height}`. Bài cũ/thuần văn bản: null hoặc không có field này theo quy tắc serialize hiện có.
- URL do backend tạo, frontend không tự ghép filename gốc hoặc local path.

## Mã lỗi

Giữ 1015/422 cho nội dung/ảnh bị đánh dấu; 1016/503 cho provider không dùng được. Giữ validation content 1017/1018. Không dùng lỗi ảnh để thay ý nghĩa mã cũ.

| Enum mới | Mã dự kiến | HTTP | Thông báo |
|---|---:|---:|---|
| POST_IMAGE_REQUIRED | 1019 | 400 | Vui lòng chọn một ảnh. |
| POST_IMAGE_TOO_LARGE | 1020 | 413 | Ảnh không được vượt quá 5 MiB. |
| POST_IMAGE_INVALID | 1021 | 400 | Ảnh không hợp lệ. Chỉ hỗ trợ ảnh JPEG hoặc PNG tĩnh. |
| POST_IMAGE_DIMENSIONS_EXCEEDED | 1022 | 400 | Kích thước ảnh vượt giới hạn cho phép. |
| POST_IMAGE_COUNT_EXCEEDED | 1023 | 400 | Mỗi bài viết chỉ được đính kèm một ảnh. |
| POST_MEDIA_STORAGE_UNAVAILABLE | 1024 | 503 | Chưa thể lưu ảnh. Vui lòng thử lại sau. |

I02 kiểm tra trùng mã ở checkout thật trước khi chốt. Phải xử lý lỗi multipart vượt giới hạn ở tầng framework để có HTTP 413/response rõ ràng; không để catch-all biến thành lỗi 400/9999. Tổng multipart request đề xuất 6 MiB, file 5 MiB; kiểm tra cấu hình Gateway/proxy và File Service tương ứng. Request vượt tổng giới hạn có thể chỉ trả thông báo 413 chung an toàn, không bắt buộc suy ra chính xác part vi phạm.

## Kiểm duyệt

Tái sử dụng OpenAI API key, RestClient, timeout và kiểm tra response hiện tại. Giữ `isFlagged(String)` và `assertAllowed(String)` để test/luồng cũ tiếp tục hoạt động. Thêm biến thể ảnh nhận đối tượng ảnh đã validate (bytes, MIME xác thực, kích thước), không nhận URL do người dùng cung cấp.

Một request kiểm duyệt chứa mảng input: `{type:'text',text:content}` và `{type:'image_url',image_url:{url:'data:image/png;base64,...'}}` hoặc MIME JPEG phù hợp. Dùng JSON serializer, không nối JSON thủ công. boolean flagged true → 1015; false → tiếp tục; missing/null/wrong type/HTTP lỗi/timeout → 1016. Không retry tự động và không fallback cho đăng.

Tài liệu đối chiếu: https://developers.openai.com/api/docs/guides/moderation . Một số category chỉ hỗ trợ text, không được diễn giải điểm 0 ở category không hỗ trợ ảnh là ảnh chắc chắn an toàn. Không dùng nội dung xâm hại tình dục trẻ em đã biết hoặc nghi ngờ làm fixture gửi API. Ca kỹ thuật chặn dùng response giả lập; ca AI thật dùng fixture hợp lệ, có quyền sử dụng.

## Lưu trữ và ranh giới xác thực

Chỉ sau AI cho qua, Post Service mới gọi File Service để lưu byte ảnh. Dùng namespace/endpoint mới riêng cho post-media, không tái sử dụng generic upload làm bằng chứng đã duyệt.

Mặc định triển khai nhỏ: các endpoint ghi/xóa post-media yêu cầu **JWT người dùng hợp lệ + credential nội bộ riêng giữa Post và File Service**, ví dụ header secret từ biến `POST_MEDIA_INTERNAL_SECRET` ở hai backend. Không dùng key OpenAI làm secret nội bộ. File Service kiểm tra cả hai; ownerId lấy từ JWT, không tin userId do client gửi. Header nội bộ chỉ được Post Service thêm cho client riêng, không forward header nhận từ browser. Thiếu secret phải có chính sách cấu hình/test rõ ràng, tuyệt đối không bỏ xác thực.

Không mở rộng credential nội bộ sang frontend hoặc HTTP client gọi OpenAI/Profile. Không dựa vào tên `/internal` hoặc việc route không xuất hiện trên Gateway để bảo vệ. Môi trường ngoài localhost phải dùng kênh truyền nội bộ được bảo vệ, không gửi secret qua mạng không tin cậy. Nếu repo đã có cơ chế service identity phù hợp, I02 có thể chọn dùng nó thay secret nhưng phải ghi hợp đồng cụ thể trước I05.

Ảnh đã duyệt được lưu immutable dưới ID server sinh, có thể phục vụ công khai theo phạm vi bài hiện tại. Endpoint đọc mới chỉ truy cập kho post-media; endpoint `/media/download` cũ không được đọc kho mới bằng cách đoán ID/path. Luồng này không bổ sung kiểm duyệt avatar/generic media cũ.

## Thứ tự và lỗi từng bước

1. Xác thực → validate content/file → duyệt text+ảnh.
2. Lưu ảnh đã duyệt → nhận metadata → lưu Post với image.
3. Save Post thành công mới phát event và trả response.

AI chặn/lỗi: không gọi File Service, không lưu Post, không Kafka. Lưu ảnh lỗi: 1024, không Post/event. Lưu Post thất bại sau lưu ảnh: gọi xóa bù đúng file vừa tạo; không xóa file khác hoặc file bài đã lưu. Nếu delete bù thất bại, log an toàn fileId/correlation và đưa vào báo cáo xử lý file mồ côi; không tuyên bố toàn hệ thống có transaction nguyên tử. File Service phải dọn file đĩa nếu save metadata thất bại.

Nếu Mongo đã commit nhưng client gặp lỗi không rõ trạng thái, không xóa ảnh một cách mù quáng; xác minh tham chiếu Post bằng ID tạo trước hoặc cơ chế tương đương, ghi cách xử lý trong I06. Kafka lỗi sau save giữ cách xử lý hiện có, không xóa ảnh/bài đã lưu vì lỗi phát event. Không thêm outbox hoặc bảo đảm exactly-once trong phạm vi này.

Ảnh được công khai sau khi AI đạt; nếu save Post thất bại, ảnh có thể tồn tại ngắn hạn trước cleanup nhưng đã qua duyệt. Không hứa bảo đảm “chỉ tải ảnh được sau khi bài lưu thành công” với thiết kế đơn giản này.

## Frontend và tính tương thích

Preview bằng object URL local, thu hồi URL khi thay/xóa/unmount/success. Giữ File object và content khi lỗi; khóa chọn/xóa ảnh, textarea, đóng/backdrop và submit khi đang gửi. Khi đổi ảnh nên xóa lỗi cũ liên quan. Không upload ngay khi chọn ảnh.

Feed/profile/detail/search hiển thị field image nếu có. Bài cũ không cần migration. Kafka event image là field tùy chọn; producer/consumer tương thích khi thiếu field. Không đưa Base64, path đĩa, secret hoặc metadata owner nội bộ vào event. Search vẫn tìm theo text, chưa tìm bằng nội dung ảnh.
