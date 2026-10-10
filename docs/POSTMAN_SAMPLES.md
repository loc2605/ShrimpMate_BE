# ShrimpMate - Bo Mau Test Postman Cho Tat Ca API

Tai lieu nay cung cap day du cac mau request (Method, URL, Headers, JSON Body, Role quy dinh) de test toan bo API cua backend qua **Postman**.

---

## 1. Huong Dan Thiet Lap Postman Nhanh

### 1.1. Tao Environment trong Postman

Tao mot **Environment** moi (dat ten la `ShrimpMate Local`) voi cac bien sau:

| Variable Name | Initial Value | Ghi chu |
| --- | --- | --- |
| `baseUrl` | `http://localhost:3000` | Doi sang `http://192.168.24.35:3000` khi test khac may |
| `accessToken` | *(de trong)* | Tu dong luu sau khi dang nhap |
| `refreshToken` | *(de trong)* | Tu dong luu sau khi dang nhap |
| `farmId` | *(de trong)* | Luu ID lay tu API Farm |
| `pondId` | *(de trong)* | Luu ID lay tu API Pond |
| `deviceId` | *(de trong)* | Luu ID lay tu API Device |
| `cropSeasonId` | *(de trong)* | Luu ID lay tu API Crop Season |
| `feedingScheduleId` | *(de trong)* | Luu ID lay tu API Schedule |
| `feedingRecordId` | *(de trong)* | Luu ID lay tu API Record |

### 1.2. Tu dong luu `accessToken` sau khi dang nhap (Postman Test Script)

Trong Postman, tai request **POST Login**, vao tab **Tests** va dan doan script nay vao:

```javascript
if (pm.response.code === 200) {
    const res = pm.response.json();
    if (res.accessToken) {
        pm.environment.set("accessToken", res.accessToken);
        console.log("Da cap nhat accessToken moi!");
    }
    if (res.refreshToken) {
        pm.environment.set("refreshToken", res.refreshToken);
        console.log("Da cap nhat refreshToken moi!");
    }
}
```

Moi lan ban bam Send o request Login, Postman se tu dong luu token vao bien `{{accessToken}}` ma khong can copy tay!

### 1.3. Cau hinh Authorization o Collection hoac Folder

- Tab **Authorization**: Chon Type **Bearer Token**
- Token: `{{accessToken}}`

---

## 2. Tai Khoan Mau Co San (Seed Accounts)

He thong da co san 3 tai khoan voi 3 phan quyen khac nhau:

| Role | Email | So dien thoai | Mat khau | Ung dung su dung |
| --- | --- | --- | --- | --- |
| `admin` | `admin@shrimpmate.local` | `0901000001` | `Admin@123456` | Web Dashboard |
| `manager` | `manager@shrimpmate.local` | `0901000002` | `Manager@123456` | Web App |
| `farmer` | `farmer@shrimpmate.local` | `0901000003` | `Farmer@123456` | Mobile App |

---

## 3. Health Check

### [GET] Kiem tra server hoat dong
- **URL**: `{{baseUrl}}/`
- **Method**: `GET`
- **Auth**: Khong can
- **Expected Response**: `200 OK` (`Hello World!`)

---

## 4. Module Authentication & User (`/auth`)

### 4.1. [POST] Dang ky tai khoan Manager moi (Tu dang ky)
- **URL**: `{{baseUrl}}/auth/register`
- **Method**: `POST`
- **Auth**: Khong can
- **Ghi chu**: Nguoi dung tu dang ky se mac dinh nhan vai tro `manager` (Farmer khong tu dang ky).
- **Body (raw JSON)**:
```json
{
  "email": "manager_moi@example.com",
  "phoneNumber": "0912345678",
  "password": "Password@123",
  "fullName": "Le Van Manager"
}
```

### 4.2. [POST] Dang nhap (Lay Access Token & Refresh Token)
- **URL**: `{{baseUrl}}/auth/login`
- **Method**: `POST`
- **Auth**: Khong can
- **Body 1: Dang nhap bang Email (Admin)**:
```json
{
  "identifier": "admin@shrimpmate.local",
  "password": "Admin@123456"
}
```
- **Body 2: Dang nhap bang So dien thoai (Manager)**:
```json
{
  "identifier": "0901000002",
  "password": "Manager@123456"
}
```

