# Checklist UI thủ công — U1–U6 đã được người dùng xác nhận

**Kết luận cuối ngày 13/11/2026: U1–U6 đạt trong phạm vi kiểm thử thủ công.**
Sau commit `487578e`, người dùng xác nhận bổ sung ở 501/500: thử nhấn nút Đăng
bị khóa không phát sinh POST `/post/create` và feed không thêm bài. Không còn
mục bắt buộc UI chờ xác nhận. Đây không phải browser E2E tự động.

Ngày ghi nhận: 13/11/2026 (Asia/Saigon), sau commit `cd3f88b`. Nguồn bằng chứng:
người dùng trực tiếp kiểm thử và trả lời trong phiên chat; agent không điều
khiển được trình duyệt, không nhận screenshot/HAR hoặc tự chạy browser E2E.

Mở http://localhost:3000, đăng nhập tài khoản thử nghiệm. Chỉ dùng nội dung tổng
hợp. Mở DevTools → Network, lọc `/post/create`; không gửi key/token vào chat.

| Mục | Thao tác | Kết quả mong đợi | Kết quả người dùng |
|---|---|---|---|
| U1 | Gửi bài vô hại; quan sát khi request còn chờ | Có “Đang kiểm duyệt…”, textarea/nút Đăng/nút đóng/backdrop bị khóa | **Đạt theo người dùng**: xác nhận có trạng thái chờ và khóa thao tác |
| U2 | Bấm Đăng nhanh nhiều lần trong U1 | Chỉ 1 POST `/post/create`; thành công chỉ thêm 1 bài vào feed | **Đạt theo người dùng**: xác nhận đúng cả request và bài được thêm |
| U3 | Gửi câu đe dọa tổng hợp; kiểm tra response thực tế | Giữ modal/nguyên nội dung khi 422/1015, không thêm bài vào feed | **Đạt theo người dùng**: DevTools xác nhận HTTP 422/code 1015, modal giữ nội dung, không có bài mới |
| U4 | Sửa bản nháp U3 thành lời chào vô hại rồi gửi lại | Đăng thành công, modal đóng; mở composer lại có nội dung trống | **Đạt theo người dùng**: xác nhận đăng thành công/đóng modal, sau đó xác nhận riêng mở lại nội dung trống |

Fixture: [vietnamese-acceptance-fixtures.json](../../post/post/src/test/resources/moderation/vietnamese-acceptance-fixtures.json).
Đây là AI thật; `[BLOCK]` không phải quy tắc chặn. Nếu request quá nhanh để quan
sát U1, hoặc không nhận 422 ở U3, ghi **chưa thử/không quan sát được**, không suy
ra đạt. Không đổi key/endpoint hoặc dừng Post Service để tạo điều kiện thử.

Người dùng đã hoàn tất phản hồi U1–U4 và xác nhận bổ sung phần bản nháp trống.
Không chép câu đe dọa vào báo cáo; người dùng dùng mẫu tổng hợp riêng, không coi
đó là lần chạy lại nguyên fixture V16–V19. Không thay ghi nhận mô hình V12/V20.

**UI U1–U6 đạt theo các xác nhận dưới đây.** Các nhánh phụ mạng/response sai,
refresh token lỗi riêng và từng biến thể emoji chưa có browser evidence; không
nâng thành điều kiện Task 08 mới. Không gây lỗi bằng đổi key/endpoint hoặc dừng
Post Service người dùng.

## U5 — HTTP 503/code 1016 giả lập trong tab, được người dùng xác nhận

Ngày 13/11/2026: người dùng xác nhận các bước đúng mô tả, sau lỗi đã giữ nguyên
nội dung và bấm Đăng lại thành công. **U5 đạt theo kiểm thử thủ công**, không phải
browser E2E tự động. Không cần sửa nội dung để thử lại lỗi kỹ thuật 503/1016;
khác với 422/1015 từ chối nội dung. Giả lập tự gỡ nên lần thứ hai gọi backend thật.

