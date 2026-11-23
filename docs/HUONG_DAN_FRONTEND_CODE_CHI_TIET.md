# CẨM NANG HƯỚNG DẪN LẬP TRÌNH FRONTEND (WEB & MOBILE) CHI TIẾT NHẤT
## Dự án: Hệ sinh thái Quản lý & Cho Tôm Ăn Thông Minh - ShrimpMate
**Dành cho lập trình viên:** Frontend Web (`ShrimpMate_Web`) & Mobile (`ShrimpMate_Mobile`)  
**Mục tiêu:** Cung cấp đầy đủ Contract API, hướng dẫn xóa bỏ các thành phần cũ (Camera / Nhá ăn / FIS), cấu trúc giao diện và code mẫu để FE ráp vào chạy ngay mà không cần đoán mò.

---

## 📌 QUY TẮC CỐT LÕI CẦN NẮM VỮNG TRƯỚC KHI CODE:
1. **KHÔNG CÒN CAMERA DƯỚI NƯỚC, NHÁ ĂN, ĐIỂM FIS, HAY MÔ HÌNH YOLO NỮA:**
   * Hệ thống thực tế **chỉ sử dụng Cảm biến đo nước (RS485 Modbus) + Máy phun cám ly tâm tự động (Feeder)**.
   * Tất cả giao diện hiển thị hình ảnh nhá ăn hay nút chấm điểm FIS Mức 0 - 3 cần được **xóa bỏ hoặc ẩn hoàn toàn**.
2. **ĐỐI TƯỢNG DUY NHẤT:** Tôm thẻ chân trắng (*Litopenaeus vannamei*) nuôi thâm canh công nghệ cao.
3. **MÔ HÌNH AI CỐT LÕI:** XGBoost Regressor (7 đặc trưng) + TreeSHAP XAI (giải thích mức tăng/giảm kg cám).
4. **CHỐT CHẶN AN TOÀN:** Mọi lệnh cho ăn bắt buộc qua **Safety Rule Engine** (Nếu oxy $\text{DO} < 3.5\text{ mg/L}$ hoặc cảm biến mất kết nối $> 30$ phút $\rightarrow$ Backend trả mã HTTP 422 chặn ăn).

---

# PHẦN 1: HƯỚNG DẪN DỌN DẸP & SỬA CODE TRÊN `ShrimpMate_Web`

### 1.1. Các file cần XÓA BỎ trên Web:
1. `src/components/CameraFisView.jsx` (Xóa bỏ vì không còn camera dưới nước).
2. `src/services/cameraFisService.js` (Xóa bỏ vì backend không còn module camera).

### 1.2. Các file cần CHỈNH SỬA trên Web:

#### A. File `src/App.jsx`:
* **Tìm và xóa dòng import:**
  ```javascript
  // XÓA DÒNG NÀY:
  import { CameraFisView } from './components/CameraFisView';
  import { cameraFisService } from './services/cameraFisService';
  ```
* **Trong hàm `getTabFromPath`:** Xóa case `camera-fis` và `acoustics`.
* **Trong `Routes`:** Xóa bỏ Route:
  ```jsx
  {/* XÓA BỎ ROUTE NÀY: */}
  <Route path="/camera-fis" element={<CameraFisView ... />} />
  <Route path="/acoustics" element={<CameraFisView ... />} />
  ```

#### B. File `src/constants/navigation.js` & `src/components/Sidebar.jsx`:
* Xóa mục menu:
  ```javascript
  // XÓA MỤC NÀY KHỎI SIDEBAR:
  { id: 'camera-fis', label: 'Camera Sàng ăn FIS', icon: Camera, path: '/camera-fis' }
  ```
* Danh mục Sidebar chuẩn chỉ còn 6 mục cho Manager:
  1. `overview` (Tổng quan SCADA - `/`)
  2. `ponds` (Quản lý Ao & Vụ nuôi - `/ponds`)
  3. `feeder` (Điều khiển Máy cho ăn - `/feeder`)
  4. `schedule` (Lịch cho ăn & AI - `/schedule`)
  5. `farmers` (Quản lý & Phân công Nhân viên - `/farmers`)
  6. `logs` (Nhật ký Cảnh báo & SCADA - `/logs`)