### 4.3. [POST] Lam moi Token (Refresh Token)
- **URL**: `{{baseUrl}}/auth/refresh-token`
- **Method**: `POST`
- **Auth**: Khong can
- **Body (raw JSON)**:
```json
{
  "refreshToken": "{{refreshToken}}"
}
```

### 4.4. [POST] Quen mat khau (Yeu cau ma OTP)
- **URL**: `{{baseUrl}}/auth/forgot-password`
- **Method**: `POST`
- **Auth**: Khong can
- **Body 1: Yeu cau bang Email**:
```json
{
  "identifier": "admin@shrimpmate.local"
}
```
- **Body 2: Yeu cau bang So dien thoai**:
```json
{
  "identifier": "0901000001"
}
```
*(Luu y: Trong moi truong dev, ma OTP 6 so se duoc in thang ra terminal console cua server Backend)*

### 4.5. [POST] Dat lai mat khau bang ma OTP
- **URL**: `{{baseUrl}}/auth/reset-password`
- **Method**: `POST`
- **Auth**: Khong can
- **Body (raw JSON)**:
```json
{
  "identifier": "admin@shrimpmate.local",
  "otp": "123456",
  "newPassword": "NewPassword@123"
}
```

### 4.6. [GET] Lay thong tin user hien tai
- **URL**: `{{baseUrl}}/auth/me`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`, `operator`

### 4.7. [PATCH] Doi mat khau (User da dang nhap)
- **URL**: `{{baseUrl}}/auth/change-password`
- **Method**: `PATCH`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Body (raw JSON)**:
```json
{
  "currentPassword": "Admin@123456",
  "newPassword": "Admin@NewPass123"
}
```

### 4.8. [GET] Kiem tra quyen Admin
- **URL**: `{{baseUrl}}/auth/admin-check`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin` (Neu dang nhap role khac se tra ve `403 Forbidden`)

### 4.9. [GET] Admin lay danh sach tat ca tai khoan
- **URL**: `{{baseUrl}}/auth/users`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`

### 4.10. [POST] Admin tao tai khoan chi dinh Role
- **URL**: `{{baseUrl}}/auth/users`
- **Method**: `POST`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`
- **Body (raw JSON)**:
```json
{
  "email": "manager_new@shrimpmate.local",
  "phoneNumber": "0908888999",
  "password": "Manager@123456",
  "fullName": "Tran Quan Ly",
  "role": "manager"
}
```

### 4.11. [PATCH] Admin thay doi Role cua User
- **URL**: `{{baseUrl}}/auth/users/{{userId}}/role`
- **Method**: `PATCH`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`
- **Body (raw JSON)**:
```json
{
  "role": "manager"
}
```
*(Gia tri hop le: `admin`, `manager`, `operator`)*

### 4.12. [PATCH] Admin khoa hoac mo khoa tai khoan
- **URL**: `{{baseUrl}}/auth/users/{{userId}}/status`
- **Method**: `PATCH`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`
- **Body (raw JSON)**:
```json
{
  "isActive": false
}
```

### 4.13. [POST] Admin gan User vao Ao (Pond Assignment)
- **URL**: `{{baseUrl}}/auth/users/{{userId}}/ponds`
- **Method**: `POST`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`
- **Body (raw JSON)**:
```json
{
  "pondId": "{{pondId}}"
}
```

### 4.14. [DELETE] Admin go User khoi Ao
- **URL**: `{{baseUrl}}/auth/users/{{userId}}/ponds/{{pondId}}`
- **Method**: `DELETE`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`

---

## 5. Module Farm (Trang trai) (`/farms`)

### 5.1. [GET] Lay danh sach trang trai (Co phan trang)
- **URL**: `{{baseUrl}}/farms?page=1&limit=10`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`, `operator`

### 5.2. [POST] Tao trang trai moi
- **URL**: `{{baseUrl}}/farms`
- **Method**: `POST`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`
- **Body (raw JSON)**:
```json
{
  "name": "Trang trai Tom Sóng Vàng",
  "address": "Dong Hai, Bac Lieu, Viet Nam",
  "status": "active"
}
```
*(Gia tri status: `active`, `inactive`)*

