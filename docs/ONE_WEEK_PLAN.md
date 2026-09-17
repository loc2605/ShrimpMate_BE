# Kế hoạch công việc ShrimpMate trong 1 tuần

## 1. Trạng thái hiện tại

Các phần đã có:

- [x] Đăng ký tài khoản `POST /auth/register`.
- [x] Đăng nhập tài khoản `POST /auth/login`.
- [x] JWT authentication.
- [x] Phân quyền theo role: `admin`, `manager`, `operator`.
- [x] Tạo, xem danh sách, xem chi tiết, cập nhật và xóa mềm Farm.
- [x] Tạo, xem danh sách, xem chi tiết, cập nhật và xóa mềm Pond.
- [x] Tạo, xem, cập nhật và xóa Crop Season.
- [x] Database migration và các entity chính.
- [x] Seed dữ liệu Farm, Pond, Crop Season và tài khoản mẫu.
- [x] Tài liệu API và database schema.

Các phần cần tiếp tục:

- [x] Hoàn thiện quản lý Device.
- [x] Hoàn thiện Feeding Schedule và Feeding Record.
- [ ] Hoàn thiện Telemetry Reading.
- [ ] Hoàn thiện Alert và Safety Rule.
- [ ] Kết nối MQTT.
- [ ] Bổ sung test cho các chức năng chính.
- [ ] AI và tài liệu sẽ thực hiện sau khi backend cốt lõi ổn định.

## 2. Kế hoạch theo từng ngày

### Ngày 1 - Ổn định nền tảng và xác nhận chức năng hiện có