#### C. Màn hình Giám sát Nước trên Web:
* Tích hợp Lưới **6 Vòng tròn tiến độ SVG đo chất lượng nước** (đã có sẵn trong Dashboard) đặt ngay tại trang Tổng quan:
  * 1. **Oxy hòa tan (DO):** Đơn vị `mg/L` (An toàn: $\ge 4.0$, Cảnh báo: $3.5 - 4.0$, Nguy hiểm: $< 3.5$).
  * 2. **Độ pH:** (An toàn: $7.5 - 8.5$, Cảnh báo: $7.0 - 7.5$ hoặc $8.5 - 9.0$, Nguy hiểm: $< 7.0$ hoặc $> 9.0$).
  * 3. **Nhiệt độ nước:** Đơn vị `°C` (An toàn: $26 - 32^\circ\text{C}$, Nguy hiểm: $< 22^\circ\text{C}$ hoặc $> 34^\circ\text{C}$).
  * 4. **Độ mặn:** Đơn vị `ppt` ($10 - 25\text{ ppt}$).
  * 5. **Khí độc $\text{NH}_3$ (Ammonia):** Đơn vị `mg/L` (An toàn: $< 0.1$, Cảnh báo: $0.1 - 0.3$, Nguy hiểm: $> 0.3$).
  * 6. **Độ đục (Turbidity):** Đơn vị `NTU` ($20 - 40\text{ NTU}$).

---

# PHẦN 2: HƯỚNG DẪN DỌN DẸP & SỬA CODE TRÊN `ShrimpMate_Mobile`

### 2.1. File `src/app/(tabs)/quan-ly-ao.tsx` (Màn hình Giám Sát):
* **Hiện trạng cũ:** Màn hình này đang chứa khung camera nhá ăn giả lập (`Image`, `scanTray`, `isScanningTray`) và thanh chọn `FIS_LEVELS` (Mức 0 - Mức 3).
* **Cách sửa:**
  1. **Xóa bỏ hoàn toàn:**
     * Nút "Quét / Phân tích nhá ăn mới".
     * Khung hiển thị ảnh Camera sàng ăn.
     * Thang đánh giá 4 mức thèm ăn FIS.
  2. **Đổi tên màn hình & Tab thành:** **"Giám Sát Môi Trường Nước"**.
  3. **Tập trung toàn bộ giao diện vào Lưới 6 Thẻ Cảm Biến Nước thời gian thực:**
     * Render lưới 2 cột $\times$ 3 hàng cho 6 chỉ số: `DO`, `pH`, `Nhiệt độ`, `Độ mặn`, `Khí độc NH3`, `Độ đục`.
     * Tự động hiển thị Badge màu theo ngưỡng:
       * Xanh lá: `AN TOÀN`
       * Vàng cam: `CẦN CHÚ Ý`
       * Đỏ đậm: `NGUY HIỂM`
       * Xám: `Chưa có dữ liệu` (khi giá trị là null hoặc `--`).
     * Hiển thị thời điểm đo gần nhất: *"Cập nhật lúc: 08:30 (Cách đây 2 phút)"*.
     * **Cảnh báo mất tín hiệu:** Nếu dữ liệu đo cũ quá 30 phút, hiển thị dải banner màu vàng cảnh báo: *"⚠️ Dữ liệu trạm đo đã quá cũ (>30 phút). Vui lòng kiểm tra lại thiết bị ngoài ao!"*.

### 2.2. File `src/app/(tabs)/index.tsx` (Tab Lịch Cữ & Khuyến nghị AI):
* **Khối Khuyến nghị Khẩu phần AI:**
  * Hiển thị lượng cám dự báo: `predictedFeedAmountKg` (Ví dụ: **13.1 kg**).
  * Hiển thị chuỗi giải thích nông học: `explanation` (từ Backend trả về).
  * **Hiển thị danh sách Tag TreeSHAP (Đặc trưng tác động):**
    * Duyệt mảng `featureContributions`:
      * Nếu `impact === 'INCREASE'`: Hiển thị Pill nền xanh nhạt, chữ xanh: `+0.74 kg (Oxy hòa tan tốt)`.
      * Nếu `impact === 'DECREASE'`: Hiển thị Pill nền đỏ nhạt, chữ đỏ: `-0.42 kg (Mưa sáng sớm)`.
  * **2 Nút hành động:**
    * Nút 1: **"Áp dụng mức cám AI"** (Tự động điền giá trị này vào cữ ăn kế tiếp).
    * Nút 2: **"Giữ nguyên lịch hiện tại"**.

### 2.3. File `src/app/(tabs)/may-cho-an.tsx` (Tab Trạm Ăn):
* **Nút Dừng Khẩn Cấp (EMERGENCY STOP):**
  * Nút đỏ lớn toàn màn hình. Khi bấm, gọi ngay API:
    `POST /devices/:feederDeviceId/emergency-stop`.
  * Khi thành công, hiển thị Toast cảnh báo và cập nhật trạng thái máy thành `DỪNG KHẨN CẤP`.
