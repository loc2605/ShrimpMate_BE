# KỊCH BẢN TRÌNH DIỄN HỆ THỐNG SHRIMPMATE BẰNG POSTMAN (BẢN TẬP TRUNG TÍNH NĂNG CHÍNH)
> **Tài liệu Kịch bản Demo Live phục vụ Báo cáo & Bảo vệ Luận văn**  
> **Thời lượng**: 10 – 15 phút (Đi thẳng vào các tính năng kỹ thuật cốt lõi)  
> **Công cụ**: Postman + Terminal Backend Log (kết hợp kiểm tra Email/SMS thực tế)  
> **Phương pháp tiếp cận**: Dùng tài khoản mẫu có sẵn, không rườm rà form đăng ký, tập trung chứng minh AI, IoT, Hàng đợi BullMQ, Chống bão spam và Nghiệm thu FCR.

---

## 1. THIẾT LẬP NHANH TÀI KHOẢN MẪU & MÔI TRƯỜNG POSTMAN

Hệ thống đã có sẵn 3 tài khoản chuẩn cho 3 vai trò, chỉ cần bấm Login 1 lần trên Postman để lưu Token vào Environment:

| Vai trò (Role) | Ứng dụng | Identifier (Email/SĐT) | Mật khẩu | Biến Token trên Postman |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Web Dashboard | `admin@shrimpmate.local` | `Admin@123456` | `{{adminToken}}` |
| **Manager** | Web App | `locphanhuu2605@gmail.com` | *(Mật khẩu đã tạo)* | `{{managerToken}}` |
| **Farmer** | Mobile App | `locphanhuu26052004@gmail.com` | `Loc26052004` | `{{farmerToken}}` |

> **Thông tin Ao nuôi & Phần cứng dùng để Demo Live:**
> - **Mã Ao nuôi (`pondId`)**: `208cf3b7-a60f-4c83-83b0-54d06fee3d97` (Ao 1 - Giai đoạn tăng trưởng)
> - **Máy cho ăn (`feederDeviceId`)**: `52c77a02-f1d4-4b0f-ac37-48f5473ac820` (`DEV-FEEDER-001`)

---

## MÀN 1: QUẢN LÝ NHÂN SỰ & PHÂN CÔNG AO NUÔI (MANAGER -> FARMER)
*Thời lượng: 2 phút*  
*Mục đích: Giới thiệu quy trình Manager tạo tài khoản công nhân bờ ao và phân quyền quản lý theo ao nuôi.*

---

### Bước 1.1: Manager Tạo Tài Khoản Cho Farmer Mới (UC020)
* **Thực hiện trên Postman**:
  - Request: `POST {{baseUrl}}/farmers`
  - Headers: `Authorization: Bearer {{managerToken}}`
  - Body (Raw JSON):
    ```json
    {
      "fullName": "Trần Văn Nuôi",
      "email": "farmer.tran@shrimpmate.local",
      "phoneNumber": "0987654321"
    }
    ```
  - Response HTTP `201 Created`:
    ```json
    {
      "farmer": {
        "id": "fa123456-...",
        "fullName": "Trần Văn Nuôi",
        "role": "farmer",
        "isActive": true
      },
      "temporaryPassword": "Abc@123456_NgauNhien"
    }
    ```
* **Thuyết trình**:
  > *"Thưa thầy cô, công nhân bờ ao thường không tự đăng ký tài khoản. Manager sẽ khởi tạo tài khoản Farmer trên Web App, hệ thống tự động cấp mật khẩu ngẫu nhiên an toàn để bàn giao cho công nhân."*

---

### Bước 1.2: Manager Phân Công Ao 1 Cho Farmer (UC021)
* **Thực hiện trên Postman**:
  - Request: `POST {{baseUrl}}/farmers/fa123456-.../assignments`
  - Headers: `Authorization: Bearer {{managerToken}}`
  - Body:
    ```json
    {
      "farmId": "f1b2c3d4-...",
      "pondIds": ["208cf3b7-a60f-4c83-83b0-54d06fee3d97"]
    }
    ```
  - Response HTTP `201 Created`: Phân công thành công Ao 1 cho Farmer.
