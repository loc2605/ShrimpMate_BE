# Kiến Trúc Phân Quyền & Đặc Tả Nền Tảng (Roles & Permissions)

Tài liệu đặc tả toàn diện mô hình phân quyền **2 Roles** (`admin` và `farmer`) trên **3 ứng dụng đầu cuối** (*Admin Web Dashboard*, *Farmer Web Portal*, và *Farmer Mobile App*) của hệ sinh thái **ShrimpMate**.

---

## 1. Sơ Đồ Điều Hướng & Kiến Trúc Tổng Thể

Hệ thống sử dụng cơ chế xác thực không trạng thái (**Stateless JWT**) kết hợp **Role-Based Access Control (RBAC)** và **Multi-Tenancy Data Isolation**:

```text
                                [ Đăng nhập: POST /auth/login ]
                                               |
                                +--------------+--------------+
                                |                             |
                        role === 'admin'              role === 'farmer'
                                |                             |
                                v                             v
                      [ ADMIN WEB DASHBOARD ]     +-----------+-----------+
                      (Dành cho Ban quản trị)     |                       |
                      - Quản lý tài khoản User    v                       v
                      - Quản lý Catalog Thiết bị [ FARMER MOBILE APP ]  [ FARMER WEB PORTAL ]
                      - Quản lý Luật an toàn     (React Native bờ ao)   (React Dashboard)
                      - Báo cáo tổng quan & FCR  - Gauges đo thời gian  - Quản lý Farm & Pond
                      - Giám sát Farm & Pond     - Emergency Stop       - Báo cáo FCR chuyên sâu
                      - Kiểm thử MQTT Feeder     - Cho ăn thủ công      - Lịch cho ăn theo tuần
                                                 - Push Notification    - Cấu hình ROI Camera
                                                 - Xử lý sự cố 1 chạm   - Đồ thị chuỗi thời gian
```

---

## 2. Chi Tiết Vai Trò Quản Trị Viên (Admin - `admin`)

### 2.1. Phạm vi ứng dụng
- **Nền tảng sử dụng**: **Duy nhất Admin Web Dashboard** (Giao diện desktop màn hình lớn).
- **Không sử dụng Mobile App**: Admin không trực tiếp làm việc tại bờ ao, do đó không cần cài đặt Mobile App của người nuôi.

### 2.2. Danh mục chức năng trên Admin Web Dashboard

| Nhóm chức năng | Mô tả chi tiết | Các API sử dụng |
| --- | --- | --- |
| **1. Quản lý Tài khoản (User Management)** | - Xem danh sách toàn bộ tài khoản người dùng đã đăng ký trên hệ thống.<br>- Khóa (`isActive: false`) hoặc mở khóa tài khoản người dùng vi phạm.<br>- Thay đổi vai trò người dùng (`admin` $\leftrightarrow$ `farmer`).<br>- *Nguyên tắc an toàn*: Chặn Admin tự khóa hoặc tự hạ quyền của chính mình. | `GET /auth/users`<br>`PATCH /auth/users/:id/status`<br>`PATCH /auth/users/:id/role`<br>`GET /auth/admin-check` |
| **2. Quản lý Catalog Phần cứng (Hardware Catalog)** | - Khai báo thiết bị chuẩn mới vào kho hệ thống (`pond_id = null`).<br>- Cấu hình định danh phần cứng duy nhất (`deviceUid`) và phiên bản firmware chuẩn.<br>- Cập nhật thông số metadata phần cứng.<br>- Xóa thiết bị khỏi danh mục hệ thống. | `GET /devices` (Toàn bộ kho)<br>`POST /devices`<br>`PATCH /devices/:id`<br>`DELETE /devices/:id` |
| **3. Giám sát & Báo cáo Cấp hệ thống** | - **Tổng quan nền tảng**: Thống kê số user, farm, ao active/maintenance, tỷ lệ thiết bị online/offline, thống kê cảnh báo.<br>- **Báo cáo vận hành**: Xem 10 cảnh báo nguy cấp gần nhất và danh sách thiết bị offline > 5 phút.<br>- **Báo cáo FCR toàn hệ thống**: Đánh giá FCR từng vụ nuôi, tính FCR trung bình toàn hệ thống và xếp loại chất lượng (*Xuất sắc / Tốt / Cần tối ưu*). | `GET /admin/overview`<br>`GET /admin/reports/operational`<br>`GET /admin/reports/fcr` |
| **4. Giám sát Cơ sở nuôi (Read-Only)** | - Xem danh sách trang trại và ao nuôi của toàn bộ hộ nuôi trong hệ thống phục vụ công tác thanh tra/hỗ trợ kỹ thuật.<br>- Xem chi tiết các vụ nuôi và số liệu FCR từng ao. | `GET /farms`<br>`GET /farms/:id`<br>`GET /farms/:farmId/ponds`<br>`GET /farms/:farmId/ponds/:id`<br>`GET /ponds/:pondId/crop-seasons` |
| **5. Quản lý Quy tắc An toàn Nước** | - Tạo mới, chỉnh sửa ngưỡng an toàn (DO, pH, Nhiệt độ, NH₃) áp dụng chuẩn cho toàn hệ thống.<br>- Bật / tắt các luật an toàn. | `GET /safety-rules`<br>`POST /safety-rules`<br>`PATCH /safety-rules/:id`<br>`DELETE /safety-rules/:id` |
| **6. Giám sát Cảnh báo Toàn hệ thống** | - Xem tất cả các cảnh báo sự cố từ mọi trang trại để nắm tình hình dịch bệnh/môi trường diện rộng. | `GET /alerts`<br>`GET /alerts/summary` |
| **7. Kiểm thử Thiết bị IoT qua MQTT** | - Kiểm tra trạng thái kết nối MQTT Broker.<br>- Phát lệnh test máy cho ăn trực tiếp qua MQTT tới thiết bị phần cứng. | `GET /mqtt/status`<br>`POST /mqtt/devices/:deviceUid/feeder-test` |

