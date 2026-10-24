# ShrimpMate Backend API Specification

Tài liệu đặc tả toàn diện và chi tiết tất cả các REST API và giao thức truyền thông MQTT hiện có trong hệ thống **ShrimpMate Backend**.

---

## 1. Thông tin chung

- **Base URL**: `http://localhost:3000` (hoặc `http://<IP_MAY_BACKEND>:3000` khi chạy trong mạng LAN/Wi-Fi)
- **Content-Type**: `application/json`
- **Authentication**: Các API bảo vệ sử dụng JSON Web Token (JWT Bearer Token), truyền qua Header:
  ```http
  Authorization: Bearer <access_token>
  ```

### Cấu hình kết nối Frontend (Khi FE và BE chạy trên 2 máy khác nhau)

#### 1. Cùng mạng Wi-Fi / LAN (Thường dùng khi làm việc nhóm)
- **Kiểm tra IP máy Backend**: Trên máy Backend, mở terminal chạy `ipconfig` để lấy địa chỉ `IPv4 Address` (ví dụ: `192.168.1.15`).
- **Cấu hình Base URL trên Frontend**: Trong file `.env` của Frontend:
  ```env
  # Ví dụ với Vite:
  VITE_API_BASE_URL=http://192.168.1.15:3000

  # Ví dụ với Next.js:
  NEXT_PUBLIC_API_URL=http://192.168.1.15:3000
  ```
- **Backend CORS & Host**: Backend đã cấu hình `app.enableCors({ origin: true, credentials: true })` và lắng nghe trên `0.0.0.0` tại `src/main.ts` để chấp nhận request từ thiết bị khác trong mạng LAN.
- **Tường lửa (Windows Firewall)**: Cho phép kết nối Inbound cổng `3000` trên Windows Defender Firewall nếu FE gặp lỗi timeout/network error.

#### 2. Khác mạng (Kết nối từ xa qua Internet)
Sử dụng Cloudflare Tunnel:
```powershell
npx cloudflared tunnel --url http://localhost:3000
```

---

### Mô hình Phân quyền: 3 Roles chính

1. **Quản trị viên (Admin - `admin` - Web Dashboard)**:
   - Quản trị viên cấp cao của nền tảng, duy trì sự ổn định và an toàn hệ thống máy chủ.
   - **Quản lý tài khoản toàn hệ thống**: Theo dõi danh sách tài khoản Manager và Farmer (`GET /auth/users`), khóa/mở khóa tài khoản vi phạm (`PATCH /auth/users/:id/status`) và phân vai trò (`PATCH /auth/users/:id/role`).
   - **Quản lý danh mục thiết bị IoT chuẩn (Hardware Catalog)**: Khai báo thiết bị chuẩn vào kho danh mục (`POST /devices`), cấu hình phiên bản firmware chuẩn và kiểm soát định danh phần cứng duy nhất (`deviceUid`).
   - **Quản lý quy tắc an toàn chuẩn**: Thiết lập các quy tắc an toàn môi trường nước áp dụng cho toàn hệ thống (`POST /safety-rules`, `PATCH /safety-rules/:id`, `DELETE /safety-rules/:id`).
   - **Giám sát toàn diện & Báo cáo cấp hệ thống**: Xem thống kê tổng quan toàn nền tảng (`GET /admin/overview`), báo cáo vận hành & thiết bị ngoại tuyến (`GET /admin/reports/operational`), và báo cáo FCR toàn hệ thống (`GET /admin/reports/fcr`).
   - **Kiểm thử phần cứng MQTT**: Phát lệnh test điều khiển máy cho ăn trực tiếp tới thiết bị (`POST /mqtt/devices/:deviceUid/feeder-test`).

2. **Quản lý (Manager - `manager` - Web App)**:
   - Chủ thể sở hữu và điều hành hoạt động cơ sở nuôi tôm trên Web App tại văn phòng/nhà:
   - **Tự chủ tài khoản**: Tự đăng ký tài khoản Quản lý (`POST /auth/register`), đăng nhập, cập nhật hồ sơ, đổi mật khẩu và đặt lại mật khẩu qua OTP.
   - **Quản lý Người nuôi (UC020)**: Trực tiếp tạo tài khoản cho Farmer với mật khẩu ngẫu nhiên do hệ thống sinh ra (`POST /farmers`), cập nhật thông tin và khóa/mở khóa tài khoản Farmer.
   - **Phân công ao nuôi (UC021)**: Phân công một hoặc nhiều ao nuôi (hoặc toàn bộ trang trại) cho Farmer phụ trách (`POST /farmers/:id/assignments`).
   - **Quản lý trang trại và ao nuôi (UC005, UC006)**: Khởi tạo trang trại (`/farms`, `owner_id = manager.id`), khai báo danh mục ao nuôi (`/farms/:farmId/ponds`), diện tích ($m^2$), mã ao và trạng thái hoạt động.
   - **Quản lý vụ nuôi và tính toán FCR (UC007, UC016)**: Thiết lập vụ nuôi mới (`/ponds/:pondId/crop-seasons`), quản lý mật độ, ngày thả giống và theo dõi hệ số chuyển đổi thức ăn FCR (`GET /crop-seasons/:id/statistics`).
   - **Gán thiết bị và điều khiển (UC009, UC012)**: Tìm mã `deviceUid` phần cứng để gán (`claim`) vào ao nuôi (`POST /devices/claim`), gỡ thiết bị khi cần (`POST /devices/:id/unassign`), bật/tắt máy cho ăn và chuyển chế độ tự động/thủ công.
   - **Cấu hình lịch cho ăn tự động (UC011)**: Thiết lập cữ ăn tự động theo tuần (`/feeding-schedules`).
   - **Giám sát môi trường & Khai thác AI (UC013, UC014)**: Xem đồ thị chuỗi thời gian 24h/7d chi tiết (`/telemetry`); cấu hình ROI và tinh chỉnh trọng số FIS ($w_1 - w_4$) của camera AI (`/camera`).
   - **Tiếp nhận & xử lý cảnh báo (UC015)**: Theo dõi, tiếp nhận (`PATCH /alerts/:id/acknowledge`) và giải quyết sự cố (`PATCH /alerts/:id/resolve`).

3. **Người nuôi (Farmer - `farmer` - Mobile App)**:
   - Người trực tiếp vận hành tại bờ ao nuôi qua Mobile App (React Native):
   - **Không tự đăng ký**: Tài khoản do Manager tạo; đăng nhập bằng mật khẩu do Manager bàn giao và đổi mật khẩu ở lần đăng nhập đầu tiên.
   - **Xem cơ sở nuôi được phân công**: Xem danh sách trang trại và các ao nuôi mà mình được Manager phân công phụ trách.
   - **Giám sát tức thời (UC013)**: Xem thẻ tóm tắt màu cảnh báo nhanh (Xanh / Vàng / Đỏ) cho 6 thông số: DO, pH, Nhiệt độ, Độ mặn, NH₃, Độ đục.
   - **Xem khuyến nghị AI tóm tắt (UC014)**: Xem lượng thức ăn khuyến nghị và cường độ thèm ăn của tôm (FIS).
   - **Điều khiển thiết bị nhanh (UC012)**: Cho ăn nhanh (Quick Feed) và Dừng khẩn cấp (1-Tap Emergency Stop) tức thì ngoài bờ ao.
   - **Tiếp nhận cảnh báo đẩy (UC015)**: Nhận thông báo đẩy (Push Notification qua FCM) trên màn hình khóa điện thoại; xác nhận đã xử lý sự cố.

---

## 2. Health Check API

### Kiểm tra trạng thái hoạt động của máy chủ

```http
GET /
```

- **Quyền**: Public (Không cần đăng nhập).
- **Công dụng**: Kiểm tra máy chủ backend có đang chạy và phản hồi hay không.

#### Phản hồi (Response):
- **Status Code**: `200 OK`
- **Body**:
  ```text
  Hello World!
  ```

---

## 3. Module Authentication & User Management (`/auth`)

### 3.1. Đăng ký tài khoản (Quản lý - Manager)

```http
POST /auth/register
```

- **Quyền**: Public.
- **Công dụng**: Quản lý (Manager) tự đăng ký tài khoản mới trên Web App. Tài khoản tạo thành công sẽ có vai trò mặc định là `manager`. Farmer không tự đăng ký qua endpoint này mà do Manager tạo trực tiếp qua `POST /farmers`.
- **Công dụng**: Người nuôi tự đăng ký tài khoản mới trên hệ thống. Tài khoản mới mặc định nhận role `farmer` và `isActive: true`.
- **Yêu cầu đầu vào**:
  - `email`: Định dạng email hợp lệ, duy nhất trong hệ thống.
  - `phoneNumber`: Số điện thoại di động Việt Nam (10 chữ số, bắt đầu bằng `0`, tự động chuẩn hóa từ `+84` hoặc `84`), duy nhất.
  - `password`: Tối thiểu 6 ký tự.
  - `fullName`: Họ và tên người nuôi.

#### Body:
```json
{
  "email": "farmer1@example.com",
  "phoneNumber": "0901234567",
  "password": "password123",
  "fullName": "Nguyen Van Farmer"
}
```