* **Xử lý khi Cho Ăn Nhanh / Rải Cám Thủ Công bị Safety Rule chặn (HTTP 422):**
  * Khi bấm "Rải ngay", nếu backend trả về mã lỗi `422 Unprocessable Entity` hoặc response có `safetyDecision === 'blocked'`:
    * Không bật motor.
    * Hiển thị Modal Popup màu đỏ:
      * **Tiêu đề:** *"LỆNH CHO ĂN BỊ KHÓA AN TOÀN"*
      * **Lý do:** Hiển thị trường `safetyReason` từ backend (ví dụ: *"Oxy hòa tan DO = 3.2 mg/L < 3.5 mg/L. Cấm rải thức ăn để tránh tôm bị ngạt!"*).

---

# PHẦN 3: BẢNG ĐẶC TẢ CHI TIẾT REST API BACKEND (DÀNH CHO FE RÁP CODE)

Tất cả các API yêu cầu gắn Header:  
`Authorization: Bearer <accessToken>` (trừ các API đăng nhập/quên mật khẩu).

---

### 1. NHÓM API QUAN TRẮC MÔI TRƯỜNG NƯỚC (TELEMETRY)

#### 1.1. Lấy dữ liệu cảm biến mới nhất của Ao
* **Endpoint:** `GET /ponds/:pondId/telemetry/latest`
* **Quyền:** `ADMIN`, `MANAGER`, `FARMER`
* **Response Thành công (HTTP 200):**
```json
{
  "id": "e2c3b4a5-6789-4bcd-8ef0-123456789abc",
  "pondId": "p-101",
  "deviceId": "dev-sensor-01",
  "ph": 7.82,
  "dissolvedOxygenMgL": 5.40,
  "temperatureC": 28.5,
  "salinityPpt": 15.2,
  "ammoniaMgL": 0.08,
  "turbidityNtu": 28.0,
  "measuredAt": "2026-11-23T20:15:00.000Z",
  "isBuffered": false
}
```
* **Lưu ý cho FE:** Nếu ao chưa có dữ liệu đo, backend trả về `{ "message": "Chưa có dữ liệu đo môi trường cho ao này" }` $\rightarrow$ FE kiểm tra nếu không có trường `ph` thì hiển thị trạng thái `--`.

#### 1.2. Lấy lịch sử đo để vẽ biểu đồ chuỗi thời gian
* **Endpoint:** `GET /ponds/:pondId/telemetry/history?limit=50&page=1`
* **Response (HTTP 200):** Mảng danh sách các bản ghi đo sắp xếp theo `measuredAt: DESC`.

---

### 2. NHÓM API DỰ BÁO LƯỢNG THỨC ĂN BẰNG AI (XGBOOST 7 ĐẶC TRƯNG)

#### 2.1. Yêu cầu AI dự báo lượng thức ăn cho cữ kế tiếp
* **Endpoint:** `POST /ponds/:pondId/ai/predict-feed`
* **Quyền:** `ADMIN`, `MANAGER`, `FARMER`
* **Request Body (Tùy chọn - nếu muốn ghi đè thông số thử nghiệm):**
```json
{
  "doc": 45,
  "avgWeightG": 12.5,
  "doMin": 5.2,
  "deltaTan": 0.05,
  "morningRainMm": 0.0,
  "prevFeedAmountKg": 10.0,
  "waterChangeM3": 0.0
}
```
*(Nếu gửi body rỗng `{}` thì Backend sẽ tự động lấy dữ liệu thực tế từ vụ nuôi và cảm biến gần nhất!)*

* **Response Thành công (HTTP 200/201):**
```json
{
  "id": "rec-uuid-12345",
  "pondId": "p-101",
  "modelName": "XGBoost-Regressor",
  "modelVersion": "v2.0.0",
  "predictedFeedAmountKg": 13.11,
  "explanation": "Tôm DOC 55 ngày (ABW 16.50 g/con), lượng ăn cữ trước 13.50 kg. Các yếu tố ảnh hưởng mạnh nhất: Oxy hòa tan (+0.74 kg), Mưa sáng sớm (+0.74 kg)...",
  "safetyDecision": "allowed",
  "safetyReason": "Môi trường an toàn",
  "status": "pending",
  "inputSnapshot": {
    "doc": 55,
    "avgWeightG": 16.5,
    "doMin": 5.2,
    "deltaTan": 0.08,
    "morningRainMm": 0.0,
    "prevFeedAmountKg": 13.5,
    "waterChangeM3": 0.0,
    "baseValueKg": 11.01,
    "featureContributions": [
      {
        "feature": "do_min",
        "name": "Oxy hòa tan tối thiểu (DO min)",
        "value": "5.20 mg/L",
        "impact": "INCREASE",
        "deltaKg": 0.74,
        "description": "DO tối thiểu duy trì ở mức tối ưu làm tăng dự báo khẩu phần +0.74 kg."
      },
      {
        "feature": "morning_rain_mm",
        "name": "Lượng mưa sáng sớm",
        "value": "0.0 mm",
        "impact": "INCREASE",
        "deltaKg": 0.74,
        "description": "Thời tiết sáng sớm không có mưa giúp đàn tôm bắt mồi ổn định (+0.74 kg)."
      },
      {
        "feature": "prev_feed_kg",
        "name": "Lượng ăn cữ trước",
        "value": "13.50 kg",
        "impact": "INCREASE",
        "deltaKg": 0.46,
        "description": "Cữ trước đàn tôm tiêu thụ tốt thúc đẩy tăng lượng thức ăn cữ này (+0.46 kg)."
      }
    ]
  }
}
```
* **Trường hợp bị Safety Rule Engine điều chỉnh (`safetyDecision: "adjusted"`):**
  * Lượng cám `predictedFeedAmountKg` đã được Backend tự động giảm theo tỷ lệ an toàn.
  * Trường `safetyReason` ghi rõ: *"Biến thiên đạm Amoniac gia tăng đột biến (Delta_TAN > 0.5 mg/L). Giảm 50% lượng thức ăn."*