### 2.3. Ranh giới quyền hạn của Admin (Boundary Rules)
- ❌ **KHÔNG ĐƯỢC**: Tạo trang trại, tạo ao nuôi, sửa thông số diện tích ao nuôi của người nuôi.
- ❌ **KHÔNG ĐƯỢC**: Tạo lịch cho ăn, kích hoạt cữ ăn hay phát lệnh dừng khẩn cấp thiết bị của người nuôi.
- ❌ **KHÔNG ĐƯỢC**: Can thiệp vào vụ nuôi hay chỉnh sửa dữ liệu nhật ký của người nuôi.

---

## 3. Chi Tiết Vai Trò Người Nuôi (Farmer - `farmer`)

Người nuôi sở hữu toàn quyền đối với trang trại và ao nuôi của mình, được hỗ trợ bởi **2 ứng dụng bổ trợ lẫn nhau**:

### 3.1. Chức năng trên Farmer Mobile App (Hiện trường / Bờ ao)
> *Tập trung vào tính di động, thao tác 1 chạm, giám sát thời gian thực và xử lý sự cố khẩn cấp.*

| Nhóm chức năng | Thao tác trên Mobile App | API Backend tương ứng |
| --- | --- | --- |
| **1. Tiếp nhận Cảnh báo khẩn cấp** | - Nhận Push Notification qua Firebase/FCM khi DO < 3.5 mg/L hoặc camera phát hiện thức ăn thừa.<br>- Nút bấm 1 chạm: **"Đã tiếp nhận"** (`Acknowledge`) và **"Đã giải quyết"** (`Resolve`). | `GET /alerts/summary`<br>`PATCH /alerts/:id/acknowledge`<br>`PATCH /alerts/:id/resolve` |
| **2. Đồng hồ đo Môi trường Tức thời** | - Hiển thị 6 thẻ Gauge thời gian thực: pH, DO, Nhiệt độ, Độ mặn, NH₃, Độ đục.<br>- Đổi màu thẻ theo ngưỡng: Xanh (an toàn) / Vàng (chú ý) / Đỏ (nguy hiểm). | `GET /ponds/:pondId/telemetry/latest` |
| **3. Cường độ bắt mồi FIS & Ảnh Sàng** | - Xem mức độ bắt mồi tức thời của đàn tôm: Mức 0, 1, 2, 3.<br>- Xem tỷ lệ thức ăn còn dư trên sàng (%) và ảnh chụp camera mới nhất.<br>- Cảnh báo dữ liệu cũ (`isStale = true`) nếu mất tín hiệu camera > 120s. | `GET /camera/ponds/:pondId/latest-fis` |
| **4. Điều khiển Máy cho ăn tại bờ ao** | - **Nút Dừng khẩn cấp (Emergency Stop)**: Ngắt máy ăn tức thì khi có sự cố.<br>- **Cho ăn thủ công ngay (`manual feeding`)**: Nhập số kg thức ăn muốn xả, Backend tự động kiểm tra an toàn nước trước khi cho phép xả.<br>- Theo dõi tiến độ cữ ăn đang chạy (kg đã rải / kg yêu cầu). | `POST /devices/:id/emergency-stop`<br>`POST /ponds/:pondId/feeding-records`<br>`GET /ponds/:pondId/feeding-records` |
| **5. Gán & Quản lý thiết bị nhanh** | - Nhập/quét mã `deviceUid` để gán (`claim`) thiết bị vào ao nuôi.<br>- Hủy gán (`unassign`) thiết bị khi cần chuyển máy sang ao khác.<br>- Đổi chế độ máy ăn giữa Tự động (`automatic`) và Thủ công (`manual`). | `POST /devices/claim`<br>`POST /devices/:id/unassign`<br>`PATCH /devices/:id` |
| **6. Xem tổng quan tiến độ vụ nuôi** | - Xem nhanh số ngày nuôi ($DOC$), số lượng tôm ước tính, hệ số $FCR$ hiện tại. | `GET /crop-seasons/:id/statistics` |