### 5.3. [GET] Lay chi tiet trang trai theo ID
- **URL**: `{{baseUrl}}/farms/{{farmId}}`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`, `operator`

### 5.4. [PATCH] Cap nhat thong tin trang trai
- **URL**: `{{baseUrl}}/farms/{{farmId}}`
- **Method**: `PATCH`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`
- **Body (raw JSON)**:
```json
{
  "name": "Trang trai Tom Sóng Vàng - Khu A",
  "status": "active"
}
```

### 5.5. [DELETE] Xoa trang trai (Soft Delete)
- **URL**: `{{baseUrl}}/farms/{{farmId}}`
- **Method**: `DELETE`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`

---

## 6. Module Pond (Ao nuoi) (`/farms/:farmId/ponds`)

### 6.1. [GET] Lay danh sach ao cua trang trai
- **URL**: `{{baseUrl}}/farms/{{farmId}}/ponds?page=1&limit=20`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`, `operator`

### 6.2. [POST] Tao ao nuoi moi trong trang trai
- **URL**: `{{baseUrl}}/farms/{{farmId}}/ponds`
- **Method**: `POST`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`
- **Body (raw JSON)**:
```json
{
  "code": "POND-05",
  "name": "Ao So 5 - Uom giong",
  "areaM2": 2500,
  "status": "active"
}
```
*(Gia tri status: `active`, `inactive`, `maintenance`)*

### 6.3. [GET] Lay chi tiet ao nuoi
- **URL**: `{{baseUrl}}/farms/{{farmId}}/ponds/{{pondId}}`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`, `operator`

### 6.4. [PATCH] Cap nhat thong tin ao nuoi
- **URL**: `{{baseUrl}}/farms/{{farmId}}/ponds/{{pondId}}`
- **Method**: `PATCH`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`
- **Body (raw JSON)**:
```json
{
  "name": "Ao So 5 - Uom giong dot 1",
  "areaM2": 2600,
  "status": "active"
}
```

### 6.5. [DELETE] Xoa ao nuoi
- **URL**: `{{baseUrl}}/farms/{{farmId}}/ponds/{{pondId}}`
- **Method**: `DELETE`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`

---

## 7. Module Device (Thiet bi IoT) (`/devices`)

### 7.1. [GET] Lay danh sach thiet bi
- **URL**: `{{baseUrl}}/devices`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`, `operator`

### 7.2. [POST] Dang ky / Tao thiet bi moi
- **URL**: `{{baseUrl}}/devices`
- **Method**: `POST`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`
- **Body 1: May cho an (Feeder)**:
```json
{
  "deviceUid": "DEV-FEEDER-2026-01",
  "name": "Máy cho ăn tự động Ao 1",
  "type": "feeder",
  "status": "online",
  "mode": "automatic",
  "pondId": "{{pondId}}",
  "firmwareVersion": "1.2.0",
  "metadata": {
    "zone": "khu-bac",
    "feederCapacityKg": 50,
    "batteryPercent": 95
  }
}
```
- **Body 2: Tram cam bien moi truong (Sensor Node)**:
```json
{
  "deviceUid": "DEV-SENSOR-DO-001",
  "name": "Trạm cảm biến Oxy & pH Ao 1",
  "type": "sensor_node",
  "status": "online",
  "mode": "automatic",
  "pondId": "{{pondId}}",
  "firmwareVersion": "2.0.1",
  "metadata": {
    "sensorTypes": ["do", "ph", "temperature", "salinity"]
  }
}
```
*(Gia tri type: `feeder`, `sensor_node`, `camera`, `edge_gateway`)*  
*(Gia tri status: `online`, `offline`, `error`, `maintenance`)*  
*(Gia tri mode: `automatic`, `manual`, `emergency_stop`)*

### 7.3. [GET] Lay chi tiet thiet bi
- **URL**: `{{baseUrl}}/devices/{{deviceId}}`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`, `operator`

### 7.4. [PATCH] Cap nhat thong tin thiet bi
- **URL**: `{{baseUrl}}/devices/{{deviceId}}`
- **Method**: `PATCH`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`
- **Body (raw JSON)**:
```json
{
  "status": "online",
  "mode": "automatic",
  "firmwareVersion": "1.2.1"
}
```