* **Trường hợp bị Safety Rule Engine chặn hoàn toàn (`safetyDecision: "blocked"`):**
  * `predictedFeedAmountKg = 0`.
  * `safetyReason`: *"Nồng độ oxy hòa tan (DO) quá thấp (< 3.5 mg/L). Cấm cho ăn!"*

#### 2.2. Lấy gợi ý AI mới nhất đã lưu
* **Endpoint:** `GET /ponds/:pondId/ai/recommendations/latest`

---

### 3. NHÓM API ĐIỀU KHIỂN MÁY CHO ĂN & DỪNG KHẨN CẤP (FEEDER & E-STOP)

#### 3.1. Dừng Khẩn Cấp Thiết Bị (1-Tap Emergency Stop)
* **Endpoint:** `POST /devices/:deviceId/emergency-stop`
* **Quyền:** `ADMIN`, `MANAGER`, `FARMER`
* **Response (HTTP 200):**
```json
{
  "id": "device-uuid-feeder",
  "name": "Máy cho ăn Ao 1",
  "type": "feeder",
  "mode": "emergency_stop",
  "status": "online",
  "message": "Đã kích hoạt dừng khẩn cấp cho thiết bị"
}
```

#### 3.2. Chuyển chế độ hoạt động thiết bị (Tự động / Thủ công / E-Stop)
* **Endpoint:** `PATCH /devices/:deviceId`
* **Request Body:**
```json
{
  "mode": "automatic" 
}
```
*(Các giá trị hợp lệ của mode: `"automatic"`, `"manual"`, `"emergency_stop"`)*.

---

### 4. NHÓM API LẬP LỊCH & NHẬT KÝ CỮ ĂN (FEEDING)

#### 4.1. Lấy danh sách lịch cho ăn trong ngày của Ao
* **Endpoint:** `GET /ponds/:pondId/feeding-schedules`
* **Response (HTTP 200):**
```json
[
  {
    "id": "sched-01",
    "name": "Ao 1 - Cữ sáng (06:30)",
    "timeOfDay": "06:30",
    "feedAmountKg": 12.5,
    "spreadRateKgPerMinute": 1.5,
    "daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
    "isEnabled": true
  },
  {
    "id": "sched-02",
    "name": "Ao 1 - Cữ trưa (10:30)",
    "timeOfDay": "10:30",
    "feedAmountKg": 15.0,
    "spreadRateKgPerMinute": 1.5,
    "daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
    "isEnabled": true
  }
]
```

#### 4.2. Tạo cữ ăn mới (Dành cho Quản lý)
* **Endpoint:** `POST /ponds/:pondId/feeding-schedules`
* **Request Body:**
```json
{
  "name": "Cữ chiều",
  "timeOfDay": "14:30",
  "feedAmountKg": 14.0,
  "spreadRateKgPerMinute": 1.5,
  "daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
  "isEnabled": true
}
```

#### 4.3. Cho ăn nhanh (Tạo bản ghi cữ ăn tức thời)
* **Endpoint:** `POST /ponds/:pondId/feeding-records`
* **Request Body:**
```json
{
  "requestedAmountKg": 5.0,
  "source": "manual"
}
```
* **Lưu ý quan trọng cho FE:**
  * Nếu môi trường vi phạm ngưỡng an toàn (ví dụ $\text{DO} < 3.5$), API này sẽ trả về lỗi HTTP 422:
    ```json
    {
      "statusCode": 422,
      "message": "Cữ ăn bị chặn bởi Safety Rule Engine: Nồng độ oxy hòa tan quá thấp (< 3.5 mg/L)",
      "error": "Unprocessable Entity"
    }
    ```
  * FE cần bắt lỗi này để bật `SafetyBlockedModal` thông báo cho người dùng!

