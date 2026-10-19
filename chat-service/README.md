# Chat Service - Markie Social Network

Dịch vụ Chat thời gian thực (Real-time Messaging) cho mạng xã hội **Markie**, hỗ trợ cả REST API và WebSocket/Netty-SocketIO.

---

## 🛠️ Công nghệ & Cấu hình

- **Java**: 21
- **Spring Boot**: 3.2.5
- **Cơ sở dữ liệu**: MongoDB (`chat-service`, cổng `27018`)
- **Bảo mật & Xác thực**: Spring Security OAuth2 Resource Server kết hợp **Keycloak IAM** (`http://localhost:8280/realms/markie`)
- **Real-time Server**: Netty-SocketIO (cổng `8099`)
- **API Gateway**: Spring Cloud Gateway định tuyến `/chat/**` tới cổng `8086`

---

## 🚀 Cấu hình Cổng & Môi trường

| Tham số | Giá trị mặc định | Mô tả |
|---|---|---|
| `server.port` | `8086` | Cổng HTTP REST API |
| `server.servlet.context-path` | `/chat` | Context path phục vụ API Gateway |
| `spring.data.mongodb.uri` | `mongodb://root:root@localhost:27018/chat-service?authSource=admin` | Chuỗi kết nối MongoDB |
| `spring.security.oauth2.resourceserver.jwt.issuer-uri` | `http://localhost:8280/realms/markie` | Keycloak Realm Issuer |
| `app.services.profile.url` | `http://localhost:8081/profile` | Địa chỉ Profile Service |
| `app.socket.host` | `0.0.0.0` | Host lắng nghe Netty-SocketIO |
| `app.socket.port` | `8099` | Cổng Netty-SocketIO |

---

## 📡 REST API Endpoints

Tất cả các API yêu cầu Bearer JWT Token từ Keycloak trong header `Authorization: Bearer <token>`.

### 1. Hội thoại (Conversations)
- **`POST /chat/conversations/create`**: Tạo hoặc lấy cuộc trò chuyện (1-1 hoặc Nhóm).
  - Body:
    ```json
    {
      "type": "DIRECT",
      "participantIds": ["target-user-keycloak-id"]
    }
    ```
- **`GET /chat/conversations/my-conversations`**: Lấy danh sách cuộc trò chuyện của người dùng hiện tại (sắp xếp theo tin nhắn mới nhất, kèm tên & avatar đối phương).

### 2. Tin nhắn (Messages)
- **`POST /chat/messages/create`**: Gửi tin nhắn mới.
  - Body:
    ```json
    {
      "conversationId": "660c1...",
      "message": "Xin chào bạn!"
    }
    ```
  - Tự động phát sự kiện SocketIO tới room cuộc hội thoại và room cá nhân của các thành viên.
- **`GET /chat/messages?conversationId={id}`**: Lấy lịch sử tin nhắn của cuộc trò chuyện (được sắp xếp theo thứ tự thời gian, tự động tính cờ `me: true/false`).

---

## ⚡ Socket.IO Real-time Events (Cổng `8099`)

### 1. Kết nối & Xác thực
Client kết nối tới `http://localhost:8099` kèm token:
```js
import { io } from "socket.io-client";

const socket = io("http://localhost:8099", {
  query: {
    token: keycloakToken // JWT Bearer token
  }
});
```
Hệ thống giải mã và xác thực token với Keycloak JWK Certs. Sau khi xác thực thành công, client tự động tham gia vào phòng cá nhân `userId`.

### 2. Sự kiện Client -> Server
- `join_conversation`: Tham gia phòng trò chuyện cụ thể (tham số: `conversationId`).
- `leave_conversation`: Rời phòng trò chuyện (tham số: `conversationId`).
- `typing`: Thông báo trạng thái đang gõ.
  ```json
  {
    "conversationId": "...",
    "isTyping": true
  }
  ```
- `send_message`: Gửi tin nhắn trực tiếp qua socket.
  ```json
  {
    "conversationId": "...",
    "message": "Nội dung tin nhắn"
  }
  ```

### 3. Sự kiện Server -> Client
- `receive_message`: Nhận tin nhắn mới (trả về full payload `ChatMessageResponse`).
- `new_message_notification`: Nhận thông báo tin nhắn mới khi đang ở ngoài cuộc hội thoại.
- `user_typing`: Trạng thái gõ phím của thành viên khác trong phòng.