### 7.5. [POST] Dung khan cap thiet bi (Emergency Stop)
- **URL**: `{{baseUrl}}/devices/{{deviceId}}/emergency-stop`
- **Method**: `POST`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`, `operator` (Dung de dung gap khi thiet bi gap su co)

### 7.6. [POST] Cap nhat Heartbeat cho thiet bi (REST test)
- **URL**: `{{baseUrl}}/devices/{{deviceId}}/heartbeat`
- **Method**: `POST`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`

### 7.7. [DELETE] Xoa thiet bi
- **URL**: `{{baseUrl}}/devices/{{deviceId}}`
- **Method**: `DELETE`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`

---

## 8. Module Crop Season (Vu nuoi)

### 8.1. [GET] Lay danh sach vu nuoi cua ao
- **URL**: `{{baseUrl}}/ponds/{{pondId}}/crop-seasons`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`, `operator`

### 8.2. [POST] Tao vu nuoi moi cho ao
- **URL**: `{{baseUrl}}/ponds/{{pondId}}/crop-seasons`
- **Method**: `POST`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`
- **Body (raw JSON)**:
```json
{
  "name": "Vụ Tôm Thẻ Chân Trắng - Mùa Mưa 2026",
  "stockingDate": "2026-09-20",
  "initialCount": 250000,
  "stockingDensity": 80.5,
  "initialAverageWeightG": 0.02,
  "estimatedSurvivalRate": 88.5,
  "status": "planned"
}
```
*(Gia tri status: `planned`, `active`, `completed`, `cancelled`)*  
*(Luu y: Moi ao chi duoc phep co toi da 1 vu o trang thai `active` tai mot thoi diem)*

### 8.3. [GET] Lay chi tiet vu nuoi
- **URL**: `{{baseUrl}}/crop-seasons/{{cropSeasonId}}`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`, `operator`

### 8.4. [PATCH] Cap nhat thong tin / trang thai vu nuoi
- **URL**: `{{baseUrl}}/crop-seasons/{{cropSeasonId}}`
- **Method**: `PATCH`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`
- **Body 1: Kich hoat vu nuoi thanh `active`**:
```json
{
  "status": "active"
}
```
- **Body 2: Ket thuc vu nuoi thanh `completed`**:
```json
{
  "status": "completed"
}
```

### 8.5. [DELETE] Xoa vu nuoi
- **URL**: `{{baseUrl}}/crop-seasons/{{cropSeasonId}}`
- **Method**: `DELETE`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`

---

## 9. Module Feeding (Cho an & Lich trinh)

### 9.1. [GET] Lay danh sach lich cho an cua ao
- **URL**: `{{baseUrl}}/ponds/{{pondId}}/feeding-schedules`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`, `operator`

### 9.2. [POST] Tao lich cho an moi
- **URL**: `{{baseUrl}}/ponds/{{pondId}}/feeding-schedules`
- **Method**: `POST`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`
- **Body (raw JSON)**:
```json
{
  "name": "Cữ cho ăn sáng",
  "timeOfDay": "07:30",
  "feedAmountKg": 15.5,
  "spreadRateKgPerMinute": 1.5,
  "daysOfWeek": [1, 2, 3, 4, 5, 6, 0],
  "isEnabled": true
}
```
*(Chu thich: `daysOfWeek`: mang chua cac ngay trong tuan tu `0` den `6`, voi `0` la Chu Nhat)*

### 9.3. [PATCH] Cap nhat lich cho an
- **URL**: `{{baseUrl}}/feeding-schedules/{{feedingScheduleId}}`
- **Method**: `PATCH`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`
- **Body (raw JSON)**:
```json
{
  "feedAmountKg": 18.0,
  "isEnabled": true
}
```

### 9.4. [DELETE] Xoa lich cho an
- **URL**: `{{baseUrl}}/feeding-schedules/{{feedingScheduleId}}`
- **Method**: `DELETE`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`