---

### 5. NHÓM API QUẢN LÝ NHÂN VIÊN & PHÂN CÔNG AO NUÔI (FARMERS & ASSIGNMENTS)

#### 5.1. Quản lý tạo tài khoản cho Người nuôi (Farmer)
* **Endpoint:** `POST /farmers`
* **Quyền:** `MANAGER`, `ADMIN`
* **Request Body:**
```json
{
  "fullName": "Nguyễn Văn A",
  "phoneNumber": "0987654321",
  "email": "nguyenvana@gmail.com"
}
```
* **Response (HTTP 201):**
```json
{
  "id": "user-uuid-farmer",
  "fullName": "Nguyễn Văn A",
  "phoneNumber": "0987654321",
  "role": "farmer",
  "initialPassword": "TempPassword123!",
  "message": "Tạo tài khoản người nuôi thành công. Vui lòng gửi mật khẩu khởi tạo cho nhân viên."
}
```
*(FE hiển thị hộp thoại chứa `initialPassword` để Quản lý sao chép gửi cho công nhân)*.

#### 5.2. Phân công Ao nuôi cho Người nuôi
* **Endpoint:** `POST /farmers/assignments`
* **Request Body:**
```json
{
  "farmerId": "user-uuid-farmer",
  "pondId": "pond-uuid-ao1",
  "farmId": "farm-uuid-traiA"
}
```

---

### 6. NHÓM API CẢNH BÁO (ALERTS)

#### 6.1. Lấy danh sách cảnh báo của Ao
* **Endpoint:** `GET /ponds/:pondId/alerts?status=open&severity=3`
* *(Query params: `status`: `open` | `acknowledged` | `resolved`; `severity`: `1` - Giám sát, `2` - Cảnh báo, `3` - Nguy hiểm)*.

#### 6.2. Xác nhận đã tiếp nhận cảnh báo
* **Endpoint:** `PATCH /alerts/:alertId/acknowledge`

#### 6.3. Đánh dấu đã xử lý xong sự cố
* **Endpoint:** `PATCH /alerts/:alertId/resolve`

---

# PHẦN 4: KẾT NỐI WEBSOCKET (SOCKET.IO) THỜI GIAN THỰC

Backend NestJS cung cấp cổng WebSocket thời gian thực tại namespace `/` hỗ trợ cập nhật dữ liệu tự động mà không cần gọi API vòng lặp (polling):

### 4.1. Khởi tạo kết nối & Xác thực
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  auth: {
    token: `Bearer ${accessToken}`
  }
});

socket.on('connect', () => {
  console.log('Đã kết nối Socket.IO thành công, socket ID:', socket.id);
  
  // Tham gia vào Room của ao nuôi đang chọn
  socket.emit('join:pond', { pondId: currentSelectedPondId });
});
```

### 4.2. Các sự kiện lắng nghe trên Frontend:
```javascript
// 1. Nhận gói tin đo đạc môi trường mới nhất từ cảm biến
socket.on('telemetry:new', (data) => {
  console.log('Chỉ số nước mới nhất:', data);
  // Cập nhật lại 6 đồng hồ nước trên giao diện
  updateWaterGauges(data);
});

// 2. Nhận tiến độ máy cho ăn đang rải cám
socket.on('feeding:progress', (data) => {
  console.log('Tiến độ cữ ăn:', data); // { actualAmountKg, progressPercent, rpm }
  updateFeederGauge(data);
});

// 3. Nhận thông báo cữ ăn hoàn tất
socket.on('feeding:completed', (data) => {
  showToastSuccess(`Cữ ăn hoàn tất: Đã rải thành công ${data.actualAmountKg} kg`);
});