* **Thuyết trình**:
  > *"Từ thời điểm này, Farmer chỉ có quyền truy cập dữ liệu và vận hành đúng Ao 1. Nếu cố tình truy cập các ao khác sẽ bị WebSocket và API từ chối ngay lập tức."*

---

## MÀN 2: GIÁM SÁT MÔI TRƯỜNG IOT & XỬ LÝ GÓI TIN ĐỆM (isBuffered)
*Thời lượng: 3 phút*  
*Mục đích: Chứng minh tốc độ truy vấn O(1) và khả năng xử lý khi trạm cảm biến bị mất mạng rồi có lại.*

---

### Bước 2.1: Truy Vấn Chỉ Số Nước Mới Nhất Siêu Tốc ($O(1)$)
* **Thực hiện trên Postman**:
  - Request: `GET {{baseUrl}}/ponds/{{pondId}}/telemetry/latest`
  - Headers: `Authorization: Bearer {{farmerToken}}`
  - Response HTTP `200 OK` (Thời gian phản hồi chỉ **5–15 ms**):
    ```json
    {
      "ph": 7.85,
      "dissolvedOxygenMgL": 5.6,
      "temperatureC": 29.2,
      "salinityPpt": 18.0,
      "measuredAt": "2026-11-10T09:30:00.000Z",
      "isBuffered": false
    }
    ```
* **Thuyết trình**:
  > *"Hệ thống sử dụng Composite Index kép giảm dần [pond_id, measured_at DESC] trên PostgreSQL. Dù bảng telemetry tích lũy hàng triệu dòng sau cả vụ nuôi, câu truy vấn lấy chỉ số mới nhất vẫn đạt tốc độ O(1) với thời gian thực thi chỉ 0.089ms."*

---

### Bước 2.2: Trình Diễn Xử Lý Gói Tin Đệm `isBuffered: true` (Khi Có Mạng Lại)
* **Tình huống**: ESP32 bị mất sóng WiFi 30 phút, lưu dữ liệu vào Flash. Khi có mạng lại, ESP32 bắn bù một loạt gói tin cũ lên hệ thống.
* **Thực hiện trên Postman**:
  - Request: `POST {{baseUrl}}/ponds/{{pondId}}/telemetry`
  - Body:
    ```json
    {
      "ph": 6.5,
      "dissolvedOxygenMgL": 2.2,
      "temperatureC": 32.0,
      "salinityPpt": 15.0,
      "isBuffered": true,
      "measuredAt": "2026-11-10T08:30:00.000Z"
    }
    ```
  - Response HTTP `201 Created`.
* **Quan sát Terminal Backend**:
  - Console in: `[MQTT] [DEV-SENSOR-001] -> pH: 6.5 | DO: 2.2 mg/L | [Gói tin đệm / isBuffered]`
  - **Khẳng định**: Hệ thống **vẫn lưu vào CSDL** để vẽ biểu đồ lịch sử, nhưng **hoàn toàn bỏ qua kiểm duyệt an toàn và không bật còi báo động giả**, tránh trường hợp dữ liệu cũ từ 30 phút trước làm gián đoạn cữ ăn hiện tại.

---

## MÀN 3: KÍCH HOẠT CẢNH BÁO NGUY CẤP, KHUYẾN NGHỊ AI & CHỐNG BÃO SPAM
*Thời lượng: 4 phút*  
*Mục đích: Chứng minh phân cấp cảnh báo (Warning vs Critical), gửi SMS/Email thật và bộ lọc Debounce Cooldown 15 phút.*

---