- [ ] Kiểm tra biến môi trường: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`.
- [ ] Chạy migration trên database local.
- [ ] Khởi động backend và kiểm tra seed dữ liệu.
- [ ] Test đăng ký tài khoản operator.
- [ ] Test đăng nhập bằng tài khoản `admin`, `manager` và `operator`.
- [ ] Test `GET /auth/me`.
- [x] Có refresh token để làm mới access token.
- [x] Có API đổi mật khẩu `PATCH /auth/change-password`.
- [x] Admin có thể khóa/mở khóa tài khoản.
- [x] Cảnh báo khi production dùng mật khẩu seed mặc định.
- [ ] Test `GET /auth/admin-check` với đúng và sai role.
- [ ] Kiểm tra các response lỗi: `400`, `401`, `403`, `404`, `409`.
- [ ] Sửa lỗi cấu hình NestJS Observe nếu tiếp tục sử dụng monitoring.

Kết quả cần đạt: đăng ký, đăng nhập và JWT hoạt động ổn định; role chặn đúng quyền.

### Ngày 2 - Hoàn thiện Farm, Pond và Crop Season

- [ ] Test đầy đủ CRUD Farm bằng Postman.
- [ ] Test đầy đủ CRUD Pond theo từng Farm.
- [ ] Kiểm tra không cho trùng mã Pond trong cùng một Farm.
- [x] Kiểm tra xóa mềm Farm đồng thời xóa mềm các Pond liên quan.
- [ ] Test CRUD Crop Season.
- [ ] Kiểm tra mỗi Pond chỉ có một Crop Season ở trạng thái `active`.
- [ ] Bổ sung kiểm tra dữ liệu đầu vào và thông báo lỗi rõ ràng.
- [ ] Xác định có cần thêm quan hệ người dùng với Farm hay không.
- [x] Thêm phân trang `page`, `limit` cho danh sách Farm và Pond.
- [x] Validate tên không rỗng và `areaM2 > 0`.

Kết quả cần đạt: hoàn chỉnh phần quản lý trang trại, ao và vụ nuôi để demo được.

### Ngày 3 - Hoàn thiện Device Management

- [x] Tạo DTO cho Device.
- [ ] Tạo các endpoint:
  - `POST /devices`
  - `GET /devices`
  - `GET /devices/:id`
  - `PATCH /devices/:id`
  - `DELETE /devices/:id`
- [x] Cho phép gán hoặc bỏ gán Device vào Pond.
- [x] Kiểm tra `device_uid` không bị trùng.
- [x] Xử lý các enum `type`, `status`, `mode`.
- [x] Phân quyền Device theo role.
- [x] Bổ sung seed một số Device mẫu.

Kết quả cần đạt: quản lý được sensor, feeder, camera và gateway.

### Ngày 4 - Hoàn thiện Feeding

- [x] Tạo DTO cho Feeding Schedule.
- [x] Tạo CRUD Feeding Schedule theo Pond.
- [x] Kiểm tra giờ cho ăn, khối lượng thức ăn và ngày trong tuần.
- [x] Tạo API tạo và xem Feeding Record.
- [x] Liên kết Feeding Record với Pond, Device và Schedule.
- [x] Hỗ trợ các nguồn cho ăn: `schedule`, `manual`, `ai`.
- [x] Xử lý trạng thái: `requested`, `running`, `completed`, `stopped`, `failed`.
- [x] Phân quyền: operator chỉ xem, manager tạo/cập nhật, admin xóa hoặc quản trị.

Kết quả cần đạt: tạo được lịch cho ăn và lưu lịch sử các lần cho ăn.

### Ngày 5 - Telemetry và Alert

- [ ] Tạo API nhận dữ liệu cảm biến.
- [ ] Tạo API xem telemetry theo Pond, Device và khoảng thời gian.
- [ ] Kiểm tra các giá trị pH, oxygen, temperature, salinity, ammonia và turbidity.
- [ ] Sử dụng index theo `(pond_id, measured_at)` và `(device_id, measured_at)`.
- [ ] Tạo service phát hiện dữ liệu vượt ngưỡng.
- [ ] Tạo CRUD hoặc API xử lý Alert.
- [ ] Hỗ trợ trạng thái Alert: `open`, `acknowledged`, `resolved`.
- [ ] Liên kết Alert với Pond và Device.

Kết quả cần đạt: nhận được dữ liệu cảm biến và sinh cảnh báo cơ bản.

### Ngày 6 - MQTT và Safety Rule

- [ ] Cấu hình MQTT broker local.
- [ ] Kết nối backend với MQTT broker.
- [ ] Thiết kế topic cho telemetry và command feeder.
- [ ] Nhận telemetry từ MQTT và lưu vào `telemetry_readings`.
- [ ] Gửi command điều khiển feeder qua MQTT.
- [ ] Hoàn thiện bảng và service `safety_rules`.
- [ ] Kiểm tra command trước khi gửi xuống Device.

Kết quả cần đạt: có luồng thử nghiệm từ thiết bị -> MQTT -> backend -> database và kiểm tra an toàn trước khi điều khiển. Phần AI chưa làm trong giai đoạn này.

### Ngày 7 - Kiểm thử, tài liệu và demo

- [ ] Viết unit test cho AuthService.
- [ ] Viết test cho RolesGuard và JwtStrategy.
- [ ] Viết test cho Farm/Pond/CropSeason service.
- [ ] Viết e2e test cho các luồng chính.
- [ ] Chạy `npm run build`.
- [ ] Chạy `npm run lint`.
- [ ] Sửa lỗi cấu hình Jest để test chạy được với NestJS hiện tại.
- [ ] Chuẩn bị dữ liệu và kịch bản demo.

Kết quả cần đạt: project build được, lint pass, các API chính có test và có thể trình diễn end-to-end. Tài liệu chi tiết sẽ cập nhật sau.

### Công việc để sau

- [ ] Tích hợp AI Recommendation và AI Engine.
- [ ] Cập nhật đầy đủ `docs/API.md` và `docs/DATABASE.md`.
- [ ] Tạo Postman collection hoàn chỉnh.
- [ ] Viết hướng dẫn triển khai production.

## 3. Thứ tự ưu tiên nếu không đủ thời gian

1. Đăng nhập, đăng ký và phân quyền.
2. CRUD Farm, Pond và Crop Season.
3. CRUD Device.
4. Feeding Schedule và Feeding Record.
5. Telemetry và Alert.
6. MQTT.
7. Dashboard, notification và các tính năng mở rộng.

## 4. Luồng demo đề xuất

1. Đăng nhập bằng tài khoản `admin`.
2. Tạo một Farm.
3. Tạo một Pond thuộc Farm.
4. Tạo một Crop Season cho Pond.
5. Tạo một Device và gán vào Pond.
6. Tạo lịch cho ăn.
7. Gửi một bản ghi telemetry giả lập.
8. Kiểm tra Alert nếu dữ liệu vượt ngưỡng.
9. Tạo Feeding Record.
10. Kiểm tra dữ liệu bằng các API xem danh sách và chi tiết.

## 5. Tiêu chí hoàn thành cuối tuần

- Auth hoạt động với cả ba role.
- CRUD Farm, Pond và Crop Season hoạt động đúng.
- Device có thể tạo, cập nhật, gán vào Pond và xem trạng thái.
- Có lịch cho ăn và lịch sử cho ăn.
- Có thể lưu và truy vấn telemetry.
- Có Alert cơ bản từ dữ liệu vượt ngưỡng.
- Có ít nhất một luồng MQTT thử nghiệm hoặc mock rõ ràng.
- Build và lint chạy thành công.
- Phần AI và tài liệu chi tiết chưa nằm trong phạm vi giai đoạn đầu.