// 4. Nhận cảnh báo sự cố khẩn cấp (DO sụt giảm, máy kẹt...)
socket.on('alert:new', (alertData) => {
  playAlertSound();
  showEmergencyModal(alertData);
});
```

---

# PHẦN 5: BẢNG CHECKLIST CÔNG VIỆC DÀNH CHO LẬP TRÌNH VIÊN FE

| Dự án | Công việc cụ thể | File liên quan | Mức ưu tiên |
| :--- | :--- | :--- | :---: |
| **Web** | Xóa file component `CameraFisView.jsx` và service `cameraFisService.js` | `src/components/`, `src/services/` | **Cao (Làm ngay)** |
| **Web** | Gỡ bỏ route `/camera-fis` và xóa menu "Camera Sàng ăn FIS" trên Sidebar | `src/App.jsx`, `navigation.js`, `Sidebar.jsx` | **Cao** |
| **Web** | Đảm bảo nút E-Stop trên Header gọi đúng `POST /devices/:id/emergency-stop` | `src/components/Header.jsx`, `EStopModal.jsx` | **Cao** |
| **Web** | Hiển thị thẻ gợi ý AI gọi API `POST /ponds/:pondId/ai/predict-feed` và render TreeSHAP tags | `src/components/ScheduleView.jsx` | **Trung bình** |
| **Mobile** | Xóa khung camera nhá ăn và thanh 4 mức FIS trong màn hình giám sát | `src/app/(tabs)/quan-ly-ao.tsx` | **Cao (Làm ngay)** |
| **Mobile** | Đổi tên tab thành "Giám Sát Nước", render lưới 6 đồng hồ đo chất lượng nước | `src/app/(tabs)/quan-ly-ao.tsx` | **Cao** |
| **Mobile** | Bắt lỗi HTTP 422 khi bị Safety Rule Engine chặn để bật Popup cảnh báo đỏ | `src/app/(tabs)/may-cho-an.tsx` | **Cao** |
| **Mobile** | Nút Dừng khẩn cấp gọi đúng `POST /devices/:feederDeviceId/emergency-stop` | `src/app/(tabs)/may-cho-an.tsx` | **Cao** |

---

# PHẦN 6: BẢNG NGƯỠNG MÀU CHUẨN QCVN & HÀM TIỆN ÍCH HELPER (CODE SẴN CHO FE)

Để FE không phải tự suy nghĩ logic đổi màu, hãy copy trực tiếp hàm sau vào file `src/utils/waterQualityHelpers.js` (hoặc `.ts`):

```typescript
export interface WaterMetricEvaluation {
  status: 'safe' | 'warning' | 'critical' | 'empty';
  label: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
}

/**
 * Đánh giá trạng thái ngưỡng của 6 chỉ số môi trường nước theo chuẩn QCVN 02-19:2014
 */