Mục bắt buộc theo Task 08 §3.3 và điều kiện ba luồng đạt/chặn/lỗi ở UI. Đoạn mã
dưới chỉ thay `window.fetch` tạm thời của **tab localhost:3000**; không đổi URL
backend/key, không gọi OpenAI, không gửi request tạo bài đầu tiên tới server.
Không đọc hoặc in token/header/body. Request khác được chuyển tiếp nguyên vẹn.
Không dùng “Edit and resend” hoặc sửa response của request đã thực sự gửi: bài
có thể đã được lưu trước khi bạn thấy response giả.

1. Đăng nhập, mở composer, nhập `MARKIE-UI503-TEST` và ghi nhận feed hiện tại.
2. Mở DevTools → Console của chính tab `http://localhost:3000`. Đọc rồi chạy đoạn
   mã sau. Nó chỉ giả lập POST cùng origin `/post/create`, chờ 1,5 giây rồi trả
   HTTP 503 với JSON code 1016. Tự khôi phục sau phản hồi hoặc tối đa 2 phút.

```javascript
(() => {
  if (location.origin !== 'http://localhost:3000') {
    throw new Error('Chỉ chạy trong tab http://localhost:3000');
  }
  if (window.__markieRestore503) {
    throw new Error('Đang có kiểm tra 503; hãy khôi phục trước');
  }
  const originalFetch = window.fetch;
  let timer;
  let hits = 0;
  const restore = () => {
    if (window.fetch === simulatedFetch) window.fetch = originalFetch;
    clearTimeout(timer);
    if (window.__markieRestore503 === restore) delete window.__markieRestore503;
  };
  const simulatedFetch = async function (input, init) {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);
    const method = String(init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (url.origin === location.origin && url.pathname === '/post/create' && method === 'POST') {
      console.info('[Markie UI test] simulated 503/1016 #' + (++hits) + '; no API request sent');
      await new Promise(resolve => setTimeout(resolve, 1500));
      restore();
      return new Response(JSON.stringify({
        code: 1016,
        message: 'Chưa thể kiểm duyệt bài viết. Vui lòng thử lại sau.'
      }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    return originalFetch.call(this, input, init);
  };
  window.__markieRestore503 = restore;
  window.fetch = simulatedFetch;
  timer = setTimeout(restore, 120000);
  console.info('[Markie UI test] armed for the next create request; auto-restores within 2 minutes');
})();
```

3. Bấm Đăng một lần ngay sau khi cài giả lập. Trong 1,5 giây phải thấy trạng thái
   chờ và thao tác bị khóa. Sau đó kiểm tra đủ năm kết quả:
   - Thông báo đúng: **“Chưa thể kiểm duyệt bài viết. Vui lòng thử lại sau.”**
   - Modal còn mở, nội dung vẫn đúng `MARKIE-UI503-TEST`.
   - Nhãn chờ/spinner hết; textarea, nút Đăng và nút đóng dùng lại được.
   - Feed không thêm bài cho lần lỗi.
   - Console có dòng cố định `simulated 503/1016 #1; no API request sent`.
4. Giả lập đã tự gỡ. Đổi nội dung thành lời chào vô hại có marker riêng rồi bấm
   Đăng lại. Lần này đi qua backend/provider thật: mong đợi thành công, chỉ thêm
   1 bài và modal đóng. Nếu AI lỗi/chặn thật, ghi đúng kết quả, không coi là đã đạt
   phần thử lại thành công. Dùng dữ liệu thử vì lần thành công được lưu thật.
5. Nếu hủy trước khi bấm Đăng, chạy `window.__markieRestore503?.()` hoặc tải lại
   tab để dọn giả lập. Không thay/dừng Post Service PID 26776.

Đây là response tạo trong bộ nhớ tab: **Network không có request 503 thật** và
không chứng minh backend trả 503 trong lượt này. HTTP status/code được đoạn mã
trên đặt cố định; UI cần được người dùng quan sát. Không bật tùy chọn bỏ bảo vệ
DevTools nếu trình duyệt chặn thao tác; báo chưa chạy để chọn môi trường test khác.

