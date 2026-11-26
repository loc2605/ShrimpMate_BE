# KỊCH BẢN TEST THỰC TẾ CHO ĂN BẰNG POSTMAN

Tài liệu này hướng dẫn kiểm tra các API cho ăn của ShrimpMate theo đúng contract hiện tại của backend. Thực hiện lần lượt: đăng nhập → chọn ao → kiểm tra vụ nuôi/thiết bị → ghi telemetry → dự báo AI → cho ăn thường → kiểm tra safety chặn → lịch tự động → E-Stop.

> **Cẩn trọng khi test thiết bị thật:** `POST /feeding-records` và lịch tự động có thể phát lệnh FEED xuống máy. Chỉ chạy khi đã kiểm tra khu vực, lượng thức ăn, nguồn điện và trạng thái ao. E-Stop gửi MQTT STOP nhưng HTTP không đợi thiết bị xác nhận đã dừng.

## 1. Chuẩn bị môi trường

### 1.1 Bật các dịch vụ

Backend mặc định kết nối:

- PostgreSQL: `DATABASE_URL` trong `.env` (mặc định mẫu dùng `localhost:5432`).
- Redis: `localhost:6379`. Cần cho BullMQ; nếu Redis không sẵn sàng, backend có fallback trong bộ nhớ cho lịch.
- Mosquitto: `mqtt://localhost:1883`.
- AI service: `http://localhost:8000`.

Bạn đã có Mosquitto/Docker và project mô phỏng IoT riêng. Hãy bật container trong Docker Desktop (hoặc dùng `docker start <tên-container>` nếu container đã tồn tại), bảo đảm port được publish ra máy host. Nếu tên container đúng là `redis` và `mosquitto`, có thể dùng:

```powershell
docker start redis
docker start mosquitto
```

Sau đó chạy simulator PlatformIO/Wokwi và AI service theo cấu hình của project tương ứng. Khởi động backend:

```powershell
cd D:\KLTN\shrimpmate-backend
npm run start:dev
```

Đợi backend kết nối PostgreSQL và chạy migration trước khi gửi request. Trong môi trường không phải production, backend tự chạy seed khi khởi động; seed chỉ tạo một số dữ liệu nếu bảng tương ứng còn trống.

Trong Postman gọi `GET {{baseUrl}}/mqtt/status`. Chỉ tiếp tục test thiết bị thật khi response có `"connected": true`. Redis không bắt buộc cho quick-feed, nhưng nên bật khi kiểm tra lịch. AI service phải báo XGBoost sẵn sàng nếu muốn xác nhận dự báo dùng model, thay vì fallback.

### 1.2 Tạo Postman Environment

Tạo Environment `ShrimpMate Local`, thêm các biến:

| Variable | Giá trị ban đầu |
|---|---|
| `baseUrl` | `http://localhost:3000` |
| `managerEmail` | `manager@shrimpmate.local` |
| `managerPassword` | `Manager@123456` |
| `farmerEmail` | `farmer@shrimpmate.local` |
| `farmerPassword` | `Farmer@123456` |
| `managerToken` | để trống |
| `farmerToken` | để trống |
| `farmId` | để trống |
| `pondId` | để trống |
| `deviceId` | để trống |
| `deviceUid` | để trống |
| `seasonId` | để trống |
| `recordId` | để trống |
| `scheduleId` | để trống |

Seed password có thể bị override bởi biến `SEED_*` trong `.env`. Nếu vậy, điền đúng thông tin đang cấu hình tại máy của bạn. Chỉ dùng password mặc định khi chúng chưa bị đổi.

Trong Collection, đặt Authorization mặc định là **Bearer Token** và nhập `{{managerToken}}`. Với các request thực hiện dưới vai trò farmer, đổi token thành `{{farmerToken}}`. Login không cần token.

## 2. Kiểm tra kết nối và đăng nhập

### 2.1 MQTT broker

**Request:** `GET {{baseUrl}}/mqtt/status`

Không cần Authorization. Kỳ vọng:

```json
{
  "connected": true,
  "message": "Đã kết nối tới MQTT Broker"
}
```

Nếu `connected` là `false`, chưa test FEED/E-Stop; kiểm tra broker, port `1883` và `MQTT_BROKER_URL` trong `.env`.

### 2.2 Đăng nhập Manager

**Request:** `POST {{baseUrl}}/auth/login`  
Body → raw → JSON:

```json
{
  "identifier": "{{managerEmail}}",
  "password": "{{managerPassword}}"
}
```

Trong tab **Tests** lưu token:

```javascript
pm.test("Đăng nhập Manager thành công", () => {
  pm.response.to.have.status(200);
});

const body = pm.response.json();
pm.environment.set("managerToken", body.accessToken);
pm.expect(body.accessToken).to.be.a("string");
```

### 2.3 Đăng nhập Farmer

**Request:** `POST {{baseUrl}}/auth/login`  
Body:

```json
{
  "identifier": "{{farmerEmail}}",
  "password": "{{farmerPassword}}"
}
```

Dùng Tests tương tự, đổi tên test và lưu `body.accessToken` vào `farmerToken`.

## 3. Tìm farm, ao, vụ nuôi và feeder

Các request discovery bên dưới dùng Manager. Dùng ID lấy từ response, không nhập ID ví dụ từ tài liệu khác.

### 3.1 Lấy farm

**Request:** `GET {{baseUrl}}/farms?page=1&limit=100`

Response có dạng `{ "data": [...], "meta": {...} }`. Có thể chọn farm `Trang trại Sóng Xanh`; nếu DB khác seed, chọn farm mà Manager sở hữu. Tests có thể tự lưu:

```javascript
const body = pm.response.json();
const farms = body.data || [];
const farm = farms.find((item) => item.name === "Trang trại Sóng Xanh") || farms[0];

pm.test("Có farm để test", () => {
  pm.expect(farm, "farm").to.exist;
});

if (farm) pm.environment.set("farmId", farm.id);
```

### 3.2 Lấy ao trong farm

**Request:** `GET {{baseUrl}}/farms/{{farmId}}/ponds?page=1&limit=100`

Chọn `POND-01` nếu có; nếu không, chọn ao đang dùng để test. Tests:

```javascript
const body = pm.response.json();
const ponds = body.data || [];
const pond = ponds.find((item) => item.code === "POND-01") || ponds[0];

pm.test("Có ao để test", () => {
  pm.expect(pond, "pond").to.exist;
});

if (pond) pm.environment.set("pondId", pond.id);
```

### 3.3 Kiểm tra vụ nuôi ACTIVE

**Request:** `GET {{baseUrl}}/ponds/{{pondId}}/crop-seasons`

Response là mảng vụ nuôi. Nếu có phần tử `status: "active"`, dùng vụ đó. Nếu chưa có, Manager tạo một vụ:

**Request:** `POST {{baseUrl}}/ponds/{{pondId}}/crop-seasons`

Trong tab **Pre-request Script** của request này, tạo ngày hôm nay theo định dạng `YYYY-MM-DD`:

```javascript
pm.environment.set("stockingDate", new Date().toISOString().slice(0, 10));
```

```json
{
  "name": "Postman test - vụ đang hoạt động",
  "stockingDate": "{{stockingDate}}",
  "initialCount": 100000,
  "stockingDensity": 31.25,
  "initialAverageWeightG": 0.8,
  "estimatedSurvivalRate": 85,
  "status": "active"
}
```

Lưu `id` từ response vào `seasonId`. Không tạo thêm vụ ACTIVE nếu ao đã có vụ đang hoạt động.

### 3.4 Tìm feeder và xác nhận UID

**Request:** `GET {{baseUrl}}/devices`

Response là mảng thiết bị. Chọn feeder có `pondId` bằng `{{pondId}}`; lưu `id` thành `deviceId`, `deviceUid` thành `deviceUid`. Backend seed thường dùng UID `DEV-FEEDER-001`, nhưng luôn ưu tiên giá trị trả về từ API.

Kiểm tra thiết bị:

**Request:** `GET {{baseUrl}}/devices/{{deviceId}}`

Trước khi test feeder thật, xác nhận `type: "feeder"`, `status: "online"`, `mode` không phải `"emergency_stop"` và simulator dùng đúng `deviceUid`. Thiết bị được đánh offline khi không có heartbeat quá thời gian cấu hình (mặc định 15 phút).

> `POST /devices/{{deviceId}}/heartbeat` có thể cập nhật trạng thái trong DB để test API, nhưng **không chứng minh feeder thật đang kết nối**. Không dùng cách này để kết luận closed-loop IoT hoạt động.

## 4. Gửi telemetry và kiểm tra safety

### 4.1 Gửi mẫu nước tốt

**Request:** `POST {{baseUrl}}/ponds/{{pondId}}/telemetry`