### 9.5. [GET] Lay lich su nhat ky cho an cua ao
- **URL**: `{{baseUrl}}/ponds/{{pondId}}/feeding-records`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`, `operator`

### 9.6. [POST] Tao nhat ky cho an moi (Feeding Record)
- **URL**: `{{baseUrl}}/ponds/{{pondId}}/feeding-records`
- **Method**: `POST`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`
- **Body (raw JSON)**:
```json
{
  "deviceId": "{{deviceId}}",
  "scheduleId": "{{feedingScheduleId}}",
  "requestedAmountKg": 15.5,
  "actualAmountKg": 15.2,
  "source": "schedule",
  "status": "requested"
}
```
*(Gia tri source: `schedule`, `manual`, `ai`)*  
*(Gia tri status: `requested`, `running`, `completed`, `stopped`, `failed`)*  
*(Luu y: Ao phai dang co 1 vu nuoi o trang thai `active` thi moi tao duoc feeding record)*

### 9.7. [PATCH] Cap nhat ket qua lan cho an (Thuc an thuc te / Thuc an thua)
- **URL**: `{{baseUrl}}/feeding-records/{{feedingRecordId}}`
- **Method**: `PATCH`
- **Auth**: Bearer Token (`{{accessToken}}`)
- **Role**: `admin`, `manager`
- **Body (raw JSON)**:
```json
{
  "status": "completed",
  "actualAmountKg": 15.2,
  "appetiteLevel": 2,
  "leftoverPercent": 2.5
}
```
*(Gia tri appetiteLevel: `1` (it an / yeu), `2` (binh thuong), `3` (an manh))*

---

## 10. Module Quan Ly Farmer & Phan Cong Ao Nuoi (`/farmers`)

### 10.1. [POST] Manager tao tai khoan Farmer moi (UC020)
- **URL**: `{{baseUrl}}/farmers`
- **Method**: `POST`
- **Auth**: Bearer Token (`{{accessToken}}` cua Manager)
- **Role**: `manager`
- **Body (raw JSON)**:
```json
{
  "fullName": "Nguyen Van Farmer",
  "phoneNumber": "0988776655",
  "email": "farmer_moi@shrimpmate.local"
}
```
- **Response**: Tra ve thong tin Farmer kem theo `temporaryPassword` (mat khau ngau nhien do he thong sinh ra nhu `Fm#k9xP!2a`, chi hien thi 1 lan).

### 10.2. [GET] Manager xem danh sach Farmer thuoc quyen quan ly
- **URL**: `{{baseUrl}}/farmers`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}` cua Manager)
- **Role**: `manager`

### 10.3. [GET] Manager xem chi tiet 1 Farmer kem cac ao duoc phan cong
- **URL**: `{{baseUrl}}/farmers/{{farmerId}}`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}` cua Manager)
- **Role**: `manager`

### 10.4. [PATCH] Manager khoa / mo khoa tai khoan Farmer
- **URL**: `{{baseUrl}}/farmers/{{farmerId}}/status`
- **Method**: `PATCH`
- **Auth**: Bearer Token (`{{accessToken}}` cua Manager)
- **Role**: `manager`
- **Body (raw JSON)**:
```json
{
  "isActive": false
}
```

### 10.5. [POST] Manager phan cong ao nuoi / trang trai cho Farmer (UC021)
- **URL**: `{{baseUrl}}/farmers/assignments`
- **Method**: `POST`
- **Auth**: Bearer Token (`{{accessToken}}` cua Manager)
- **Role**: `manager`
- **Body (raw JSON)**:
```json
{
  "farmerId": "{{farmerId}}",
  "farmId": "{{farmId}}",
  "pondId": "{{pondId}}"
}
```
*(Luu y: Bo qua `pondId` neu muon phan cong Farmer quan ly toan bo cac ao trong Farm)*

### 10.6. [GET] Manager xem danh sach tat ca phan cong
- **URL**: `{{baseUrl}}/farmers/assignments/list`
- **Method**: `GET`
- **Auth**: Bearer Token (`{{accessToken}}` cua Manager)
- **Role**: `manager`

### 10.7. [DELETE] Manager thu hoi phan cong ao
- **URL**: `{{baseUrl}}/farmers/assignments/{{assignmentId}}`
- **Method**: `DELETE`
- **Auth**: Bearer Token (`{{accessToken}}` cua Manager)
- **Role**: `manager`

---

## 11. Kich Ban Kiem Thu Toan Dien 3 Role (End-to-End Test Workflow)

