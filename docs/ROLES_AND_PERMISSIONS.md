# Kiến Trúc Phân Quyền & Đặc Tả Nền Tảng (Roles & Permissions)

Tài liệu đặc tả toàn diện mô hình phân quyền **3 Roles** (`Admin`, `Manager`, và `Farmer`) trên **3 ứng dụng đầu cuối chuyên biệt** (*Admin Web Dashboard*, *Manager Web App*, và *Farmer Mobile App*) của hệ sinh thái **ShrimpMate**.

---

## 1. Quy Ước Ứng Dụng & Vai Trò

| Vai trò | Định danh (`role`) | Ứng dụng đầu cuối | Công nghệ | Không gian sử dụng chính | Trọng tâm nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên** | `admin` | **Web Dashboard** | React | Ban quản trị nền tảng | Quản trị tài khoản, catalog phần cứng IoT, quy tắc an toàn, giám sát vĩ mô |
| **Quản lý** | `manager` | **Web App** | React | Văn phòng / Nhà điều hành | Sở hữu trang trại, quản lý ao nuôi, tạo Farmer, phân công ao, lịch cho ăn, FCR, AI |
| **Người nuôi** | `farmer` | **Mobile App** | React Native | Ngoài bờ ao nuôi | Giám sát tức thời, Cho ăn nhanh, Dừng khẩn cấp, nhận thông báo đẩy FCM |

---

## 2. Sơ Đồ Điều Hướng & Kiến Trúc Tổng Thể

Hệ thống sử dụng cơ chế xác thực không trạng thái (**Stateless JWT**) kết hợp **Role-Based Access Control (RBAC)** và **Multi-Tenancy Data Isolation**:

```text
                                [ Đăng nhập: POST /auth/login ]
                                               |
                +------------------------------+------------------------------+
                |                                                             |
        role === 'admin'               role === 'manager'             role === 'farmer'
                |                               |                             |
                v                               v                             v
      [ ADMIN WEB DASHBOARD ]           [ MANAGER WEB APP ]          [ FARMER MOBILE APP ]
      (Ban quản trị nền tảng)        (Văn phòng / Nhà điều hành)     (Vận hành ngoài bờ ao)
      - Quản lý Manager & Farmer     - Tự đăng ký tài khoản          - Đăng nhập (Pass do Manager cấp)
      - Quản lý Catalog Thiết bị     - Tạo Farmer (Pass ngẫu nhiên)  - Đổi mật khẩu lần đầu
      - Cấu hình Quy tắc an toàn     - Quản lý Trang trại & Ao nuôi  - Xem ao được phân công
      - Giám sát toàn hệ thống       - Phân công ao cho Farmer       - Thẻ tóm tắt chỉ số nước
      - Báo cáo FCR toàn diện        - Lập Lịch cho ăn tự động       - Cho ăn nhanh (Quick Feed)
      - Thanh tra dữ liệu mọi trại   - Khai báo & đóng Vụ nuôi       - Dừng khẩn cấp (1-Tap E-Stop)
      - Test phần cứng qua MQTT      - Đồ thị chuỗi thời gian 24h/7d - Nhận Push Notification (FCM)
                                     - Khai thác AI (FIS, Forecast)  - Xác nhận & xử lý sự cố
                                     - Thống kê & Báo cáo FCR vụ
```

---

## 3. Các Giả Định Nghiệp Vụ Cốt Lõi

1. **Khởi tạo tài khoản**:
   - **Manager**: Chủ động tự đăng ký tài khoản trên Web App (`POST /auth/register`).
   - **Farmer**: **Không tự đăng ký**. Sau khi Manager đăng nhập vào Web App, Manager trực tiếp tạo tài khoản Farmer (`POST /farmers`). Mật khẩu ban đầu do hệ thống sinh ngẫu nhiên (hiển thị 1 lần cho Manager đưa lại cho Farmer); Farmer đăng nhập trên Mobile App và đổi mật khẩu ở lần đầu sử dụng.
   - Mỗi Farmer trực thuộc đúng 1 Manager (`users.manager_id = manager.id`).
