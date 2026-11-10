# TÀI LIỆU HƯỚNG DẪN TÍCH HỢP FRONTEND & BẢN ĐẶC TẢ GIAO DIỆN HỆ THỐNG SHRIMPMATE
> **Dành cho Đội ngũ Phát triển Frontend (Mobile App & Web Dashboard)**  
> **Phiên bản Backend**: 2.5.0 (Cập nhật sau hoàn thiện 5 Hạng mục Kỹ thuật Hiện đại hóa)  
> **Ngày cập nhật**: Tháng 11/2026

---

## MỤC LỤC
1. [Tổng quan Kiến trúc & Cơ chế Xác thực An toàn](#1-tổng-quan-kiến-trúc--cơ-chế-xác-thực-an-toàn)
2. [Chi tiết Toàn bộ API Backend theo Nghiệp vụ](#2-chi-tiết-toàn-bộ-api-backend-theo-nghiệp-vụ)
   - [2.1. Module Xác thực & Bảo mật Tài khoản (Auth & Security)](#21-module-xác-thực--bảo-mật-tài-khoản-auth--security)
   - [2.2. Module Quản lý Nhân sự & Phân công Ao (Farmers & Assignments)](#22-module-quản-lý-nhân-sự--phân-công-ao-farmers--assignments)
   - [2.3. Module Trang trại & Ao nuôi (Farms & Ponds)](#23-module-trang-trại--ao-nuôi-farms--ponds)
   - [2.4. Module Vụ nuôi & Quản lý Sản lượng (Crop Seasons & Harvest)](#24-module-vụ-nuôi--quản-lý-sản-lượng-crop-seasons--harvest)
   - [2.5. Module Thiết bị IoT & Giám sát Phần cứng (Devices & Health Watchdog)](#25-module-thiết-bị-iot--giám-sát-phần-cứng-devices--health-watchdog)
   - [2.6. Module Dữ liệu Cảm biến Thời gian thực (Telemetry Readings)](#26-module-dữ-liệu-cảm-biến-thời-gian-thực-telemetry-readings)
   - [2.7. Module Điều phối Cữ ăn & Máy Cho Ăn Thông minh (Feeding & BullMQ)](#27-module-điều-phối-cữ-ăn--máy-cho-ăn-thông-minh-feeding--bullmq)
   - [2.8. Module Kiểm duyệt An toàn & AI Dự báo Nhu cầu (Safety Rules & AI)](#28-module-kiểm-duyệt-an-toàn--ai-dự-báo-nhu-cầu-safety-rules--ai)
   - [2.9. Module Cảnh báo Thông minh & Khuyến nghị Nông học (Alerts & AI Recommendations)](#29-module-cảnh-báo-thông-minh--khuyến-nghị-nông-học-alerts--ai-recommendations)
   - [2.10. Module Báo cáo Vận hành & Phân tích FCR (Admin Reports)](#210-module-báo-cáo-vận-hành--phân-tích-fcr-admin-reports)
3. [Giao thức WebSocket Thời gian thực (Socket.IO Gateway)](#3-giao-thức-websocket-thời-gian-thực-socketio-gateway)
4. [Đặc tả Kiến trúc Màn hình Mobile App (Dành cho Farmer & Quản lý Hiện trường)](#4-đặc-tả-kiến-trúc-màn-hình-mobile-app-dành-cho-farmer--quản-lý-hiện-trường)
5. [Đặc tả Kiến trúc Màn hình Web Dashboard (Dành cho Manager & Admin)](#5-đặc-tả-kiến-trúc-màn-hình-web-dashboard-dành-cho-manager--admin)
6. [Mã Mẫu Tích hợp (Axios Interceptors & Socket.IO Client)](#6-mã-mẫu-tích-hợp-axios-interceptors--socketio-client)

---

## 1. TỔNG QUAN KIẾN TRÚC & CƠ CHẾ XÁC THỰC AN TOÀN

### 1.1. Thông tin Kết nối
- **Base URL API**: `http://<API_HOST>:3000` (Môi trường dev: `http://localhost:3000`)
- **WebSocket URL**: `ws://<API_HOST>:3000` (Socket.IO namespace: `/`)
- **Format Payload**: `application/json` (UTF-8)

### 1.2. Cơ chế Phân quyền 3 Vai trò (Role-Based Access Control)
Hệ thống phân định rạch ròi 3 vai trò:
1. **`admin` (Quản trị viên Hệ thống)**: Toàn quyền truy cập mọi cơ sở dữ liệu, quản lý tài khoản người dùng, mở khóa tài khoản, xem báo cáo tổng hợp và FCR toàn hệ thống.
2. **`manager` (Chủ trang trại / Kỹ thuật trưởng)**: Quản lý trang trại, ao nuôi, vụ nuôi, thiết bị, tạo lịch cho ăn tự động, phân công công việc cho Farmer và xem thống kê kinh tế ao nuôi.
3. **`farmer` (Kỹ thuật viên / Công nhân bờ ao)**: Chỉ truy cập vào **các ao nuôi được Manager phân công**. Thực hiện giám sát chỉ số tức thời, bấm nút cho ăn nhanh, dừng khẩn cấp và nhận thông báo cảnh báo.

### 1.3. Cơ chế Bảo mật Nâng cao (Mới cập nhật)
- **Cơ chế Khóa tài khoản chống Brute-Force (Login Lockout)**:
  - Nhập sai mật khẩu 5 lần: Khóa tài khoản tạm thời **15 phút**. Frontend cần hiển thị thông báo thời gian chờ còn lại.
  - Nhập sai mật khẩu 10 lần: Tài khoản chuyển sang trạng thái `ACCOUNT_PENDING_ADMIN_UNLOCK` (khóa vĩnh viễn cho đến khi Admin/Manager mở khóa).
- **Thu hồi Token tức thì (JWT Blacklist)**:
  - Khi gọi `POST /auth/logout`, token hiện tại sẽ bị đưa vào Blacklist trên Redis. Mọi request dùng token cũ đều bị từ chối `401 Unauthorized`.
- **Cơ chế `tokenVersion`**:
  - Khi Manager đổi quyền hoặc khóa một Farmer, `tokenVersion` tăng lên, toàn bộ các phiên làm việc của người đó trên điện thoại sẽ tự động bị out ngay lập tức.

---

## 2. CHI TIẾT TOÀN BỘ API BACKEND THEO NGHIỆP VỤ

### 2.1. Module Xác thực & Bảo mật Tài khoản (Auth & Security)

| Method | Endpoint | Quyền hạn | Mô tả chức năng | Request Body / Query | Response chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Đăng ký tài khoản Manager mới | `{ email, phoneNumber, password, fullName }` | `{ accessToken, refreshToken, user }` |
| `POST` | `/auth/login` | Public | Đăng nhập (hỗ trợ Email hoặc SĐT) | `{ identifier, password }` | `{ accessToken, refreshToken, user }` |
| `POST` | `/auth/refresh-token` | Public | Lấy accessToken mới khi hết hạn | `{ refreshToken }` | `{ accessToken, refreshToken, user }` |
| `POST` | `/auth/logout` | Authenticated | Đăng xuất, đưa token vào Blacklist | Không có (gửi Header `Bearer <token>`) | `{ message: "Đăng xuất thành công" }` |
| `GET` | `/auth/me` | Authenticated | Lấy thông tin tài khoản hiện tại | Không có | `{ id, email, fullName, role, ... }` |
| `PATCH` | `/auth/profile` | Authenticated | Cập nhật họ tên, số điện thoại | `{ fullName?, phoneNumber? }` | `{ id, email, fullName, phoneNumber }` |
| `PATCH` | `/auth/change-password`| Authenticated | Đổi mật khẩu | `{ currentPassword, newPassword }` | `{ message: "Đổi mật khẩu thành công" }` |
| `POST` | `/auth/forgot-password`| Public | Yêu cầu mã OTP khôi phục mật khẩu | `{ identifier }` (Email hoặc SĐT) | `{ message: "..." }` |
| `POST` | `/auth/resend-otp` | Public | Gửi lại mã OTP (cooldown 60s) | `{ identifier }` | `{ message: "..." }` |
| `POST` | `/auth/verify-reset-otp`| Public | Kiểm tra OTP trước khi đổi pass | `{ identifier, otp }` | `{ valid: true, message: "..." }` |
| `POST` | `/auth/reset-password` | Public | Đặt lại mật khẩu bằng OTP | `{ identifier, otp, newPassword }` | `{ message: "..." }` |
| `GET` | `/auth/users` | `admin` | Xem danh sách người dùng hệ thống | Không có | `User[]` |
| `PATCH` | `/auth/users/:id/status`| `admin` | Khóa hoặc kích hoạt tài khoản | `{ isActive: boolean }` | `User` |
| `PATCH` | `/auth/users/:id/role` | `admin` | Phân quyền tài khoản (`admin`/`manager`/`farmer`)| `{ role: UserRole }` | `User` |
| `PATCH` | `/auth/users/:id/unlock`| `admin` | Mở khóa tài khoản bị khóa do Brute-force | Không có | `{ message, user }` |

---

### 2.2. Module Quản lý Nhân sự & Phân công Ao (Farmers & Assignments)

> Dành cho Manager quản lý nhân viên bờ ao thuộc trại của mình.

| Method | Endpoint | Quyền hạn | Mô tả chức năng | Request Body / Query | Response chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/farmers` | `manager`, `admin` | Tạo tài khoản công nhân nuôi tôm mới | `{ fullName, email, phoneNumber, password? }` | `{ farmer, temporaryPassword? }` |
| `GET` | `/farmers` | `manager`, `admin` | Danh sách công nhân do Manager quản lý | Không có | `Farmer[]` (kèm danh sách ao) |
| `GET` | `/farmers/:id` | `manager`, `admin` | Chi tiết một công nhân và các ao phụ trách | Không có | Chi tiết Farmer + Assignments |
| `PATCH` | `/farmers/:id` | `manager`, `admin` | Cập nhật thông tin công nhân | `{ fullName?, phoneNumber?, email? }` | `Farmer` |
| `PATCH` | `/farmers/:id/status`| `manager`, `admin` | Khóa/Mở khóa công nhân (tự tăng `tokenVersion`)| `{ isActive: boolean }` | `Farmer` |
| `POST` | `/farmers/:id/assignments` | `manager`, `admin` | Phân công một hoặc nhiều ao cho công nhân | `{ farmId, pondIds?: string[] }` | `FarmerAssignment[]` |
| `GET` | `/farmers/:id/assignments` | `manager`, `admin`, `farmer` | Xem danh sách các ao công nhân được phân công | Không có | `FarmerAssignment[]` |
| `DELETE`| `/farmers/:id/assignments/:assignmentId` | `manager`, `admin` | Thu hồi phân công 1 ao cụ thể | Không có | `{ message: "..." }` |
| `DELETE`| `/farmers/:id/assignments` | `manager`, `admin` | Thu hồi toàn bộ phân công của công nhân | Không có | `{ message: "..." }` |

---

### 2.3. Module Trang trại & Ao nuôi (Farms & Ponds)

| Method | Endpoint | Quyền hạn | Mô tả chức năng | Request Body / Query | Response chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/farms` | `manager` | Tạo mới trang trại nuôi tôm | `{ name, address?, description? }` | `Farm` |
| `GET` | `/farms` | All roles | Danh sách trang trại (tự lọc theo quyền sở hữu/phân công) | Không có | `Farm[]` |
| `GET` | `/farms/:id` | All roles | Chi tiết trang trại kèm danh sách các ao | Không có | `Farm` kèm `ponds: Pond[]` |
| `PATCH` | `/farms/:id` | `manager`, `admin` | Cập nhật thông tin trang trại | `{ name?, address?, status? }` | `Farm` |
| `DELETE`| `/farms/:id` | `manager`, `admin` | Xóa mềm trang trại | Không có | `{ message: "..." }` |
| `POST` | `/farms/:farmId/ponds` | `manager`, `admin` | Tạo ao nuôi mới trong trang trại | `{ name, code, areaM2, depthM?, targetDensity? }` | `Pond` |
| `GET` | `/farms/:farmId/ponds` | All roles | Lấy danh sách ao của trang trại | Không có | `Pond[]` |
| `GET` | `/ponds` | All roles | Lấy danh sách toàn bộ ao người dùng được phép xem | Query: `?farmId=...` | `Pond[]` |
| `GET` | `/ponds/:id` | All roles | Chi tiết 1 ao nuôi (kèm thiết bị & vụ nuôi active) | Không có | `Pond` chi tiết |
| `PATCH` | `/ponds/:id` | `manager`, `admin` | Cập nhật diện tích, độ sâu, tên ao | `{ name?, areaM2?, depthM?, status? }` | `Pond` |
| `DELETE`| `/ponds/:id` | `manager`, `admin` | Xóa ao nuôi | Không có | `{ message: "..." }` |

---

### 2.4. Module Vụ nuôi & Quản lý Sản lượng (Crop Seasons & Harvest)

| Method | Endpoint | Quyền hạn | Mô tả chức năng | Request Body / Query | Response chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/ponds/:pondId/crop-seasons` | `manager`, `admin` | Bắt đầu vụ nuôi mới trong ao | `{ name, shrimpBreed, initialStockingCount, stockingDate, targetHarvestDate? }` | `CropSeason` (`status: active`) |
| `GET` | `/ponds/:pondId/crop-seasons` | All roles | Lịch sử các vụ nuôi của ao | Không có | `CropSeason[]` |
| `GET` | `/crop-seasons/:id` | All roles | Chi tiết vụ nuôi kèm thống kê tiêu thụ thức ăn | Không có | `CropSeason` |
| `PATCH` | `/crop-seasons/:id` | `manager`, `admin` | Cập nhật thông tin vụ nuôi | `{ name?, currentBiomassKg?, survivalRate? }` | `CropSeason` |
| `POST` | `/crop-seasons/:id/harvest` | `manager`, `admin` | Thu hoạch kết thúc vụ nuôi & tính toán FCR | `{ harvestDate, harvestBiomassKg, averageWeightGram? }` | `CropSeason` (`status: completed`, `fcr: number`) |

---

### 2.5. Module Thiết bị IoT & Giám sát Phần cứng (Devices & Health Watchdog)

| Method | Endpoint | Quyền hạn | Mô tả chức năng | Request Body / Query | Response chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/devices` | `admin` | Đăng ký thiết bị phần cứng mới vào hệ thống | `{ deviceUid, name, type, firmwareVersion? }` | `Device` |
| `GET` | `/devices` | All roles | Danh sách thiết bị (hiển thị trạng thái Online/Offline) | Query: `?pondId=...&type=...` | `Device[]` |
| `GET` | `/devices/:id` | All roles | Xem chi tiết thiết bị & lần cuối online (`lastSeenAt`)| Không có | `Device` |
| `PATCH` | `/devices/:id` | `manager`, `admin` | Gán hoặc đổi ao cho thiết bị | `{ pondId: string \| null, name? }` | `Device` |
| `POST` | `/devices/claim` | `manager` | Kích hoạt thiết bị mới về trại bằng mã UID | `{ deviceUid, pondId, name }` | `Device` |

---

### 2.6. Module Dữ liệu Cảm biến Thời gian thực (Telemetry Readings)

| Method | Endpoint | Quyền hạn | Mô tả chức năng | Request Body / Query | Response chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/ponds/:pondId/telemetry/latest` | All roles | **Lấy chỉ số môi trường mới nhất** (tốc độ $O(1)$ ~0.08ms) | Không có | `{ ph, dissolvedOxygenMgL, temperatureC, salinityPpt, ammoniaMgL, measuredAt, isBuffered }` |
| `GET` | `/ponds/:pondId/telemetry/history`| All roles | Lấy dữ liệu lịch sử để vẽ biểu đồ | Query: `?from=...&to=...&limit=200` | `TelemetryReading[]` |
| `POST` | `/ponds/:pondId/telemetry` | `admin`, Gateway | Ghi nhận gói tin cảm biến thủ công / mô phỏng | `{ ph, dissolvedOxygenMgL, temperatureC, salinityPpt, isBuffered? }` | `TelemetryReading` |

---

### 2.7. Module Điều phối Cữ ăn & Máy Cho Ăn Thông minh (Feeding & BullMQ)

| Method | Endpoint | Quyền hạn | Mô tả chức năng | Request Body / Query | Response chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/ponds/:pondId/feeding/schedules` | `manager`, `admin` | Tạo lịch cho ăn tự động (07:00, 11:00, 15:00,...) | `{ name, scheduledTime: "07:00", feedAmountKg, enabled: true }` | `FeedingSchedule` |
| `GET` | `/ponds/:pondId/feeding/schedules` | All roles | Danh sách lịch ăn trong ngày của ao | Không có | `FeedingSchedule[]` |
| `PATCH` | `/feeding/schedules/:id` | `manager`, `admin` | Bật/tắt hoặc sửa lượng cám của cữ ăn | `{ enabled?, feedAmountKg?, scheduledTime? }`| `FeedingSchedule` |
| `DELETE`| `/feeding/schedules/:id` | `manager`, `admin` | Xóa lịch ăn | Không có | `{ message: "..." }` |
| `POST` | `/ponds/:pondId/feeding/manual` | All roles | **Bấm nút Cho ăn ngay** (Manual Trigger 1-chạm) | `{ feedAmountKg: 5.0, durationSeconds?: 300 }`| `FeedingRecord` (`status: running`) |
| `POST` | `/ponds/:pondId/feeding/emergency-stop` | All roles | **DỪNG KHẨN CẤP (E-STOP)** máy ăn ngay lập tức | `{ reason?: string }` | `{ success: true, message: "Đã gửi lệnh dừng khẩn cấp" }` |
| `GET` | `/ponds/:pondId/feeding/records` | All roles | Xem nhật ký các cữ ăn đã diễn ra trong ao | Query: `?page=1&limit=20` | `PaginatedFeedingRecords` |
| `GET` | `/ponds/:pondId/feeding/status` | All roles | Trạng thái cữ ăn đang chạy (nếu có) | Không có | `{ isFeeding: boolean, currentRecord? }` |

---

### 2.8. Module Kiểm duyệt An toàn & AI Dự báo Nhu cầu (Safety Rules & AI)

| Method | Endpoint | Quyền hạn | Mô tả chức năng | Request Body / Query | Response chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/safety-rules` | `admin` | Cấu hình ngưỡng kiểm duyệt an toàn môi trường | `{ parameter: "dissolvedOxygenMgL", minVal: 3.5, action: "BLOCK" }` | `SafetyRule` |
| `GET` | `/safety-rules` | All roles | Danh sách các quy tắc an toàn hệ thống | Không có | `SafetyRule[]` |
| `GET` | `/ponds/:pondId/ai/predict-feed` | All roles | **AI gợi ý lượng thức ăn tối ưu** cho cữ kế tiếp | Không có | `{ predictedFeedAmountKg: 12.5, appetiteLevel: 2, confidence: 0.92, explanation: "..." }` |
| `GET` | `/ponds/:pondId/ai/predicted-trends` | All roles | **Dự báo xu hướng DO/chất lượng nước 2h tới** | Không có | `{ predictedDo1h: 4.1, predictedDo2h: 3.2, riskLevel: "WARNING", adaptiveAction: "REDUCE_FEED_40%" }` |

---

### 2.9. Module Cảnh báo Thông minh & Khuyến nghị Nông học (Alerts & AI Recommendations)

| Method | Endpoint | Quyền hạn | Mô tả chức năng | Request Body / Query | Response chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/alerts` | All roles | Danh sách cảnh báo (có lọc theo ao, mức độ, trạng thái) | Query: `?pondId=...&severity=3&status=open` | `{ data: Alert[], total, page }` |
| `GET` | `/alerts/summary` | All roles | Tổng hợp số lượng cảnh báo (`critical`, `warning`, `open`) | Query: `?pondId=...` | `{ total, open, bySeverity: { critical, warning } }` |
| `PATCH` | `/alerts/:id/acknowledge` | All roles | **Xác nhận đã xem cảnh báo** (Farmer/Manager nhận việc) | Không có | `Alert` (`status: acknowledged`) |
| `PATCH` | `/alerts/:id/resolve` | All roles | **Đánh dấu đã xử lý xong sự cố** | Không có | `Alert` (`status: resolved`) |

> **Cấu trúc trường `metadata` và `aiRecommendation` trong Alert**:
> - `alert.aiRecommendation.explanation`: Khuyến nghị can thiệp nông học tức thì từ AI (ví dụ: *"Bật 100% quạt nước trong 45 phút, tạt vôi CaCO3..."*).
> - `alert.metadata.latestValue`: Giá trị đo mới nhất khi chỉ số bị dao động (nhờ cơ chế Debounce Cooldown 15 phút, không spam thêm tin mới).
> - `alert.metadata.repeatCount`: Số lần chỉ số tiếp tục vượt ngưỡng trong khoảng thời gian debounce.

---

### 2.10. Module Báo cáo Vận hành & Phân tích FCR (Admin Reports)

| Method | Endpoint | Quyền hạn | Mô tả chức năng | Response chính |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/admin/overview` | `admin` | Thống kê số lượng trang trại, ao nuôi, người dùng, máy ăn online/offline | Thống kê hệ thống |
| `GET` | `/admin/reports/operational` | `admin` | Báo cáo vận hành: 10 cảnh báo mới nhất, thiết bị offline quá 5 phút | Chi tiết sự cố phần cứng |
| `GET` | `/admin/reports/fcr` | `admin` | Báo cáo FCR và xếp loại hiệu quả kinh tế vụ nuôi toàn hệ thống | Danh sách vụ nuôi kèm điểm FCR |

---

## 3. GIAO THỨC WEBSOCKET THỜI GIAN THỰC (SOCKET.IO GATEWAY)

### 3.1. Kết nối & Xác thực An toàn
Client kết nối tới Namespace `/` kèm token:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'BEARER_ACCESS_TOKEN_CỦA_USER',
  },
  transports: ['websocket'],
});
```

### 3.2. Đăng ký nhận dữ liệu theo Ao nuôi (Room Isolation)
Để tránh tình trạng Farmer ao này xem trộm dữ liệu ao khác, Backend yêu cầu client gửi sự kiện `join:pond`:

```javascript
// Gửi yêu cầu vào phòng theo dõi ao
socket.emit('join:pond', pondId, (response) => {
  if (response.success) {
    console.log('Đã vào room ao nuôi:', response.pondId);
  } else {
    console.error('Bị từ chối quyền truy cập:', response.message);
  }
});

// Khi chuyển trang hoặc không theo dõi ao đó nữa
socket.emit('leave:pond', pondId);
```

### 3.3. Các sự kiện Lắng nghe (Event Listeners)

| Tên sự kiện | Phạm vi nhận | Dữ liệu trả về (Payload) | Công dụng trên giao diện |
| :--- | :--- | :--- | :--- |
| `telemetry:update` | Chỉ client trong `pond_{pondId}` | `{ pondId, ph, dissolvedOxygenMgL, temperatureC, salinityPpt, ammoniaMgL, measuredAt, isBuffered }` | Cập nhật đồng hồ đo (Gauge) và vẽ biểu đồ thời gian thực |
| `feeder:status` | Chỉ client trong `pond_{pondId}` | `{ pondId, recordId, status, actualAmountKg, safetyDecision, reason }` | Hiển thị máy đang nhả thức ăn, số kg đã nhả hoặc bị dừng khẩn cấp |
| `alert:new` | Room ao + Admin toàn hệ thống | `{ id, pondId, type, severity, message, aiRecommendation, triggeredAt }` | Bật chuông/banner cảnh báo đỏ khẩn cấp trên giao diện |
| `device:status` | Toàn hệ thống | `{ deviceId, deviceUid, name, status: "online" \| "offline", reason }` | Đổi icon đèn tín hiệu xanh/xám của thiết bị |

---

## 4. ĐẶC TẢ KIẾN TRÚC MÀN HÌNH MOBILE APP (DÀNH CHO FARMER & QUẢN LÝ HIỆN TRƯỜNG)

> **Mục tiêu**: Tối ưu thao tác nhanh bằng 1 tay dưới ánh nắng ngoài trời, chữ to, màu sắc tương phản cao, thao tác khẩn cấp 1-chạm.

```
+-----------------------------------------------------------------------------------+
|                            MOBILE APP WORKFLOW (REACT NATIVE / FLUTTER)           |
+-----------------------------------------------------------------------------------+
|  [1. Màn hình Đăng nhập]                                                          |
|       |--> Kiểm tra Lockout 5 lần (đếm lùi 15 phút) / 10 lần (yêu cầu Admin mở)   |
|       v                                                                           |
|  [2. Trang chủ - Danh sách Ao nuôi được phân công]                                |
|       |--> Badge số lượng cảnh báo khẩn cấp cần xử lý                             |
|       |--> Trạng thái máy cho ăn (Đang ăn / Chờ / Offline)                        |
|       v                                                                           |
|  [3. Chi tiết Ao nuôi (SCADA Monitor Dashboard)]                                  |
|       |--> 4 Đồng hồ chỉ số lớn: Oxy hòa tan (DO), pH, Nhiệt độ, Độ mặn           |
|       |--> Banner cảnh báo dự báo DO tụt (Pre-feeding AI Trend)                   |
|       |--> [NÚT ĐỎ KHẨN CẤP: E-STOP] (Cố định ở góc dưới màn hình)                |
|       |--> [NÚT XANH: BẬT MÁY ĂN 1-CHẠM] (Mở popup nhập số kg hoặc dùng AI gợi ý) |
|       v                                                                           |
|  [4. Màn hình Cảnh báo & Khuyến nghị Nông học AI]                                 |
|       |--> Hộp khuyến nghị màu vàng nổi bật: Hành động cụ thể (bật quạt, tạt vôi)|
|       |--> Nút "Đã xác nhận" & "Đã xử lý xong"                                    |
|       v                                                                           |
|  [5. Lịch sử Cữ ăn & Nhật ký ao]                                                  |
|       |--> Bảng cữ ăn: Giờ ăn, Lượng cám, Trạng thái (Thành công / Giảm 40% / Hủy)|
+-----------------------------------------------------------------------------------+
```

### Các màn hình chi tiết cần thiết kế trên Mobile App:

1. **Màn hình Đăng nhập & Khôi phục mật khẩu**:
   - Ô nhập Email hoặc Số điện thoại.
   - Hiển thị thông báo khi sai mật khẩu: *"Bạn đã nhập sai 3/5 lần. Nhập sai 5 lần sẽ khóa 15 phút"*.
   - Khi bị khóa tạm thời: Hiển thị đồng hồ đếm ngược lùi thời gian khóa.
   - Luồng Quên mật khẩu: Nhập SĐT -> Nhập OTP 6 số (nhận từ SMS eSMS) -> Đổi pass mới.

2. **Màn hình Trang chủ (Ao nuôi của tôi)**:
   - Dạng thẻ (Card) danh sách các ao được phân công.
   - Mỗi thẻ ao hiển thị nhanh: Tên ao (Ao 1 - POND-01), Vụ nuôi hiện tại (Ngày nuôi DOC: 45), Trạng thái máy ăn (Online/Offline), Chỉ số DO và pH tức thời.
   - Có cờ chấm đỏ nếu ao đó đang có cảnh báo `CRITICAL`.

3. **Màn hình Giám sát Ao & Điều khiển Cho ăn**:
   - Lắng nghe sự kiện WebSocket `telemetry:update` để nhảy số trực tiếp:
     - **Oxy hòa tan (DO)**: Vạch xanh (> 5 mg/L), Vạch vàng (3.5 - 5 mg/L), Vạch đỏ báo động (< 3.5 mg/L).
     - **Độ pH**: Thang đo từ 0 - 14, vùng an toàn 7.5 - 8.5 tô màu xanh lá.
     - **Nhiệt độ & Độ mặn**: Hiển thị số đo kèm biểu đồ mini 6 giờ gần nhất.
   - **Khu vực Điều khiển Máy Cho Ăn**:
     - Nút to: `CHO ĂN NHANH` -> Click mở Modal: Gợi ý lượng cám từ AI (`predict-feed`), người nuôi có thể chỉnh sửa số kg và bấm `BẮT ĐẦU`.
     - Nút to màu đỏ: `DỪNG KHẨN CẤP (E-STOP)` -> Khi bấm, gửi API `/emergency-stop` ngay lập tức, ngắt động cơ rơ-le trong 0.5 giây.

4. **Màn hình Cảnh báo Khẩn cấp & Khuyến nghị Hành động**:
   - Danh sách các thông báo sự cố chưa xử lý (`status: open`).
   - Thẻ cảnh báo hiển thị: Tên lỗi tiếng Việt, thời điểm phát hiện, giá trị vi phạm (ví dụ: pH = 6.8).
   - **Phần Khuyến nghị Hành động (AI Recommendation)**: Đóng khung vàng nổi bật với biểu tượng bóng đèn / công cụ: *"Khuyến nghị: Tạt vôi Dolomite liều lượng 15kg/1000m3 lúc 20h tối để nâng hệ đệm"*.
   - Hai nút bấm bên dưới: `Tiếp nhận sự cố` (Acknowledge) và `Đã hoàn thành xử lý` (Resolve).

---

## 5. ĐẶC TẢ KIẾN TRÚC MÀN HÌNH WEB DASHBOARD (DÀNH CHO MANAGER & ADMIN)

> **Mục tiêu**: Màn hình rộng, hiển thị đa ao nuôi cùng lúc (Multi-Pond SCADA Grid), quản lý dữ liệu lớn, bảng biểu thống kê chi tiết và phân công nhân sự.

```
+-----------------------------------------------------------------------------------+
|                        WEB DASHBOARD WORKFLOW (REACT / VUE / NEXT.JS)             |
+-----------------------------------------------------------------------------------+
|  [Sidebar Menu]:                                                                  |
|    |-- 1. SCADA Giám sát Đa ao Thời gian thực (Multi-Pond Live Grid)             |
|    |-- 2. Quản lý Lịch Cho Ăn Tự động (BullMQ Queue Scheduler)                    |
|    |-- 3. Quản lý Trang trại & Ao nuôi (Farms & Ponds CRUD)                       |
|    |-- 4. Quản lý Vụ nuôi & Báo cáo FCR (Crop Seasons & Economic Analysis)       |
|    |-- 5. Quản lý Nhân viên & Phân công Ao (Farmers & Assignment Matrix)          |
|    |-- 6. Quản lý Thiết bị Phần cứng & Watchdog (Devices & Health Status)        |
|    |-- 7. Trung tâm Cảnh báo & Khuyến nghị Nông học (Smart Alerts Center)        |
|    +-- 8. [Admin Only] Quản trị Tài khoản & Mở khóa Brute-force (User Management) |
+-----------------------------------------------------------------------------------+
```

### Các màn hình chi tiết cần thiết kế trên Web Dashboard:

1. **Màn hình Trung tâm Giám sát SCADA Đa Ao (Multi-Pond Live View)**:
   - Hiển thị dạng lưới các ao nuôi (Grid View) thuộc trang trại.
   - Mỗi ô ao là một bảng điều khiển mini:
     - 4 thông số môi trường cập nhật theo thời gian thực (DO, pH, Temp, Salinity).
     - Trạng thái máy ăn (Đang nhả cám: hiện hoạt họa quay động cơ; Dừng: hiện màu xám; Lỗi: hiện màu đỏ).
     - Nút bấm `E-Stop` trên từng ao.
   - Bộ lọc theo Trang trại hoặc tìm kiếm nhanh mã ao.

2. **Màn hình Quản lý Lịch Cho Ăn Tự động (Feeding Scheduler)**:
   - Quản lý các cữ ăn trong ngày (Cữ sáng 07:00, Trưa 11:00, Chiều 15:00, Tối 19:00).
   - Bảng cấu hình: Giờ ăn, Lượng cám dự kiến (kg), Công tắc Bật/Tắt cữ ăn.
   - Nút `Lấy gợi ý từ AI`: Tự động tính toán lượng ăn tối ưu dựa trên sinh khối tôm và chu kỳ ngày/đêm.
   - Tab `Lịch sử Hàng đợi`: Hiển thị các Job cữ ăn đã nạp vào BullMQ, trạng thái bắt tay MQTT ACK với ESP32 và số lần tự động thử lại (Retry count).

3. **Màn hình Quản trị Nhân sự & Ma trận Phân công (Farmer Assignments)**:
   - **Bảng danh sách công nhân (Farmer)**: Tên, SĐT, Email, Số ao phụ trách, Trạng thái hoạt động.
   - Nút `Tạo mới Farmer`: Popup nhập thông tin, hệ thống tự cấp mật khẩu ngẫu nhiên để gửi cho công nhân.
   - **Ma trận Phân công Ao (Assignment Modal)**:
     - Chọn 1 công nhân -> Hiển thị danh sách checkbox các ao nuôi trong trang trại.
     - Cho phép chọn nhanh: `Toàn bộ trang trại` hoặc chọn từng ao lẻ (Ao 1, Ao 2, Ao 3).
     - Khi Manager gỡ quyền của 1 Farmer, bấm `Lưu` -> Hệ thống tự động thu hồi token trên điện thoại của Farmer đó.

4. **Màn hình Quản trị Tài khoản & Mở khóa Brute-Force (`Admin Only`)**:
   - Bảng toàn bộ người dùng trong hệ thống.
   - Cột cảnh báo trạng thái: `Bình thường`, `Đang bị khóa 15 phút` (do sai pass 5 lần), hoặc `BỊ KHÓA VĨNH VIỄN - PENDING ADMIN UNLOCK` (sai pass > 10 lần).
   - Nút hành động: `Mở khóa tài khoản (Unlock)` -> Gọi API `PATCH /auth/users/:id/unlock` để xóa cờ khóa và reset bộ đếm vi phạm trên Redis.

5. **Màn hình Báo cáo Vận hành & Phân tích FCR (Economic Reports)**:
   - Biểu đồ đường so sánh: Tổng lượng thức ăn tiêu thụ hàng ngày vs Chỉ số Oxy hòa tan trung bình.
   - Thống kê FCR (Hệ số chuyển đổi thức ăn):
     - FCR < 1.2: Xếp loại `Xuất sắc` (Tô màu xanh lá).
     - FCR 1.2 - 1.5: Xếp loại `Đạt chuẩn` (Tô màu xanh dương).
     - FCR > 1.5: Xếp loại `Cảnh báo lãng phí` (Tô màu cam đỏ).
   - Xuất dữ liệu báo cáo ra file Excel / PDF để trình chủ đầu tư.

---

## 6. MÃ MẪU TÍCH HỢP (AXIOS INTERCEPTORS & SOCKET.IO CLIENT)

### 6.1. Cấu hình Axios Client tự động gắn Token & Bắt lỗi Lockout / Revoked Token
```typescript
// src/services/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Luôn tự động gắn Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 2. Response Interceptor: Xử lý tập trung các lỗi bảo mật
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response ? error.response.status : null;
    const message = error.response?.data?.message || '';

    // Xử lý tài khoản bị khóa do Brute-Force (403 Forbidden)
    if (status === 403 && message.includes('khóa')) {
      alert(`BẢO MẬT: ${message}`);
      return Promise.reject(error);
    }

    // Xử lý token bị hết hạn hoặc bị thu hồi do logout / đổi quyền (401 Unauthorized)
    if (status === 401) {
      console.warn('Phiên làm việc hết hạn hoặc token đã bị thu hồi:', message);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
      
      // Chuyển hướng về trang login nếu không phải đang ở trang login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?session_expired=1';
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
```

---

### 6.2. Cấu hình Socket.IO kết nối Room Ao nuôi an toàn
```typescript
// src/services/socketService.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Đã kết nối WebSocket thành công. Socket ID:', this.socket?.id);
    });

    this.socket.on('error', (err: any) => {
      console.error('⛔ Lỗi WebSocket Security:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Mất kết nối WebSocket:', reason);
    });
  }

  // Vào phòng theo dõi ao nuôi
  subscribePond(pondId: string, onJoined?: (res: any) => void) {
    if (!this.socket) return;
    this.socket.emit('join:pond', pondId, (res: any) => {
      if (res?.success) {
        console.log(`Đã vào room ao ${pondId} an toàn`);
        onJoined?.(res);
      } else {
        alert(`Không thể truy cập dữ liệu ao: ${res?.message}`);
      }
    });
  }

  // Rời phòng ao nuôi khi chuyển trang
  unsubscribePond(pondId: string) {
    if (!this.socket) return;
    this.socket.emit('leave:pond', pondId);
  }

  // Lắng nghe dữ liệu cảm biến nhảy số thời gian thực
  onTelemetryUpdate(callback: (data: any) => void) {
    this.socket?.on('telemetry:update', callback);
  }

  // Lắng nghe trạng thái cữ ăn và máy cho ăn
  onFeederStatus(callback: (data: any) => void) {
    this.socket?.on('feeder:status', callback);
  }

  // Lắng nghe cảnh báo mới
  onNewAlert(callback: (data: any) => void) {
    this.socket?.on('alert:new', callback);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();
```

---

## 7. BẢNG TỔNG KẾT MAPPING TRƯỜNG DỮ LIỆU & Ý NGHĨA

| Trường Dữ liệu | Kiểu | Ý nghĩa và Quy ước hiển thị Frontend |
| :--- | :--- | :--- |
| `dissolvedOxygenMgL` | `number` | Nồng độ Oxy hòa tan ($mg/L$). Xanh khi $\ge 5.0$, Vàng khi $3.5 - 5.0$, Đỏ khi $< 3.5$. |
| `ph` | `number` | Độ pH nước ao. Xanh khi $7.5 - 8.5$, Vàng khi $7.0 - 7.5$ hoặc $8.5 - 9.0$, Đỏ khi $< 7.0$ hoặc $> 9.0$. |
| `temperatureC` | `number` | Nhiệt độ nước ao ($^\circ C$). Thích hợp nhất $28 - 32^\circ C$. |
| `salinityPpt` | `number` | Độ mặn ($ppt$ hay phần nghìn). Thích hợp cho tôm thẻ $10 - 25 ppt$. |
| `ammoniaMgL` | `number` | Khí độc $NH_3 / TAN$ ($mg/L$). Cực kỳ nguy hiểm nếu $> 0.3 mg/L$. |
| `isBuffered` | `boolean` | `true` nếu là gói tin gửi bù từ bộ nhớ flash của ESP32 sau khi có mạng lại. Không bật chuông cảnh báo. |
| `status` (Device) | `enum` | `'online'` (Đèn xanh), `'offline'` (Đèn xám/đỏ mất tín hiệu > 15 phút), `'error'` (Đèn vàng nhấp nháy). |
| `safetyDecision` | `enum` | `'allowed'` (Cho ăn bình thường), `'adjusted'` (AI tự giảm 40% cám do DO tụt), `'blocked'` (Bị chặn an toàn). |
| `severity` (Alert) | `enum` | `1` (Monitoring - Thông tin), `2` (Warning - Cảnh báo), `3` (Critical - Nguy cấp, có SMS khẩn cấp). |
| `tokenVersion` | `integer` | Phiên bản hiệu lực của tài khoản. Dùng để vô hiệu hóa ngay tức thì khi thu hồi quyền công nhân. |

---
*Tài liệu này được biên soạn đầy đủ, chính xác theo cấu trúc mã nguồn thực tế của hệ thống `shrimpmate-backend`. Đội ngũ Frontend có thể sử dụng ngay để thiết kế Wireframe, UI Components và viết tích hợp API.*