```json
{
  "ph": 7.8,
  "dissolvedOxygenMgL": 5.8,
  "temperatureC": 29.5,
  "salinityPpt": 15,
  "ammoniaMgL": 0.008,
  "turbidityNtu": 25,
  "measuredAt": "{{$isoTimestamp}}",
  "isBuffered": false,
  "rawData": {
    "rainMm": 0,
    "waterChangeM3": 0
  }
}
```

Kỳ vọng HTTP `201`. Sau đó gọi:

`GET {{baseUrl}}/ponds/{{pondId}}/telemetry/latest`

Xác nhận các chỉ số và `measuredAt` vừa gửi. Khi đánh giá cho ăn, backend chặn nếu không có telemetry hoặc bản đo mới nhất cũ hơn 30 phút.

Tests tùy chọn:

```javascript
pm.test("Telemetry được ghi nhận", () => {
  pm.response.to.have.status(201);
  pm.expect(pm.response.json()).to.have.property("measuredAt");
});
```

### 4.2 Gửi mẫu nước xấu để thử cảnh báo

**Request:** `POST {{baseUrl}}/ponds/{{pondId}}/telemetry`

```json
{
  "ph": 6.1,
  "dissolvedOxygenMgL": 2.8,
  "temperatureC": 29.5,
  "salinityPpt": 15,
  "ammoniaMgL": 0.025,
  "turbidityNtu": 25,
  "measuredAt": "{{$isoTimestamp}}",
  "isBuffered": false
}
```

Kỳ vọng HTTP `201`; response telemetry có `violationsCount` và `violations`. Với ngưỡng mặc định, DO `2.8` và pH `6.1` là các chỉ số nguy cấp. Ammonia `0.025` chưa vượt ngưỡng cảnh báo mặc định `0.1` hay rule chặn `0.3`; đừng kỳ vọng nó tạo thêm vi phạm.

Tests tùy chọn:

```javascript
pm.test("Telemetry xấu được ghi và có kết quả kiểm tra ngưỡng", () => {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body).to.have.property("violationsCount");
  pm.expect(body.violations).to.be.an("array");
});
```

Để xem alert:

- `GET {{baseUrl}}/ponds/{{pondId}}/alerts?limit=20&page=1`
- `GET {{baseUrl}}/alerts/summary?pondId={{pondId}}`

Summary trả về trực tiếp `total`, `open`, `acknowledged`, `resolved`, `bySeverity` (gồm `critical`, `warning`, `monitoring`). Số alert có thể thay đổi theo dữ liệu trước đó và cooldown; không dùng tổng số cố định làm tiêu chí test.

## 5. Kiểm tra AI dự báo lượng thức ăn

### 5.1 Xác nhận AI service

**Request:** `GET {{baseUrl}}/admin/ai-service-status`

Dùng Manager token. Nếu bị `403`, thử Admin token. Muốn xác nhận dùng model XGBoost, kiểm tra trạng thái `ONLINE`, mode `AI_XGBOOST` và `modelsLoaded.xgboost: true`. Nếu trạng thái degraded/offline, request dự báo vẫn có thể trả kết quả heuristic fallback.

### 5.2 Dự báo từ dữ liệu backend

**Request:** `POST {{baseUrl}}/ponds/{{pondId}}/ai/predict-feed`  
Body:

```json
{}
```

Kỳ vọng HTTP `201` và response trực tiếp có các field như `recommendationId`, `predictedFeedAmountKg`, `safeAllowedAmountKg`, `safetyDecision`, `featureBreakdown`, `featureImportance`, `featureContributions`, `modelName`, `modelVersion`. Không kỳ vọng wrapper `success/data`, `confidence`, hay các chỉ số MAE/R² cố định.

Tests tùy chọn:

```javascript
pm.test("Có kết quả dự báo", () => {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body.recommendationId).to.be.a("string");
  pm.expect(body.predictedFeedAmountKg).to.be.a("number");
  pm.expect(body).to.have.property("safetyDecision");
});
```

### 5.3 Dự báo với input override (tùy chọn)

Body là các field phẳng, không có `overrideInputs`:

```json
{
  "doc": 100,
  "avgWeightG": 10,
  "doMin": 5.8,
  "deltaTan": 0.05,
  "morningRainMm": 0,
  "prevFeedAmountKg": 6.5,
  "waterChangeM3": 0
}
```

## 6. Quick-feed thực tế