2. **Sở hữu & Phân công**:
   - **Manager sở hữu trang trại** (`farms.owner_id = manager.id`) và toàn quyền tạo các ao nuôi trực thuộc.
   - **Manager phân công ao nuôi cho Farmer** (`farmer_assignments`): Có thể phân công từng ao cụ thể hoặc toàn bộ trang trại (`pond_id = null`).
   - Farmer chỉ nhìn thấy và thao tác trên các ao/trại được phân công.
3. **Phạm vi giám sát của Admin**:
   - Admin quản trị danh mục thiết bị IoT trong kho/catalog, bộ quy tắc an toàn toàn cục, và có quyền xem dữ liệu mọi trang trại/ao nuôi để hỗ trợ kỹ thuật hoặc xử lý vi phạm.

---

## 4. Chi Tiết Vai Trò Quản Trị Viên (Admin - `admin`)

### 4.1. Phạm vi ứng dụng
- **Nền tảng sử dụng**: **Duy nhất Admin Web Dashboard** (Giao diện desktop màn hình lớn).

### 4.2. Danh mục chức năng trên Admin Web Dashboard

| Nhóm chức năng | Mô tả chi tiết | Các API sử dụng |
| --- | --- | --- |
| **1. Quản lý Tài khoản Toàn hệ thống** | - Xem danh sách toàn bộ tài khoản Manager và Farmer trên nền tảng.<br>- Khóa/mở khóa tài khoản khi có vi phạm.<br>- Thay đổi vai trò người dùng.<br>- *Quy tắc an toàn*: Không được tự khóa hoặc hạ quyền của chính mình. | `GET /auth/users`<br>`PATCH /auth/users/:id/status`<br>`PATCH /auth/users/:id/role`<br>`GET /auth/admin-check` |
| **2. Quản lý Catalog Phần cứng IoT** | - Khai báo thiết bị chuẩn mới vào kho hệ thống (`pond_id = null`).<br>- Cấu hình định danh phần cứng duy nhất (`deviceUid`) và firmware chuẩn.<br>- Xóa thiết bị khỏi danh mục hệ thống. | `GET /devices` (Toàn bộ kho)<br>`POST /devices`<br>`PATCH /devices/:id`<br>`DELETE /devices/:id` |
| **3. Giám sát & Báo cáo Nền tảng** | - **Tổng quan nền tảng**: Thống kê số lượng Manager, Farmer, Trang trại, Ao nuôi, thiết bị online/offline.<br>- **Báo cáo vận hành**: Xem 10 cảnh báo nguy cấp gần nhất và thiết bị offline > 5 phút.<br>- **Báo cáo FCR toàn hệ thống**: Thống kê FCR trung bình toàn bộ các vụ nuôi trên nền tảng. | `GET /admin/overview`<br>`GET /admin/reports/operational`<br>`GET /admin/reports/fcr` |
| **4. Quản lý Quy tắc An toàn Nước** | - Tạo mới, chỉnh sửa ngưỡng an toàn (DO, pH, Nhiệt độ, NH₃) áp dụng chuẩn cho toàn hệ thống.<br>- Bật/tắt các luật an toàn. | `GET /safety-rules`<br>`POST /safety-rules`<br>`PATCH /safety-rules/:id`<br>`DELETE /safety-rules/:id` |
| **5. Giám sát Cơ sở nuôi Toàn diện** | - Xem danh sách trang trại, ao nuôi, vụ nuôi của mọi Manager để phục vụ công tác thanh tra/hỗ trợ kỹ thuật. | `GET /farms`<br>`GET /farms/:id`<br>`GET /farms/:farmId/ponds`<br>`GET /farms/:farmId/ponds/:id`<br>`GET /ponds/:pondId/crop-seasons` |
| **6. Kiểm thử Thiết bị IoT qua MQTT** | - Kiểm tra trạng thái kết nối MQTT Broker.<br>- Phát lệnh test máy cho ăn trực tiếp qua MQTT tới thiết bị phần cứng. | `GET /mqtt/status`<br>`POST /mqtt/devices/:deviceUid/feeder-test` |

---

## 5. Chi Tiết Vai Trò Quản Lý (Manager - `manager`)

### 5.1. Phạm vi ứng dụng
- **Nền tảng sử dụng**: **Web App** (Giao diện React trên trình duyệt máy tính văn phòng/nhà).

