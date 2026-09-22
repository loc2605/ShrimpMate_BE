# ShrimpMate Backend API

## 1. Thông tin chung

- Base URL: `http://localhost:3000` (hoặc `http://<IP_MAY_BACKEND>:3000` khi chạy khác máy trong mạng LAN)
- Content-Type: `application/json`
- Các API được bảo vệ sử dụng JWT cần gửi kèm header:

```http
Authorization: Bearer <access_token>
```

### Cấu hình kết nối Frontend (khi FE và BE chạy trên 2 máy khác nhau)

#### 1. Cùng mạng Wi-Fi / LAN (Thường dùng khi làm việc nhóm)
- **Kiểm tra IP máy Backend**: Trên máy Backend, mở terminal chạy `ipconfig` để lấy địa chỉ `IPv4 Address` (ví dụ: `192.168.24.35`).
- **Cấu hình Base URL trên Frontend**: Trong file `.env` của Frontend, thay `localhost` bằng IP máy Backend:
  ```env
  # Ví dụ với Vite:
  VITE_API_BASE_URL=http://192.168.24.35:3000

  # Ví dụ với Next.js:
  NEXT_PUBLIC_API_URL=http://192.168.24.35:3000
  ```
- **Backend CORS & Host**: Backend đã được cấu hình `app.enableCors({ origin: true, credentials: true })` và lắng nghe trên host `0.0.0.0` tại `src/main.ts` để chấp nhận request từ thiết bị khác trong mạng.
- **Tường lửa (Windows Firewall)**: Mở cổng `3000` trên Windows Defender Firewall nếu FE gặp lỗi timeout.

#### 2. Khác mạng (Kết nối từ xa qua Internet)
- Dùng Cloudflare Tunnel:
  ```powershell
  npx cloudflared tunnel --url http://localhost:3000
  ```

---

### Mô hình Phân quyền: 2 Roles chính

1. **Quản trị viên (Admin - `admin`)**:
   - Quản trị viên cấp cao của nền tảng, chịu trách nhiệm duy trì sự ổn định của hệ thống máy chủ.
   - **Quản lý trạng thái người dùng**: Theo dõi danh sách tài khoản đã đăng ký trên hệ thống; thực hiện khóa hoặc tạm ngưng quyền truy cập đối với các tài khoản vi phạm hoặc có nguy cơ mất an toàn thông tin (`GET /auth/users`, `PATCH /auth/users/:id/status`). Admin **không** tạo tài khoản hay chỉnh sửa thông tin cá nhân thay cho người nuôi.
   - **Quản lý danh mục thiết bị IoT**: Khai báo và quản lý danh mục thiết bị phần cứng chuẩn được phép kết nối vào hệ thống (`feeder`, `sensor_node`, `camera`), cấu hình phiên bản firmware chuẩn và kiểm soát danh sách định danh thiết bị (`device_uid`).
   - **Giám sát toàn diện & thống kê - báo cáo cấp hệ thống**: Theo dõi tổng quan số lượng tài khoản đăng ký, số lượng trang trại, ao nuôi đang kích hoạt, tỷ lệ thiết bị trực tuyến (online/offline) qua tín hiệu heartbeat; thống kê tổng thể tần suất cảnh báo và trích xuất báo cáo vận hành toàn nền tảng (`GET /admin/overview`, `GET /admin/reports/operational`).
   - **Không can thiệp vào quy trình quản lý nội bộ của từng hộ nuôi** (không tạo ao, sửa ao, can thiệp lịch cho ăn hay điều khiển thiết bị của người nuôi).