### Bước 3.1: Kích Hoạt Sự Cố DO Tụt Nguy Cấp ($< 3.0\ mg/L$)
* **Thực hiện trên Postman**:
  - Request: `POST {{baseUrl}}/ponds/{{pondId}}/telemetry`
  - Body (Gói tin trực tiếp `isBuffered: false`):
    ```json
    {
      "dissolvedOxygenMgL": 2.8,
      "ph": 7.6,
      "temperatureC": 29.0,
      "salinityPpt": 18.0,
      "isBuffered": false
    }
    ```
  - Response HTTP `201 Created`.

* **Quan sát Kết quả Thực tế**:
  1. **Terminal Backend**:
     ```
     [AlertCreated] Đã tạo cảnh báo mới [CRITICAL_DO_LOW] cho ao 208cf3b7... (Gắn AI Rec: ...)
     [SMS CẢNH BÁO] Tới: 0865498043 (Lộc Phan Hữu) | Nội dung: [ShrimpMate] CANH BAO NGUY CAP tai Ao 1: Oxy hoa tan (DO) tut nguy cap...
     ```
  2. **Hòm thư Email**: Mở email nhận được thông báo đỏ chuyên nghiệp có đính kèm **Khuyến nghị nông học AI**:
     > *"Khuyến nghị khẩn cấp: Bật ngay 100% dàn quạt nước và sục khí oxy đáy trong 45-60 phút. Ngưng ngay cữ ăn hiện tại cho đến khi DO > 4.0 mg/L."*
  3. **Tin nhắn SMS**: Nhận SMS cảnh báo trực tiếp về điện thoại người nuôi qua cổng **eSMS.vn**.

---

### Bước 3.2: Chứng Minh Cơ Chế Chống Bão Cảnh Báo (Redis Debounce Cooldown 15 Phút)
* **Tình huống**: Cảm biến gửi dữ liệu 5 giây/lần, số đo DO tiếp tục dao động xấu ở mức 2.7 mg/L, rồi 2.6 mg/L.
* **Thực hiện trên Postman**:
  - Bấm gửi liên tiếp 2 request với `dissolvedOxygenMgL: 2.7` và `2.6`.
* **Quan sát Terminal Backend**:
  ```
  [AlertCooldown] Debounce ao 208cf3b7 (CRITICAL_DO_LOW): Đã cập nhật giá trị mới nhất (2.7 mg/L), không tạo thêm thông báo mới.
  ```
* **Khẳng định với Hội đồng**:
  > *"Áp dụng khóa Redis atomic `SET alert:cooldown:{pondId}:{metric} 1 EX 900 NX`. Trong 15 phút, hệ thống chỉ cập nhật giá trị mới nhất vào bản ghi đang OPEN, tuyệt đối không tạo thêm thông báo, không spam chuông điện thoại người nuôi."*

---

## MÀN 4: ĐIỀU KHIỂN CỮ ĂN (BULLMQ), ADAPTIVE FEEDING & DỪNG KHẨN CẤP
*Thời lượng: 5 phút*  
*Mục đích: Chứng minh cơ chế bảo vệ máy ăn, AI dự báo xu hướng 2h tới, giảm ăn tự động và nút dừng khẩn cấp.*

---

### Bước 4.1: Chống "Bắn Lệnh Vào Hư Không" Khi Máy Cho Ăn OFFLINE
* **Tình huống**: Máy ăn ngoài ao bị đứt dây nguồn hoặc mất sóng quá 15 phút (trạng thái `OFFLINE`).
* **Thực hiện trên Postman**:
  - Request: `POST {{baseUrl}}/ponds/{{pondId}}/feeding/manual`
  - Body: `{ "feedAmountKg": 10.0 }`
  - Response HTTP `200 OK`:
    ```json
    {
      "status": "STOPPED",
      "safetyDecision": "BLOCKED",
      "stoppedReason": "Máy cho ăn đang OFFLINE (mất kết nối phần cứng). Cữ ăn tự động bị hủy để đảm bảo an toàn."
    }
    ```
