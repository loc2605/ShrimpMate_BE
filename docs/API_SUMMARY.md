# Bảng Tóm Tắt Toàn Bộ API - ShrimpMate Backend

Tài liệu tra cứu nhanh (Quick Reference) toàn bộ các endpoint, phương thức, phân quyền và yêu cầu kỹ thuật của hệ thống **ShrimpMate Backend** theo mô hình **3 Roles** (`Admin`, `Manager`, `Farmer`).

---

## 1. Thông tin kết nối & Phân quyền

- **Base URL**: `http://localhost:3000` (hoặc `http://<IP_LAN>:3000`)
- **Header xác thực**:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Phân quyền (3 Roles)**:
  - `admin`: Quản trị viên hệ thống (Web Dashboard: quản lý người dùng, catalog phần cứng, luật an toàn, báo cáo tổng quan & FCR toàn nền tảng).
  - `manager`: Quản lý sở hữu cơ sở nuôi (Web App: quản lý Farmer, phân công ao, trang trại, ao nuôi, vụ nuôi, gán thiết bị, tạo lịch ăn, camera AI, báo cáo).
  - `farmer`: Người nuôi trực tiếp vận hành bờ ao (Mobile App: giám sát tức thời, cho ăn nhanh, dừng khẩn cấp, nhận cảnh báo FCM trên các ao được phân công).
  - `Public`: Không yêu cầu token.

---

## 2. Bảng Tra Cứu Toàn Bộ API (Master API Table)