2. **Người nuôi (Farmer - `farmer`)**:
   - Chủ thể tự quản lý toàn bộ cơ sở nuôi của mình, sở hữu toàn quyền đối với dữ liệu trang trại và chu trình nuôi trồng trên cả Web Dashboard lẫn Mobile App:
   - **Tự chủ tài khoản**: Trực tiếp đăng ký tài khoản bằng Email và Số điện thoại, tự đăng nhập, chủ động cập nhật thông tin cá nhân (`PATCH /auth/profile`), đổi mật khẩu và khôi phục tài khoản thông qua mã xác thực OTP.
   - **Tự quản lý trang trại và ao nuôi**: Tự tạo mới và quản lý thông tin các trang trại thuộc quyền sở hữu của mình (`farms`); tự do khởi tạo, chỉnh sửa thông số diện tích ($m^2$), mã ao và cấu hình trạng thái của từng ao nuôi (`ponds`) mà không cần thông qua sự phê duyệt của Admin.
   - **Quản lý vụ nuôi và lịch cho ăn**: Tự thiết lập các vụ nuôi mới cho từng ao (ngày thả giống, mật độ, số lượng thả, tỷ lệ sống ước tính); thiết lập và tinh chỉnh các lịch cho ăn tự động (khung giờ, định mức khối lượng thức ăn, tốc độ rải).
   - **Gán thiết bị và điều khiển từ xa**: Đăng ký gán các thiết bị IoT vào từng ao nuôi cụ thể (`POST /devices/claim`); thực hiện điều khiển bật/tắt máy cho ăn, chuyển đổi chế độ tự động/thủ công và kích hoạt lệnh Dừng khẩn cấp (Emergency Stop) từ xa.
   - **Giám sát môi trường và khai thác AI**: Theo dõi liên tục các chỉ số môi trường nước (pH, DO, nhiệt độ, độ mặn, NH₃, độ đục); tham khảo lượng thức ăn dự báo, cường độ bắt mồi (FIS) do AI phân tích để điều chỉnh cữ ăn.
   - **Xử lý cảnh báo và thống kê vụ nuôi**: Tiếp nhận thông báo đẩy khi có chỉ số nguy hiểm hoặc sự cố thiết bị, xác nhận đã tiếp nhận / khắc phục sự cố và xem báo cáo thống kê FCR, lượng thức ăn tiêu thụ của từng ao/vụ nuôi (`GET /crop-seasons/:id/statistics`).

---

## 2. Health check

```http
GET /
```

Response:
```text
Hello World!
```

---

## 3. Authentication & User Status API

### Đăng ký tài khoản (Người nuôi - Farmer)

```http
POST /auth/register
```

Body:
```json
{
  "email": "farmer1@example.com",
  "phoneNumber": "0901234567",
  "password": "password123",
  "fullName": "Nguyen Van Farmer"
}
```

- **Quyền**: Không cần đăng nhập.
- Tài khoản đăng ký mới mặc định nhận role **`farmer`**.
- `phoneNumber` định dạng số điện thoại Việt Nam (10 chữ số, bắt đầu bằng `0`). Tự động chuẩn hóa từ `+84` hoặc `84`.
- `email` và `phoneNumber` là duy nhất (trùng lặp trả về `409 Conflict`).

### Đăng nhập

```http
POST /auth/login
```

Body (sử dụng email hoặc số điện thoại):
```json
{
  "identifier": "farmer1@example.com",
  "password": "password123"
}
```

Hoặc:
```json
{
  "identifier": "0901234567",
  "password": "password123"
}
```