Kich ban nay kiem thu tron ven luong nghiep vu 3 role tu khoi tao den van hanh:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin (Web Dash)
    actor Manager as Manager (Web App)
    actor Farmer as Farmer (Mobile App)
    participant BE as ShrimpMate Backend

    Note over Admin, BE: GIAI DOAN 1: ADMIN KIEM TRA NEN TANG
    Admin->>BE: POST /auth/login (Admin)
    Admin->>BE: GET /admin/overview
    Admin->>BE: GET /devices (Kiem tra Hardware Catalog)

    Note over Manager, BE: GIAI DOAN 2: MANAGER DANG KY & THIET LAP TRANG TRAI
    Manager->>BE: POST /auth/register (Tao tai khoan Manager)
    Manager->>BE: POST /auth/login (Lay Manager Token)
    Manager->>BE: POST /farms (Tao Trang trai moi)
    Manager->>BE: POST /farms/:farmId/ponds (Tao Ao nuoi moi)

    Note over Manager, BE: GIAI DOAN 3: MANAGER TAO FARMER & PHAN CONG AO (UC020, UC021)
    Manager->>BE: POST /farmers (Tao Farmer -> BE sinh pass ngau nhien)
    Manager->>BE: POST /farmers/assignments (Phan cong Ao cho Farmer)

    Note over Manager, BE: GIAI DOAN 4: MANAGER CAU HINH VAN HANH
    Manager->>BE: POST /devices/claim (Gan thiet bi DEV-FEEDER-001 vao ao)
    Manager->>BE: POST /ponds/:pondId/crop-seasons (Tao vu nuoi)
    Manager->>BE: PATCH /crop-seasons/:id (Kich hoat status 'active')
    Manager->>BE: POST /ponds/:pondId/feeding-schedules (Cai dat lich cho an)

    Note over Farmer, BE: GIAI DOAN 5: FARMER VAN HANH NGOAI BO AO (MOBILE APP)
    Farmer->>BE: POST /auth/login (Dang nhap bang mat khau tam duoc cap)
    Farmer->>BE: GET /ponds (Chi thay ao duoc Manager phan cong)
    Farmer->>BE: GET /ponds/:pondId/telemetry/latest (Xem gauges nuoc tuc thoi)
    Farmer->>BE: POST /devices/:feederId/quick-feed (Cho an nhanh 1-tap)
    Farmer->>BE: POST /devices/:feederId/emergency-stop (Dung khan cap 1-tap)
    Farmer->>BE: PATCH /alerts/:alertId/resolve (Xac nhan da xu ly su co)

    Note over Admin, BE: GIAI DOAN 6: ADMIN QUAN LY & KHOA TAI KHOAN
    Admin->>BE: GET /auth/users (Xem danh sach tat ca Manager & Farmer)
    Admin->>BE: PATCH /auth/users/:farmerId/status (Khoa/Mo khoa tai khoan)
```

### Chi tiet cac buoc thuc hien:

#### Giai doan 1: Admin kiem tra he thong
1. **Dang nhap Admin**: `POST {{baseUrl}}/auth/login` voi body `{"identifier": "admin@shrimpmate.local", "password": "Admin@123456"}`. Luu `accessToken`.
2. **Xem tong quan**: `GET {{baseUrl}}/admin/overview`.
3. **Kiem tra Catalog thiet bi IoT**: `GET {{baseUrl}}/devices`. Luu ID cua thiet bi `DEV-FEEDER-001` vao `{{deviceId}}`.

#### Giai doan 2: Manager dang ky & tao Farm/Ao
4. **Dang ky Manager**: `POST {{baseUrl}}/auth/register` voi body `{"email": "boss@shrimpmate.local", "phoneNumber": "0981112233", "password": "Password@123", "fullName": "Nguyen Farm Boss"}`.
5. **Dang nhap Manager**: `POST {{baseUrl}}/auth/login` voi body `{"identifier": "boss@shrimpmate.local", "password": "Password@123"}`. Cap nhat `accessToken` bang token cua Manager.
6. **Tao Farm**: `POST {{baseUrl}}/farms` voi body:
```json
{
  "name": "Trang Trai Soc Trang 01",
  "address": "My Xuyen, Soc Trang",
  "status": "active"
}
```
*(Luu `id` tra ve vao `{{farmId}}`).*

7. **Tao Ao**: `POST {{baseUrl}}/farms/{{farmId}}/ponds` voi body:
```json
{
  "code": "POND-01",
  "name": "Ao So 1",
  "areaM2": 1500,
  "status": "active"
}
```
*(Luu `id` tra ve vao `{{pondId}}`).*

#### Giai doan 3: Manager tao Farmer & phan cong ao
8. **Tao Farmer**: `POST {{baseUrl}}/farmers` voi body `{"fullName": "Anh Ba Nuoi Tom", "phoneNumber": "0977889900", "email": "anhba@shrimpmate.local"}`.
   - Ghi nhan `temporaryPassword` trong response (vi du: `Fm#x9P!2a`) va `id` cua Farmer vao `{{farmerId}}`.