---

### 3.2. Chức năng trên Farmer Web Portal (Văn phòng / Phân tích sâu)
> *Tập trung vào màn hình lớn, trực quan hóa biểu đồ chuỗi thời gian, cấu hình hệ thống chi tiết và phân tích vụ nuôi.*

| Nhóm chức năng | Thao tác trên Web Portal | API Backend tương ứng |
| --- | --- | --- |
| **1. Quản lý Cơ sở nuôi (Farms & Ponds)** | - Khởi tạo, cập nhật, xóa mềm các Trang trại (`farms`).<br>- Khởi tạo, cấu hình diện tích ($m^2$), mã ao `code`, tên ao nuôi (`ponds`).<br>- Xem danh sách thiết bị IoT đã gán vào từng ao. | `GET /farms`, `POST /farms`<br>`PATCH /farms/:id`, `DELETE /farms/:id`<br>`GET /farms/:farmId/ponds`, `POST /farms/:farmId/ponds`<br>`PATCH /farms/:farmId/ponds/:id`, `DELETE /farms/:farmId/ponds/:id` |
| **2. Quản lý Vụ nuôi & Báo cáo FCR chuyên sâu** | - Tạo vụ nuôi mới (`crop-seasons`): ngày thả, mật độ con/$m^2$, tỷ lệ sống ước tính.<br>- Xem báo cáo FCR toàn diện: đối soát tổng thức ăn đã tiêu thụ vs sinh khối tăng thêm.<br>- Đóng vụ nuôi (`completed`) để lưu trữ lịch sử so sánh hiệu quả qua các vụ. | `GET /ponds/:pondId/crop-seasons`<br>`POST /ponds/:pondId/crop-seasons`<br>`GET /crop-seasons/:id/statistics`<br>`PATCH /crop-seasons/:id`, `DELETE /crop-seasons/:id` |
| **3. Cấu hình Lịch cho ăn theo tuần** | - Cài đặt chi tiết các cữ ăn trong ngày (cữ sáng 07:30, trưa 11:30, chiều 16:30).<br>- Định mức thức ăn ($kg$), tốc độ rải ($kg/phút$) và các ngày áp dụng trong tuần (`Thứ 2` - `Chủ Nhật`).<br>- Xem toàn bộ bảng nhật ký cữ ăn lịch sử. | `GET /ponds/:pondId/feeding-schedules`<br>`POST /ponds/:pondId/feeding-schedules`<br>`PATCH /feeding-schedules/:id`, `DELETE /feeding-schedules/:id`<br>`GET /ponds/:pondId/feeding-records` |
| **4. Phân tích Đồ thị Chuỗi thời gian** | - Đồ thị chất lượng nước 24h, 7 ngày, 30 ngày (pH, DO, nhiệt độ, độ mặn...).<br>- Đồ thị chuỗi thời gian chỉ số FIS (cường độ bắt mồi) theo chu kỳ sinh trưởng của tôm.<br>- Lịch sử các đề xuất tối ưu cữ ăn từ mô hình AI. | `GET /ponds/:pondId/telemetry/history`<br>`GET /camera/ponds/:pondId/fis-history`<br>`GET /ponds/:pondId/ai/recommendations` |
| **5. Cấu hình Thị giác máy tính AI (Camera)** | - **Cấu hình vùng ROI cố định**: Kéo thả tọa độ hộp chữ nhật / đa giác ($x, y, width, height, polygon$) bao quanh sàng ăn trên khung hình camera.<br>- **Tinh chỉnh trọng số FIS**: Cài đặt bộ trọng số $w_1 - w_4$ và ngưỡng phân vị $q_{25}, q_{50}, q_{75}$ theo độ đục nước ao. | `PATCH /camera/devices/:deviceId/roi`<br>`PATCH /camera/ponds/:pondId/weights`<br>`GET /camera/ponds/:pondId/devices` |
| **6. Thử nghiệm Đánh giá An toàn (Safety Preview)** | - Giao diện thử nghiệm nhập khối lượng thức ăn dự kiến $\rightarrow$ Xem trước quyết định của hệ thống (`ALLOWED` / `ADJUSTED` / `BLOCKED`) và luật an toàn vi phạm. | `POST /ponds/:pondId/safety-rules/evaluate`<br>`GET /safety-rules` |
| **7. Quản lý Lịch sử Sự cố** | - Xem bảng tổng hợp cảnh báo, lọc theo trạng thái (`open`, `acknowledged`, `resolved`) và mức độ nghiêm trọng. | `GET /alerts`, `GET /ponds/:pondId/alerts` |