* **Thuyết trình**:
  > *"Worker kiểm tra sức khỏe phần cứng trước khi phát lệnh. Nếu máy đang OFFLINE, cữ ăn tự hủy ngay từ đầu, không để xảy ra tình trạng nhả cám mất kiểm soát."*

---

### Bước 4.2: Tích Hợp Dự Báo AI Xu Hướng 2h Tới & Kích Hoạt Adaptive Feeding
* **Thực hiện trên Postman**:
  - Request: `GET {{baseUrl}}/ponds/{{pondId}}/ai/predicted-trends`
  - Headers: `Authorization: Bearer {{farmerToken}}`
  - Response HTTP `200 OK`:
    ```json
    {
      "currentDo": 4.5,
      "predictedDo1h": 3.7,
      "predictedDo2h": 3.1,
      "riskLevel": "WARNING",
      "adaptiveAction": "REDUCE_FEED_40%",
      "recommendation": "Dự báo sau cữ ăn DO tụt dưới 3.2 mg/L do vi khuẩn phân hủy thức ăn. Hệ thống tự động giảm 40% thức ăn và kích hoạt quạt nước sớm 15 phút."
    }
    ```
* **Thuyết trình**:
  > *"Đây là điểm đột phá của đề án: Hệ thống không hủy cực đoan cữ ăn của tôm, mà tự động áp dụng quy tắc thích ứng (Adaptive Feeding) giảm 40% khẩu phần ăn để giữ an toàn môi trường nước."*

---

### Bước 4.3: Bấm Nút Dừng Khẩn Cấp 1-Chạm (E-STOP)
* **Tình huống**: Cữ ăn đang diễn ra, người nuôi đứng bờ ao phát hiện nhá tôm có dấu hiệu bất thường muốn ngắt máy ngay lập tức.
* **Thực hiện trên Postman**:
  - Request: `POST {{baseUrl}}/ponds/{{pondId}}/feeding/emergency-stop`
  - Body:
    ```json
    {
      "reason": "Phát hiện tôm không ra nhá, cám bị trôi dạt vào bờ"
    }
    ```
  - Response HTTP `200 OK`:
    ```json
    {
      "success": true,
      "message": "Đã gửi lệnh dừng khẩn cấp cho máy cho ăn tại ao 208cf3b7..."
    }
    ```
  - Kiểm tra `GET {{baseUrl}}/ponds/{{pondId}}/feeding/records` -> Cữ ăn đổi sang trạng thái `STOPPED`, lý do lưu vết đầy đủ minh bạch.

---

### Bước 4.4: Thu Hoạch Kết Thúc Vụ & Tự Động Tính FCR
* **Thực hiện trên Postman**:
  - Request: `POST {{baseUrl}}/crop-seasons/{{cropSeasonId}}/harvest`
  - Headers: `Authorization: Bearer {{managerToken}}`
  - Body:
    ```json
    {
      "harvestDate": "2026-11-10",
      "harvestBiomassKg": 4200.0,
      "averageWeightGram": 25.5
    }
    ```
  - Response HTTP `200 OK`:
    ```json
    {
      "status": "completed",
      "harvestBiomassKg": 4200.0,
      "totalFeedConsumedKg": 5040.0,
      "fcr": 1.20,
      "performanceRating": "EXCELLENT"
    }
    ```
* **Kết luận buổi Demo**:
  > *"Hệ thống tự động cộng dồn toàn bộ thức ăn đã tiêu thụ thực tế chia cho sản lượng tôm thu hoạch, tính ra hệ số FCR = 1.20 đạt mức Xuất sắc. Toàn bộ chu trình từ cảm biến IoT, điều khiển máy ăn, bảo mật đến nghiệm thu kinh tế đã hoàn thiện khép kín 100%."*

---
*Bản kịch bản rút gọn này giúp bạn hoàn thành bài trình diễn trong đúng 12–15 phút, gây ấn tượng mạnh mẽ với Hội đồng bằng các số liệu và tính năng kỹ thuật thực tế!*