Response:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "farmer1@example.com",
    "phoneNumber": "0901234567",
    "fullName": "Nguyen Van Farmer",
    "role": "farmer",
    "isActive": true,
    "createdAt": "2026-09-19T15:00:00.000Z",
    "updatedAt": "2026-09-19T15:00:00.000Z"
  }
}
```

### Làm mới token

```http
POST /auth/refresh-token
```

Body:
```json
{
  "refreshToken": "eyJ..."
}
```

### Quên mật khẩu (Gửi OTP)

```http
POST /auth/forgot-password
```

Body:
```json
{
  "identifier": "farmer1@example.com"
}
```

Response:
```json
{
  "message": "Nếu tài khoản tồn tại trong hệ thống, mã OTP đã được gửi. Vui lòng kiểm tra email/SMS hoặc liên hệ quản trị viên."
}
```

### Gửi lại mã OTP (Resend OTP)

```http
POST /auth/resend-otp
```

Body:
```json
{
  "identifier": "farmer1@example.com"
}
```

### Xác thực mã OTP (Kiểm tra trước khi đổi mật khẩu)

```http
POST /auth/verify-reset-otp
```

Body:
```json
{
  "identifier": "farmer1@example.com",
  "otp": "123456"
}
```

Response:
```json
{
  "valid": true,
  "message": "Mã OTP chính xác và hợp lệ"
}
```

### Đặt lại mật khẩu bằng OTP

```http
POST /auth/reset-password
```

Body:
```json
{
  "identifier": "farmer1@example.com",
  "otp": "123456",
  "newPassword": "password-moi-123"
}
```

### Lấy thông tin tài khoản hiện tại

```http
GET /auth/me
```

Quyền: Đã đăng nhập (`admin`, `farmer`).

### Cập nhật hồ sơ cá nhân (Người nuôi tự chủ)

```http
PATCH /auth/profile
```

Quyền: Đã đăng nhập (`admin`, `farmer`).

Body:
```json
{
  "fullName": "Nguyen Van Farmer (Cap nhat)",
  "phoneNumber": "0909888777"
}
```

### Đổi mật khẩu

```http
PATCH /auth/change-password
```

Body:
```json
{
  "currentPassword": "password-cu",
  "newPassword": "password-moi-123"
}
```

### [Admin] Xem danh sách tài khoản đã đăng ký

```http
GET /auth/users
```

Quyền: `admin`.

### [Admin] Khóa hoặc Mở khóa tài khoản

```http
PATCH /auth/users/:id/status
```

Quyền: `admin`.

Body:
```json
{
  "isActive": false
}
```
*Tài khoản bị khóa sẽ không thể đăng nhập và toàn bộ refresh token hiện có sẽ bị hủy.*

### [Admin] Cập nhật vai trò tài khoản

```http
PATCH /auth/users/:id/role
```

Quyền: `admin`.

Body:
```json
{
  "role": "admin"
}
```
*Giá trị cho phép: `admin` hoặc `farmer`.*

---

## 4. Admin Monitoring & System Reports API

### [Admin] Thống kê tổng quan toàn nền tảng

```http
GET /admin/overview
```

Quyền: `admin`.

Response:
```json
{
  "serverTime": "2026-09-19T15:30:00.000Z",
  "users": {
    "total": 120,
    "active": 115,
    "locked": 5,
    "farmers": 118,
    "admins": 2
  },
  "farms": {
    "total": 45,
    "active": 42,
    "inactive": 3
  },
  "ponds": {
    "total": 150,
    "active": 138,
    "maintenance": 8,
    "inactive": 4
  },
  "devices": {
    "total": 210,
    "online": 195,
    "offline": 15,
    "onlineRatePercent": 92.9
  },
  "alerts": {
    "total": 60,
    "open": 8,
    "acknowledged": 12,
    "resolved": 40,
    "bySeverity": {
      "critical": 5,
      "warning": 25,
      "monitoring": 30
    }
  }
}
```

### [Admin] Báo cáo vận hành toàn nền tảng

```http
GET /admin/reports/operational
```

Quyền: `admin`. Trả về báo cáo tổng quan, danh sách cảnh báo sự cố gần đây và danh sách các thiết bị ngoại tuyến (offline) cần kiểm tra bảo trì.

### [Admin] Báo cáo hiệu quả chuyển đổi thức ăn (FCR) toàn hệ thống

```http
GET /admin/reports/fcr
```

Quyền: `admin`.

Response:
```json
{
  "generatedAt": "2026-09-22T09:30:00.000Z",
  "summary": {
    "totalSeasonsEvaluated": 12,
    "totalFeedConsumedSystemKg": 18500.5,
    "totalBiomassGainSystemKg": 15400.0,
    "averageSystemFcr": 1.20,
    "systemQualityRating": "Xuất sắc"
  },
  "seasons": [
    {
      "cropSeasonId": "uuid",
      "seasonName": "Vụ Mùa Mưa 2026",
      "status": "active",
      "farmName": "Trang trại Sóng Xanh",
      "pondName": "Ao Nuôi Số 1",
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

## 5. Farm API (Người nuôi tự quản lý)

### Lấy danh sách trang trại của Farmer

```http
GET /farms
```

Quyền: `farmer`. Chỉ trả về các trang trại do chính người nuôi này sở hữu (`ownerId = user.id`).

### Tạo trang trại mới

```http
POST /farms
```

Quyền: `farmer`. Tự động gán `ownerId` là người tạo.

Body:
```json
{
  "name": "Trang trại Tôm Bạc Liêu 1",
  "address": "Bạc Liêu, Việt Nam",
  "status": "active"
}
```

### Lấy chi tiết / Cập nhật / Xóa trang trại

- `GET /farms/:id`: Lấy chi tiết trang trại (chỉ chủ sở hữu).
- `PATCH /farms/:id`: Cập nhật tên, địa chỉ, trạng thái.
- `DELETE /farms/:id`: Xóa mềm trang trại (soft delete) và các ao thuộc trang trại.

---

## 6. Pond API (Người nuôi tự quản lý)

### Lấy danh sách ao nuôi thuộc trang trại

```http
GET /farms/:farmId/ponds
```

Quyền: `farmer` (chủ sở hữu trang trại).

### Tạo ao nuôi mới

```http
POST /farms/:farmId/ponds
```

Quyền: `farmer` (không cần sự phê duyệt của Admin).

Body:
```json
{
  "code": "POND-01",
  "name": "Ao nuôi số 1 - Khu A",
  "areaM2": 3000,
  "status": "active"
}
```
*Trạng thái: `active`, `inactive`, `maintenance`.*

### Lấy chi tiết / Cập nhật / Xóa ao nuôi

- `GET /farms/:farmId/ponds/:id`: Lấy thông tin ao nuôi.
- `PATCH /farms/:farmId/ponds/:id`: Cập nhật diện tích ($m^2$), tên ao, mã ao, trạng thái.
- `DELETE /farms/:farmId/ponds/:id`: Xóa ao nuôi.

---

## 7. Device & IoT Hardware Catalog API

### [Admin] Khai báo thiết bị chuẩn vào danh mục hệ thống

```http
POST /devices
```

Quyền: `admin`.

Body:
```json
{
  "deviceUid": "DEV-FEEDER-VN-001",
  "name": "Máy cho ăn chuẩn Model A1",
  "type": "feeder",
  "firmwareVersion": "v1.2.0",
  "metadata": {
    "manufacturer": "ShrimpMate IoT",
    "batch": "2026-Q1"
  }
}
```
*`type`: `feeder`, `sensor_node`, `camera`, `edge_gateway`.*
*Thiết bị tạo mới mặc định `pondId: null`, sẵn sàng để người nuôi đăng ký gán vào ao.*

### [Admin] Quản trị danh mục phần cứng

- `GET /devices`: Admin xem toàn bộ thiết bị trong danh mục hệ thống và trạng thái kết nối.
- `PATCH /devices/:id`: Admin cập nhật firmware version, tên, metadata, hoặc trạng thái.
- `DELETE /devices/:id`: Admin xóa thiết bị khỏi danh mục hệ thống.

### [Farmer] Xem danh sách thiết bị thuộc các ao của mình

```http
GET /devices
```

Quyền: `farmer`. Hệ thống tự động lọc và chỉ hiển thị các thiết bị đã được gán vào các ao của Farmer.

### [Farmer] Đăng ký gán thiết bị IoT vào ao nuôi

```http
POST /devices/claim
```

Quyền: `farmer`.

Body:
```json
{
  "deviceUid": "DEV-FEEDER-VN-001",
  "pondId": "uuid-cua-ao-nuoi"
}
```
*Ao nuôi phải thuộc sở hữu của người nuôi. Thiết bị phải tồn tại trong danh mục phần cứng chuẩn và chưa bị gán vào ao của người khác.*

### [Farmer] Hủy gán thiết bị khỏi ao nuôi

```http
POST /devices/:id/unassign
```

Quyền: `farmer`. Đưa thiết bị về trạng thái chưa gán (`pondId: null`).

### [Farmer] Điều khiển chế độ và máy cho ăn

```http
PATCH /devices/:id
```

Quyền: `farmer` (với thiết bị trong ao của mình).

Body ví dụ chuyển chế độ:
```json
{
  "mode": "automatic"
}
```
*`mode`: `automatic`, `manual`, `emergency_stop`.*

### [Farmer] Kích hoạt Dừng khẩn cấp từ xa (Emergency Stop)

```http
POST /devices/:id/emergency-stop
```

Quyền: `farmer`. Chuyển ngay lập tức chế độ thiết bị sang `emergency_stop`.

### [IoT / Simulator] Gửi tín hiệu nhịp tim (Heartbeat)

```http
POST /devices/:id/heartbeat
```

Cập nhật thời điểm `lastSeenAt` và đánh dấu `status = 'online'`.

---

## 8. Crop Season & FCR Statistics API (Người nuôi)

### Tạo vụ nuôi mới cho ao nuôi

```http
POST /ponds/:pondId/crop-seasons
```

Quyền: `farmer`.

Body:
```json
{
  "name": "Vụ tôm thẻ chân trắng 2026 - Đợt 1",
  "stockingDate": "2026-09-01",
  "initialCount": 200000,
  "stockingDensity": 66.6,
  "initialAverageWeightG": 0.02,
  "estimatedSurvivalRate": 85,
  "status": "active"
}
```
*Mỗi ao chỉ được có tối đa 1 vụ nuôi ở trạng thái `active`.*

### Xem danh sách / Chi tiết vụ nuôi

- `GET /ponds/:pondId/crop-seasons`: Danh sách vụ nuôi của ao.
- `GET /crop-seasons/:id`: Chi tiết vụ nuôi.
- `PATCH /crop-seasons/:id`: Cập nhật thông số vụ nuôi (hoặc đổi trạng thái sang `completed`).
- `DELETE /crop-seasons/:id`: Xóa vụ nuôi.

### Thống kê vụ nuôi & Hệ số chuyển đổi thức ăn (FCR)

```http
GET /crop-seasons/:id/statistics
```

Quyền: `farmer`.

Response:
```json
{
  "cropSeasonId": "uuid",
  "name": "Vụ tôm thẻ chân trắng 2026 - Đợt 1",
  "status": "active",
  "stockingDate": "2026-09-01",
  "daysOfCulture": 18,
  "initialCount": 200000,
  "estimatedSurvivingCount": 170000,
  "survivalRatePercent": 85,
  "totalFeedConsumedKg": 750.5,
  "totalFeedingSessions": 54,
  "estimatedCurrentBiomassKg": 768.4,
  "fcr": 1.08
}
```

---

## 9. Feeding API (Lịch cho ăn & Nhật ký & Đánh giá An toàn)

### Lịch cho ăn tự động

- `GET /ponds/:pondId/feeding-schedules`: Danh sách lịch cho ăn.
- `POST /ponds/:pondId/feeding-schedules`: Tạo lịch (khung giờ, định mức kg, tốc độ rải kg/phút, các ngày trong tuần).
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
- `PATCH /feeding-schedules/:id`: Tinh chỉnh cữ ăn.
- `DELETE /feeding-schedules/:id`: Xóa lịch.

### Nhật ký cho ăn (Feeding Records) & Kích hoạt qua Safety Rule Engine

- `GET /ponds/:pondId/feeding-records`: Lịch sử các cữ cho ăn.
- `POST /ponds/:pondId/feeding-records`: Tạo và kích hoạt cữ cho ăn mới.
  - Tự động đánh giá qua **Safety Rule Engine** (kiểm tra DO, pH, Nhiệt độ, Khí độc NH3, trạng thái thiết bị).
  - Nếu `BLOCKED`: Lưu record ở trạng thái `stopped`, ghi nhận `safetyDecision = 'blocked'`, tự động sinh Alert mức `CRITICAL` và **không phát lệnh MQTT**.
  - Nếu `ADJUSTED`: Điều chỉnh khối lượng (`actualAmountKg = requestedAmountKg * factor`), lưu `safetyDecision = 'adjusted'` và phát lệnh MQTT tới máy cho ăn.
  - Nếu `ALLOWED`: Cho phép xả 100% định mức, phát lệnh MQTT tới máy cho ăn và chuyển sang `running`.
  ```json
  {
    "deviceId": "uuid",
    "requestedAmountKg": 12.5,
    "source": "manual"
  }
  ```
- `PATCH /feeding-records/:id`: Cập nhật tiến trình (`running`, `completed`, `stopped`, `failed`), cập nhật `actualAmountKg` thực tế và ghi nhận `leftoverPercent`.

---

## 10. Water Quality Telemetry API (Chất lượng nước & Kiểm tra Ngưỡng)

### Lấy chỉ số môi trường nước mới nhất của ao

```http
GET /ponds/:pondId/telemetry/latest
```

Quyền: `admin`, `farmer`.

Response:
```json
{
  "id": "uuid",
  "pondId": "uuid",
  "deviceId": "uuid",
  "measuredAt": "2026-09-22T09:25:00.000Z",
  "ph": 7.8,
  "dissolvedOxygenMgL": 5.6,
  "temperatureC": 28.5,
  "salinityPpt": 15.2,
  "ammoniaMgL": 0.02,
  "turbidityNtu": 12.4
}
```

### Lấy lịch sử đo môi trường nước (Vẽ đồ thị & Phân trang theo thời gian)

```http
GET /ponds/:pondId/telemetry/history?startDate=2026-09-01T00:00:00.000Z&endDate=2026-09-22T23:59:59.000Z&deviceId=uuid&page=1&limit=50
```

Quyền: `admin`, `farmer`.

Query Parameters:
- `startDate` (ISO String): Lọc từ thời điểm.
- `endDate` (ISO String): Lọc đến thời điểm.
- `deviceId` (UUID): Lọc theo cảm biến đo.
- `page` (number, default: 1): Trang hiện tại.
- `limit` (number, default: 50, max: 500): Số lượng bản ghi mỗi trang.

Response:
```json
{
  "data": [ ... ],
  "total": 120,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

### Ghi nhận chỉ số đo cảm biến (Cảm biến / REST Simulator)

```http
POST /ponds/:pondId/telemetry
```

Quyền: `admin`, `farmer`.

Body:
```json
{
  "deviceId": "uuid",
  "ph": 7.9,
  "dissolvedOxygenMgL": 3.2,
  "temperatureC": 28.7,
  "salinityPpt": 15.0,
  "ammoniaMgL": 0.03,
  "turbidityNtu": 11.8
}
```

*Hệ thống tự động chạy qua **TelemetryThresholdService**: Nếu chỉ số vượt ngưỡng an toàn (ví dụ DO = 3.2 mg/L < 3.5 mg/L), hệ thống sẽ tự động tạo `Alert` cảnh báo mức `CRITICAL` và áp dụng debounce 15 phút chống spam.*

---

## 11. AI Recommendations & Feeding Intensity (FIS) API

### Lấy khuyến nghị AI mới nhất cho ao nuôi

```http
GET /ponds/:pondId/ai/recommendations/latest
```

Quyền: `farmer`.

Response:
```json
{
  "id": "uuid",
  "pondId": "uuid",
  "modelName": "ShrimpMate-FeedOpt-v2",
  "modelVersion": "2.1.0",
  "predictedFeedAmountKg": 16.2,
  "spreadRateKgPerMinute": 1.6,
  "appetiteLevel": 3,
  "biomassKg": 780.0,
  "anomalyScore": 0.04,
  "confidence": 0.94,
  "safetyDecision": "allowed",
  "explanation": "Tôm bắt mồi mạnh (FIS cao), DO và nhiệt độ nước trong ngưỡng tối ưu. Đề xuất tăng nhẹ lượng thức ăn 5%."
}
```

### Lịch sử các khuyến nghị AI

```http
GET /ponds/:pondId/ai/recommendations?limit=10
```

Quyền: `farmer`.

---

## 12. Alerts & Incident Handling API

### Lấy số lượng tổng kết cảnh báo (Summary Badge)

```http
GET /alerts/summary?pondId=uuid
```

Quyền: `admin`, `farmer`.

Response:
```json
{
  "total": 15,
  "open": 3,
  "acknowledged": 2,
  "resolved": 10,
  "bySeverity": {
    "critical": 1,
    "warning": 4,
    "monitoring": 10
  }
}
```

### Lấy danh sách cảnh báo của toàn bộ trang trại

```http
GET /alerts?status=open&severity=3&page=1&limit=20
```

Quyền: `admin`, `farmer`. (Farmer chỉ thấy ao của mình; Admin thấy toàn hệ thống).

Query Parameters:
- `status`: `open`, `acknowledged`, `resolved`.
- `severity`: `1` (monitoring), `2` (warning), `3` (critical).
- `pondId`: Lọc theo ao.
- `deviceId`: Lọc theo thiết bị.
- `type`: Lọc theo loại cảnh báo.
- `page`, `limit`: Phân trang.

### Lấy danh sách cảnh báo theo từng ao

```http
GET /ponds/:pondId/alerts?status=open
```

Quyền: `admin`, `farmer`.

### Xác nhận đã tiếp nhận cảnh báo (Acknowledge)

```http
PATCH /alerts/:id/acknowledge
```

Quyền: `admin`, `farmer`. Chuyển trạng thái sang `acknowledged` và ghi nhận thời gian `acknowledgedAt`.

### Xác nhận đã giải quyết xong sự cố (Resolve)

```http
PATCH /alerts/:id/resolve
```

Quyền: `admin`, `farmer`. Chuyển trạng thái sang `resolved` và ghi nhận thời gian `resolvedAt`.

---

## 13. Safety Rule Engine API

### [Admin & Farmer] Xem danh mục quy tắc an toàn

```http
GET /safety-rules
```

### [Admin] Tạo quy tắc an toàn mới

```http
POST /safety-rules
```

Quyền: `admin`.

Body:
```json
{
  "code": "DO_CRITICAL_CUSTOM",
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
    "reason": "Oxy hòa tan quá thấp, cấm xả thức ăn."
  }
}
```

### [Admin & Farmer] Thử nghiệm đánh giá an toàn trước khi cho ăn

```http
POST /ponds/:pondId/safety-rules/evaluate
```

Quyền: `admin`, `farmer`. Cho phép Web/Mobile app preview điều kiện an toàn và lý do trước khi bấm xác nhận cho ăn.

Body:
```json
{
  "deviceId": "uuid",
  "requestedAmountKg": 15.0
}
```

Response:
```json
{
  "decision": "blocked",
  "allowedAmountKg": 0,
  "requestedAmountKg": 15.0,
  "reasons": [
    "Nồng độ oxy hòa tan (DO) quá thấp (< 3.5 mg/L). Cấm cho ăn để tránh tôm bị ngạt và dư thừa thức ăn gây ô nhiễm đáy ao."
  ],
  "appliedRules": [
    "DO_BELOW_CRITICAL"
  ],
  "telemetrySnapshot": {
    "id": "uuid",
    "dissolvedOxygenMgL": 3.2,
    "ph": 7.8,
    "temperatureC": 29.0
  }
}
```

---

## 14. MQTT & IoT Communication Protocol

### Kiểm tra trạng thái kết nối MQTT Broker

```http
GET /mqtt/status
```

Response:
```json
{
  "connected": true,
  "message": "Đã kết nối tới MQTT Broker"
}
```

### [Admin] Gửi lệnh kiểm thử Feeder qua MQTT

```http
POST /mqtt/devices/:deviceUid/feeder-test
```

Body:
```json
{
  "command": "FEED",
  "feedAmountKg": 2.0,
  "spreadRateKgPerMinute": 1.5,
  "durationSeconds": 60
}
```

### Quy chuẩn Topic MQTT & Payloads:

1. **Thu nhận Telemetry**: `shrimpmate/telemetry/{deviceUid}` hoặc `shrimpmate/ponds/{pondId}/devices/{deviceUid}/telemetry`
   ```json
   {
     "deviceUid": "ESP32_SENSOR_01",
     "ph": 7.9,
     "dissolvedOxygenMgL": 5.8,
     "temperatureC": 29.2,
     "salinityPpt": 16.0,
     "ammoniaMgL": 0.02,
     "turbidityNtu": 25.0,
     "measuredAt": "2026-09-22T09:00:00.000Z"
   }
   ```
2. **Lệnh cho ăn (Feeder Command)**: `shrimpmate/devices/{deviceUid}/feeder/command`
   ```json
   {
     "command": "FEED",
     "recordId": "uuid",
     "feedAmountKg": 10.0,
     "spreadRateKgPerMinute": 1.5,
     "timestamp": "2026-09-22T09:00:00.000Z"
   }
   ```
3. **Phản hồi từ Feeder**: `shrimpmate/devices/{deviceUid}/feeder/status`
   ```json
   {
     "deviceUid": "ESP32_FEEDER_01",
     "recordId": "uuid",
     "status": "completed",
     "actualAmountKg": 10.0,
     "timestamp": "2026-09-22T09:05:00.000Z"
   }
   ```
4. **Heartbeat thiết bị**: `shrimpmate/devices/{deviceUid}/heartbeat`
   ```json
   {
     "deviceUid": "ESP32_FEEDER_01",
     "status": "online",
     "firmwareVersion": "1.2.0",
     "timestamp": "2026-09-22T09:00:00.000Z"
   }
   ```

*Chạy script mô phỏng ESP32: `node scripts/mqtt-simulator.js [feeder | telemetry | abnormal]`.*

---

## 15. Dữ liệu Seed mẫu

Hệ thống tự động khởi tạo dữ liệu mẫu khi khởi động:

| Role | Email | Số điện thoại | Mật khẩu | Mô tả |
| --- | --- | --- | --- | --- |
| `admin` | `admin@shrimpmate.local` | `0901000001` | `Admin@123456` | Quản trị viên hệ thống, quản lý catalog thiết bị, luật an toàn và giám sát toàn diện |
| `farmer` | `farmer@shrimpmate.local` | `0901000002` | `Farmer@123456` | Người nuôi tôm, sở hữu các Farm và Pond mẫu |

*Có thể tùy chỉnh tài khoản mẫu thông qua biến môi trường `SEED_ADMIN_*` và `SEED_FARMER_*`.*
