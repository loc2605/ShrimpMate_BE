# 🎬 KỊCH BẢN DEMO TÍNH NĂNG CHO ĂN — BACKEND SIDE
> **ShrimpMate | KLTN Nhóm 009 | IUH**  
> Phan Hữu Lộc (22653351) & Đoàn Lan Hương (22002095)  
> GVHD: TS. Nguyễn Vũ Lâm  
> Backend: `http://localhost:3000` | AI Service: `http://localhost:8000`

---

## 📋 MỤC LỤC

1. [Chuẩn bị môi trường & Seed dữ liệu](#1-chuẩn-bị-môi-trường--seed-dữ-liệu)
2. [Kịch bản 1 — AI Dự báo lượng thức ăn (XGBoost)](#2-kịch-bản-1--ai-dự-báo-lượng-thức-ăn-xgboost)
3. [Kịch bản 2 — Cho ăn nhanh + Safety Rule Engine (Happy Path)](#3-kịch-bản-2--cho-ăn-nhanh--safety-rule-engine-happy-path)
4. [Kịch bản 3 — Safety Rule Engine CHẶN (Bad Path)](#4-kịch-bản-3--safety-rule-engine-chặn-bad-path)
5. [Kịch bản 4 — Lịch cho ăn tự động End-to-End](#5-kịch-bản-4--lịch-cho-ăn-tự-động-end-to-end)
6. [Kịch bản 5 — Dừng khẩn cấp E-Stop](#6-kịch-bản-5--dừng-khẩn-cấp-e-stop)
7. [Lưu ý khi demo trước hội đồng](#7-lưu-ý-khi-demo-trước-hội-đồng)

---

## 1. Chuẩn bị môi trường & Seed dữ liệu

### 1.1 Khởi động các service

```powershell
# Terminal 1 — Backend NestJS
cd D:\KLTN\shrimpmate-backend
npm run start:dev

# Terminal 2 — AI FastAPI
cd D:\KLTN\shrimpmate-AI
C:\Users\Phan Huu Loc\AppData\Local\Python\bin\python.exe -m uvicorn app.main:app --reload --port 8000

# Terminal 3 — Redis (nếu chưa chạy)
redis-server
```

### 1.2 Seed dữ liệu demo (chạy 1 lần trước khi demo)

> **Dùng Postman hoặc curl. Lưu lại các ID để dùng xuyên suốt demo.**

#### Bước 1 — Đăng nhập lấy token MANAGER

```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "manager@demo.com",
  "password": "Demo@123"
}
```
→ Lưu `accessToken` → gọi là **`MANAGER_TOKEN`**

#### Bước 2 — Đăng nhập lấy token FARMER

```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "farmer@demo.com",
  "password": "Demo@123"
}
```
→ Lưu `accessToken` → gọi là **`FARMER_TOKEN`**

#### Bước 3 — Lấy pond ID đang có vụ nuôi

```http
GET http://localhost:3000/ponds
Authorization: Bearer {{MANAGER_TOKEN}}
```

→ Chọn pond có `status: "active"` và `activeSeason` không null  
→ Lưu `id` → gọi là **`POND_ID`** (ví dụ: `pond_abc123`)

> **Nếu chưa có vụ nuôi active**, tạo mới:
> ```http
> POST http://localhost:3000/ponds/{{POND_ID}}/seasons
> Authorization: Bearer {{MANAGER_TOKEN}}
> Content-Type: application/json
>
> {
>   "name": "Vụ Demo Q4/2026",
>   "stockingDate": "2026-09-01",
>   "initialCount": 150000,
>   "initialWeight": 0.5,
>   "pondArea": 2000,
>   "targetWeight": 25
> }
> ```
> → Lưu `id` → **`SEASON_ID`**

#### Bước 4 — Lấy Device ID (feeder)

```http
GET http://localhost:3000/devices?pondId={{POND_ID}}&type=feeder
Authorization: Bearer {{MANAGER_TOKEN}}
```

→ Lưu `id` → **`DEVICE_ID`** (ví dụ: `dev_feeder_xyz`)  
→ Đảm bảo `status: "online"` (nếu offline → đổi sang mock online)

#### Bước 5 — Seed telemetry "nước tốt" (cho happy path)

```http
POST http://localhost:3000/ponds/{{POND_ID}}/telemetry
Authorization: Bearer {{MANAGER_TOKEN}}
Content-Type: application/json

{
  "do": 5.8,
  "ph": 7.8,
  "temperature": 29.5,
  "salinity": 15,
  "turbidity": 25,
  "nh3": 0.008,
  "tan": 0.4,
  "isRaining": false,
  "isBuffered": false
}
```

> ✅ Bộ giá trị này **pass tất cả 8 rules QCVN 02-19:2014**, demo sẽ cho phép cho ăn.

---

## 2. Kịch bản 1 — AI Dự báo lượng thức ăn (XGBoost)

**Mục đích:** Cho hội đồng thấy model XGBoost tích hợp trả về dự báo kg thức ăn kèm giải thích SHAP.  
**Thời gian:** ~2 phút  
**Người thực hiện:** MANAGER hoặc FARMER

---

### 2.1 Gọi dự báo tự động (dùng telemetry mới nhất từ hồ)

```http
POST http://localhost:3000/ponds/{{POND_ID}}/ai/predict-feed
Authorization: Bearer {{MANAGER_TOKEN}}
Content-Type: application/json

{}
```

**Giải thích lúc demo:**
> *"Khi body rỗng, hệ thống tự lấy telemetry mới nhất của hồ và thông tin vụ nuôi (ngày tuổi, trọng lượng trung bình, mật độ) để đưa vào model XGBoost. Không cần nhập tay."*

**Response mẫu (200 OK):**

```json
{
  "success": true,
  "data": {
    "recommendedAmount": 12.4,
    "unit": "kg",
    "mealCount": 4,
    "amountPerMeal": 3.1,
    "confidence": 0.967,
    "modelVersion": "xgboost-v1.0",
    "metrics": {
      "mae": 0.280,
      "mape": 3.06,
      "r2": 0.992
    },
    "shapExplanation": {
      "shrimpAge_days": 0.38,
      "avgWeight_g": 0.29,
      "do": 0.17,
      "temperature": 0.09,
      "density_per_m2": 0.07
    },
    "inputs": {
      "shrimpAge_days": 60,
      "avgWeight_g": 7.2,
      "do": 5.8,
      "temperature": 29.5,
      "salinity": 15,
      "density_per_m2": 75,
      "feedingRate_pct": 4.2,
      "weather": "clear"
    },
    "safety": {
      "status": "ALLOWED",
      "blockedRules": []
    }
  }
}
```

**Điểm nhấn cần nói với hội đồng:**
- R² = **0.992** → model giải thích 99.2% phương sai lượng thức ăn
- MAE = **0.280 kg** → sai số trung bình chỉ 280g trên mỗi lần dự báo
- `shapExplanation` → TreeSHAP cho thấy **ngày tuổi tôm** ảnh hưởng nhiều nhất (38%), tiếp theo là **trọng lượng** (29%) — đúng sinh học
- Latency AI: **0.45ms** trung bình (đo thực tế trên máy local)

---

### 2.2 Gọi dự báo với override thủ công

```http
POST http://localhost:3000/ponds/{{POND_ID}}/ai/predict-feed
Authorization: Bearer {{MANAGER_TOKEN}}
Content-Type: application/json

{
  "overrideInputs": {
    "shrimpAge_days": 75,
    "avgWeight_g": 10.5,
    "do": 5.0,
    "temperature": 30.0,
    "salinity": 12,
    "density_per_m2": 80,
    "feedingRate_pct": 3.8,
    "weather": "cloudy"
  }
}
```

**Giải thích:**
> *"MANAGER có thể override input để mô phỏng kịch bản: 'Nếu tôm đã 75 ngày tuổi, trời nhiều mây — thì nên cho ăn bao nhiêu?' → hệ thống trả về dự báo ngay lập tức mà không cần chờ đủ điều kiện thực tế."*

---

### 2.3 Xem lại khuyến nghị gần nhất

```http
GET http://localhost:3000/ponds/{{POND_ID}}/ai/recommendations/latest
Authorization: Bearer {{MANAGER_TOKEN}}
```

→ Cho thấy hệ thống **lưu lịch sử khuyến nghị** để farmer biết từ trước.

---

## 3. Kịch bản 2 — Cho ăn nhanh + Safety Rule Engine (Happy Path)

**Mục đích:** Cho thấy farmer bấm "Cho ăn ngay" trên App → Backend kiểm tra an toàn → Gửi lệnh MQTT → ACK.  
**Thời gian:** ~3 phút  
**Người thực hiện:** FARMER

---

### 3.1 Gọi API cho ăn nhanh (Quick Feed)

> **⚡ Dùng FARMER_TOKEN** — đây là hành động của farmer trên Mobile App

```http
POST http://localhost:3000/ponds/{{POND_ID}}/feeding-records
Authorization: Bearer {{FARMER_TOKEN}}
Content-Type: application/json

{
  "amount": 3.1,
  "unit": "kg",
  "feedType": "compound",
  "note": "Cho ăn theo khuyến nghị AI buổi sáng",
  "deviceId": "{{DEVICE_ID}}"
}
```

**Flow bên trong Backend (giải thích từng bước):**

```
Farmer gửi POST /ponds/{{POND_ID}}/feeding-records
         │
         ▼
FeedingService.createRecord()
         │
         ├─► TelemetryService.getLatest(pondId)     ← Lấy telemetry mới nhất
         │         └─ Kiểm tra freshness: timestamp < 30 phút? ✅
         │
         ├─► SafetyRuleEngine.evaluate(telemetry)   ← Kiểm tra 8 rules QCVN
         │         ├─ Rule DO: 5.8 ≥ 4.0 → PASS ✅
         │         ├─ Rule pH: 7.8 ∈ [7.5, 8.5] → PASS ✅
         │         ├─ Rule NH3: 0.008 ≤ 0.01 → PASS ✅
         │         ├─ Rule Temp: 29.5 ∈ [25, 32] → PASS ✅
         │         ├─ Rule Rain: false → PASS ✅
         │         └─ Kết quả: status = "ALLOWED" ✅
         │
         ├─► MQTTService.publish("feeder/{{DEVICE_ID}}/command", payload)
         │         └─ Chờ ACK từ ESP32 (timeout 10s)
         │
         └─► Lưu FeedingRecord vào DB, push WebSocket "feeding.started"
```

**Response mẫu (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "rec_20261123_001",
    "pondId": "{{POND_ID}}",
    "amount": 3.1,
    "unit": "kg",
    "feedType": "compound",
    "startedAt": "2026-11-23T14:05:00.000Z",
    "status": "feeding",
    "safety": {
      "status": "ALLOWED",
      "checkedAt": "2026-11-23T14:05:00.123Z",
      "telemetryAge_seconds": 45,
      "blockedRules": []
    },
    "deviceCommand": {
      "sent": true,
      "mqttTopic": "feeder/dev_feeder_xyz/command",
      "ackReceived": true,
      "roundTripMs": 312
    }
  }
}
```

**Điểm nhấn:**
- `safety.status: "ALLOWED"` → 8 rules đều pass
- `deviceCommand.ackReceived: true` → ESP32 đã nhận lệnh, roundtrip 312ms
- `telemetryAge_seconds: 45` → dữ liệu cảm biến chỉ cũ 45 giây

---

## 4. Kịch bản 3 — Safety Rule Engine CHẶN (Bad Path)

**Mục đích:** Cho thấy hệ thống bảo vệ tôm chủ động — KHÔNG cho ăn khi nước nguy hiểm.  
**Thời gian:** ~2 phút

---

### 4.1 Seed telemetry "nước nguy hiểm"

```http
POST http://localhost:3000/ponds/{{POND_ID}}/telemetry
Authorization: Bearer {{MANAGER_TOKEN}}
Content-Type: application/json

{
  "do": 2.8,
  "ph": 6.1,
  "temperature": 29.5,
  "salinity": 15,
  "turbidity": 25,
  "nh3": 0.025,
  "tan": 0.6,
  "isRaining": false,
  "isBuffered": false
}
```

> ⚠️ DO = 2.8 (< 4.0 mg/L — ngưỡng QCVN), pH = 6.1 (< 7.5), NH3 = 0.025 (> 0.01 mg/L)  
> → 3 rules sẽ bị vi phạm đồng thời

---

### 4.2 Gọi lại API cho ăn nhanh

```http
POST http://localhost:3000/ponds/{{POND_ID}}/feeding-records
Authorization: Bearer {{FARMER_TOKEN}}
Content-Type: application/json

{
  "amount": 3.1,
  "unit": "kg",
  "feedType": "compound",
  "note": "Thử cho ăn khi nước xấu",
  "deviceId": "{{DEVICE_ID}}"
}
```

**Response mẫu (422 Unprocessable Entity):**

```json
{
  "success": false,
  "statusCode": 422,
  "error": "SAFETY_BLOCKED",
  "message": "Không thể cho ăn: điều kiện nước ao chưa đạt tiêu chuẩn an toàn",
  "data": {
    "safety": {
      "status": "BLOCKED",
      "checkedAt": "2026-11-23T14:12:00.000Z",
      "telemetryAge_seconds": 20,
      "blockedRules": [
        {
          "rule": "DO_TOO_LOW",
          "severity": "CRITICAL",
          "message": "Oxy hòa tan 2.8 mg/L thấp hơn ngưỡng an toàn 4.0 mg/L (QCVN 02-19:2014)",
          "currentValue": 2.8,
          "threshold": 4.0,
          "unit": "mg/L"
        },
        {
          "rule": "PH_OUT_OF_RANGE",
          "severity": "HIGH",
          "message": "pH 6.1 ngoài khoảng an toàn [7.5 – 8.5] (QCVN 02-19:2014)",
          "currentValue": 6.1,
          "threshold": "7.5–8.5",
          "unit": ""
        },
        {
          "rule": "NH3_TOO_HIGH",
          "severity": "HIGH",
          "message": "NH3 tự do 0.025 mg/L vượt ngưỡng 0.01 mg/L (QCVN 02-19:2014)",
          "currentValue": 0.025,
          "threshold": 0.01,
          "unit": "mg/L"
        }
      ]
    },
    "recommendation": "Kiểm tra và xử lý nước ao trước khi tiếp tục cho ăn. Cân nhắc sục khí hoặc thay nước một phần."
  }
}
```

**Giải thích với hội đồng:**
> *"Hệ thống trả về HTTP 422 kèm danh sách chính xác các vi phạm theo tiêu chuẩn QCVN 02-19:2014. Frontend Mobile App nhận được response này và hiển thị modal cảnh báo — Farmer không thể cho ăn cho đến khi nước đạt chuẩn. Lệnh MQTT hoàn toàn không được gửi xuống thiết bị."*

---

### 4.3 Seed lại telemetry tốt (restore về trạng thái ban đầu)

```http
POST http://localhost:3000/ponds/{{POND_ID}}/telemetry
Authorization: Bearer {{MANAGER_TOKEN}}
Content-Type: application/json

{
  "do": 5.8,
  "ph": 7.8,
  "temperature": 29.5,
  "salinity": 15,
  "turbidity": 25,
  "nh3": 0.008,
  "tan": 0.4,
  "isRaining": false,
  "isBuffered": false
}
```

---

## 5. Kịch bản 4 — Lịch cho ăn tự động End-to-End

**Mục đích:** Cho thấy hệ thống tự động hoạt động không cần người dùng can thiệp.  
**Thời gian:** ~4 phút

---

### 5.1 Xem danh sách lịch cho ăn

```http
GET http://localhost:3000/ponds/{{POND_ID}}/feeding-schedules
Authorization: Bearer {{MANAGER_TOKEN}}
```

**Response mẫu:**

```json
{
  "data": [
    {
      "id": "sched_001",
      "pondId": "{{POND_ID}}",
      "name": "Buổi sáng",
      "scheduledTime": "06:00",
      "amount": 3.1,
      "unit": "kg",
      "feedType": "compound",
      "isActive": true,
      "lastTriggeredAt": "2026-11-23T06:00:05.000Z",
      "lastStatus": "completed"
    },
    {
      "id": "sched_002",
      "name": "Buổi chiều",
      "scheduledTime": "14:00",
      "amount": 3.1,
      "unit": "kg",
      "isActive": true,
      "lastStatus": "pending"
    }
  ]
}
```

---

### 5.2 Trigger lịch cho ăn ngay lập tức (thay vì chờ đúng giờ)

> **Dùng để demo mà không cần đợi đúng 06:00 hay 14:00**

```http
POST http://localhost:3000/feeding-schedules/sched_001/trigger
Authorization: Bearer {{MANAGER_TOKEN}}
Content-Type: application/json

{}
```

**Response mẫu (202 Accepted):**

```json
{
  "success": true,
  "message": "Lịch cho ăn 'Buổi sáng' đã được đưa vào hàng đợi xử lý",
  "data": {
    "scheduleId": "sched_001",
    "jobId": "bull:feeding:sched_001:1732363500000",
    "queuedAt": "2026-11-23T14:15:00.000Z",
    "estimatedStart": "2026-11-23T14:15:02.000Z"
  }
}
```

**Giải thích flow tự động:**
> *"Backend dùng BullMQ để quản lý hàng đợi. Job key có timestamp — đảm bảo idempotent, không bao giờ cho ăn 2 lần trong cùng một lịch. FeedingSchedulerService chạy cron mỗi phút, tự động tạo job cho tất cả lịch đang active mà đến giờ."*

```
FeedingSchedulerService (cron * * * * *)
         │
         ▼
Tìm tất cả schedules active & scheduledTime = now
         │
         ▼
FeedingQueueService.enqueue(scheduleId, idempotencyKey)
         │
         ▼
BullMQ Worker — FeedingWorkerService.process()
         │
         ├─► Check feeder device online?
         ├─► SafetyRuleEngine.evaluate()
         ├─► Nếu ALLOWED → MQTTService.publish()
         ├─► Chờ ACK (10s timeout)
         └─► Cập nhật FeedingRecord + push WebSocket
```

---

### 5.3 Xem lịch sử cho ăn sau khi trigger

```http
GET http://localhost:3000/ponds/{{POND_ID}}/feeding-records?limit=5
Authorization: Bearer {{MANAGER_TOKEN}}
```

→ Cho thấy record mới vừa được tạo với status `completed`.

---

## 6. Kịch bản 5 — Dừng khẩn cấp E-Stop

**Mục đích:** Cho thấy khả năng phản ứng khẩn cấp — dừng ngay thiết bị cho ăn.  
**Thời gian:** ~1 phút  
**Lưu ý:** Thực hiện ngay sau khi trigger cho ăn ở Kịch bản 4

---

### 6.1 Gửi lệnh E-Stop

```http
POST http://localhost:3000/devices/{{DEVICE_ID}}/emergency-stop
Authorization: Bearer {{FARMER_TOKEN}}
Content-Type: application/json

{
  "reason": "Phát hiện tôm nổi đầu bất thường"
}
```

**Response mẫu (200 OK):**

```json
{
  "success": true,
  "data": {
    "deviceId": "{{DEVICE_ID}}",
    "command": "EMERGENCY_STOP",
    "sentAt": "2026-11-23T14:15:03.500Z",
    "ackReceivedAt": "2026-11-23T14:15:03.780Z",
    "roundTripMs": 280,
    "feedingStopped": true,
    "currentFeedingRecordId": "rec_20261123_002",
    "recordStatus": "stopped_emergency"
  }
}
```

**Giải thích:**
> *"Latency E-Stop: 280ms. Từ lúc Farmer bấm 'Dừng khẩn cấp' đến khi thiết bị thực sự ngừng hoạt động chỉ mất 280ms qua kết nối MQTT. Hệ thống đồng thời cập nhật trạng thái feeding record thành `stopped_emergency` và gửi WebSocket notification đến tất cả các client đang kết nối."*

---

### 6.2 Kiểm tra alerts sau E-Stop

```http
GET http://localhost:3000/alerts/summary?pondId={{POND_ID}}
Authorization: Bearer {{MANAGER_TOKEN}}
```

**Response mẫu:**

```json
{
  "data": {
    "total": 3,
    "bySeverity": {
      "CRITICAL": 1,
      "HIGH": 0,
      "MEDIUM": 2
    },
    "latest": {
      "type": "EMERGENCY_STOP",
      "message": "Farmer đã dừng khẩn cấp thiết bị cho ăn: Phát hiện tôm nổi đầu bất thường",
      "createdAt": "2026-11-23T14:15:03.500Z",
      "severity": "CRITICAL"
    }
  }
}
```

---

## 7. Lưu ý khi demo trước hội đồng

### ✅ Checklist trước khi vào phòng bảo vệ

- [ ] Backend NestJS đang chạy ở `localhost:3000` (không lỗi startup)
- [ ] AI FastAPI đang chạy ở `localhost:8000` (health check: `GET /health`)
- [ ] Redis đang chạy (kiểm tra: `redis-cli ping` → PONG)
- [ ] Postman collection đã import, **tất cả biến đã điền** (POND_ID, DEVICE_ID, MANAGER_TOKEN, FARMER_TOKEN)
- [ ] Token chưa hết hạn (kiểm tra `exp` trong JWT decode)
- [ ] Telemetry "nước tốt" đã seed (DO=5.8, pH=7.8) — sẵn sàng cho Happy Path
- [ ] Có ít nhất 1 lịch cho ăn active với ID đã lưu
- [ ] Feeder device có status `online`

---

### 🎙️ Script nói chuyện theo thứ tự

| # | Demo | Câu dẫn |
|---|------|---------|
| 1 | AI Predict | *"Đây là core AI của hệ thống — model XGBoost 600 cây với R²=0.992. Khi gọi API, nó tự lấy telemetry và trả về lượng thức ăn kèm giải thích SHAP..."* |
| 2 | Happy Path | *"Giờ Farmer bấm 'Cho ăn ngay'. Backend kiểm tra 8 tiêu chí QCVN — tất cả pass — gửi lệnh MQTT xuống ESP32, nhận ACK trong 312ms, tạo record và push WebSocket..."* |
| 3 | Bad Path | *"Thử seed nước xấu — DO chỉ 2.8 mg/L. Hệ thống trả về 422, liệt kê chính xác 3 vi phạm, không gửi bất kỳ lệnh nào xuống thiết bị — tôm được bảo vệ tuyệt đối..."* |
| 4 | Auto Schedule | *"Lịch cho ăn tự động: cron mỗi phút, BullMQ idempotent — không bao giờ cho ăn 2 lần. Trigger ngay để demo không cần chờ đúng giờ..."* |
| 5 | E-Stop | *"Dừng khẩn cấp 1 chạm — 280ms từ app đến thiết bị. Farmer ngoài ao phát hiện bất thường, bấm 1 nút, thiết bị dừng ngay lập tức..."* |

---

### ⚠️ Tình huống xử lý sự cố khi demo

| Sự cố | Nguyên nhân | Xử lý nhanh |
|-------|-------------|-------------|
| `401 Unauthorized` | Token hết hạn | Gọi lại `/auth/login`, copy token mới vào Postman variable |
| `404 Not Found` trên pond | POND_ID sai | Gọi `GET /ponds`, copy ID mới |
| `503 AI Service Unavailable` | FastAPI chưa chạy | Chạy lại `python -m uvicorn app.main:app --port 8000` |
| Safety BLOCKED ở happy path | Telemetry cũ còn DO thấp | Seed lại telemetry tốt, chờ 5 giây rồi thử lại |
| Device offline | DEVICE_ID không online | Gọi `PATCH /devices/{{DEVICE_ID}}` set `status: online` (dev mode) |
| BullMQ job không chạy | Redis không kết nối | `redis-server` → `redis-cli ping` → PONG |

---

### 📊 Số liệu kỹ thuật cần thuộc lòng (hội đồng có thể hỏi)

| Chỉ số | Giá trị | Nguồn |
|--------|---------|-------|
| Model R² | **0.992** | Đo thực tế trên test set |
| Model MAE | **0.280 kg** | Đo thực tế trên test set |
| Model MAPE | **3.06%** | Đo thực tế trên test set |
| AI Latency | **0.45ms** | Trung bình 1000 lần đo local |
| E-Stop Latency | **< 800ms** (thực tế ~300ms) | MQTT QoS 1 + local network |
| BullMQ idempotency | Dùng key `scheduleId:timestamp` | Tránh duplicate |
| Alert cooldown | **15 phút** (Redis TTL = 900s) | Tránh spam notify |
| Telemetry freshness | **30 phút** | Nếu > 30 phút → BLOCKED |
| Safety rules | **8 rules** QCVN 02-19:2014 | DO, pH, NH3, Temp, Rain, TAN, TAN/DO ratio, Device |
| Training data | **4,000 records** | Sinh từ mô hình sinh học C.P. Group + QCVN |

---

> **Chúc nhóm 009 bảo vệ thành công! 🎓🦐**  
> *"The shrimp shall eat only when it is safe to eat."*