> Chỉ chạy nếu đã sẵn sàng cho máy phát thức ăn thật. Dùng lượng nhỏ để kiểm tra, ví dụ `0.1 kg`.

Đổi Authorization sang Farmer token, rồi gọi:

**Request:** `POST {{baseUrl}}/ponds/{{pondId}}/feeding-records`

```json
{
  "requestedAmountKg": 0.1,
  "source": "manual",
  "deviceId": "{{deviceId}}"
}
```

Kỳ vọng:

- Nếu safety cho phép, feeder online và MQTT publish thành công: HTTP `201`; response là feeding record, thường ở trạng thái `running`.
- Lưu `id` từ response vào `recordId`.
- Quick-feed không chờ ACK trước khi trả HTTP response. Simulator cần nhận lệnh và publish trạng thái để backend cập nhật record.
- Nếu safety chặn, API vẫn tạo record với `status: "stopped"`, `safetyDecision: "blocked"` và `actualAmountKg: 0`; đây không phải response HTTP `422`.
- Nếu thiết bị offline, broker mất kết nối hoặc publish lỗi, record có thể được lưu ở trạng thái `failed` trước khi API trả lỗi.

Tests cho happy path:

```javascript
pm.test("Quick-feed được chấp nhận và phát lệnh", () => {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body.id).to.be.a("string");
  pm.expect(body.safetyDecision).not.to.eql("blocked");
  pm.expect(body.status).to.eql("running");
  pm.environment.set("recordId", body.id);
});
```

Kiểm tra record:

`GET {{baseUrl}}/ponds/{{pondId}}/feeding-records`

Tìm `id == {{recordId}}`. Record có thể vẫn `running` cho đến khi simulator gửi trạng thái `completed`, `stopped` hoặc `failed` kèm đúng `recordId`.

Backend phát lệnh trên topic:

```text
shrimpmate/devices/{{deviceUid}}/feeder/command
```

Simulator gửi trạng thái về:

```text
shrimpmate/devices/{{deviceUid}}/feeder/status
```

Payload trạng thái cần có `recordId`, `deviceUid`, `status` (`running`, `completed`, `stopped`, `failed`) và `timestamp`. ACK riêng không làm quick-feed tự chuyển record sang `completed`.

## 7. Kiểm tra Safety chặn cho ăn

1. Gửi telemetry xấu ở mục 4.2 ngay trước khi test.
2. Gọi lại quick-feed với Farmer token:

```json
{
  "requestedAmountKg": 0.1,
  "source": "manual",
  "deviceId": "{{deviceId}}"
}
```

Kỳ vọng HTTP `201`, record `status: "stopped"`, `safetyDecision: "blocked"`, `actualAmountKg: 0`; không gửi lệnh FEED xuống MQTT. Có thể kiểm tra alert `FEEDING_SAFETY_BLOCKED` trong danh sách alert của ao.

Tests cho kết quả bị chặn:

```javascript
pm.test("Safety chặn quick-feed", () => {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body.status).to.eql("stopped");
  pm.expect(body.safetyDecision).to.eql("blocked");
  pm.expect(Number(body.actualAmountKg)).to.eql(0);
});
```

Sau bài test, **gửi lại telemetry tốt ở mục 4.1** và gọi `GET .../telemetry/latest` trước khi tiếp tục. Safety Engine lấy bản đo mới nhất theo `measuredAt`.

## 8. Kiểm tra lịch cho ăn tự động (tùy chọn)

Backend không có HTTP endpoint trigger lịch ngay lập tức. Scheduler quét mỗi phút; muốn test cần tạo lịch đến hạn trong tương lai. Lịch chỉ cho phép khung giờ từ `06:00` đến `19:30`, cần đúng ngày trong tuần, vụ nuôi ACTIVE, feeder online, telemetry mới và MQTT sẵn sàng.

Thời gian scheduler dùng giờ local của tiến trình backend. Nếu backend chạy trong container có timezone khác máy Postman, hãy tính theo timezone của container.

### 8.1 Tạo lịch đến hạn

Đặt `scheduleTime` thành một phút trong tương lai (nên cách hiện tại 2–3 phút) và `scheduleDay` thành ngày tương ứng (`0` Chủ nhật, `1` thứ Hai, … `6` thứ Bảy). Không dùng giờ nằm ngoài `06:00–19:30`.

**Request:** `POST {{baseUrl}}/ponds/{{pondId}}/feeding-schedules`  
Dùng Manager token:

