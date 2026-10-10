# Bảng Tóm Tắt Toàn Bộ API - ShrimpMate Backend

Tài liệu tra cứu nhanh (Quick Reference) toàn bộ các endpoint, phương thức, phân quyền và yêu cầu kỹ thuật của hệ thống **ShrimpMate Backend**.

---

## 1. Thông tin kết nối & Phân quyền

- **Base URL**: `http://localhost:3000` (hoặc `http://<IP_LAN>:3000`)
- **Header xác thực**:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Phân quyền (Roles)**:
  - `admin`: Quản trị viên hệ thống (quản lý người dùng, catalog phần cứng, luật an toàn, báo cáo tổng quan & FCR toàn nền tảng).
  - `farmer`: Người nuôi tôm (tự chủ trang trại, ao nuôi, vụ nuôi, gán thiết bị, tạo lịch ăn, giám sát môi trường, camera AI FIS, cảnh báo).
  - `Public`: Không yêu cầu token.

---

## 2. Bảng Tra Cứu Toàn Bộ API (Master API Table)

| STT | Module | Endpoint | Method | Phân quyền | Công dụng chính & Yêu cầu |
| :-: | --- | --- | :---: | :---: | --- |
| **1** | **Health Check** | `/` | `GET` | Public | Kiểm tra trạng thái hoạt động của máy chủ backend (`200 OK`) |
| **2** | **Auth** | `/auth/register` | `POST` | Public | Đăng ký tài khoản người nuôi (`farmer`), chuẩn hóa SĐT Việt Nam, email & phone duy nhất |
| **3** | | `/auth/login` | `POST` | Public | Đăng nhập bằng Email hoặc SĐT + Password, trả về `accessToken` & `refreshToken` |
| **4** | | `/auth/refresh-token` | `POST` | Public | Cấp lại `accessToken` mới từ `refreshToken` hợp lệ |
| **5** | | `/auth/forgot-password` | `POST` | Public | Gửi yêu cầu mã OTP 6 chữ số khôi phục mật khẩu (hiệu lực 5 phút) |
| **6** | | `/auth/resend-otp` | `POST` | Public | Hủy OTP cũ và gửi lại mã OTP mới |
| **7** | | `/auth/verify-reset-otp` | `POST` | Public | Xác thực tính hợp lệ của OTP trước khi người dùng nhập mật khẩu mới |
| **8** | | `/auth/reset-password` | `POST` | Public | Đặt lại mật khẩu mới bằng mã OTP, tự động hủy các refresh token cũ |
| **9** | | `/auth/me` | `GET` | Authenticated | Lấy thông tin hồ sơ của tài khoản đang đăng nhập |
| **10** | | `/auth/profile` | `PATCH` | Authenticated | Người dùng tự cập nhật họ tên (`fullName`) và số điện thoại |
| **11** | | `/auth/change-password` | `PATCH` | Authenticated | Đổi mật khẩu tài khoản (yêu cầu mật khẩu hiện tại) |
| **12** | | `/auth/admin-check` | `GET` | `admin` | Kiểm tra nhanh token có vai trò Admin hay không |
| **13** | | `/auth/users` | `GET` | `admin` | Xem danh sách tất cả tài khoản người dùng trong hệ thống |
| **14** | | `/auth/users/:id/status` | `PATCH` | `admin` | Khóa (`isActive: false`) hoặc mở khóa tài khoản (chặn Admin tự khóa) |
| **15** | | `/auth/users/:id/role` | `PATCH` | `admin` | Phân quyền tài khoản giữa `admin` và `farmer` (chặn Admin tự hạ quyền) |
| **16** | **Admin** | `/admin/overview` | `GET` | `admin` | Thống kê tổng quan: user, trang trại, ao nuôi, thiết bị online/offline, cảnh báo |
| **17** | | `/admin/reports/operational` | `GET` | `admin` | Báo cáo vận hành: số liệu tổng quan + 10 cảnh báo mới nhất + thiết bị offline > 5 phút |
| **18** | | `/admin/reports/fcr` | `GET` | `admin` | Báo cáo FCR toàn hệ thống: FCR từng vụ, FCR trung bình toàn hệ thống & xếp loại chất lượng |
| **19** | **Farms** | `/farms` | `GET` | `farmer` | Danh sách trang trại do Farmer sở hữu (phân trang: `page`, `limit`) |
| **20** | | `/farms` | `POST` | `farmer` | Tạo trang trại mới (tự động gán `owner_id = user.id`) |
| **21** | | `/farms/:id` | `GET` | `farmer` | Xem chi tiết thông tin trang trại kèm danh sách ao nuôi |
| **22** | | `/farms/:id` | `PATCH` | `farmer` | Cập nhật tên, địa chỉ, trạng thái trang trại |
| **23** | | `/farms/:id` | `DELETE` | `farmer` | Xóa mềm trang trại (`deleted_at`) và toàn bộ ao trực thuộc |
| **24** | **Ponds** | `/farms/:farmId/ponds` | `GET` | `farmer` | Danh sách ao nuôi trong trang trại (phân trang: `page`, `limit`) |
| **25** | | `/farms/:farmId/ponds` | `POST` | `farmer` | Tạo ao nuôi mới trong trang trại (mã ao `code` duy nhất trong farm) |
| **26** | | `/farms/:farmId/ponds/:id` | `GET` | `farmer` | Chi tiết ao nuôi kèm danh sách thiết bị IoT đã gán |
| **27** | | `/farms/:farmId/ponds/:id` | `PATCH` | `farmer` | Cập nhật diện tích ($m^2$), mã ao, tên ao, trạng thái |
| **28** | | `/farms/:farmId/ponds/:id` | `DELETE` | `farmer` | Xóa mềm ao nuôi, tự động hoàn trả thiết bị về kho (`pond_id = NULL`) |
| **29** | **Devices** | `/devices` | `GET` | `admin`, `farmer` | Admin xem toàn bộ Catalog; Farmer chỉ xem thiết bị trong các ao của mình |
| **30** | | `/devices` | `POST` | `admin` | Khai báo thiết bị chuẩn mới vào Catalog (`pond_id = null`, status: offline) |
| **31** | | `/devices/claim` | `POST` | `farmer` | Đăng ký gán thiết bị theo mã phần cứng `deviceUid` vào ao nuôi |
| **32** | | `/devices/:id/unassign` | `POST` | `farmer` | Hủy gán thiết bị khỏi ao nuôi, đưa về trạng thái tự do (`pond_id = null`) |
| **33** | | `/devices/:id` | `GET` | `admin`, `farmer` | Xem chi tiết thông tin và trạng thái thiết bị |
| **34** | | `/devices/:id` | `PATCH` | `admin`, `farmer` | Admin sửa firmware/UID/metadata; Farmer sửa `mode` (`automatic`/`manual`/`emergency_stop`) |
| **35** | | `/devices/:id` | `DELETE` | `admin` | Xóa vĩnh viễn thiết bị khỏi danh mục phần cứng hệ thống |
| **36** | | `/devices/:id/emergency-stop`| `POST` | `farmer` | Kích hoạt lệnh Dừng khẩn cấp máy cho ăn tức thời từ xa |
| **37** | | `/devices/:id/heartbeat` | `POST` | `admin`, `farmer` | Ghi nhận tín hiệu nhịp tim, cập nhật `lastSeenAt` và đánh dấu `status = 'online'` |
| **38** | **Crop Seasons** | `/ponds/:pondId/crop-seasons` | `GET` | `farmer` | Danh sách các vụ nuôi của ao |
| **39** | | `/ponds/:pondId/crop-seasons` | `POST` | `farmer` | Tạo vụ nuôi mới cho ao (ràng buộc tối đa 1 vụ `active` mỗi ao) |
| **40** | | `/crop-seasons/:id` | `GET` | `farmer` | Xem chi tiết vụ nuôi |
| **41** | | `/crop-seasons/:id/statistics`| `GET` | `farmer` | Thống kê FCR vụ nuôi: ngày nuôi DOC, lượng thức ăn, sinh khối, FCR thực tế |
| **42** | | `/crop-seasons/:id` | `PATCH` | `farmer` | Cập nhật thông số thả giống hoặc chuyển trạng thái `completed` |
| **43** | | `/crop-seasons/:id` | `DELETE` | `farmer` | Xóa vụ nuôi |
| **44** | **Feeding** | `/ponds/:pondId/feeding-schedules` | `GET` | `farmer` | Danh sách lịch cho ăn tự động của ao |
| **45** | | `/ponds/:pondId/feeding-schedules` | `POST` | `farmer` | Tạo lịch cho ăn tự động (khung giờ `HH:mm`, kg thức ăn, ngày trong tuần `[0..6]`) |
| **46** | | `/feeding-schedules/:id` | `PATCH` | `farmer` | Tinh chỉnh lịch cho ăn (giờ, kg, tốc độ rải) |
| **47** | | `/feeding-schedules/:id` | `DELETE` | `farmer` | Xóa lịch cho ăn |
| **48** | | `/ponds/:pondId/feeding-records` | `GET` | `farmer` | Xem lịch sử nhật ký các lần cho ăn |
| **49** | | `/ponds/:pondId/feeding-records` | `POST` | `farmer` | Kích hoạt cữ ăn mới qua **Safety Rule Engine** (`ALLOWED`, `ADJUSTED`, `BLOCKED`) |
| **50** | | `/feeding-records/:id` | `PATCH` | `farmer` | Cập nhật tiến trình cho ăn (`completed`, `stopped`), lượng thức ăn thực tế, tỷ lệ dư |
| **51** | **Telemetry** | `/ponds/:pondId/telemetry/latest` | `GET` | `admin`, `farmer` | Lấy chỉ số nước mới nhất của ao (pH, DO, nhiệt độ, độ mặn, NH₃, độ đục) |
| **52** | | `/ponds/:pondId/telemetry/history`| `GET` | `admin`, `farmer` | Lịch sử quan trắc phân trang (lọc `startDate`, `endDate`, `deviceId`, `page`, `limit`) |
| **53** | | `/ponds/:pondId/telemetry` | `POST` | `admin`, `farmer` | Ghi nhận dữ liệu cảm biến, tự động kiểm tra ngưỡng cảnh báo (debounce 15 phút) |
| **54** | **Camera AI & FIS** | `/camera/analyze` | `POST` | `admin`, `farmer` | Phân tích khung hình qua 2 luồng AI (YOLO11n-seg + MobileNetV3), tính FIS & 4 mức bắt mồi |
| **55** | | `/camera/ingest-metrics` | `POST` | Public / Edge | Thu nhận chỉ số $R_t, D_t, C_t$ từ Edge Gateway gửi lên |
| **56** | | `/camera/ponds/:pondId/latest-fis`| `GET` | `admin`, `farmer` | Lấy chỉ số FIS mới nhất của ao, kiểm tra độ trễ stale (> 120s) |
| **57** | | `/camera/ponds/:pondId/fis-history`| `GET` | `admin`, `farmer` | Lịch sử chuỗi thời gian FIS vẽ biểu đồ, tính FIS trung bình & phân phối 4 mức bắt mồi |
| **58** | | `/camera/ponds/:pondId/devices` | `GET` | `admin`, `farmer` | Danh sách các thiết bị camera đang hoạt động trong ao |
| **59** | | `/camera/devices/:deviceId/roi` | `PATCH` | `admin`, `farmer` | Cấu hình vùng quan sát ROI cố định của sàng ăn cho camera |
| **60** | | `/camera/ponds/:pondId/weights` | `PATCH` | `admin`, `farmer` | Tinh chỉnh bộ trọng số $w_1 - w_4$ và ngưỡng phân vị $q_{25}, q_{50}, q_{75}$ của thuật toán FIS |
| **61** | **AI Integration** | `/ponds/:pondId/ai/recommendations/latest` | `GET` | `farmer` | Lấy đề xuất lượng thức ăn tối ưu mới nhất từ mô hình AI |
| **62** | | `/ponds/:pondId/ai/recommendations` | `GET` | `farmer` | Lịch sử các đề xuất AI tối ưu cữ ăn theo tham số `limit` |
| **63** | **Alerts** | `/alerts/summary` | `GET` | `admin`, `farmer` | Thống kê số lượng cảnh báo (open, acknowledged, resolved, critical, warning) |
| **64** | | `/alerts` | `GET` | `admin`, `farmer` | Danh sách toàn bộ cảnh báo (lọc theo trạng thái, mức độ, ao, thiết bị, loại) |
| **65** | | `/ponds/:pondId/alerts` | `GET` | `admin`, `farmer` | Danh sách cảnh báo riêng cho từng ao nuôi |
| **66** | | `/alerts/:id/acknowledge` | `PATCH` | `admin`, `farmer` | Tiếp nhận xử lý sự cố cảnh báo (`acknowledged`) |
| **67** | | `/alerts/:id/resolve` | `PATCH` | `admin`, `farmer` | Xác nhận sự cố đã khắc phục xong (`resolved`) |
| **68** | **Safety Rules** | `/safety-rules` | `GET` | `admin`, `farmer` | Xem danh mục các quy tắc an toàn chất lượng nước |
| **69** | | `/safety-rules` | `POST` | `admin` | Tạo quy tắc kiểm tra an toàn mới (ngưỡng DO, pH, nhiệt độ...) |
| **70** | | `/safety-rules/:id` | `GET` | `admin`, `farmer` | Xem chi tiết quy tắc an toàn |
| **71** | | `/safety-rules/:id` | `PATCH` | `admin` | Cập nhật điều kiện, hành động hoặc bật/tắt quy tắc an toàn |
| **72** | | `/safety-rules/:id` | `DELETE` | `admin` | Xóa quy tắc an toàn khỏi hệ thống |
| **73** | | `/ponds/:pondId/safety-rules/evaluate` | `POST` | `admin`, `farmer` | Thử nghiệm đánh giá an toàn trước khi bấm xả thức ăn thực tế |
| **74** | **MQTT Protocol** | `/mqtt/status` | `GET` | Public | Kiểm tra trạng thái kết nối giữa Backend và MQTT Broker |
| **75** | | `/mqtt/devices/:deviceUid/feeder-test` | `POST` | `admin` | Gửi lệnh test máy cho ăn trực tiếp qua MQTT |
| **--** | | *MQTT Topics* | `Pub/Sub` | IoT / Server | Telemetry: `shrimpmate/telemetry/{deviceUid}`<br>Lệnh ăn: `shrimpmate/devices/{deviceUid}/feeder/command`<br>Status: `shrimpmate/devices/{deviceUid}/feeder/status`<br>Heartbeat: `shrimpmate/devices/{deviceUid}/heartbeat` |