export function evaluateWaterMetric(metric: string, rawValue: number | string | null | undefined): WaterMetricEvaluation {
  if (rawValue === null || rawValue === undefined || rawValue === '' || isNaN(Number(rawValue))) {
    return {
      status: 'empty',
      label: 'Chưa có dữ liệu',
      badgeBg: '#F1F5F9',
      textColor: '#64748B',
      borderColor: '#CBD5E1',
    };
  }

  const val = Number(rawValue);

  switch (metric) {
    case 'dissolvedOxygenMgL':
    case 'do':
      // Oxy hòa tan (DO): Chuẩn an toàn >= 4.0; Cảnh báo [3.5, 4.0); Nguy hiểm < 3.5
      if (val < 3.5) {
        return { status: 'critical', label: 'NGUY HIỂM (Ngạt tôm)', badgeBg: '#FFDAD6', textColor: '#BA1A1A', borderColor: '#BA1A1A' };
      }
      if (val < 4.0) {
        return { status: 'warning', label: 'CẦN CHÚ Ý (Ăn yếu)', badgeBg: '#FEF3C7', textColor: '#B45309', borderColor: '#F59E0B' };
      }
      return { status: 'safe', label: 'TỐI ƯU', badgeBg: '#E8F5E9', textColor: '#006E2D', borderColor: '#7CF994' };

    case 'ph':
      // Độ pH nước: Chuẩn an toàn 7.5 - 8.5; Cảnh báo 7.0 - 7.5 hoặc 8.5 - 9.0; Nguy hiểm < 7.0 hoặc > 9.0
      if (val < 7.0 || val > 9.0) {
        return { status: 'critical', label: 'NGUY HIỂM (Sốc pH)', badgeBg: '#FFDAD6', textColor: '#BA1A1A', borderColor: '#BA1A1A' };
      }
      if (val < 7.5 || val > 8.5) {
        return { status: 'warning', label: 'CẦN CHÚ Ý', badgeBg: '#FEF3C7', textColor: '#B45309', borderColor: '#F59E0B' };
      }
      return { status: 'safe', label: 'TỐI ƯU', badgeBg: '#E8F5E9', textColor: '#006E2D', borderColor: '#7CF994' };

    case 'temperatureC':
    case 'temperature':
      // Nhiệt độ nước: Chuẩn an toàn 26 - 32°C; Nguy hiểm < 22°C hoặc > 34°C
      if (val < 22 || val > 34) {
        return { status: 'critical', label: 'NGUY HIỂM (Sốc nhiệt)', badgeBg: '#FFDAD6', textColor: '#BA1A1A', borderColor: '#BA1A1A' };
      }
      if (val < 26 || val > 32) {
        return { status: 'warning', label: 'CẦN CHÚ Ý', badgeBg: '#FEF3C7', textColor: '#B45309', borderColor: '#F59E0B' };
      }
      return { status: 'safe', label: 'TỐI ƯU', badgeBg: '#E8F5E9', textColor: '#006E2D', borderColor: '#7CF994' };

    case 'ammoniaMgL':
    case 'nh3':
      // Khí độc Ammonia (NH3): An toàn < 0.1; Cảnh báo 0.1 - 0.3; Nguy hiểm > 0.3
      if (val > 0.3) {
        return { status: 'critical', label: 'NGUY HIỂM (Độc tố cao)', badgeBg: '#FFDAD6', textColor: '#BA1A1A', borderColor: '#BA1A1A' };
      }
      if (val > 0.1) {
        return { status: 'warning', label: 'CẦN CHÚ Ý', badgeBg: '#FEF3C7', textColor: '#B45309', borderColor: '#F59E0B' };
      }
      return { status: 'safe', label: 'AN TOÀN', badgeBg: '#E8F5E9', textColor: '#006E2D', borderColor: '#7CF994' };

    case 'salinityPpt':
    case 'salinity':
      // Độ mặn: Chuẩn 10 - 25 ppt
      if (val < 5 || val > 30) {
        return { status: 'warning', label: 'CẦN CHÚ Ý', badgeBg: '#FEF3C7', textColor: '#B45309', borderColor: '#F59E0B' };
      }
      return { status: 'safe', label: 'PHÙ HỢP', badgeBg: '#E8F5E9', textColor: '#006E2D', borderColor: '#7CF994' };

    case 'turbidityNtu':
    case 'turbidity':
      // Độ đục: Chuẩn 20 - 40 NTU
      if (val > 60) {
        return { status: 'warning', label: 'NƯỚC ĐỤC CAO', badgeBg: '#FEF3C7', textColor: '#B45309', borderColor: '#F59E0B' };
      }
      return { status: 'safe', label: 'TRONG HỢP LÝ', badgeBg: '#E8F5E9', textColor: '#006E2D', borderColor: '#7CF994' };

    default:
      return { status: 'safe', label: 'BÌNH THƯỜNG', badgeBg: '#E8F5E9', textColor: '#006E2D', borderColor: '#7CF994' };
  }
}
```

---

# PHẦN 7: BỘ TYPESCRIPT INTERFACES ĐẦY ĐỦ CHO FRONTEND

Copy vào file `src/types/shrimpmate.ts`:

```typescript
// 1. Dữ liệu Quan trắc Môi trường Nước
export interface TelemetryReading {
  id: string;
  pondId: string;
  deviceId?: string | null;
  ph?: number | null;
  dissolvedOxygenMgL?: number | null;
  temperatureC?: number | null;
  salinityPpt?: number | null;
  ammoniaMgL?: number | null;
  turbidityNtu?: number | null;
  measuredAt: string;
  isBuffered: boolean;
}

// 2. Thành phần Giải thích Mô hình TreeSHAP (XAI)
export interface FeatureContribution {
  feature: string;
  name: string;
  value: string | number;
  impact: 'INCREASE' | 'DECREASE' | 'NEUTRAL';
  deltaKg: number;
  description: string;
}

// 3. Khuyến nghị lượng thức ăn từ AI
export interface AiFeedRecommendation {
  id: string;
  pondId: string;
  modelName: string;
  modelVersion: string;
  predictedFeedAmountKg: number;
  explanation: string;
  safetyDecision: 'allowed' | 'adjusted' | 'blocked';
  safetyReason: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  inputSnapshot: {
    doc: number;
    avgWeightG: number;
    doMin: number;
    deltaTan: number;
    morningRainMm: number;
    prevFeedAmountKg: number;
    waterChangeM3: number;
    baseValueKg: number;
    featureContributions: FeatureContribution[];
  };
}

// 4. Lịch cho ăn trong ngày
export interface FeedingSchedule {
  id: string;
  pondId: string;
  name: string;
  timeOfDay: string; // "06:30"
  feedAmountKg: number;
  spreadRateKgPerMinute?: number | null;
  daysOfWeek: number[]; // [0,1,2,3,4,5,6]
  isEnabled: boolean;
}