### 5.2. Danh mục chức năng trên Manager Web App

| Nhóm chức năng | Mô tả chi tiết | Các API sử dụng |
| --- | --- | --- |
| **1. Xác thực & Hồ sơ cá nhân** | - Tự đăng ký tài khoản Quản lý mới bằng Email/Số điện thoại.<br>- Đăng nhập, đổi mật khẩu, đăng xuất an toàn.<br>- Khôi phục mật khẩu qua mã OTP đa kênh (Email thật qua Gmail SMTP & SMS thật qua cổng eSMS.vn). | `POST /auth/register`<br>`POST /auth/login`<br>`POST /auth/logout`<br>`PATCH /auth/profile`<br>`PATCH /auth/change-password`<br>`POST /auth/forgot-password`<br>`POST /auth/resend-otp`<br>`POST /auth/verify-reset-otp`<br>`POST /auth/reset-password`<br>`GET /auth/manager-check` |
| **2. Quản lý Người nuôi (Farmer Management - UC020)** | - Trực tiếp tạo tài khoản cho Farmer với mật khẩu ngẫu nhiên do hệ thống sinh ra.<br>- Xem danh sách Farmer thuộc quyền quản lý.<br>- Cập nhật thông tin họ tên, SĐT, Email của Farmer.<br>- Khóa/mở khóa tài khoản Farmer. | `POST /farmers`<br>`GET /farmers`<br>`GET /farmers/:id`<br>`PATCH /farmers/:id`<br>`PATCH /farmers/:id/status` |
| **3. Phân công Ao nuôi (Farmer Assignment - UC021)** | - Phân công một hoặc nhiều ao nuôi (hoặc toàn bộ trang trại) cho Farmer phụ trách.<br>- Xem danh sách phân công của từng Farmer.<br>- Thay đổi hoặc thu hồi phân công. | `POST /farmers/:id/assignments`<br>`GET /farmers/:id/assignments`<br>`DELETE /farmers/:id/assignments/:assignmentId`<br>`DELETE /farmers/:id/assignments` |
| **4. Quản lý Trang trại & Ao nuôi (UC005, UC006)** | - Khởi tạo trang trại (`farms`) do mình sở hữu (`owner_id = manager.id`).<br>- Khai báo danh mục các ao nuôi (`ponds`), diện tích (m²) và trạng thái hoạt động.<br>- Sửa, xóa (soft delete) trang trại và ao nuôi. | `POST /farms`<br>`GET /farms`<br>`PATCH /farms/:id`<br>`DELETE /farms/:id`<br>`POST /farms/:farmId/ponds`<br>`GET /farms/:farmId/ponds`<br>`PATCH /farms/:farmId/ponds/:id`<br>`DELETE /farms/:farmId/ponds/:id` |
| **5. Quản lý Vụ nuôi (Crop Season - UC007)** | - Khai báo vụ nuôi mới (ngày thả, mật độ, số lượng giống thả, tỷ lệ sống ước tính).<br>- Theo dõi ngày nuôi (DOC), sinh khối ước tính, cập nhật trạng thái vụ nuôi (đóng/tổng kết vụ). | `POST /ponds/:pondId/crop-seasons`<br>`GET /ponds/:pondId/crop-seasons`<br>`GET /crop-seasons/:id`<br>`PATCH /crop-seasons/:id`<br>`DELETE /crop-seasons/:id` |
| **6. Gán & Quản lý Thiết bị (UC009)** | - Liên kết thiết bị IoT từ kho vào ao nuôi thuộc quyền quản lý (`claim`).<br>- Gỡ thiết bị khỏi ao (`unassign`) khi cần bảo dưỡng/thay thế.<br>- Theo dõi thời điểm phản hồi gần nhất (`lastSeenAt`) và trạng thái online/offline. | `POST /devices/claim`<br>`POST /devices/:id/unassign`<br>`GET /devices`<br>`GET /devices/:id` |
| **7. Cấu hình Lịch cho ăn Tự động (UC011)** | - Thiết lập lịch cho ăn tự động trong tuần: khung giờ cho ăn, định mức kg thức ăn, tốc độ rải.<br>- Bật/tắt hoặc xóa lịch cho ăn. | `POST /ponds/:pondId/feeding-schedules`<br>`GET /ponds/:pondId/feeding-schedules`<br>`PATCH /feeding-schedules/:id`<br>`DELETE /feeding-schedules/:id` |
| **8. Giám sát Môi trường & Đồ thị Chuỗi thời gian (UC013)** | - Xem biểu đồ chuỗi thời gian 24h/7d chi tiết 6 thông số nước (pH, DO, nhiệt độ, độ mặn, NH₃, độ đục).<br>- Phân tích xu hướng biến động môi trường. | `GET /ponds/:pondId/telemetry/history`<br>`GET /ponds/:pondId/telemetry/latest` |
| **9. Khai thác AI & Camera Vision (UC014)** | - Xem dự báo nhu cầu thức ăn và sinh khối ước tính.<br>- Xem chỉ số thèm ăn FIS (0-3), ảnh phân tích YOLO11n-seg & MobileNetV3.<br>- Cấu hình tọa độ ROI và tinh chỉnh trọng số FIS ($w_1 - w_4$). | `GET /camera/ponds/:pondId/latest-fis`<br>`GET /camera/ponds/:pondId/fis-history`<br>`PATCH /camera/devices/:deviceId/roi`<br>`PATCH /camera/ponds/:pondId/weights`<br>`GET /ai-integration/ponds/:pondId/forecast-biomass` |
| **10. Điều khiển Thiết bị & Cho ăn (UC012)** | - Bật/tắt máy cho ăn, chuyển chế độ tự động/thủ công.<br>- Kích hoạt cữ cho ăn có kiểm duyệt an toàn.<br>- Dừng khẩn cấp máy cho ăn. | `POST /ponds/:pondId/feeding-records`<br>`POST /devices/:id/emergency-stop`<br>`POST /devices/:id/feeder-command` |
| **11. Tiếp nhận & Xử lý Cảnh báo (UC015)** | - Xem toàn bộ sự cố môi trường và thiết bị trong các ao thuộc quyền quản lý.<br>- Xác nhận đã tiếp nhận (`acknowledged`) và đánh dấu đã khắc phục (`resolved`). | `GET /alerts`<br>`GET /alerts/summary`<br>`GET /ponds/:pondId/alerts`<br>`PATCH /alerts/:id/acknowledge`<br>`PATCH /alerts/:id/resolve` |
| **12. Thống kê & Xuất báo cáo Vụ nuôi (UC016)** | - Đánh giá lượng thức ăn tiêu thụ tích lũy, tính hệ số FCR chuẩn.<br>- Báo cáo tổng kết hiệu quả vụ nuôi. | `GET /crop-seasons/:id/statistics` |