```json
{
  "name": "Postman test schedule",
  "timeOfDay": "{{scheduleTime}}",
  "feedAmountKg": 0.1,
  "spreadRateKgPerMinute": 0.1,
  "daysOfWeek": [{{scheduleDay}}],
  "isEnabled": true
}
```

Lưu `id` response thành `scheduleId`. Có thể xem lịch bằng:

`GET {{baseUrl}}/ponds/{{pondId}}/feeding-schedules`

### 8.2 Chờ scheduler và kiểm tra record

Đợi qua phút đã đặt, sau đó gọi:

`GET {{baseUrl}}/ponds/{{pondId}}/feeding-records`

Tìm record có `scheduleId == {{scheduleId}}`. Khi job bắt đầu, trạng thái thường là `running`. Worker đợi ACK tối đa 20 giây và có retry; chỉ kỳ vọng `completed` khi simulator gửi trạng thái hoàn tất với `recordId`.

Sau test, tắt lịch để tránh chạy lại:

**Request:** `PATCH {{baseUrl}}/feeding-schedules/{{scheduleId}}`

```json
{
  "isEnabled": false
}
```

## 9. Kiểm tra Emergency Stop

Chỉ gửi khi muốn dừng feeder thật hoặc đang kiểm tra lệnh STOP. **Không cần body**:

**Request:** `POST {{baseUrl}}/devices/{{deviceId}}/emergency-stop`

Dùng Farmer hoặc Manager token. Kỳ vọng HTTP `201`; response là device đã lưu với `mode: "emergency_stop"`. Backend publish MQTT `STOP` tới:

Tests tùy chọn:

```javascript
pm.test("Backend đã lưu mode E-Stop", () => {
  pm.response.to.have.status(201);
  pm.expect(pm.response.json().mode).to.eql("emergency_stop");
});
```

```text
shrimpmate/devices/{{deviceUid}}/feeder/command
```

HTTP response không chứng minh thiết bị đã nhận/dừng: API không đợi ACK, không tự cập nhật feeding record đang chạy và không tạo alert E-Stop. Kiểm tra simulator hoặc phần cứng để xác nhận STOP thực tế.

Sau khi xác nhận máy đã dừng, khôi phục chế độ:

**Request:** `PATCH {{baseUrl}}/devices/{{deviceId}}`

```json
{
  "mode": "automatic"
}
```

Kiểm tra lại bằng `GET {{baseUrl}}/devices/{{deviceId}}`. Nếu không khôi phục mode, safety rule có thể chặn các lần cho ăn sau.

## 10. Checklist và xử lý lỗi

- `401`: login lại và cập nhật token trong Environment.
- `403`: Farmer có thể chưa được phân công ao; discovery/test quyền bằng Manager hoặc kiểm tra assignment.
- `400` có lỗi validation: kiểm tra tên field, enum và JSON; backend từ chối field không nằm trong DTO.
- Safety chặn: gửi telemetry tốt với `measuredAt` mới; kiểm tra ao có vụ ACTIVE.
- MQTT `connected: false`: kiểm tra Mosquitto/port `1883`/`MQTT_BROKER_URL`.
- Feeder offline: kiểm tra heartbeat thực từ simulator; không xem API heartbeat giả lập là bằng chứng thiết bị thật online.
- AI fallback: gọi `GET /admin/ai-service-status`; kiểm tra AI service, URL và model đã load.
- Không có lịch chạy: kiểm tra `isEnabled`, `daysOfWeek`, timezone của backend, giờ `06:00–19:30`, Redis/worker và log scheduler.
- Record mãi `running`: xác nhận simulator publish feeder status có đúng `recordId` trên topic tương ứng.

## 11. Những điều không nên kết luận chỉ từ Postman

- HTTP `201` của quick-feed chỉ xác nhận backend tạo record và publish command thành công; không tự chứng minh máy đã rải thức ăn.
- HTTP `201` của E-Stop chỉ xác nhận backend lưu mode và gửi lệnh khi broker sẵn sàng; không đo latency dừng và không xác nhận ACK phần cứng.
- Response dự báo không tự chứng minh model XGBoost đang chạy. Xác nhận qua `/admin/ai-service-status`; số liệu R²/MAE/MAPE phải lấy từ kết quả đánh giá model riêng.
- Các rule an toàn đang chạy là rule trong DB/backend hiện tại; không gọi chúng là bộ QCVN nếu chưa đối chiếu tài liệu tiêu chuẩn và cấu hình triển khai.