#### Phản hồi thành công (`201 Created`):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e674512e-360d-45f8-8bbd-7d079dbe39f1",
    "email": "farmer1@example.com",
    "phoneNumber": "0901234567",
    "fullName": "Nguyen Van Farmer",
    "role": "farmer",
    "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2026-10-10T08:00:00.000Z",
    "updatedAt": "2026-10-10T08:00:00.000Z"
  }
}
```

#### Mã lỗi:
- `400 Bad Request`: Định dạng email hoặc số điện thoại không hợp lệ, mật khẩu quá ngắn.
- `409 Conflict`: Email hoặc số điện thoại đã được đăng ký trong hệ thống.

---

### 3.2. Đăng nhập hệ thống

```http
POST /auth/login
```

- **Quyền**: Public.
- **Công dụng**: Xác thực người dùng bằng Email hoặc Số điện thoại cùng Mật khẩu. Trả về cặp `accessToken` và `refreshToken`.

#### Body (Dùng Email):
```json
{
  "identifier": "farmer1@example.com",
  "password": "password123"
}
```

#### Body (Dùng Số điện thoại):
```json
{
  "identifier": "0901234567",
  "password": "password123"
}
```

#### Phản hồi thành công (`200 OK`):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e674512e-360d-45f8-8bbd-7d079dbe39f1",
    "email": "farmer1@example.com",
    "phoneNumber": "0901234567",
    "fullName": "Nguyen Van Farmer",
    "role": "farmer",
    "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2026-10-10T08:00:00.000Z",
    "updatedAt": "2026-10-10T08:00:00.000Z"
  }
}
```

#### Mã lỗi:
- `401 Unauthorized`: Sai tài khoản hoặc mật khẩu; hoặc tài khoản đã bị Quản trị viên khóa (`isActive: false`).

---

### 3.3. Làm mới Access Token (Refresh Token)

```http
POST /auth/refresh-token
```

- **Quyền**: Public (Cần gửi `refreshToken` còn hiệu lực).
- **Công dụng**: Lấy `accessToken` mới khi token cũ hết hạn mà không cần đăng nhập lại.