---

## 6. Chi Tiết Vai Trò Người Nuôi (Farmer - `farmer`)

### 6.1. Phạm vi ứng dụng
- **Nền tảng sử dụng**: **Duy nhất Mobile App** (React Native trên điện thoại thông minh Android/iOS).
- **Mục đích**: Vận hành trực tiếp ngoài bờ ao nuôi tôm.

### 6.2. Danh mục chức năng trên Farmer Mobile App

| Nhóm chức năng | Mô tả chi tiết | Các API sử dụng |
| --- | --- | --- |
| **1. Xác thực & Đổi mật khẩu** | - Đăng nhập bằng tài khoản và mật khẩu do Manager cấp.<br>- Nhận biết cờ `mustChangePassword` và đổi mật khẩu ở lần đăng nhập đầu tiên.<br>- Đăng xuất an toàn, thu hồi phiên làm việc.<br>- Khôi phục mật khẩu qua mã OTP đa kênh (SMS thật qua cổng eSMS.vn & Email thật qua Gmail SMTP). | `POST /auth/login`<br>`POST /auth/logout`<br>`PATCH /auth/change-password`<br>`POST /auth/forgot-password`<br>`POST /auth/resend-otp`<br>`POST /auth/verify-reset-otp`<br>`POST /auth/reset-password`<br>`GET /auth/farmer-check` |
| **2. Xem Ao nuôi được phân công** | - Xem danh sách trang trại và các ao nuôi mà mình được Manager phân công phụ trách.<br>- Chuyển đổi giữa các ao nuôi nhanh chóng. | `GET /farms`<br>`GET /farms/:farmId/ponds`<br>`GET /farms/:farmId/ponds/:id` |
| **3. Giám sát Nước Tức thời (Gauges - UC013)** | - Xem thẻ tóm tắt màu cảnh báo nhanh (Xanh: Tối ưu / Vàng: Cảnh báo / Đỏ: Nguy cấp) cho 6 thông số: DO, pH, Nhiệt độ, Độ mặn, NH₃, Độ đục.<br>- Cập nhật tức thời thời gian đo gần nhất. | `GET /ponds/:pondId/telemetry/latest` |
| **4. Xem Khuyến nghị AI Tóm tắt (UC014)** | - Xem lượng thức ăn khuyến nghị cho cữ ăn hiện tại.<br>- Xem chỉ số thèm ăn tức thời của đàn tôm (Mức 0: Không ăn, 1: Ăn yếu, 2: Bình thường, 3: Ăn mạnh). | `GET /camera/ponds/:pondId/latest-fis`<br>`GET /ai-integration/ponds/:pondId/recommendations` |
| **5. Điều khiển Thiết bị Nhanh (1-Tap Control - UC012)** | - **Cho ăn nhanh (Quick Feed)**: Nhập lượng thức ăn và bấm cho ăn ngay tại bờ ao (tự động kiểm duyệt qua Safety Rule Engine).<br>- **Dừng khẩn cấp (Emergency Stop)**: 1 chạm ngắt lập tức động cơ máy cho ăn qua MQTT khi phát hiện sự cố tại ao. | `POST /ponds/:pondId/feeding-records` (Quick Feed)<br>`POST /devices/:id/emergency-stop` (E-Stop) |
| **6. Tiếp nhận & Xử lý Cảnh báo Đẩy (FCM Push - UC015)** | - Nhận thông báo đẩy (Push Notification) tức thời trên màn hình khóa điện thoại khi nước vượt ngưỡng nguy cấp.<br>- Xem chi tiết nguyên nhân sự cố.<br>- Bấm xác nhận đã xử lý sự cố tại bờ ao. | `GET /ponds/:pondId/alerts`<br>`PATCH /alerts/:id/acknowledge`<br>`PATCH /alerts/:id/resolve` |