| Kiểm tra U5 | Trạng thái |
|---|---|
| Đúng thông báo 1016 | Đạt theo người dùng |
| Giữ modal và nguyên nội dung | Đạt theo người dùng |
| Giải phóng trạng thái chờ/khóa | Đạt theo người dùng |
| Không thêm bài vào feed ở lần lỗi | Đạt theo người dùng |
| Có thể thử lại; kết quả lần thử lại | Đạt: giữ nguyên nội dung, bấm Đăng lại thành công sau khi giả lập tự gỡ |

Không có raw response/HAR mới; bằng chứng là người dùng trực tiếp xác nhận.
Lần đầu mô phỏng lỗi trong tab không chứng minh backend lỗi trong lượt này;
lần thử lại thành công được xác nhận qua UI. Không thay key/endpoint hoặc process.

## Phạm vi ngoài U5 — không mở rộng nghiệm thu

**Bắt buộc đã hoàn tất UI:** nội dung dài 500/501 ASCII, theo U6 dưới đây.
Đọc bài cũ đã được xác minh qua API có JWT ở phiên tiếp tục từ `79d9d5d`:
bài ngày 31/10/2026 trả 200/1000, content và toàn bộ bản ghi không đổi sau đọc.
Không tuyên bố bài cũ được kiểm duyệt lại, không coi đây là thao tác browser.

**Ca phụ, không là cổng nghiệm thu Task 08 mới:** UI lỗi mạng, HTML/JSON response
sai (robustness của Task 07), refresh token lỗi riêng, thử thêm 250/251 emoji trên
UI. Các mục này chưa có bằng chứng browser hiện tại; giới hạn UTF-16/response
handling đã có kiểm tra backend hoặc harness lịch sử ở mức thấp hơn, không
được mô tả như đã chạy UI. Không yêu cầu thêm tải, thiết bị, browser hoặc policy.

## U6 — UI đúng 500 và 501 ký tự, đã được xác nhận đầy đủ

1. Tại localhost:3000, mở composer. Trong DevTools Console chạy
   `copy('a'.repeat(501))`, rồi dán vào textarea. Mong đợi bộ đếm **501/500**,
   nút Đăng bị khóa, không có POST `/post/create` hoặc bài mới.
2. Xóa đúng một chữ `a`, còn **500/500**. Mong đợi nút Đăng bật. Bấm một lần,
   xác nhận có đúng một POST; ghi HTTP/code và kết quả UI. Nếu AI thật cho qua,
   bài đăng thành công/modal đóng; nếu AI chặn hoặc lỗi, ghi đúng kết quả, không
   suy ra lỗi giới hạn độ dài chỉ vì AI không cho qua.

Lệnh Console chỉ chép chuỗi tổng hợp vào clipboard, không đổi fetch/key/endpoint
hoặc gửi request. Nếu DevTools chặn, không bỏ bảo vệ; ghi chưa thử. Lần gửi 500
đi qua AI thật và có thể lưu bài thử. Không gửi key/token vào chat.

| Biên | Trạng thái |
|---|---|
| 501: bộ đếm 501/500 | Đạt theo người dùng |
| 501: nút Đăng bị khóa | Đạt theo người dùng |
| 501: Network không có POST `/post/create` | Đạt: người dùng xác nhận riêng thử nhấn không phát sinh POST |
| 501: không có bài mới trong feed | Đạt: người dùng xác nhận riêng feed không thêm bài |
| 500: bộ đếm 500/500, nút Đăng bật | Đạt theo người dùng sau khi xóa một chữ a |
| 500: bấm một lần có đúng một request | Đạt theo người dùng |
| 500: HTTP 200/code 1000, modal đóng, bài xuất hiện trên feed | Đạt theo người dùng |

Kết quả 500 và counter/disable 501 nhận sau `f29d01a`; hai xác nhận riêng còn
thiếu của 501 nhận sau `487578e`, cùng ngày 13/11/2026. Không có HAR/browser
automation mới; đây là xác nhận thủ công. **U6 đạt cả 500 và 501**, dựa trên phản
hồi trực tiếp, không suy từ disabled. Không thay U1–U5, V16–V19 hoặc V12/V20.

Kiểm tra API đúng 500 qua provider giả lập đã đạt trong instance test riêng;
**không thay thế U6 trên browser**. Không yêu cầu lặp U1–U5 hoặc V16–V19.