---

## 4. Ma Trận Phân Quyền Chi Tiết (RBAC Matrix)

Ký hiệu:
- **`CRUD`**: Toàn quyền (Tạo, Đọc, Sửa, Xóa)
- **`R`**: Chỉ đọc (Read-Only)
- **`C/U`**: Chỉ tạo hoặc cập nhật
- **`✕`**: Không có quyền truy cập (`403 Forbidden`)

| Phân hệ / Chức năng | Admin Web Dashboard | Farmer Web Portal | Farmer Mobile App |
| --- | :---: | :---: | :---: |
| **Đăng ký tài khoản (`/auth/register`)** | ✕ | ✅ Public | ✅ Public |
| **Đăng nhập (`/auth/login`)** | ✅ Role `admin` | ✅ Role `farmer` | ✅ Role `farmer` |
| **Khôi phục mật khẩu OTP (`/auth/*-otp`)** | ✕ | ✅ Có | ✅ Có |
| **Cập nhật hồ sơ cá nhân (`/auth/profile`)** | ✅ Có | ✅ Có | ✅ Có |
| **Xác thực quyền Admin (`/auth/admin-check`)** | ✅ Hợp lệ | ✕ Chặn (`403`) | ✕ Chặn (`403`) |
| **Xác thực quyền Farmer (`/auth/farmer-check`)** | ✕ Chặn (`403`) | ✅ Hợp lệ | ✅ Hợp lệ |
| **Quản lý tài khoản người dùng (`/auth/users`)** | **`CRUD` (Khóa/Role)** | ✕ | ✕ |
| **Báo cáo tổng quan hệ thống (`/admin/*`)** | **`R` (Báo cáo)** | ✕ | ✕ |
| **Quản lý Catalog Phần cứng (`/devices`)** | **`CRUD` (Toàn kho)** | `R` (Ao của mình) | `R` (Ao của mình) |
| **Gán / Gỡ thiết bị (`claim` / `unassign`)** | ✕ | **`C/U`** | **`C/U`** |
| **Dừng khẩn cấp máy ăn (`emergency-stop`)** | ✕ | ✅ Có | ✅ **Ưu tiên 1 chạm** |
| **Quản lý Trang trại (`/farms`)** | `R` (Giám sát) | **`CRUD` (Sở hữu)** | `R` (Xem danh sách) |
| **Quản lý Ao nuôi (`/farms/:farmId/ponds`)** | `R` (Giám sát) | **`CRUD` (Sở hữu)** | `R` (Xem danh sách) |
| **Quản lý Vụ nuôi (`/crop-seasons`)** | `R` (Đối soát FCR) | **`CRUD` (Sở hữu)** | `R` (Xem tiến độ) |
| **Cấu hình Lịch cho ăn (`/feeding-schedules`)**| ✕ | **`CRUD` (Theo tuần)**| `R` / Bật tắt nhanh |
| **Nhật ký cho ăn (`/feeding-records`)** | ✕ | **`R` / Xem bảng** | **`C` / Cho ăn nhanh** |
| **Xem Gauges đo chất lượng nước tức thời** | `R` | `R` | **`R` (Thẻ Gauges dọc)** |
| **Xem Đồ thị biến thiên nước theo ngày/tháng** | `R` | **`R` (Biểu đồ lớn)** | `R` (Biểu đồ tóm tắt) |
| **Xem trạng thái bắt mồi FIS & ảnh camera** | `R` | `R` | **`R` (Thẻ FIS trực quan)**|
| **Cấu hình vùng quan sát ROI cho camera** | ✕ | **`U` (Kéo thả Web)** | ✕ |
| **Tinh chỉnh trọng số FIS $w_1 - w_4$** | ✕ | **`U` (Web Slider)** | ✕ |
| **Xem Khuyến nghị cữ ăn từ AI** | ✕ | `R` | `R` |
| **Tiếp nhận & Giải quyết Cảnh báo (Alerts)** | `R` (Xem toàn cục) | **`U` (Danh sách)** | **`U` (Xử lý tức thời)** |
| **Quản lý Luật an toàn (`/safety-rules`)** | **`CRUD`** | `R` (Xem luật) | `R` (Xem luật) |
| **Thử nghiệm Đánh giá An toàn (`evaluate`)** | ✅ Có | **✅ Có (Công cụ Web)**| ⚠️ Preview trước ăn |
| **Kiểm thử MQTT Feeder (`/mqtt/*`)** | **`C` (Test lệnh)** | ✕ | ✕ |