---

## 7. Bảng Đối Chiếu Use Case Toàn Diện (UC001 - UC021)

| Mã Use Case | Tên Use Case | Tác nhân chính | Giao diện thực hiện | Mô tả nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| **UC001** | Đăng ký tài khoản | **Quản lý (Manager)** | Web App | Quản lý tự đăng ký tài khoản mới bằng Email và Số điện thoại vào hệ thống. |
| **UC002** | Đăng nhập | Toàn bộ vai trò | Web / Mobile | Đăng nhập bằng Email/SĐT + Mật khẩu, cấp JWT Access/Refresh Token. |
| **UC003** | Quên & đặt lại mật khẩu | Toàn bộ vai trò | Web / Mobile | Gửi mã OTP 6 chữ số qua Email/SMS để đặt lại mật khẩu. |
| **UC004** | Quản lý trạng thái người dùng | **Admin** | Web Dashboard | Xem danh sách tài khoản Manager và Farmer, thực hiện khóa hoặc mở khóa. |
| **UC005** | Quản lý trang trại | **Manager** | Web App | Khởi tạo và quản lý thông tin các trang trại thuộc quyền sở hữu của Quản lý. |
| **UC006** | Quản lý ao nuôi | **Manager** | Web App | Khởi tạo, cập nhật diện tích, trạng thái ao thuộc trang trại của Quản lý. |
| **UC007** | Quản lý vụ nuôi | **Manager** | Web App | Khai báo giống, ngày thả, theo dõi DOC và đóng/tổng kết vụ nuôi. |
| **UC008** | Quản lý thiết bị IoT toàn hệ thống | **Admin** | Web Dashboard | Khai báo thiết bị mới vào danh mục phần cứng toàn hệ thống. |
| **UC009** | Gán và quản lý thiết bị ao nuôi | **Manager** | Web App | Liên kết thiết bị IoT từ kho vào từng ao nuôi thuộc quyền quản lý. |
| **UC010** | Giám sát tổng thể hệ thống | **Admin** | Web Dashboard | Xem thống kê số liệu tổng quan, tình trạng thiết bị và cảnh báo toàn nền tảng. |
| **UC011** | Thiết lập lịch cho ăn tự động | **Manager** | Web App | Tạo, sửa hoặc tạm ngưng các lịch cho ăn tự động theo khung giờ trong tuần. |
| **UC012** | Điều khiển thiết bị từ xa | **Manager, Farmer** | Web App / Mobile App | Quản lý bật/tắt động cơ, chuyển chế độ trên Web App; Farmer Cho ăn nhanh và Dừng khẩn cấp trên Mobile App. |
| **UC013** | Giám sát môi trường thời gian thực | **Manager, Farmer** | Web App / Mobile App | Quản lý xem biểu đồ chuỗi thời gian (Web App); Farmer xem thẻ tóm tắt màu cảnh báo (Mobile App). |
| **UC014** | Xem khuyến nghị AI | **Manager, Farmer** | Web App / Mobile App | Quản lý xem phân tích chuyên sâu FIS, sinh khối; Farmer xem khuyến nghị tóm tắt lượng ăn. |
| **UC015** | Tiếp nhận và xử lý cảnh báo | **Farmer, Manager** | Mobile App / Web App | Farmer nhận Push Notification và xử lý ngoài bờ ao; Manager theo dõi và xác nhận trên Web App. |
| **UC016** | Thống kê và xuất báo cáo vụ nuôi | **Manager** | Web App | Đánh giá tổng lượng ăn tiêu thụ, tính hệ số FCR và trích xuất báo cáo vụ. |
| **UC017** | Thu nhận dữ liệu cảm biến IoT | Thiết bị ESP32 | MQTT Broker | Cảm biến định kỳ gửi thông số chất lượng nước lên Backend. |
| **UC018** | Kiểm duyệt lệnh cho ăn an toàn | Safety Rule Engine | Backend | Tự động kiểm tra chất lượng nước trước khi phát lệnh điều khiển máy cho ăn. |
| **UC019** | Phân tích thị giác máy tính sàng ăn | Camera AI Engine | Backend / Edge | Chạy song song YOLO11n-seg và MobileNetV3 để tính chỉ số bắt mồi FIS. |
| **UC020** | **Quản lý Người nuôi (Mới)** | **Manager** | Web App | Quản lý tạo tài khoản cho Farmer với mật khẩu ngẫu nhiên; sửa thông tin, khóa/mở khóa. |
| **UC021** | **Gán ao nuôi cho Người nuôi (Mới)** | **Manager** | Web App | Quản lý phân công một hoặc nhiều ao nuôi (hoặc cả trang trại) cho Farmer phụ trách. |

