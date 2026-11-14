# Bàn giao Task 07 — Giao diện đăng bài với kiểm duyệt AI

Trạng thái: **hoàn thành phần triển khai Task 07**, ngày 13/11/2026 (Asia/Saigon). Build toàn frontend còn bị chặn bởi lỗi có sẵn ngoài phạm vi; chưa kiểm thử UI bằng trình duyệt/E2E. Dừng sau Task 07, chưa thực hiện Task 08.

## Xác minh checkout và phụ thuộc

- Repository: `C:/Users/LMT/Documents/University/Nam4/N4_HK1/DACN/Markie`; nhánh `feature/ai-post-moderation`, HEAD đầu phiên `b1f66fd` (Task 05). `git status --short` đầu phiên rỗng. Không tạo nhánh hoặc ghi đè thay đổi có sẵn.
- Đã đọc START-HERE, SHARED-CONTRACT, TASK-07-FRONTEND và handoff Task 05/06. Không tìm thấy `AGENTS.md` trong repository (kể cả file ẩn, ngoài `.git`/`node_modules`) hoặc các thư mục cha đến gốc ổ C.
- Phụ thuộc có đủ: Task 05 gọi `assertAllowed` trước save/Profile/Kafka; Task 06 có enum 1015–1018 đúng HTTP/thông báo. Báo cáo 94/94 backend là kết quả phiên Task 05, không chạy lại trong phiên này. So với commit tham chiếu `85957fe`, backend đã có các kết quả task trước; đã đọc lại mã thực tế.

## File và hành vi

| File | Thay đổi |
|---|---|
| `web-app/src/components/feed/CreatePostCard.tsx` | Trạng thái chờ kiểm duyệt, khóa thao tác, chống gửi lặp và xử lý lỗi |
| `docs/ai-moderation/handoffs/task-07.md` | Bàn giao, kết quả kiểm tra và phần còn cần nghiệm thu |

- Hiển thị **“Đang kiểm duyệt…”**, spinner và khóa nút Đăng/textarea/nút đóng trong suốt refresh token và request tạo bài. Backdrop cũng không đóng modal khi đang gửi.
- `submittingRef` được đặt đồng bộ trước mọi `await` và kiểm tra ngay đầu handler, chặn nhiều lần gọi trước khi React render lại. Handler đóng modal và thay đổi textarea cũng kiểm tra ref để bảo vệ khoảng thời gian trước render. `finally` luôn giải phóng ref và state chờ.
- Giữ giới hạn 500 đơn vị UTF-16 theo `.length`, kiểm tra cả trong handler; chỉ dùng `trim()` để kiểm tra rỗng, gửi nguyên văn content. Giữ route `/post/create`, Bearer token, `updateToken(30)` và cách tiếp tục request khi refresh thất bại như cũ.
- Dùng thông báo cố định theo hợp đồng cho code 1015/1016/1017/1018, không hiển thị message kỹ thuật tùy ý từ response. Lỗi chưa biết dùng thông báo đăng bài thất bại; JSON sai/HTML/body rỗng hoặc cấu trúc thiếu code số có thông báo phản hồi không hợp lệ; lỗi fetch có thông báo kiểm tra kết nối.
- Khi lỗi: giữ modal và content, không gọi callback, mở lại thao tác để sửa/thử lại. Không retry tự động.
- Chỉ gọi `onPostCreated` một lần sau HTTP thành công và code số `1000`, có result với `id` chuỗi; sau đó xóa content và đóng modal. Kiểm tra result là phòng vệ để không đưa response thiếu result vào feed. Không thêm bài trước xác nhận backend.
- Không sửa backend, xác thực, route hoặc dependency; không gọi AI thật, không thêm key, endpoint thử hay cơ chế bypass vào sản phẩm.

## Kiểm tra thực tế

Môi trường Node `v24.22.0`. Ban đầu chưa có `web-app/node_modules`.