| STT | Module | Endpoint | Method | Phân quyền | Công dụng chính & Yêu cầu |
| :-: | --- | --- | :---: | :---: | --- |
| **1** | **Health Check** | `/` | `GET` | Public | Kiểm tra trạng thái hoạt động của máy chủ backend (`200 OK`) |
| **2** | **Auth** | `/auth/register` | `POST` | Public | Quản lý (`manager`) tự đăng ký tài khoản mới trên Web App, chuẩn hóa SĐT Việt Nam |
| **3** | | `/auth/login` | `POST` | Public | Đăng nhập bằng Email hoặc SĐT + Password, trả về `accessToken` & `refreshToken` |
| **4** | | `/auth/refresh-token` | `POST` | Public | Cấp lại `accessToken` mới từ `refreshToken` hợp lệ |
| **5** | | `/auth/forgot-password` | `POST` | Public | Gửi mã OTP 6 số khôi phục mật khẩu (Email qua Gmail SMTP & SMS thật qua eSMS.vn, hiệu lực 5 phút) |
| **6** | | `/auth/resend-otp` | `POST` | Public | Hủy OTP cũ và gửi lại mã OTP mới (cooldown 60s) |
| **7** | | `/auth/verify-reset-otp` | `POST` | Public | Xác thực tính hợp lệ của OTP trước khi người dùng nhập mật khẩu mới |
| **8** | | `/auth/reset-password` | `POST` | Public | Đặt lại mật khẩu mới bằng mã OTP, tự động hủy các refresh token cũ |
| **9** | | `/auth/me` | `GET` | Authenticated | Lấy thông tin hồ sơ của tài khoản đang đăng nhập |
| **10** | | `/auth/profile` | `PATCH` | Authenticated | Người dùng tự cập nhật họ tên (`fullName`) và số điện thoại |
| **11** | | `/auth/change-password` | `PATCH` | Authenticated | Đổi mật khẩu tài khoản (yêu cầu mật khẩu hiện tại) |
| **12** | | `/auth/admin-check` | `GET` | `admin` | Kiểm tra nhanh token có vai trò Admin hay không |
| **13** | | `/auth/manager-check` | `GET` | `manager` | Kiểm tra nhanh token có vai trò Quản lý (Manager) hay không |
| **14** | | `/auth/farmer-check` | `GET` | `farmer` | Kiểm tra nhanh token có vai trò Người nuôi (Farmer) hay không |
| **15** | | `/auth/users` | `GET` | `admin` | Xem danh sách tất cả tài khoản người dùng trong hệ thống |
| **16** | | `/auth/users/:id/status` | `PATCH` | `admin` | Khóa (`isActive: false`) hoặc mở khóa tài khoản (chặn Admin tự khóa) |
| **17** | | `/auth/users/:id/role` | `PATCH` | `admin` | Phân quyền tài khoản giữa `admin`, `manager`, `farmer` (chặn Admin tự hạ quyền) |
| **18** | **Farmers (UC020)** | `/farmers` | `POST` | `manager`, `admin` | Manager tạo tài khoản Farmer mới, hệ thống tự sinh mật khẩu ngẫu nhiên |
| **19** | | `/farmers` | `GET` | `manager`, `admin` | Danh sách Farmer thuộc quyền quản lý của Manager (Admin xem tất cả) |
| **20** | | `/farmers/:id` | `GET` | `manager`, `admin` | Chi tiết Farmer kèm danh sách ao/trang trại được phân công |
| **21** | | `/farmers/:id` | `PATCH` | `manager`, `admin` | Cập nhật thông tin họ tên, số điện thoại, email của Farmer |
| **22** | | `/farmers/:id/status` | `PATCH` | `manager`, `admin` | Khóa hoặc mở khóa tài khoản của Farmer |
| **23** | **Assignments (UC021)** | `/farmers/:id/assignments` | `POST` | `manager`, `admin` | Phân công một hoặc nhiều ao nuôi (hoặc toàn bộ trang trại) cho Farmer |
| **24** | | `/farmers/:id/assignments` | `GET` | `manager`, `admin`, `farmer` | Xem danh sách phân công của Farmer |
| **25** | | `/farmers/:id/assignments/:assignmentId` | `DELETE` | `manager`, `admin` | Thu hồi một bản ghi phân công ao cụ thể của Farmer |
| **26** | | `/farmers/:id/assignments` | `DELETE` | `manager`, `admin` | Thu hồi toàn bộ phân công của Farmer |
| **27** | **Admin Reports** | `/admin/overview` | `GET` | `admin` | Thống kê tổng quan: user, trang trại, ao nuôi, thiết bị online/offline, cảnh báo |
| **28** | | `/admin/reports/operational` | `GET` | `admin` | Báo cáo vận hành: số liệu tổng quan + 10 cảnh báo mới nhất + thiết bị offline > 5 phút |
| **29** | | `/admin/reports/fcr` | `GET` | `admin` | Báo cáo FCR toàn hệ thống: FCR từng vụ, FCR trung bình & xếp loại chất lượng |
| **30** | **Farms (UC005)** | `/farms` | `GET` | `admin`, `manager`, `farmer` | Danh sách trang trại (Manager xem trại mình sở hữu, Farmer xem trại được phân công) |
| **31** | | `/farms` | `POST` | `manager` | Khởi tạo trang trại mới (tự động gán `owner_id = manager.id`) |
| **32** | | `/farms/:id` | `GET` | `admin`, `manager`, `farmer` | Xem chi tiết thông tin trang trại kèm danh sách ao nuôi |
| **33** | | `/farms/:id` | `PATCH` | `manager` | Cập nhật tên, địa chỉ, trạng thái trang trại thuộc quyền sở hữu |
| **34** | | `/farms/:id` | `DELETE` | `manager` | Xóa mềm trang trại (`deleted_at`) và toàn bộ ao trực thuộc |
| **35** | **Ponds (UC006)** | `/farms/:farmId/ponds` | `GET` | `admin`, `manager`, `farmer` | Danh sách ao nuôi (Farmer chỉ xem các ao được phân công phụ trách) |
| **36** | | `/farms/:farmId/ponds` | `POST` | `manager` | Tạo ao nuôi mới trong trang trại (mã ao `code` duy nhất trong farm) |
| **37** | | `/farms/:farmId/ponds/:id` | `GET` | `admin`, `manager`, `farmer` | Chi tiết ao nuôi kèm danh sách thiết bị IoT đã gán |
| **38** | | `/farms/:farmId/ponds/:id` | `PATCH` | `manager` | Cập nhật diện tích ($m^2$), mã ao, tên ao, trạng thái |
| **39** | | `/farms/:farmId/ponds/:id` | `DELETE` | `manager` | Xóa mềm ao nuôi, tự động hoàn trả thiết bị về kho (`pond_id = NULL`) |
| **40** | **Devices (UC008, 009)** | `/devices` | `GET` | `admin`, `manager`, `farmer` | Admin xem Catalog; Manager/Farmer xem thiết bị thuộc ao của mình |
| **41** | | `/devices` | `POST` | `admin` | Khai báo thiết bị chuẩn mới vào Catalog (`pond_id = null`, status: offline) |
| **42** | | `/devices/claim` | `POST` | `manager` | Manager đăng ký gán thiết bị theo mã `deviceUid` vào ao nuôi |
| **43** | | `/devices/:id/unassign` | `POST` | `manager` | Manager hủy gán thiết bị khỏi ao nuôi, đưa về trạng thái tự do trong kho |
| **44** | | `/devices/:id` | `GET` | `admin`, `manager`, `farmer` | Xem chi tiết thông tin và trạng thái thiết bị |
| **45** | | `/devices/:id` | `PATCH` | `admin`, `manager` | Admin sửa firmware/UID/metadata; Manager sửa mode |
| **46** | | `/devices/:id` | `DELETE` | `admin` | Xóa vĩnh viễn thiết bị khỏi danh mục phần cứng hệ thống |
| **47** | | `/devices/:id/emergency-stop` | `POST` | `admin`, `manager`, `farmer` | Dừng khẩn cấp máy cho ăn tức thì qua MQTT (khóa feeder, status: `emergency_stop`) |
| **48** | | `/devices/:id/heartbeat` | `POST` | `admin`, `manager`, `farmer` | Cập nhật tín hiệu sống heartbeat (`last_seen_at = now()`, status: `online`) |
| **49** | **Crop Seasons (UC007)** | `/ponds/:pondId/crop-seasons` | `GET` | `admin`, `manager`, `farmer` | Danh sách các vụ nuôi của ao nuôi (lịch sử và vụ đang chạy) |
| **50** | | `/ponds/:pondId/crop-seasons` | `POST` | `manager` | Tạo vụ nuôi mới (mỗi ao chỉ có tối đa 1 vụ `active` tại một thời điểm) |
| **51** | | `/crop-seasons/:id` | `GET` | `admin`, `manager`, `farmer` | Xem thông tin chi tiết vụ nuôi |
| **52** | | `/crop-seasons/:id` | `PATCH` | `manager` | Cập nhật thông số vụ nuôi (tỷ lệ sống, mật độ, đóng vụ `completed`) |
| **53** | | `/crop-seasons/:id` | `DELETE` | `manager` | Hủy vụ nuôi (`cancelled`) |
| **54** | | `/crop-seasons/:id/statistics` | `GET` | `admin`, `manager`, `farmer` | Thống kê vụ nuôi: DOC, lượng thức ăn, sinh khối ước tính, hệ số FCR |
| **55** | **Feeding (UC011, 012)** | `/ponds/:pondId/feeding-schedules` | `GET` | `admin`, `manager`, `farmer` | Danh sách lịch cho ăn tự động trong tuần của ao |
| **56** | | `/ponds/:pondId/feeding-schedules` | `POST` | `manager` | Tạo lịch cho ăn tự động theo khung giờ trong tuần |
| **57** | | `/feeding-schedules/:id` | `PATCH` | `manager` | Cập nhật khung giờ, định mức kg thức ăn, bật/tắt (`isEnabled`) |
| **58** | | `/feeding-schedules/:id` | `DELETE` | `manager` | Xóa lịch cho ăn tự động |
| **59** | | `/ponds/:pondId/feeding-records` | `GET` | `admin`, `manager`, `farmer` | Lịch sử các cữ cho ăn (thành công, bị chặn an toàn, đang chạy) |
| **60** | | `/ponds/:pondId/feeding-records` | `POST` | `admin`, `manager`, `farmer` | Cho ăn nhanh (Quick Feed) / Ghi nhận cữ ăn (kiểm duyệt qua Safety Rule Engine) |
| **61** | | `/feeding-records/:id` | `PATCH` | `admin`, `manager`, `farmer` | Cập nhật kết quả cữ ăn sau khi thiết bị cho ăn xong (`actualAmountKg`) |
| **62** | **Telemetry (UC013, 017)**| `/ponds/:pondId/telemetry/latest` | `GET` | `admin`, `manager`, `farmer` | Chỉ số nước mới nhất (pH, DO, nhiệt độ, độ mặn, NH₃, độ đục) |
| **63** | | `/ponds/:pondId/telemetry/history` | `GET` | `admin`, `manager`, `farmer` | Lịch sử chuỗi thời gian 24h/7d phục vụ vẽ đồ thị giám sát |
| **64** | | `/ponds/:pondId/telemetry` | `POST` | `admin`, `manager`, `farmer` | Thu nhận đo đạc cảm biến, tự động kiểm tra ngưỡng vi phạm & debounce alert |
| **65** | **Camera & FIS (UC019)** | `/camera/analyze` | `POST` | `admin`, `manager`, `farmer` | Phân tích ảnh sàng ăn song song qua YOLO11n-seg & MobileNetV3 để tính FIS |
| **66** | | `/camera/ingest-metrics` | `POST` | Public | Thu nhận chỉ số tiền xử lý ($R_t, D_t, C_t$) từ Camera AI Edge Gateway |
| **67** | | `/camera/ponds/:pondId/latest-fis` | `GET` | `admin`, `manager`, `farmer` | Chỉ số thèm ăn FIS mới nhất của ao (0: Không ăn, 1: Yếu, 2: Bình thường, 3: Mạnh) |
| **68** | | `/camera/ponds/:pondId/fis-history`| `GET` | `admin`, `manager`, `farmer` | Lịch sử biến thiên điểm FIS theo thời gian kèm đồ thị |
| **69** | | `/camera/ponds/:pondId/devices` | `GET` | `admin`, `manager`, `farmer` | Danh sách thiết bị camera lắp đặt tại ao nuôi |
| **70** | | `/camera/devices/:deviceId/roi` | `PATCH` | `manager`, `admin` | Cập nhật vùng quan sát ROI cố định cho camera sàng ăn |
| **71** | | `/camera/ponds/:pondId/weights` | `PATCH` | `manager`, `admin` | Tinh chỉnh trọng số $w_1 - w_4$ và ngưỡng phân vị $q_{25}, q_{50}, q_{75}$ của thuật toán FIS |
| **72** | **Alerts (UC015)** | `/alerts/summary` | `GET` | `admin`, `manager`, `farmer` | Thống kê số lượng cảnh báo theo mức độ (`critical`, `warning`, `info`) |
| **73** | | `/alerts` | `GET` | `admin`, `manager`, `farmer` | Danh sách sự cố toàn bộ ao thuộc quyền truy cập |
| **74** | | `/ponds/:pondId/alerts` | `GET` | `admin`, `manager`, `farmer` | Danh sách sự cố theo từng ao nuôi cụ thể |
| **75** | | `/alerts/:id/acknowledge` | `PATCH` | `admin`, `manager`, `farmer` | Tiếp nhận cảnh báo (`status: acknowledged`) |
| **76** | | `/alerts/:id/resolve` | `PATCH` | `admin`, `manager`, `farmer` | Đánh dấu sự cố đã được khắc phục xong (`status: resolved`) |
| **77** | **Safety Rules (UC018)** | `/safety-rules` | `GET` | `admin`, `manager`, `farmer` | Xem danh sách các quy tắc an toàn môi trường đang kích hoạt |
| **78** | | `/safety-rules` | `POST` | `admin` | Admin tạo quy tắc an toàn mới áp dụng toàn hệ thống |
| **79** | | `/safety-rules/:id` | `PATCH` | `admin` | Admin cập nhật ngưỡng kiểm duyệt, độ ưu tiên, bật/tắt quy tắc |
| **80** | | `/safety-rules/:id` | `DELETE` | `admin` | Admin xóa quy tắc an toàn |
| **81** | | `/safety-rules/evaluate` | `POST` | `admin`, `manager`, `farmer` | Kiểm tra thử nghiệm tính an toàn của một bộ chỉ số nước |
| **82** | **AI Integration (UC014)** | `/ai-integration/ponds/:pondId/recommendations` | `GET` | `admin`, `manager`, `farmer` | Lấy khuyến nghị lượng thức ăn tối ưu từ AI |
| **83** | | `/ai-integration/ponds/:pondId/forecast-biomass` | `GET` | `admin`, `manager`, `farmer` | Dự báo sinh khối tôm và sản lượng thu hoạch dự kiến |
| **84** | **MQTT Diagnostics** | `/mqtt/status` | `GET` | `admin` | Kiểm tra trạng thái kết nối tới MQTT Broker và danh sách topic đăng ký |
| **85** | | `/mqtt/devices/:deviceUid/feeder-test` | `POST` | `admin` | Phát gói tin test máy cho ăn trực tiếp qua MQTT tới thiết bị phần cứng |

---

## 3. Tài Khoản Test Mẫu Khởi Tạo Sẵn (Seeded Accounts)

| Vai trò | Định danh (`identifier`) | Mật khẩu | Ứng dụng sử dụng | Phạm vi quyền hạn |
| :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên** (`admin`) | `admin@shrimpmate.local`<br>`0901000001` | `Admin@123456` | **Admin Web Dashboard** | Quản lý toàn bộ Manager & Farmer, Catalog thiết bị, Safety Rules, Báo cáo toàn hệ thống |
| **Quản lý** (`manager`) | `manager@shrimpmate.local`<br>`0901000002` | `Manager@123456` | **Manager Web App** | Sở hữu trang trại, tạo Farmer, phân công ao, lập lịch ăn, vụ nuôi, FCR, cấu hình AI |
| **Người nuôi** (`farmer`) | `farmer@shrimpmate.local`<br>`0901000003` | `Farmer@123456` | **Farmer Mobile App** | Vận hành ngoài bờ ao, xem ao được phân công, đo tức thời, Cho ăn nhanh, Dừng khẩn cấp, nhận cảnh báo FCM |