9. **Phan cong Ao cho Farmer**: `POST {{baseUrl}}/farmers/assignments` voi body `{"farmerId": "{{farmerId}}", "farmId": "{{farmId}}", "pondId": "{{pondId}}"}`.

#### Giai doan 4: Manager cau hinh thiet bi, vu nuoi & lich an
10. **Gan thiet bi vao Ao**: `POST {{baseUrl}}/devices/claim` voi body `{"deviceUid": "DEV-FEEDER-002", "pondId": "{{pondId}}"}`.
11. **Tao vu nuoi**: `POST {{baseUrl}}/ponds/{{pondId}}/crop-seasons` voi body:
```json
{
  "name": "Vu Mua Mua 2026",
  "stockingDate": "2026-10-10",
  "initialCount": 80000,
  "stockingDensity": 50.0,
  "initialAverageWeightG": 0.8,
  "estimatedSurvivalRate": 85.0,
  "status": "planned"
}
```
*(Luu `id` tra ve vao `{{cropSeasonId}}`).*

12. **Kich hoat vu nuoi**: `PATCH {{baseUrl}}/crop-seasons/{{cropSeasonId}}` voi body `{"status": "active"}`.
13. **Tao lich an tuan**: `POST {{baseUrl}}/ponds/{{pondId}}/feeding-schedules` voi body:
```json
{
  "name": "Cu cho an sang",
  "feedAmountKg": 10.0,
  "timeOfDay": "07:30",
  "daysOfWeek": [1, 2, 3, 4, 5, 6, 0],
  "isEnabled": true
}
```

#### Giai doan 5: Farmer van hanh ngoai bo ao (Mobile App)
14. **Dang nhap Farmer**: `POST {{baseUrl}}/auth/login` voi identifier `0977889900` va password la `temporaryPassword` vua duoc cap. Luu token vao bien `{{farmerAccessToken}}`.
15. **Kiem tra ao duoc phan cong**: `GET {{baseUrl}}/ponds` (Authorization: Bearer `{{farmerAccessToken}}`).
    - *Ket qua mong doi*: Farmer chi thay dung "Ao So 1" vua duoc phan cong.
16. **Kiem tra chan bao mat**: Thu goi `GET {{baseUrl}}/ponds/<id-ao-cua-manager-khac>` (ao khong duoc phan cong).
    - *Ket qua mong doi*: Backend tra ve `403 Forbidden` (`Bạn không có quyền truy cập ao nuôi này`).
17. **Xem thong so moi truong tuc thoi**: `GET {{baseUrl}}/ponds/{{pondId}}/telemetry/latest`.
18. **Dung khan cap 1-tap**: `POST {{baseUrl}}/devices/{{deviceId}}/emergency-stop` voi body `{"reason": "Phat hien chim nuoc ngoai ao"}`.
19. **Cho an nhanh 1-tap**: `POST {{baseUrl}}/devices/{{deviceId}}/quick-feed` voi body `{"feedAmountKg": 2.5, "dispenseDurationSec": 30}`.
20. **Xu ly canh bao**: `PATCH {{baseUrl}}/alerts/{{alertId}}/resolve` voi body `{"actionTaken": "Da bat quat nuoc bo sung oxy"}`.

#### Giai doan 6: Admin giam sat & can thiep
21. **Dang nhap lai Admin**: `POST {{baseUrl}}/auth/login` bang tai khoan admin.
22. **Xem toan bo nguoi dung**: `GET {{baseUrl}}/auth/users`.
23. **Khoa tai khoan bat thuong**: `PATCH {{baseUrl}}/auth/users/{{farmerId}}/status` voi body `{"isActive": false}`.