---

## 8. Ma Trận Phân Quyền Chi Tiết (RBAC Matrix)

| Module / Nhóm Endpoint | Endpoint / Action | Admin (Web Dashboard) | Manager (Web App) | Farmer (Mobile App) | Ghi chú bảo mật |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Auth** | `POST /auth/register` | ❌ | 🟢 **Chính** | ❌ | Chỉ Manager tự đăng ký |
| | `POST /auth/login` | 🟢 | 🟢 | 🟢 | Mọi vai trò |
| | `POST /auth/forgot-password` | 🟢 | 🟢 | 🟢 | Public, yêu cầu OTP khôi phục mật khẩu (Email/SMS thật) |
| | `POST /auth/resend-otp` | 🟢 | 🟢 | 🟢 | Public, gửi lại mã OTP (áp dụng cooldown 60s) |
| | `POST /auth/verify-reset-otp` | 🟢 | 🟢 | 🟢 | Public, xác thực mã OTP trước khi đặt lại |
| | `POST /auth/reset-password` | 🟢 | 🟢 | 🟢 | Public, đặt lại mật khẩu bằng mã OTP |
| | `GET /auth/me` | 🟢 | 🟢 | 🟢 | Lấy thông tin cá nhân |
| | `PATCH /auth/profile` | 🟢 | 🟢 | 🟢 | Cập nhật họ tên, SĐT cá nhân |
| | `PATCH /auth/change-password` | 🟢 | 🟢 | 🟢 | Đổi mật khẩu (cần mật khẩu cũ) |
| | `GET /auth/users` | 🟢 | ❌ | ❌ | Admin quản lý tài khoản |
| | `PATCH /auth/users/:id/status` | 🟢 | ❌ | ❌ | Admin khóa/mở khóa tài khoản |
| | `GET /auth/admin-check` | 🟢 | ❌ | ❌ | Guard kiểm tra Admin |
| | `GET /auth/manager-check` | ❌ | 🟢 | ❌ | Guard kiểm tra Manager |
| | `GET /auth/farmer-check` | ❌ | ❌ | 🟢 | Guard kiểm tra Farmer |
| **Farmer Mgmt** | `POST /farmers` | 🟢 | 🟢 | ❌ | Tạo Farmer + mật khẩu ngẫu nhiên |
| | `GET /farmers` | 🟢 | 🟢 (chỉ farmer của mình) | ❌ | Danh sách người nuôi |
| | `PATCH /farmers/:id` | 🟢 | 🟢 | ❌ | Cập nhật thông tin Farmer |
| | `PATCH /farmers/:id/status` | 🟢 | 🟢 | ❌ | Khóa/mở khóa Farmer |
| | `POST /farmers/:id/assignments`| 🟢 | 🟢 | ❌ | Phân công ao/trại cho Farmer |
| | `GET /farmers/:id/assignments` | 🟢 | 🟢 | 🟢 (chính mình) | Xem phân công ao |
| | `DELETE /farmers/:id/assignments/*` | 🟢 | 🟢 | ❌ | Thu hồi phân công |
| **Farms & Ponds** | `POST /farms` | ❌ | 🟢 | ❌ | Manager tạo trang trại |
| | `GET /farms` | 🟢 (toàn bộ) | 🟢 (trại sở hữu) | 🟢 (trại được phân công) | Lọc theo vai trò |
| | `PATCH /farms/:id` | ❌ | 🟢 | ❌ | Chủ trang trại chỉnh sửa |
| | `POST /farms/:id/ponds` | ❌ | 🟢 | ❌ | Manager thêm ao nuôi |
| | `GET /farms/:id/ponds` | 🟢 | 🟢 | 🟢 (ao được phân công) | Lọc theo phân công |
| **Crop Seasons** | `POST /ponds/:id/crop-seasons` | ❌ | 🟢 | ❌ | Manager tạo vụ nuôi |
| | `GET /crop-seasons/:id` | 🟢 | 🟢 | 🟢 | Xem vụ nuôi |
| | `GET /crop-seasons/:id/statistics` | 🟢 | 🟢 | 🟢 | Xem thống kê & FCR |
| **IoT Devices** | `POST /devices` (Catalog) | 🟢 | ❌ | ❌ | Admin tạo thiết bị vào kho |
| | `POST /devices/claim` | ❌ | 🟢 | ❌ | Manager gán thiết bị vào ao |
| | `POST /devices/:id/unassign` | ❌ | 🟢 | ❌ | Manager gỡ thiết bị khỏi ao |
| | `POST /devices/:id/emergency-stop` | 🟢 | 🟢 | 🟢 | Dừng khẩn cấp máy cho ăn |
| **Feeding** | `POST /ponds/:id/feeding-schedules` | ❌ | 🟢 | ❌ | Manager tạo lịch ăn |
| | `POST /ponds/:id/feeding-records` | 🟢 | 🟢 | 🟢 | Quick Feed & cữ ăn |
| **Telemetry** | `GET /ponds/:id/telemetry/latest` | 🟢 | 🟢 | 🟢 | Xem chỉ số đo tức thời |
| | `GET /ponds/:id/telemetry/history` | 🟢 | 🟢 | 🟢 | Đồ thị lịch sử 24h/7d |
| **Alerts** | `GET /alerts` | 🟢 | 🟢 | 🟢 | Xem cảnh báo |
| | `PATCH /alerts/:id/acknowledge` | 🟢 | 🟢 | 🟢 | Tiếp nhận xử lý sự cố |
| | `PATCH /alerts/:id/resolve` | 🟢 | 🟢 | 🟢 | Đóng/hoàn tất sự cố |
| **Camera & AI**| `GET /camera/ponds/:id/latest-fis` | 🟢 | 🟢 | 🟢 | Xem chỉ số FIS |
| | `PATCH /camera/devices/:id/roi` | 🟢 | 🟢 | ❌ | Cấu hình vùng ROI camera |
| | `PATCH /camera/ponds/:id/weights` | 🟢 | 🟢 | ❌ | Cấu hình trọng số FIS |
| **Safety Rules**| CRUD `/safety-rules` | 🟢 | ❌ | ❌ | Admin cấu hình luật an toàn |
| **Admin Reports**| `GET /admin/*` | 🟢 | ❌ | ❌ | Báo cáo toàn hệ thống |