---

## 5. Cơ Chế Bảo Mật & Kiểm Soát Đa Tầng Tại Backend

1. **Tầng Xác thực Token (`JwtAuthGuard`)**:
   - Mọi request yêu cầu xác thực phải gửi kèm Header `Authorization: Bearer <access_token>`.
   - Token chứa `sub (userId)`, `email`, và `role`.

2. **Tầng Phân quyền Vai trò (`RolesGuard`)**:
   - Sử dụng decorator `@Roles(UserRole.ADMIN, UserRole.FARMER)`.
   - Nếu Client cố tình gọi endpoint vượt quá quyền hạn (ví dụ Farmer gọi `/admin/overview` hoặc Admin gọi `POST /farms`), hệ thống lập tức ngắt kết nối với mã lỗi `403 Forbidden`.

3. **Tầng Phân lập Dữ liệu Đa hộ nuôi (`PondAccessService`)**:
   - Người nuôi A tuyệt đối **không thể đọc, sửa hay điều khiển** ao nuôi, thiết bị, camera hay lịch ăn của người nuôi B.
   - Khi nhận `pondId`, `PondAccessService` tự động đối soát:
     ```typescript
     if (pond.farm.ownerId !== user.id) {
       throw new ForbiddenException('Bạn không có quyền truy cập Pond này');
     }
     ```
   - Với `admin`, service cho phép đọc (`read-only`) phục vụ công tác thanh tra mà không vi phạm quyền can thiệp.

4. **Tầng Khóa An Toàn Nghiệp Vụ (`SafetyRuleEngineService`)**:
   - Bất kể lệnh cho ăn được kích hoạt từ Mobile App hay Web Portal, Backend đều tự động kích hoạt bộ đánh giá an toàn. Nếu các chỉ số môi trường vượt ngưỡng nguy hiểm (DO < 3.5 mg/L), hệ thống **tự động chặn lệnh MQTT** gửi đến máy cho ăn và tạo bản ghi cảnh báo `CRITICAL`.