#### Body:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Phản hồi thành công (`200 OK`):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e674512e-360d-45f8-8bbd-7d079dbe39f1",
    "email": "farmer1@example.com",
    "phoneNumber": "0901234567",
    "fullName": "Nguyen Van Farmer",
    "role": "farmer",
    "isActive": true,
    "mustChangePassword": false
  }
}
```

#### Mã lỗi:
- `401 Unauthorized`: Refresh token không hợp lệ, đã hết hạn hoặc tài khoản bị khóa.

---

### 3.4. Đăng xuất hệ thống (Logout)

```http
POST /auth/logout
```

- **Quyền**: Authenticated (`Bearer <access_token>`).
- **Công dụng**: Đăng xuất khỏi hệ thống, hủy bỏ phiên làm việc và xóa bỏ `refreshTokenHash` trong CSDL, ngăn chặn hoàn toàn việc tái sử dụng refresh token cũ.

#### Header:
```http
Authorization: Bearer <access_token>
```

#### Phản hồi thành công (`200 OK`):
```json
{
  "message": "Đăng xuất thành công"
}
```

#### Mã lỗi:
- `401 Unauthorized`: Token không hợp lệ hoặc đã hết hạn.

---

### 3.5. Yêu cầu mã OTP khôi phục mật khẩu (Forgot Password)

```http
POST /auth/forgot-password
```

- **Quyền**: Public (Không cần đăng nhập).
- **Công dụng**: Khởi tạo mã OTP ngẫu nhiên gồm 6 chữ số có hiệu lực trong 5 phút. Mã OTP được phân phối đa kênh thực tế tới người dùng (Email thật và SMS thật).
- **Cơ chế phân phối mã OTP (Multi-channel OTP Delivery)**:
  - **Email (Gmail SMTP)**: Nếu `identifier` là định dạng Email, mã OTP được gửi qua Gmail SMTP (`locphanhuu2605@gmail.com`) với template HTML chuẩn thương hiệu ShrimpMate.
  - **SMS thật (Cổng eSMS.vn)**: Nếu `identifier` là số điện thoại Việt Nam (chấp nhận các đầu số `0xxxxxxxxx`, `+84xxxxxxxxx`, `84xxxxxxxxx`), hệ thống tự động chuẩn hóa về số điện thoại nội địa `0xxxxxxxxx` và phát lệnh gửi tin nhắn SMS thật qua cổng API của **eSMS.vn** trực tiếp tới điện thoại của người dùng.
    * *Môi trường thử nghiệm / KLTN*: Sử dụng Brandname test **`Baotrixemay`** (`ESMS_SMS_TYPE=2`) với mẫu cú pháp đã được các nhà mạng (Viettel, VinaPhone, MobiFone) phê duyệt sẵn: `{OTP} la ma xac minh dang ky Baotrixemay cua ban`.
    * *Môi trường doanh nghiệp*: Tùy biến `ESMS_BRANDNAME` theo tên thương hiệu riêng của cơ sở nuôi tôm sau khi hoàn tất đăng ký với nhà mạng.
  - **Console Server Log (Môi trường Dev)**: Khi `NODE_ENV !== 'production'`, mã OTP đồng thời được in trực tiếp ra terminal console của server backend để lập trình viên kiểm thử nhanh mà không bắt buộc phải mở điện thoại/email.
- **Bảo mật & Giới hạn tần suất (Rate Limiting & Security)**:
  - **Thời gian hiệu lực**: 5 phút (`OTP_EXPIRES_IN_MINUTES=5`).
  - **Thời gian chờ giữa các lần gửi (Cooldown)**: 60 giây (`OTP_REQUEST_COOLDOWN_SECONDS=60`). Nếu gửi liên tiếp trong vòng 60 giây, hệ thống trả về mã lỗi `429 Too Many Requests` kèm thời gian chờ còn lại.
  - **Số lần thử tối đa**: Tối đa 5 lần nhập sai (`OTP_MAX_ATTEMPTS=5`). Quá 5 lần, mã OTP sẽ bị hủy hoàn toàn để chống tấn công brute-force.

#### Body (Yêu cầu qua Email):
```json
{
  "identifier": "locphanhuu2605@gmail.com"
}
```

#### Body (Yêu cầu qua Số điện thoại):
```json
{
  "identifier": "0865152043"
}
```

#### Phản hồi thành công (`200 OK`):
```json
{
  "message": "Nếu tài khoản tồn tại trong hệ thống, mã OTP đã được gửi. Vui lòng kiểm tra email/SMS hoặc liên hệ quản trị viên."
}
```

#### Mã lỗi:
- `400 Bad Request`: `identifier` không hợp lệ hoặc để trống.
- `429 Too Many Requests`: Yêu cầu gửi lại quá nhanh khi chưa hết 60 giây cooldown.

---

### 3.5. Gửi lại mã OTP (Resend OTP)

```http
POST /auth/resend-otp
```

- **Quyền**: Public.
- **Công dụng**: Vô hiệu hóa mã OTP cũ trước đó và phát hành mã OTP mới cho tài khoản, phân phối lại qua Email thật (Gmail SMTP) hoặc SMS thật (eSMS Gateway). Vẫn áp dụng cơ chế Cooldown 60 giây để chống spam.

#### Body:
```json
{
  "identifier": "0865152043"
}
```

#### Phản hồi thành công (`200 OK`):
```json
{
  "message": "Nếu tài khoản tồn tại trong hệ thống, mã OTP đã được gửi. Vui lòng kiểm tra email/SMS hoặc liên hệ quản trị viên."
}
```

#### Mã lỗi:
- `400 Bad Request`: Thiếu `identifier`.
- `429 Too Many Requests`: Gửi yêu cầu lại khi chưa hết 60 giây chờ.

---

### 3.6. Xác thực mã OTP trước khi đổi mật khẩu

```http
POST /auth/verify-reset-otp
```

- **Quyền**: Public.
- **Công dụng**: Cho phép giao diện Frontend kiểm tra xem mã OTP người dùng nhập vào có chính xác và còn hạn hay không trước khi chuyển sang bước nhập mật khẩu mới.

#### Body:
```json
{
  "identifier": "farmer1@example.com",
  "otp": "123456"
}
```

#### Phản hồi thành công (`200 OK`):
```json
{
  "valid": true,
  "message": "Mã OTP chính xác và hợp lệ"
}
```

#### Mã lỗi:
- `400 Bad Request`: Mã OTP sai quá số lần cho phép (tối đa 5 lần), OTP đã hết hạn hoặc OTP không đúng.

---

### 3.7. Đặt lại mật khẩu bằng mã OTP

```http
POST /auth/reset-password
```

- **Quyền**: Public.
- **Công dụng**: Đặt lại mật khẩu mới cho tài khoản khi cung cấp đúng mã OTP. Toàn bộ refresh token hiện tại bị hủy để đảm bảo an toàn.

#### Body:
```json
{
  "identifier": "farmer1@example.com",
  "otp": "123456",
  "newPassword": "newSecretPassword123"
}
```

#### Phản hồi thành công (`200 OK`):
```json
{
  "message": "Đặt lại mật khẩu thành công, vui lòng đăng nhập lại"
}
```

---

### 3.8. Lấy thông tin tài khoản hiện tại

```http
GET /auth/me
```

- **Quyền**: Đã đăng nhập (`admin`, `farmer`).
- **Công dụng**: Lấy thông tin hồ sơ của tài khoản đang đăng nhập từ access token (đã loại bỏ password hash và refresh token hash).

#### Phản hồi thành công (`200 OK`):
```json
{
  "id": "e674512e-360d-45f8-8bbd-7d079dbe39f1",
  "email": "farmer1@example.com",
  "phoneNumber": "0901234567",
  "fullName": "Nguyen Van Farmer",
  "role": "farmer",
  "isActive": true,
  "createdAt": "2026-10-10T08:00:00.000Z",
  "updatedAt": "2026-10-10T08:00:00.000Z"
}
```

---

### 3.9. Cập nhật hồ sơ cá nhân

```http
PATCH /auth/profile
```

- **Quyền**: Đã đăng nhập (`admin`, `farmer`).
- **Công dụng**: Người dùng tự cập nhật họ tên hoặc số điện thoại cá nhân.

#### Body:
```json
{
  "fullName": "Nguyen Van Farmer (Đã cập nhật)",
  "phoneNumber": "0909888999"
}
```

#### Phản hồi thành công (`200 OK`): Trả về thông tin user đã cập nhật.

---

### 3.10. Đổi mật khẩu tài khoản

```http
PATCH /auth/change-password
```

- **Quyền**: Đã đăng nhập (`admin`, `farmer`).
- **Công dụng**: Người dùng chủ động đổi mật khẩu bằng cách nhập mật khẩu hiện tại và mật khẩu mới.

#### Body:
```json
{
  "currentPassword": "password123",
  "newPassword": "newPassword456"
}
```

#### Phản hồi thành công (`200 OK`):
```json
{
  "message": "Đổi mật khẩu thành công, vui lòng đăng nhập lại"
}
```

---

### 3.11. [Admin] Kiểm tra quyền Admin nhanh

```http
GET /auth/admin-check
```

- **Quyền**: `admin`.
- **Công dụng**: Kiểm tra nhanh xem token hiện tại có quyền Quản trị viên hay không, dùng cho Auth Guard phía Frontend Admin Web Dashboard.

#### Phản hồi thành công (`200 OK`):
```json
{
  "message": "Bạn có quyền Admin"
}
```

---

### 3.12. [Manager] Kiểm tra quyền Quản lý nhanh

```http
GET /auth/manager-check
```

- **Quyền**: `manager`.
- **Công dụng**: Kiểm tra nhanh xem token hiện tại có quyền Quản lý hay không, dùng cho Auth Guard phía Manager Web App.

#### Phản hồi thành công (`200 OK`):
```json
{
  "message": "Bạn có quyền Quản lý (Manager)"
}
```

---

### 3.13. [Farmer] Kiểm tra quyền Người nuôi nhanh

```http
GET /auth/farmer-check
```

- **Quyền**: `farmer`.
- **Công dụng**: Kiểm tra nhanh xem token hiện tại có quyền Người nuôi hay không, dùng cho Auth Guard phía Farmer Mobile App.

#### Phản hồi thành công (`200 OK`):
```json
{
  "message": "Bạn có quyền Người nuôi (Farmer)"
}
```

---

### 3.14. [Admin] Xem danh sách tất cả tài khoản trong hệ thống

```http
GET /auth/users
```

- **Quyền**: `admin`.
- **Công dụng**: Quản trị viên giám sát toàn bộ tài khoản người dùng đã đăng ký trên hệ thống, sắp xếp theo thời gian tạo mới nhất.

#### Phản hồi thành công (`200 OK`):
```json
[
  {
    "id": "e674512e-360d-45f8-8bbd-7d079dbe39f1",
    "email": "farmer1@example.com",
    "phoneNumber": "0901234567",
    "fullName": "Nguyen Van Farmer",
    "role": "farmer",
    "isActive": true,
    "createdAt": "2026-10-10T08:00:00.000Z",
    "updatedAt": "2026-10-10T08:00:00.000Z"
  }
]
```

---

### 3.13. [Admin] Khóa hoặc mở khóa tài khoản người dùng

```http
PATCH /auth/users/:id/status
```

- **Quyền**: `admin`.
- **Công dụng**: Khóa (`isActive: false`) hoặc mở khóa (`isActive: true`) tài khoản người dùng. Khi khóa tài khoản, hệ thống tự động xóa refresh token của người dùng đó. Chặn Admin tự khóa tài khoản của chính mình.

#### Body:
```json
{
  "isActive": false
}
```

#### Phản hồi thành công (`200 OK`): Trả về thông tin user với trạng thái `isActive` mới.

#### Mã lỗi:
- `403 Forbidden`: Admin cố tình tự khóa tài khoản của chính mình.
- `404 Not Found`: Không tìm thấy user với `id` được chỉ định.

---

### 3.14. [Admin] Phân bổ vai trò tài khoản

```http
PATCH /auth/users/:id/role
```

- **Quyền**: `admin`.
- **Công dụng**: Thay đổi vai trò người dùng giữa `admin` và `farmer`. Chặn Admin tự hạ quyền tài khoản của chính mình.

#### Body:
```json
{
  "role": "admin"
}
```

#### Phản hồi thành công (`200 OK`): Trả về thông tin user với vai trò mới.

---

## 4. Module Quản lý Người nuôi & Phân công ao nuôi (`/farmers`) (UC020, UC021)

Module phục vụ **Quản lý (Manager)** điều hành danh sách Người nuôi (Farmer) trực thuộc và phân công ao nuôi/trang trại cho họ phụ trách. Quản trị viên (Admin) cũng có quyền xem và can thiệp khi cần thiết.

### 4.1. [Manager] Tạo tài khoản Người nuôi mới (UC020)

```http
POST /farmers
```

- **Quyền**: `manager`, `admin`.
- **Công dụng**: Manager trực tiếp tạo tài khoản cho Farmer với mật khẩu ban đầu do hệ thống tự sinh ngẫu nhiên. Mật khẩu này được trả về 1 lần duy nhất trong response để Manager giao cho Farmer; Farmer dùng để đăng nhập trên Mobile App và đổi mật khẩu ở lần đầu.
- **Yêu cầu đầu vào**:
  - `fullName`: Họ và tên Người nuôi (bắt buộc).
  - `phoneNumber`: Số điện thoại Người nuôi (bắt buộc, chuẩn hóa VN).
  - `email`: Email (tùy chọn; nếu không điền hệ thống tự gán dạng `farmer_<sđt>@shrimpmate.local`).

#### Body:
```json
{
  "fullName": "Trần Văn Nuôi",
  "phoneNumber": "0903123456",
  "email": "nuoi.tran@example.com"
}
```

#### Phản hồi thành công (`201 Created`):
```json
{
  "message": "Tạo tài khoản Farmer thành công",
  "farmer": {
    "id": "c1a2b3c4-1111-4444-8888-999999999999",
    "email": "nuoi.tran@example.com",
    "phoneNumber": "0903123456",
    "fullName": "Trần Văn Nuôi",
    "role": "farmer",
    "managerId": "m1a2b3c4-2222-4444-8888-999999999999",
    "isActive": true,
    "createdAt": "2026-10-10T08:00:00.000Z",
    "updatedAt": "2026-10-10T08:00:00.000Z"
  },
  "initialPassword": "Fm#a8B2x9"
}
```

---

### 4.2. [Manager] Xem danh sách Người nuôi thuộc quyền quản lý

```http
GET /farmers
```

- **Quyền**: `manager`, `admin`.
- **Công dụng**: Manager xem danh sách các Farmer do mình quản lý (`manager_id = manager.id`), kèm số lượng ao/trại đã phân công (`assignmentCount`). Admin có quyền xem tất cả Farmer trên nền tảng.

#### Phản hồi thành công (`200 OK`):
```json
[
  {
    "id": "c1a2b3c4-1111-4444-8888-999999999999",
    "email": "nuoi.tran@example.com",
    "phoneNumber": "0903123456",
    "fullName": "Trần Văn Nuôi",
    "role": "farmer",
    "managerId": "m1a2b3c4-2222-4444-8888-999999999999",
    "isActive": true,
    "createdAt": "2026-10-10T08:00:00.000Z",
    "updatedAt": "2026-10-10T08:00:00.000Z",
    "assignmentCount": 2
  }
]
```

---

### 4.3. [Manager] Xem chi tiết Người nuôi và các ao được phân công

```http
GET /farmers/:id
```

- **Quyền**: `manager`, `admin`.
- **Công dụng**: Xem thông tin chi tiết của 1 Farmer kèm danh sách toàn bộ các phân công (`assignments`) trang trại và ao nuôi.

---

### 4.4. [Manager] Cập nhật thông tin Người nuôi

```http
PATCH /farmers/:id
```

- **Quyền**: `manager`, `admin`.
- **Body**:
```json
{
  "fullName": "Trần Văn Nuôi Mới",
  "phoneNumber": "0903888999"
}
```

---

### 4.5. [Manager] Khóa hoặc mở khóa tài khoản Người nuôi

```http
PATCH /farmers/:id/status
```

- **Quyền**: `manager`, `admin`.
- **Body**:
```json
{
  "isActive": false
}
```

---

### 4.6. [Manager] Phân công trang trại hoặc ao nuôi cho Người nuôi (UC021)

```http
POST /farmers/:id/assignments
```

- **Quyền**: `manager`, `admin`.
- **Công dụng**: Manager phân công một hoặc nhiều ao nuôi cụ thể (hoặc toàn bộ trang trại) cho Farmer phụ trách.
- **Body phân công các ao cụ thể**:
```json
{
  "farmId": "f1a2b3c4-1111-4444-8888-999999999999",
  "pondIds": [
    "p1a2b3c4-1111-4444-8888-999999999999",
    "p2a2b3c4-2222-4444-8888-999999999999"
  ]
}
```
- **Body phân công toàn bộ trang trại** (`pondIds` để trống):
```json
{
  "farmId": "f1a2b3c4-1111-4444-8888-999999999999"
}
```

#### Phản hồi thành công (`201 Created`):
```json
{
  "message": "Đã phân công 2 ao nuôi cho Farmer Trần Văn Nuôi",
  "assignments": [
    {
      "id": "a1b2c3d4-1111-2222-3333-444444444444",
      "farmerId": "c1a2b3c4-1111-4444-8888-999999999999",
      "farmId": "f1a2b3c4-1111-4444-8888-999999999999",
      "pondId": "p1a2b3c4-1111-4444-8888-999999999999",
      "createdAt": "2026-10-10T08:00:00.000Z"
    }
  ]
}
```

---

### 4.7. Xem danh sách phân công của một Người nuôi

```http
GET /farmers/:id/assignments
```

- **Quyền**: `manager`, `admin`, hoặc chính `farmer` đó.
- **Công dụng**: Xem danh sách các trang trại và ao nuôi mà Farmer được phân công.

---

### 4.8. [Manager] Thu hồi một phân công cụ thể

```http
DELETE /farmers/:id/assignments/:assignmentId
```

- **Quyền**: `manager`, `admin`.
- **Công dụng**: Thu hồi quyền phụ trách 1 ao/trại cụ thể của Farmer.

---

### 4.9. [Manager] Thu hồi toàn bộ phân công của Người nuôi

```http
DELETE /farmers/:id/assignments
```

- **Quyền**: `manager`, `admin`.
- **Công dụng**: Thu hồi tất cả các phân công ao và trại của Farmer.

---

## 5. Module Admin Monitoring & System Reports (`/admin`)

Tất cả các API trong module này yêu cầu quyền **`admin`**.

### 4.1. [Admin] Thống kê tổng quan toàn nền tảng

```http
GET /admin/overview
```

- **Công dụng**: Cung cấp bức tranh tổng thể thời gian thực về quy mô hệ thống: số lượng người dùng (active/locked), số lượng trang trại, số lượng ao nuôi (active/maintenance), số lượng thiết bị phần cứng trực tuyến/ngoại tuyến, tỷ lệ online (%) và thống kê cảnh báo theo mức độ nghiêm trọng.

#### Phản hồi thành công (`200 OK`):
```json
{
  "serverTime": "2026-10-10T08:30:00.000Z",
  "users": {
    "total": 50,
    "active": 48,
    "locked": 2,
    "farmers": 48,
    "admins": 2
  },
  "farms": {
    "total": 35,
    "active": 32,
    "inactive": 3
  },
  "ponds": {
    "total": 120,
    "active": 110,
    "maintenance": 6,
    "inactive": 4
  },
  "devices": {
    "total": 180,
    "online": 165,
    "offline": 15,
    "onlineRatePercent": 91.7
  },
  "alerts": {
    "total": 45,
    "open": 5,
    "acknowledged": 10,
    "resolved": 30,
    "bySeverity": {
      "critical": 3,
      "warning": 17,
      "monitoring": 25
    }
  }
}
```

---

### 4.2. [Admin] Báo cáo vận hành toàn nền tảng

```http
GET /admin/reports/operational
```

- **Công dụng**: Xuất báo cáo vận hành hệ thống máy chủ, bao gồm số liệu tổng quan, danh sách 10 cảnh báo nguy cấp/bất thường gần nhất và danh sách các thiết bị phần cứng đang bị offline quá 5 phút để kỹ thuật viên có phương án kiểm tra bảo trì.

#### Phản hồi thành công (`200 OK`):
```json
{
  "generatedAt": "2026-10-10T08:30:00.000Z",
  "overview": { ... },
  "recentAlerts": [
    {
      "id": "uuid",
      "type": "CAMERA_FEEDING_ANOMALY",
      "severity": 3,
      "status": "open",
      "message": "Phát hiện bất thường tại sàng ăn: FIS=0.15, thức ăn thừa 65%",
      "pondName": "Ao số 1",
      "deviceUid": "CAM-01-A1",
      "triggeredAt": "2026-10-10T08:25:00.000Z"
    }
  ],
  "offlineDevices": [
    {
      "id": "uuid",
      "deviceUid": "DEV-FEEDER-VN-002",
      "name": "Máy cho ăn Ao 2",
      "type": "feeder",
      "firmwareVersion": "v1.2.0",
      "lastSeenAt": "2026-10-10T08:00:00.000Z"
    }
  ]
}
```

---

### 4.3. [Admin] Báo cáo hiệu quả chuyển đổi thức ăn (FCR) toàn hệ thống

```http
GET /admin/reports/fcr
```

- **Công dụng**: Đánh giá hiệu suất sử dụng thức ăn và hệ số chuyển đổi sinh khối FCR (Feed Conversion Ratio) trên tất cả các vụ nuôi đang diễn ra (`active`) hoặc đã kết thúc (`completed`) trong toàn bộ nền tảng. Xếp loại chất lượng FCR: `Xuất sắc (< 1.3)`, `Tốt (1.3 - 1.5)`, hoặc `Cần tối ưu (> 1.5)`.

#### Phản hồi thành công (`200 OK`):
```json
{
  "generatedAt": "2026-10-10T08:30:00.000Z",
  "summary": {
    "totalSeasonsEvaluated": 8,
    "totalFeedConsumedSystemKg": 14200.5,
    "totalBiomassGainSystemKg": 11833.75,
    "averageSystemFcr": 1.2,
    "systemQualityRating": "Xuất sắc"
  },
  "seasons": [
    {
      "cropSeasonId": "uuid",
      "seasonName": "Vụ Mùa Mưa 2026",
      "status": "active",
      "farmName": "Trang trại Bạc Liêu 1",
      "pondName": "Ao nuôi số 1",
      "daysOfCulture": 45,
      "totalFeedConsumedKg": 1250.0,
      "estimatedCurrentBiomassKg": 1100.0,
      "biomassGainKg": 1050.0,
      "fcr": 1.19,
      "qualityRating": "Xuất sắc (< 1.3)"
    }
  ]
}
```

---

## 5. Module Trang trại (Farm Management) (`/farms`)

Tất cả API quản lý trang trại yêu cầu quyền **`farmer`**. Hệ thống tự động phân tách dữ liệu đa người dùng: Farmer chỉ có quyền truy cập vào trang trại thuộc quyền sở hữu của chính mình (`owner_id = user.id`).

### 5.1. Lấy danh sách trang trại của Farmer

```http
GET /farms?page=1&limit=20
```

- **Query Parameters**:
  - `page` (tùy chọn, mặc định: 1): Số trang.
  - `limit` (tùy chọn, mặc định: 20): Số lượng trang trại mỗi trang.

#### Phản hồi thành công (`200 OK`):
```json
{
  "data": [
    {
      "id": "7b04fbb3-938b-4c4f-9e8c-d2325c34e047",
      "ownerId": "e674512e-360d-45f8-8bbd-7d079dbe39f1",
      "name": "Trang trại Nuôi Tôm Sông Xanh",
      "address": "Xã Vĩnh Hậu, Huyện Hòa Bình, Tỉnh Bạc Liêu",
      "status": "active",
      "createdAt": "2026-10-01T08:00:00.000Z",
      "updatedAt": "2026-10-01T08:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### 5.2. Tạo trang trại mới

```http
POST /farms
```

- **Body**:
  - `name`: Tên trang trại (bắt buộc).
  - `address`: Địa chỉ (tùy chọn).
  - `status`: Trạng thái (`active` hoặc `inactive`, mặc định: `active`).

```json
{
  "name": "Trang trại Nuôi Tôm Sông Xanh",
  "address": "Xã Vĩnh Hậu, Huyện Hòa Bình, Tỉnh Bạc Liêu",
  "status": "active"
}
```

#### Phản hồi thành công (`201 Created`): Trả về đối tượng trang trại vừa tạo với `ownerId = user.id`.

---

### 5.3. Xem chi tiết trang trại theo ID

```http
GET /farms/:id
```

- **Phản hồi**: Trả về thông tin chi tiết trang trại kèm danh sách các ao nuôi trực thuộc.

---

### 5.4. Cập nhật thông tin trang trại

```http
PATCH /farms/:id
```

- **Body**:
```json
{
  "name": "Trang trại Nuôi Tôm Sông Xanh - Khu 1",
  "address": "Bạc Liêu, Việt Nam",
  "status": "active"
}
```

---

### 5.5. Xóa trang trại (Soft Delete)

```http
DELETE /farms/:id
```

- **Công dụng**: Thực hiện xóa mềm trang trại (đánh dấu `deleted_at`) và đồng thời tự động xóa mềm tất cả các ao nuôi trực thuộc để bảo toàn dữ liệu lịch sử vụ nuôi.

---

## 6. Module Ao nuôi (Pond Management) (`/farms/:farmId/ponds`)

Quản lý các ao nuôi nằm trong trang trại. Yêu cầu quyền **`farmer`** (và phải là chủ sở hữu trang trại tương ứng).

### 6.1. Danh sách ao nuôi thuộc trang trại

```http
GET /farms/:farmId/ponds?page=1&limit=20
```

#### Phản hồi thành công (`200 OK`):
```json
{
  "data": [
    {
      "id": "3cb49a46-81cf-4a47-a365-1d6fa55e8d89",
      "farmId": "7b04fbb3-938b-4c4f-9e8c-d2325c34e047",
      "code": "AO-01",
      "name": "Ao nuôi số 1 - Khu A",
      "areaM2": 3000.0,
      "status": "active",
      "createdAt": "2026-10-01T09:00:00.000Z",
      "updatedAt": "2026-10-01T09:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### 6.2. Tạo ao nuôi mới trong trang trại

```http
POST /farms/:farmId/ponds
```

- **Yêu cầu đầu vào**:
  - `code`: Mã ao nuôi (duy nhất trong phạm vi cùng một trang trại).
  - `name`: Tên ao nuôi.
  - `areaM2`: Diện tích mặt nước ao ($m^2$, số dương).
  - `status`: `active`, `inactive`, hoặc `maintenance` (mặc định: `active`).

#### Body:
```json
{
  "code": "AO-01",
  "name": "Ao nuôi số 1 - Khu A",
  "areaM2": 3000.0,
  "status": "active"
}
```

#### Phản hồi thành công (`201 Created`): Trả về đối tượng ao nuôi vừa tạo.

---

### 6.3. Chi tiết ao nuôi

```http
GET /farms/:farmId/ponds/:id
```

- **Phản hồi**: Trả về thông tin chi tiết của ao nuôi cùng danh sách thiết bị IoT đang được gán vào ao này.

---

### 6.4. Cập nhật thông tin ao nuôi

```http
PATCH /farms/:farmId/ponds/:id
```

#### Body:
```json
{
  "name": "Ao nuôi số 1 (Đã nâng cấp lót bạt)",
  "areaM2": 3200.0,
  "status": "active"
}
```

---

### 6.5. Xóa ao nuôi (Soft Delete)

```http
DELETE /farms/:farmId/ponds/:id
```

- **Công dụng**: Thực hiện xóa mềm ao nuôi (`deleted_at`), đồng thời tự động set `pond_id = NULL` đối với tất cả các thiết bị IoT đang gắn với ao này để hoàn trả thiết bị về kho chuẩn.

---

## 7. Module Thiết bị IoT & Catalog Phần cứng (`/devices`)

Hệ thống quản lý thiết bị theo mô hình Catalog:
- **Admin**: Khai báo thiết bị chuẩn vào kho hệ thống (`pond_id = null`), quản lý firmware và định danh phần cứng.
- **Farmer**: Tìm `deviceUid` của thiết bị được lắp đặt tại ao để `claim` (gán) vào ao của mình, điều khiển hoạt động hoặc hủy gán (`unassign`).

### 7.1. Danh sách thiết bị IoT

```http
GET /devices
```

- **Quyền**: `admin`, `farmer`.
- **Cơ chế lọc tự động**:
  - `admin`: Trả về toàn bộ danh mục thiết bị trong hệ thống kèm trạng thái kết nối.
  - `farmer`: Tự động chỉ trả về các thiết bị đã được gán vào các ao nuôi thuộc sở hữu của người nuôi đó.

#### Phản hồi thành công (`200 OK`):
```json
[
  {
    "id": "22fffa98-46eb-4606-93a0-faae9f70691e",
    "pondId": "3cb49a46-81cf-4a47-a365-1d6fa55e8d89",
    "deviceUid": "ESP32_FEEDER_01",
    "name": "Máy cho ăn tự động A1",
    "type": "feeder",
    "status": "online",
    "mode": "automatic",
    "firmwareVersion": "1.2.0",
    "lastSeenAt": "2026-10-10T08:35:00.000Z",
    "metadata": {
      "hopperCapacityKg": 50
    }
  }
]
```

---

### 7.2. [Admin] Khai báo thiết bị chuẩn vào danh mục

```http
POST /devices
```

- **Quyền**: `admin`.
- **Body**:
  - `deviceUid`: Mã định danh phần cứng duy nhất (Unique), ví dụ: `ESP32_SENSOR_01`.
  - `name`: Tên thiết bị.
  - `type`: Loại thiết bị (`feeder`, `sensor_node`, `camera`, `edge_gateway`).
  - `firmwareVersion`: Phiên bản firmware ban đầu (mặc định: `1.0.0`).
  - `metadata`: Đối tượng JSON chứa cấu hình phần cứng bổ sung.

```json
{
  "deviceUid": "CAM-01-A1",
  "name": "Camera giám sát sàng ăn Ao 1",
  "type": "camera",
  "firmwareVersion": "1.0.0",
  "metadata": {
    "resolution": "1920x1080",
    "fps": 30
  }
}
```

#### Phản hồi thành công (`201 Created`): Thiết bị khởi tạo với `pondId: null`, trạng thái `offline`.

---

### 7.3. [Farmer] Đăng ký gán thiết bị vào ao nuôi (Claim Device)

```http
POST /devices/claim
```

- **Quyền**: `farmer`.
- **Công dụng**: Người nuôi nhập mã `deviceUid` in trên tem thiết bị phần cứng để liên kết thiết bị vào một ao nuôi cụ thể của mình.
- **Điều kiện**: Thiết bị phải tồn tại trong Catalog hệ thống và chưa bị người khác gán vào ao của họ.

#### Body:
```json
{
  "deviceUid": "CAM-01-A1",
  "pondId": "3cb49a46-81cf-4a47-a365-1d6fa55e8d89"
}
```

#### Phản hồi thành công (`201 Created`): Trả về thiết bị với `pondId` đã được cập nhật.

---

### 7.4. [Farmer] Hủy gán thiết bị khỏi ao nuôi (Unassign Device)

```http
POST /devices/:id/unassign
```

- **Quyền**: `farmer`.
- **Công dụng**: Gỡ thiết bị ra khỏi ao nuôi (`pondId = null`), trả thiết bị về kho chuẩn để có thể gán sang ao khác hoặc trả về kho bảo trì.

#### Phản hồi thành công (`200 OK`): Trả về thiết bị với `pondId: null`.

---

### 7.5. Xem chi tiết thiết bị

```http
GET /devices/:id
```

- **Quyền**: `admin`, `farmer` (phải sở hữu ao gắn với thiết bị này).

---

### 7.6. Cập nhật thiết bị

```http
PATCH /devices/:id
```

- **Quyền**: `admin` hoặc `farmer`.
- **Phân quyền trường dữ liệu**:
  - `admin`: Được phép cập nhật `deviceUid`, `firmwareVersion`, `metadata`, `status`, `name`.
  - `farmer`: Chỉ được cập nhật `name`, `mode` (`automatic`, `manual`, `emergency_stop`) và `metadata`. Cấm tự đổi `deviceUid` hoặc `firmwareVersion`.

#### Body (Farmer đổi chế độ hoạt động):
```json
{
  "mode": "automatic"
}
```

---

### 7.7. [Admin] Xóa thiết bị khỏi danh mục

```http
DELETE /devices/:id
```

- **Quyền**: `admin`. Xóa vĩnh viễn thiết bị khỏi cơ sở dữ liệu.

---

### 7.8. [Farmer] Kích hoạt Dừng khẩn cấp (Emergency Stop)

```http
POST /devices/:id/emergency-stop
```

- **Quyền**: `farmer`.
- **Công dụng**: Lập tức chuyển `mode` của thiết bị sang `emergency_stop`. Nếu là máy cho ăn (`feeder`), hệ thống sẽ ngừng ngay lập tức cữ ăn đang chạy và gửi lệnh ngắt khẩn cấp qua MQTT.

#### Phản hồi thành công (`200 OK`):
```json
{
  "id": "22fffa98-46eb-4606-93a0-faae9f70691e",
  "mode": "emergency_stop",
  "status": "online"
}
```

---

### 7.9. Gửi tín hiệu nhịp tim thiết bị (Heartbeat)

```http
POST /devices/:id/heartbeat
```

- **Quyền**: `admin`, `farmer` (hoặc thiết bị IoT gọi qua REST/Gateway).
- **Công dụng**: Cập nhật `lastSeenAt = CURRENT_TIMESTAMP` và đánh dấu `status = 'online'`.

---

## 8. Module Vụ nuôi & Thống kê FCR (Crop Season)

Quản lý vòng đời vụ nuôi tôm của từng ao. Yêu cầu quyền **`farmer`**.

### 8.1. Danh sách vụ nuôi của ao

```http
GET /ponds/:pondId/crop-seasons
```

---

### 8.2. Tạo vụ nuôi mới cho ao nuôi

```http
POST /ponds/:pondId/crop-seasons
```

- **Ràng buộc an toàn**: Mỗi ao nuôi chỉ được phép có **tối đa 1 vụ nuôi ở trạng thái `active`** tại một thời điểm (được kiểm soát bởi DB Unique Partial Index).

#### Body:
```json
{
  "name": "Vụ tôm thẻ chân trắng 2026 - Đợt 1",
  "stockingDate": "2026-09-01",
  "initialCount": 200000,
  "stockingDensity": 66.6,
  "initialAverageWeightG": 0.02,
  "estimatedSurvivalRate": 85.0,
  "status": "active"
}
```

#### Phản hồi thành công (`201 Created`): Trả về đối tượng vụ nuôi mới tạo.

---

### 8.3. Xem chi tiết vụ nuôi

```http
GET /crop-seasons/:id
```

---

### 8.4. Thống kê chi tiết vụ nuôi & Hệ số FCR

```http
GET /crop-seasons/:id/statistics
```

- **Công dụng**: Tính toán tự động các chỉ số vận hành quan trọng của vụ nuôi:
  - Số ngày nuôi ($DOC = Days\ of\ Culture$).
  - Số lượng tôm sống sót ước tính dựa trên tỷ lệ sống.
  - Tổng khối lượng thức ăn đã tiêu thụ từ các cữ ăn hoàn thành ($kg$).
  - Tổng số cữ cho ăn đã thực hiện.
  - Ước tính sinh khối hiện tại ($kg$).
  - Hệ số chuyển đổi thức ăn thực tế ($FCR = \frac{Tổng\ thức\ ăn}{Độ\ tăng\ sinh\ khối}$).

#### Phản hồi thành công (`200 OK`):
```json
{
  "cropSeasonId": "uuid",
  "name": "Vụ tôm thẻ chân trắng 2026 - Đợt 1",
  "status": "active",
  "stockingDate": "2026-09-01",
  "daysOfCulture": 40,
  "initialCount": 200000,
  "estimatedSurvivingCount": 170000,
  "survivalRatePercent": 85.0,
  "totalFeedConsumedKg": 820.5,
  "totalFeedingSessions": 120,
  "estimatedCurrentBiomassKg": 765.0,
  "fcr": 1.07
}
```

---

### 8.5. Cập nhật vụ nuôi

```http
PATCH /crop-seasons/:id
```

- Cập nhật thông số thả giống, tỷ lệ sống, hoặc chuyển trạng thái sang `completed` khi thu hoạch.

---

### 8.6. Xóa vụ nuôi

```http
DELETE /crop-seasons/:id
```

---

## 9. Module Quản lý Cho ăn (Feeding Schedules & Records)

Quản lý lịch cho ăn tự động và nhật ký các lần cho ăn thực tế. Yêu cầu quyền **`farmer`**.

### 9.1. Danh sách lịch cho ăn của ao

```http
GET /ponds/:pondId/feeding-schedules
```

---

### 9.2. Tạo lịch cho ăn tự động

```http
POST /ponds/:pondId/feeding-schedules
```

- **Body**:
  - `name`: Tên cữ ăn (ví dụ: `Cữ sáng`).
  - `timeOfDay`: Khung giờ cho ăn theo định dạng `HH:mm` (ví dụ: `07:30`).
  - `feedAmountKg`: Khối lượng thức ăn định mức ($kg$, ví dụ: `15.0`).
  - `spreadRateKgPerMinute`: Tốc độ rải thức ăn ($kg/phút$, ví dụ: `1.5`).
  - `daysOfWeek`: Mảng số nguyên đại diện cho các ngày trong tuần (`0` là Chủ Nhật, `1` là Thứ Hai... `[1, 2, 3, 4, 5, 6, 0]`).
  - `isEnabled`: Trạng thái bật/tắt (mặc định: `true`).

```json
{
  "name": "Cữ sáng",
  "timeOfDay": "07:30",
  "feedAmountKg": 15.0,
  "spreadRateKgPerMinute": 1.5,
  "daysOfWeek": [1, 2, 3, 4, 5, 6, 0],
  "isEnabled": true
}
```

#### Phản hồi thành công (`201 Created`).

---

### 9.3. Cập nhật / Xóa lịch cho ăn

- `PATCH /feeding-schedules/:id`: Cập nhật thông số lịch.
- `DELETE /feeding-schedules/:id`: Xóa lịch cho ăn.

---

### 9.4. Lịch sử nhật ký các lần cho ăn

```http
GET /ponds/:pondId/feeding-records
```

---

### 9.5. Kích hoạt cữ cho ăn mới (Tự động bảo vệ qua Safety Rule Engine)

```http
POST /ponds/:pondId/feeding-records
```

- **Quy trình hoạt động cốt lõi**:
  1. Người nuôi hoặc hệ thống gửi yêu cầu cữ ăn mới (`requestedAmountKg`).
  2. Hệ thống gọi tự động **SafetyRuleEngineService**: Lấy snapshot chỉ số môi trường nước mới nhất từ `telemetry_readings` và so sánh với danh sách các luật an toàn trong `safety_rules`.
  3. **Nếu vi phạm luật cấm (decision = `blocked`)**:
     - Bản ghi được tạo với trạng thái `stopped`.
     - `safetyDecision = 'blocked'`, lưu lý do vào `safetyReason`.
     - Tự động sinh `Alert` mức `CRITICAL`.
     - **Tuyệt đối không phát lệnh MQTT tới máy cho ăn** để bảo vệ an toàn cho đàn tôm.
  4. **Nếu điều chỉnh an toàn (decision = `adjusted`)**:
     - Khối lượng thực tế được giảm theo hệ số an toàn.
     - `safetyDecision = 'adjusted'`, bản ghi chuyển sang `running`.
     - Phát lệnh qua MQTT tới thiết bị với khối lượng đã điều chỉnh.
  5. **Nếu an toàn tuyệt đối (decision = `allowed`)**:
     - `safetyDecision = 'allowed'`, trạng thái `running`.
     - Phát lệnh qua MQTT tới máy cho ăn xả 100% định mức.

#### Body:
```json
{
  "deviceId": "22fffa98-46eb-4606-93a0-faae9f70691e",
  "scheduleId": "uuid-lich-an-neu-co",
  "requestedAmountKg": 15.0,
  "source": "manual"
}
```
*`source`: `schedule`, `manual`, `ai`.*

#### Phản hồi thành công (`201 Created`):
```json
{
  "id": "uuid-feeding-record",
  "pondId": "uuid-ao",
  "deviceId": "22fffa98-46eb-4606-93a0-faae9f70691e",
  "startedAt": "2026-10-10T08:40:00.000Z",
  "requestedAmountKg": 15.0,
  "actualAmountKg": 15.0,
  "source": "manual",
  "status": "running",
  "safetyDecision": "allowed",
  "safetyReason": null
}
```

---

### 9.6. Cập nhật tiến trình cho ăn

```http
PATCH /feeding-records/:id
```

- **Công dụng**: Cập nhật trạng thái hoàn thành (`completed`), dừng (`stopped`), thất bại (`failed`), cập nhật lượng thức ăn thực tế đã rải (`actualAmountKg`), tỷ lệ thức ăn dư trên sàng (`leftoverPercent`) và cường độ bắt mồi (`appetiteLevel`).

#### Body:
```json
{
  "status": "completed",
  "actualAmountKg": 14.8,
  "leftoverPercent": 5.2,
  "appetiteLevel": 3
}
```

---

## 10. Module Quan trắc Chất lượng Nước (Telemetry) (`/ponds/:pondId/telemetry`)

Quyền: `admin`, `farmer`.

### 10.1. Lấy chỉ số môi trường nước mới nhất của ao

```http
GET /ponds/:pondId/telemetry/latest
```

- **Công dụng**: Lấy bản ghi quan trắc gần nhất để hiển thị trực tiếp lên đồng hồ đo (Gauges) của Dashboard.

#### Phản hồi thành công (`200 OK`):
```json
{
  "id": "uuid",
  "pondId": "uuid-ao",
  "deviceId": "uuid-cam-bien",
  "measuredAt": "2026-10-10T08:42:00.000Z",
  "ph": 7.85,
  "dissolvedOxygenMgL": 5.4,
  "temperatureC": 28.5,
  "salinityPpt": 15.2,
  "ammoniaMgL": 0.02,
  "turbidityNtu": 12.0
}
```

---

### 10.2. Lịch sử đo môi trường nước (Vẽ đồ thị & Phân trang)

```http
GET /ponds/:pondId/telemetry/history?startDate=2026-10-01T00:00:00.000Z&endDate=2026-10-10T23:59:59.000Z&deviceId=uuid&page=1&limit=50
```

- **Query Parameters**:
  - `startDate` (ISO String): Lọc từ thời điểm.
  - `endDate` (ISO String): Lọc đến thời điểm.
  - `deviceId` (UUID): Lọc theo cảm biến cụ thể.
  - `page` (number, mặc định: 1): Trang hiện tại.
  - `limit` (number, mặc định: 50, tối đa: 500): Số bản ghi mỗi trang.

#### Phản hồi thành công (`200 OK`):
```json
{
  "data": [ ... ],
  "total": 240,
  "page": 1,
  "limit": 50,
  "totalPages": 5
}
```

---

### 10.3. Ghi nhận chỉ số đo cảm biến (REST Ingestion / Simulator)

```http
POST /ponds/:pondId/telemetry
```

- **Quy trình kiểm tra ngưỡng tự động**:
  - Dữ liệu gửi lên sẽ lập tức được kiểm tra qua **TelemetryThresholdService**.
  - Nếu chỉ số rơi vào khoảng nguy hiểm (ví dụ DO < 3.5 mg/L, pH < 7.0 hoặc pH > 9.0, Ammonia > 0.1 mg/L), hệ thống sẽ tự động kích hoạt một `Alert` mức `CRITICAL`.
  - Áp dụng cơ chế **Debounce 15 phút** cho mỗi loại lỗi của từng ao nuôi để chống spam cảnh báo.

#### Body:
```json
{
  "deviceId": "uuid-cam-bien",
  "ph": 7.9,
  "dissolvedOxygenMgL": 3.2,
  "temperatureC": 28.7,
  "salinityPpt": 15.0,
  "ammoniaMgL": 0.03,
  "turbidityNtu": 11.8
}
```

#### Phản hồi thành công (`201 Created`): Trả về đối tượng quan trắc đã lưu.

---

## 11. Module Thị giác Máy tính & Cường độ Bắt mồi FIS (Camera Computer Vision) (`/camera`)

Hệ thống xử lý thị giác máy tính chạy **2 luồng AI song song**:
1. **YOLO11n-seg**: Phân đoạn hình ảnh sàng ăn (Tray Segmentation) để tính tỷ lệ diện tích thức ăn còn lại ($R_t$) và đếm mật độ tôm tập trung quanh sàng ($D_t$).
2. **MobileNetV3-Small**: Phân loại chuyển động và hành vi ăn tức thời ($C_t$) theo 4 mức độ.

Chỉ số cường độ bắt mồi tổng hợp:
$$FIS = w_1 \cdot \text{norm}(1 - R_t) + w_2 \cdot \text{norm}(v_t) + w_3 \cdot \text{norm}(D_t) + w_4 \cdot \text{norm}(C_t)$$

Trong đó $v_t = \frac{\Delta R_t}{\Delta t}$ là tốc độ tiêu thụ thức ăn. 4 mức bắt mồi:
- **0: None (Không ăn)** ($FIS < q_{25}$)
- **1: Weak (Ăn yếu)** ($q_{25} \le FIS < q_{50}$)
- **2: Normal (Bình thường)** ($q_{50} \le FIS < q_{75}$)
- **3: Strong (Ăn mạnh)** ($FIS \ge q_{75}$)

---

### 11.1. Phân tích khung hình Camera bằng AI (Song song 2 luồng)

```http
POST /camera/analyze
```

- **Quyền**: Đã đăng nhập (`admin`, `farmer`).
- **Công dụng**: Nhận ảnh khung hình (dạng chuỗi Base64 hoặc URL ảnh), chạy đồng thời YOLO11n-seg và MobileNetV3-Small, tính toán các chỉ số $R_t, v_t, D_t, C_t$, điểm FIS và mức độ thèm ăn.
- **Tự động liên kết**:
  - Tự động cập nhật `appetiteLevel` và `leftoverPercent` vào cữ ăn `feedingRecordId` (nếu có).
  - Tự động cập nhật trạng thái Camera thành `online` và ghi nhận `lastSeenAt`.
  - Tự động kích hoạt `Alert` mức `CRITICAL` nếu phát hiện thức ăn tồn đọng bất thường (> 50% sau thời gian dài) với độ trễ $\le 5$ giây.

#### Body:
```json
{
  "pondId": "3cb49a46-81cf-4a47-a365-1d6fa55e8d89",
  "deviceId": "22fffa98-46eb-4606-93a0-faae9f70691e",
  "feedingRecordId": "uuid-cu-an-neu-co",
  "frameUrl": "https://storage.shrimpmate.vn/frames/pond1_tray_20261010.jpg",
  "timeDeltaSeconds": 20,
  "roi": {
    "x": 250,
    "y": 180,
    "width": 600,
    "height": 600,
    "resolutionWidth": 1920,
    "resolutionHeight": 1080
  }
}
```

#### Phản hồi thành công (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "uuid-fis-log",
    "pondId": "3cb49a46-81cf-4a47-a365-1d6fa55e8d89",
    "deviceId": "22fffa98-46eb-4606-93a0-faae9f70691e",
    "timestamp": "2026-10-10T08:45:00.000Z",
    "remainingFeedAreaRt": 0.12,
    "feedConsumptionVelocityVt": 0.015,
    "shrimpDensityDt": 18.5,
    "behaviorClassificationCt": 2.8,
    "normalizedRt": 0.88,
    "normalizedVt": 0.3,
    "normalizedDt": 0.6167,
    "normalizedCt": 0.9333,
    "fisScore": 0.785,
    "appetiteLevel": 3,
    "confidence": 0.92,
    "frameUrl": "https://storage.shrimpmate.vn/frames/pond1_tray_20261010.jpg"
  },
  "analysisSummary": {
    "fisScore": 0.785,
    "appetiteLevel": 3,
    "appetiteLevelDescription": "Ăn mạnh (Mức 3)",
    "feedLeftoverPercent": 12.0,
    "shrimpDensity": 18.5,
    "consumptionVelocity": 0.015,
    "isAnomaly": false,
    "anomalyReason": null
  }
}
```

---

### 11.2. Thu nhận chỉ số tiền xử lý từ Camera AI Edge Gateway

```http
POST /camera/ingest-metrics
```

- **Quyền**: Public / Edge Gateway token.
- **Công dụng**: Dành cho các thiết bị phần cứng tại biên (như Raspberry Pi / Jetson Nano) đã chạy mô hình YOLO/MobileNet cục bộ, gửi trực tiếp các chỉ số $R_t, D_t, C_t$ lên máy chủ qua HTTP REST hoặc MQTT.

#### Body:
```json
{
  "pondId": "3cb49a46-81cf-4a47-a365-1d6fa55e8d89",
  "deviceUid": "CAM-01-A1",
  "remainingFeedAreaRt": 0.25,
  "shrimpDensityDt": 12.0,
  "behaviorClassificationCt": 2.0,
  "timeDeltaSeconds": 20,
  "confidence": 0.89
}
```

#### Phản hồi thành công (`201 Created`): Trả về bản ghi `CameraFisLog` đã được lưu trữ.

---

### 11.3. Lấy kết quả FIS mới nhất theo ao nuôi

```http
GET /camera/ponds/:pondId/latest-fis
```

- **Quyền**: `admin`, `farmer`.
- **Công dụng**: Lấy trạng thái bắt mồi mới nhất của ao, kiểm tra độ tươi của dữ liệu (`ageSeconds`, đánh dấu `isStale = true` nếu quá 120 giây không có khung hình mới) và thông tin camera quan sát.

#### Phản hồi thành công (`200 OK`):
```json
{
  "hasData": true,
  "pondId": "3cb49a46-81cf-4a47-a365-1d6fa55e8d89",
  "status": {
    "fisScore": 0.785,
    "appetiteLevel": 3,
    "appetiteLevelDescription": "Ăn mạnh (Mức 3)",
    "remainingFeedPercent": 12.0,
    "shrimpDensity": 18.5,
    "consumptionVelocity": 0.015,
    "timestamp": "2026-10-10T08:45:00.000Z",
    "ageSeconds": 25,
    "isStale": false
  },
  "camera": {
    "id": "uuid-cam",
    "name": "Camera quan sát Ao 1",
    "status": "online",
    "lastSeenAt": "2026-10-10T08:45:00.000Z"
  }
}
```

---

### 11.4. Lấy lịch sử chuỗi thời gian FIS (Vẽ biểu đồ trực quan)

```http
GET /camera/ponds/:pondId/fis-history?from=2026-10-01T00:00:00.000Z&to=2026-10-10T23:59:59.000Z&appetiteLevel=3&page=1&limit=50
```

- **Query Parameters**:
  - `from`, `to` (ISO Date String): Khoảng thời gian lọc.
  - `deviceId` (UUID): Lọc theo camera.
  - `feedingRecordId` (UUID): Lọc theo cữ ăn.
  - `appetiteLevel` (`0`, `1`, `2`, `3`): Lọc theo mức thèm ăn.
  - `page`, `limit`: Phân trang (mặc định: page 1, limit 50, tối đa 500).

#### Phản hồi thành công (`200 OK`):
```json
{
  "data": [ ... ],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3,
  "summary": {
    "avgFisScore": 0.684,
    "distribution": {
      "none": 5,
      "weak": 20,
      "normal": 75,
      "strong": 50
    }
  }
}
```

---

### 11.5. Danh sách camera thuộc ao nuôi

```http
GET /camera/ponds/:pondId/devices
```

- **Quyền**: `admin`, `farmer`. Trả về danh sách tất cả các thiết bị có `type = 'camera'` đang được gán vào ao nuôi này.

---

### 11.6. Cập nhật vùng quan sát cố định cho Camera (ROI)

```http
PATCH /camera/devices/:deviceId/roi
```

- **Quyền**: `admin`, `farmer`.
- **Công dụng**: Thiết lập tọa độ hộp chữ nhật hoặc đa giác của sàng ăn trên khung hình camera, lưu vào `metadata.roi` của thiết bị để AI tự động cắt đúng vùng sàng ăn trong các lần phân tích sau.

#### Body:
```json
{
  "x": 200,
  "y": 150,
  "width": 650,
  "height": 650,
  "polygon": [
    [200, 150],
    [850, 150],
    [850, 800],
    [200, 800]
  ],
  "resolutionWidth": 1920,
  "resolutionHeight": 1080
}
```

#### Phản hồi thành công (`200 OK`): Trả về đối tượng thiết bị đã cập nhật ROI.

---

### 11.7. Tinh chỉnh trọng số và phân vị thuật toán FIS

```http
PATCH /camera/ponds/:pondId/weights
```

- **Quyền**: `admin`, `farmer`.
- **Công dụng**: Điều chỉnh trọng số thành phần ($w_1, w_2, w_3, w_4$) và các ngưỡng phân vị ($q_{25}, q_{50}, q_{75}$) phù hợp với đặc thù nước đục/nước trong hoặc giống tôm của từng ao.

#### Body:
```json
{
  "weightRt": 0.35,
  "weightVt": 0.25,
  "weightDt": 0.20,
  "weightCt": 0.20,
  "quantile25": 0.25,
  "quantile50": 0.50,
  "quantile75": 0.75,
  "samplingIntervalSeconds": 20
}
```

#### Phản hồi thành công (`200 OK`):
```json
{
  "message": "Đã cập nhật trọng số và phân vị FIS cho 1 camera trong ao",
  "weights": { ... }
}
```

---

## 12. Module Đề xuất AI & Tối ưu cữ ăn (`/ponds/:pondId/ai`)

Tích hợp mô hình AI tối ưu lượng thức ăn theo sinh khối và dữ liệu môi trường. Yêu cầu quyền **`farmer`**.

### 12.1. Lấy khuyến nghị AI mới nhất cho ao nuôi

```http
GET /ponds/:pondId/ai/recommendations/latest
```

#### Phản hồi thành công (`200 OK`):
```json
{
  "id": "uuid",
  "pondId": "uuid-ao",
  "modelName": "ShrimpMate-FeedOpt-v2",
  "modelVersion": "2.1.0",
  "predictedFeedAmountKg": 16.2,
  "spreadRateKgPerMinute": 1.6,
  "appetiteLevel": 3,
  "biomassKg": 780.0,
  "anomalyScore": 0.04,
  "confidence": 0.94,
  "safetyDecision": "allowed",
  "safetyReason": null,
  "explanation": "Tôm bắt mồi mạnh (FIS cao), DO=5.5 mg/L và nhiệt độ 28.5°C nằm trong ngưỡng tối ưu. Đề xuất tăng nhẹ lượng thức ăn 5%."
}
```

---

### 12.2. Lịch sử các khuyến nghị AI

```http
GET /ponds/:pondId/ai/recommendations?limit=10
```

- **Query Parameters**: `limit` (mặc định: 10).

---

## 13. Module Cảnh báo & Xử lý Sự cố (`/alerts`)

Quyền: `admin`, `farmer` (Farmer chỉ thấy ao của mình, Admin thấy toàn hệ thống).

### 13.1. Tổng kết số lượng cảnh báo (Summary Badge)

```http
GET /alerts/summary?pondId=uuid-tuy-chon
```

- **Query Parameters**: `pondId` (tùy chọn, lọc theo ao).

#### Phản hồi thành công (`200 OK`):
```json
{
  "total": 12,
  "open": 2,
  "acknowledged": 3,
  "resolved": 7,
  "bySeverity": {
    "critical": 1,
    "warning": 4,
    "monitoring": 7
  }
}
```

---

### 13.2. Lấy danh sách toàn bộ cảnh báo

```http
GET /alerts?status=open&severity=3&pondId=uuid&page=1&limit=20
```

- **Query Parameters**:
  - `status`: `open`, `acknowledged`, `resolved`.
  - `severity`: `1` (monitoring), `2` (warning), `3` (critical).
  - `pondId`, `deviceId`, `type`: Lọc theo tiêu chí tương ứng.
  - `page`, `limit`: Phân trang.

---

### 13.3. Lấy danh sách cảnh báo theo từng ao cụ thể

```http
GET /ponds/:pondId/alerts?status=open
```

---

### 13.4. Xác nhận đã tiếp nhận sự cố (Acknowledge)

```http
PATCH /alerts/:id/acknowledge
```

- **Công dụng**: Người nuôi bấm nút xác nhận đã biết có sự cố đang xảy ra. Cập nhật `status = 'acknowledged'` và lưu thời điểm `acknowledgedAt`.

---

### 13.5. Xác nhận đã khắc phục sự cố xong (Resolve)

```http
PATCH /alerts/:id/resolve
```

- **Công dụng**: Người nuôi xác nhận đã xử lý xong sự cố ngoài ao (ví dụ: đã bật quạt nước nâng DO, đã thay nước...). Cập nhật `status = 'resolved'` và lưu thời điểm `resolvedAt`.

---

## 14. Module Quy tắc An toàn Nước (Safety Rule Engine) (`/safety-rules`)

Cung cấp khả năng cấu hình các luật nghiệp vụ an toàn để hệ thống tự động kiểm soát việc xả thức ăn.

### 14.1. Xem danh mục quy tắc an toàn

```http
GET /safety-rules
```

- **Quyền**: `admin`, `farmer`. Trả về tất cả các luật an toàn đang được kích hoạt trong hệ thống.

---

### 14.2. [Admin] Tạo quy tắc an toàn mới

```http
POST /safety-rules
```

- **Quyền**: `admin`.

#### Body:
```json
{
  "code": "DO_CRITICAL_BLOCKED",
  "name": "Chặn cho ăn khi DO dưới 3.5 mg/L",
  "priority": 1,
  "isEnabled": true,
  "condition": {
    "field": "dissolvedOxygenMgL",
    "operator": "<",
    "value": 3.5
  },
  "action": {
    "decision": "blocked",
    "reason": "Nồng độ oxy hòa tan (DO) quá thấp (< 3.5 mg/L). Cấm cho ăn để tránh tôm bị ngạt và ô nhiễm đáy ao."
  }
}
```

---

### 14.3. [Admin] Chi tiết, Cập nhật, Xóa quy tắc an toàn

- `GET /safety-rules/:id`: Xem chi tiết quy tắc.
- `PATCH /safety-rules/:id` [Admin]: Cập nhật điều kiện, ngưỡng, mức ưu tiên hoặc bật/tắt (`isEnabled`).
- `DELETE /safety-rules/:id` [Admin]: Xóa quy tắc.

---

### 14.4. Thử nghiệm đánh giá an toàn trước khi cho ăn (Preview Safety Evaluation)

```http
POST /ponds/:pondId/safety-rules/evaluate
```

- **Quyền**: `admin`, `farmer`.
- **Công dụng**: Cho phép ứng dụng Web / Mobile app kiểm tra trước kết quả an toàn dựa trên số đo cảm biến mới nhất của ao mà chưa cần tạo bản ghi thực tế. Giúp hiển thị cảnh báo cho người nuôi biết trước khi họ quyết định nhấn nút xả thức ăn.

#### Body:
```json
{
  "deviceId": "22fffa98-46eb-4606-93a0-faae9f70691e",
  "requestedAmountKg": 15.0
}
```

#### Phản hồi thành công (`200 OK` - Trường hợp bị chặn):
```json
{
  "decision": "blocked",
  "allowedAmountKg": 0,
  "requestedAmountKg": 15.0,
  "reasons": [
    "Nồng độ oxy hòa tan (DO) quá thấp (< 3.5 mg/L). Cấm cho ăn để tránh tôm bị ngạt và ô nhiễm đáy ao."
  ],
  "appliedRules": [
    "DO_CRITICAL_BLOCKED"
  ],
  "telemetrySnapshot": {
    "id": "uuid",
    "dissolvedOxygenMgL": 3.2,
    "ph": 7.8,
    "temperatureC": 28.5
  }
}
```

---

## 15. Module Giao tiếp MQTT & IoT Protocol (`/mqtt`)

### 15.1. Kiểm tra trạng thái kết nối MQTT Broker

```http
GET /mqtt/status
```

- **Quyền**: Public.

#### Phản hồi thành công (`200 OK`):
```json
{
  "connected": true,
  "message": "Đã kết nối tới MQTT Broker"
}
```

---

### 15.2. [Admin] Gửi lệnh kiểm thử Feeder qua MQTT

```http
POST /mqtt/devices/:deviceUid/feeder-test
```

- **Quyền**: `admin`.
- **Công dụng**: Phát lệnh kiểm tra phần cứng trực tiếp tới topic MQTT của máy cho ăn.

#### Body:
```json
{
  "command": "FEED",
  "feedAmountKg": 2.0,
  "spreadRateKgPerMinute": 1.5,
  "durationSeconds": 60
}
```

#### Phản hồi thành công (`200 OK`):
```json
{
  "success": true,
  "deviceUid": "ESP32_FEEDER_01",
  "message": "Đã gửi lệnh feeder test tới thiết bị ESP32_FEEDER_01"
}
```

---

### 15.3. Quy chuẩn Topic MQTT & Payloads

Hệ thống định tuyến dữ liệu IoT qua các Topic chuẩn:

#### 1. Thu nhận chỉ số môi trường nước (Telemetry Ingestion)
- **Topic**: `shrimpmate/telemetry/{deviceUid}` hoặc `shrimpmate/ponds/{pondId}/devices/{deviceUid}/telemetry`
- **Payload**:
  ```json
  {
    "deviceUid": "ESP32_SENSOR_01",
    "ph": 7.85,
    "dissolvedOxygenMgL": 5.4,
    "temperatureC": 28.5,
    "salinityPpt": 15.2,
    "ammoniaMgL": 0.02,
    "turbidityNtu": 12.0,
    "measuredAt": "2026-10-10T08:42:00.000Z"
  }
  ```

#### 2. Lệnh điều khiển máy cho ăn (Feeder Command)
- **Topic**: `shrimpmate/devices/{deviceUid}/feeder/command`
- **Payload**:
  ```json
  {
    "command": "FEED",
    "recordId": "uuid-feeding-record",
    "feedAmountKg": 15.0,
    "spreadRateKgPerMinute": 1.5,
    "timestamp": "2026-10-10T08:40:00.000Z"
  }
  ```

#### 3. Phản hồi trạng thái từ máy cho ăn (Feeder Status)
- **Topic**: `shrimpmate/devices/{deviceUid}/feeder/status`
- **Payload**:
  ```json
  {
    "deviceUid": "ESP32_FEEDER_01",
    "recordId": "uuid-feeding-record",
    "status": "completed",
    "actualAmountKg": 14.8,
    "timestamp": "2026-10-10T08:50:00.000Z"
  }
  ```

#### 4. Tín hiệu nhịp tim phần cứng (Device Heartbeat)
- **Topic**: `shrimpmate/devices/{deviceUid}/heartbeat`
- **Payload**:
  ```json
  {
    "deviceUid": "ESP32_FEEDER_01",
    "status": "online",
    "firmwareVersion": "1.2.0",
    "timestamp": "2026-10-10T08:45:00.000Z"
  }
  ```

---

## 16. Tài khoản Seed Mẫu Sẵn Có

Hệ thống tự động khởi tạo các tài khoản chuẩn khi chạy seed:

| Vai trò (Role) | Email | Số điện thoại | Mật khẩu | Phạm vi quyền hạn |
| --- | --- | --- | --- | --- |
| `admin` | `admin@shrimpmate.local` | `0901000001` | `Admin@123456` | Quản trị viên hệ thống: Quản lý catalog phần cứng, khóa/phân quyền tài khoản, cấu hình luật an toàn, báo cáo tổng quan và FCR toàn hệ thống |
| `farmer` | `farmer@shrimpmate.local` | `0901000002` | `Farmer@123456` | Người nuôi tôm: Sở hữu và tự chủ các Farm và Pond mẫu, gán thiết bị, tạo lịch ăn, phân tích AI camera FIS và tiếp nhận cảnh báo |