---

## 8. Kiến Trúc Xác Thực & Phân Phối Mã OTP (Multi-Channel OTP Delivery)

Hệ thống ShrimpMate triển khai giải pháp xác thực và khôi phục tài khoản hai lớp (Two-Factor Authentication / OTP Recovery) chuẩn hóa cho môi trường viễn thông Việt Nam:

```text
[ Yêu cầu: POST /auth/forgot-password ]
                     |
         +-----------+-----------+
         |                       |
   (Email format)        (Phone format: 0865152043)
         |                       |
         v                       v
 [ Gmail SMTP Service ]  [ Phone Normalizer ]
         |                       |
         v                       v
 [ HTML Email Template ]  [ eSMS.vn Gateway ]
         |                       |
         v                       v
 (Hộp thư người dùng)     (SMS về điện thoại)
```

### 8.1. Các kênh phân phối OTP thực tế

1. **Kênh Email (Gmail SMTP)**:
   - Gửi qua dịch vụ SMTP chính thức (`smtp.gmail.com:587`, STARTTLS).
   - Email hiển thị giao diện HTML định dạng thương hiệu **ShrimpMate**, cung cấp mã OTP 6 số cùng thời hạn hiệu lực rõ ràng.

2. **Kênh SMS (Cổng eSMS.vn)**:
   - Tích hợp trực tiếp qua REST API của cổng **eSMS.vn** (đơn vị cung cấp giải pháp SMS viễn thông trong nước).
   - **Chuẩn hóa số điện thoại**: Tự động chuyển đổi các định dạng quốc tế (`+84865152043`, `84865152043`) hoặc nội địa thành chuẩn 10 chữ số `0xxxxxxxxx` trước khi gửi lên nhà mạng.
   - **Tuân thủ quy định viễn thông**:
     - *Môi trường kiểm thử / KLTN*: Sử dụng Brandname test **`Baotrixemay`** (`ESMS_SMS_TYPE=2`) kèm template chuẩn đã được các nhà mạng (Viettel, VinaPhone, MobiFone) phê duyệt sẵn: `{OTP} la ma xac minh dang ky Baotrixemay cua ban`.
     - *Môi trường doanh nghiệp sản xuất*: Hỗ trợ cấu hình `ESMS_BRANDNAME` tùy biến theo tên cơ sở nuôi tôm sau khi hoàn tất thủ tục đăng ký thương hiệu với nhà mạng.
   - **Log Development**: Khi chạy trong môi trường phát triển (`NODE_ENV !== 'production'`), mã OTP đồng thời được in ra terminal console của máy chủ Backend để hỗ trợ debug lập trình nhanh chóng.

### 8.2. Cơ chế bảo mật & Chống lạm dụng (Security Controls)

- **Thời hạn hiệu lực**: Mã OTP tồn tại tối đa 5 phút (`OTP_EXPIRES_IN_MINUTES=5`).
- **Thời gian chờ chống spam (Cooldown Rate Limit)**: Bắt buộc tối thiểu 60 giây (`OTP_REQUEST_COOLDOWN_SECONDS=60`) giữa 2 lần bấm yêu cầu cấp mã.
- **Giới hạn số lần thử (Brute-force Protection)**: Cho phép nhập sai tối đa 5 lần (`OTP_MAX_ATTEMPTS=5`). Quá 5 lần, mã OTP hiện tại bị thu hồi ngay lập tức.
- **Vô hiệu hóa phiên đăng nhập cũ**: Sau khi đặt lại mật khẩu thành công bằng mã OTP, toàn bộ `refreshToken` trước đó bị thu hồi để đảm bảo kẻ gian không thể tiếp tục phiên truy cập trái phép.