| Lệnh/kiểm tra | Kết quả |
|---|---|
| `npm run build`, `npm run lint` qua PowerShell | Không chạy script vì execution policy chặn `npm.ps1`; dùng `npm.cmd` bên dưới, không đổi policy |
| `npm.cmd ci --offline --cache .npm-task07-cache --ignore-scripts --no-audit --no-fund` | Exit 1, EUSAGE: lockfile thiếu peer dependency `@emnapi/core`/`@emnapi/runtime`; cache tạm đã dọn |
| `npm.cmd ci --offline --legacy-peer-deps --ignore-scripts --no-audit --no-fund` | Exit 0, cài 56 package từ cache; không sửa package.json/package-lock.json |
| `npm.cmd run build` trong `web-app` | Exit 1 tại `tsc -b`: `ProfilePage.tsx:522` thiếu `X`, `ProfilePage.tsx:566` thiếu `Check`; chưa tới bước Vite build |
| `npm.cmd run lint` trong `web-app` | Exit 0; hai warning `react(jsx-no-undef)` cho chính `X`/`Check` ở trên |
| `node task07-check.cjs` trong `web-app` (harness tạm, đã xóa) | **14/14 đạt**; transpile component thực tế bằng TypeScript, mock hooks/JSX/token/fetch/callback; không phải React DOM hay browser test |
| `git diff --check` | Đạt |

Hai lỗi/warning `ProfilePage.tsx` có sẵn: đối chiếu `git show HEAD:web-app/src/pages/ProfilePage.tsx` cho thấy import không có `X`/`Check`; file không có diff trong phiên này. Không sửa ngoài phạm vi. Build không được báo thành công.

Harness tạm kiểm tra hành vi:

- Bấm nhanh nhiều lần khi refresh token và fetch còn chờ chỉ gửi một request; khóa nội dung/đóng modal ngay cả trước render; props disabled và nhãn kiểm duyệt khi render chờ; thành công gọi callback một lần, đóng/xóa bài.
- Từng phản hồi 422/1015, 503/1016, 400/1017, 400/1018 hiển thị đúng thông báo hợp đồng, giữ bản nháp, không callback; sửa và gửi lại thành công.
- HTML/503, body rỗng, lỗi mạng, JSON null, JSON thiếu code, code 1000 thiếu result, HTTP lỗi kèm code 1000 đều không thêm bài, giữ nội dung, giải phóng chờ và thử lại được.
- Rỗng/khoảng trắng, 501 ký tự ASCII, 251 emoji bị chặn ngay trong handler; 250 emoji (=500 UTF-16) được gửi. Refresh token lỗi vẫn giữ cách xử lý hiện có.

Harness mock không được commit và không còn trong sản phẩm. Không ghi token/key thật hoặc dữ liệu bài thật vào báo cáo.

## Chưa kiểm tra và yêu cầu cho Task 08

Công cụ inventory trình duyệt trả `Browsers: Error: The browser access host is unavailable`, không có browser session điều khiển được qua công cụ đó. Chưa thao tác giao diện trên trình duyệt, chưa xác minh render/animation/focus hoặc hành vi disabled bằng React DOM thực tế. Không coi harness, lint hoặc typecheck là E2E.

Task 08 cần nghiệm thu bằng trình duyệt với backend thật hoặc request interception: thành công chỉ thêm một bài/modal đóng; 1015 sửa rồi đăng lại; 1016 thử lại; 1017/1018; HTML/body sai/mất mạng; nhiều lần bấm nhanh; khóa textarea/nút đóng/backdrop trong lúc gửi; mở lại modal sau thành công có nội dung trống. Kiểm tra cả token refresh và route Gateway hiện có.

Cần xử lý riêng lỗi frontend có sẵn ở `ProfilePage.tsx` trước khi yêu cầu build toàn ứng dụng xanh. Không phát hiện lỗi backend mới trong phạm vi đọc mã này. Chưa chạy backend, Gateway/JWT thật, MongoDB, Kafka/search, full suite hoặc AI thật; việc nghiệm thu luồng toàn hệ thống và tác dụng phụ vẫn thuộc Task 08.

Không thay đổi hợp đồng chung, không push/triển khai/reset, chưa làm Task 08.