---

## 3. Mã Trạng Thái HTTP Chuẩn (Status Codes)

- `200 OK`: Request thành công, trả về dữ liệu.
- `201 Created`: Tạo mới tài nguyên thành công.
- `400 Bad Request`: Dữ liệu đầu vào sai định dạng hoặc vi phạm validate class-validator.
- `401 Unauthorized`: Chưa đăng nhập, sai thông tin đăng nhập, hoặc token không hợp lệ/hết hạn.
- `403 Forbidden`: Người dùng không có quyền truy cập tài nguyên (ví dụ: Farmer gọi API của Admin, hoặc Farmer truy cập ao của người khác).
- `404 Not Found`: Không tìm thấy tài nguyên theo ID yêu cầu.
- `409 Conflict`: Xung đột dữ liệu (ví dụ: trùng email, trùng số điện thoại, trùng mã thiết bị `device_uid`).

---

## 4. Tài Khoản Thử Nghiệm Mẫu (Pre-seeded Accounts)

| Role | Email | Số điện thoại | Mật khẩu | Phạm vi quyền hạn |
| --- | --- | --- | --- | --- |
| `admin` | `admin@shrimpmate.local` | `0901000001` | `Admin@123456` | Quản trị viên: Quản lý người dùng, catalog phần cứng, luật an toàn, báo cáo FCR toàn hệ thống |
| `farmer` | `farmer@shrimpmate.local` | `0901000002` | `Farmer@123456` | Người nuôi tôm: Sở hữu trang trại, ao nuôi, gán thiết bị, tạo lịch ăn, phân tích AI camera FIS |