// 5. Thiết bị IoT
export interface DeviceItem {
  id: string;
  name: string;
  deviceUid: string;
  type: 'feeder' | 'sensor_node' | 'edge_gateway';
  status: 'online' | 'offline' | 'error' | 'maintenance';
  mode: 'automatic' | 'manual' | 'emergency_stop';
  lastSeenAt?: string | null;
  pondId?: string | null;
}
```

---

# PHẦN 8: CODE MẪU COMPONENT (COPY & PASTE SỬ DỤNG NGAY)

### 8.1. Component React Thẻ Khuyến Nghị AI với TreeSHAP Tags (`AiRecommendationCard.jsx`):

```jsx
import React from 'react';
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const AiRecommendationCard = ({ recommendation, onApply, isLoading }) => {
  if (!recommendation) return null;

  const { predictedFeedAmountKg, explanation, safetyDecision, safetyReason, inputSnapshot } = recommendation;
  const contributions = inputSnapshot?.featureContributions || [];

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-500 text-white rounded-xl shadow-sm">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Khuyến nghị Khẩu phần AI (XGBoost)</h3>
            <p className="text-xs text-gray-500">Mô hình v2.0.0 • TreeSHAP XAI</p>
          </div>
        </div>

        {/* Badge Trạng thái An toàn */}
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          safetyDecision === 'blocked' ? 'bg-red-100 text-red-700' :
          safetyDecision === 'adjusted' ? 'bg-amber-100 text-amber-700' :
          'bg-emerald-100 text-emerald-700'
        }`}>
          {safetyDecision === 'blocked' ? 'ĐÃ KHÓA AN TOÀN' :
           safetyDecision === 'adjusted' ? 'ĐÃ ĐIỀU CHỈNH AN TOÀN' : 'TỐI ƯU'}
        </span>
      </div>

      {/* Số lượng cám đề xuất */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-extrabold text-orange-600">{predictedFeedAmountKg}</span>
        <span className="text-sm font-semibold text-gray-600">kg / cữ</span>
        {inputSnapshot?.baseValueKg && (
          <span className="text-xs text-gray-400 ml-2">(Mốc cơ sở: {inputSnapshot.baseValueKg} kg)</span>
        )}
      </div>

      {/* Giải thích nông học */}
      <p className="text-sm text-gray-700 leading-relaxed mb-4 bg-white/70 p-3 rounded-xl border border-orange-100">
        {explanation}
      </p>

      {/* Danh sách Tag TreeSHAP tác động */}
      {contributions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Yếu tố chi phối khẩu phần:</p>
          <div className="flex flex-wrap gap-2">
            {contributions.map((item, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  item.impact === 'INCREASE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : item.impact === 'DECREASE'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
                title={item.description}
              >
                {item.impact === 'INCREASE' && <TrendingUp size={12} />}
                {item.impact === 'DECREASE' && <TrendingDown size={12} />}
                {item.impact === 'NEUTRAL' && <Minus size={12} />}
                {item.name}: {item.deltaKg > 0 ? `+${item.deltaKg}` : item.deltaKg} kg
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Nút Áp dụng */}
      <button
        onClick={() => onApply(predictedFeedAmountKg)}
        disabled={safetyDecision === 'blocked' || isLoading}
        className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-sm transition-all text-sm"
      >
        {safetyDecision === 'blocked' ? 'Không thể áp dụng (Vi phạm an toàn nước)' : 'Áp dụng mức cám này cho cữ ăn'}
      </button>
    </div>
  );
};
```

### 8.2. Component Bắt Lỗi Khóa An Toàn 422 (`SafetyBlockedModal.jsx`):

```jsx
import React from 'react';
import { AlertOctagon, X } from 'lucide-react';

export const SafetyBlockedModal = ({ isOpen, onClose, reason, pondName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-red-500 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
            <AlertOctagon size={28} />
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <h3 className="text-xl font-black text-gray-900 mb-1">LỆNH CHO ĂN BỊ CHẶN!</h3>
        <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3">
          Lớp Quy tắc An toàn Sinh học (Safety Rule Engine)
        </p>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
          <p className="text-xs text-red-500 font-semibold mb-1">Nguyên nhân từ chối phát lệnh:</p>
          <p className="text-sm font-bold text-red-900 leading-snug">
            {reason || 'Chất lượng nước vi phạm ngưỡng an toàn QCVN (Oxy hòa tan DO quá thấp hoặc thiết bị báo lỗi).'}
          </p>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed mb-5">
          Hệ thống tự động ngắt lệnh xả cám xuống phần cứng để bảo vệ đàn tôm khỏi nguy cơ ngạt thở và tránh tồn đọng thức ăn thối đáy ao. Vui lòng bật quạt nước và kiểm tra lại ao nuôi.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-sm"
        >
          Tôi đã hiểu và sẽ kiểm tra ao
        </button>
      </div>
    </div>
  );
};
```

---
*Tài liệu này đã đầy đủ trọn gói 100% từ Contract API, JSON Payload mẫu, Hàm tiện ích đổi màu chuẩn QCVN đến Component UI hoàn chỉnh. Lập trình viên Frontend chỉ cần bám sát từng phần là có thể ráp code hoàn tất trong thời gian nhanh nhất!*

