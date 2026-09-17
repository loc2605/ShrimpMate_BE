# ShrimpMate Backend API

## 1. Thong tin chung

- Base URL: `http://localhost:3000`
- Content-Type: `application/json`
- Cac API duoc bao ve su dung JWT can header:

```http
Authorization: Bearer <access_token>
```

### Role

- `admin`: toan quyen
- `manager`: xem, tao va cap nhat du lieu van hanh
- `operator`: chi xem du lieu

Neu khong co token hoac token khong hop le, API tra ve `401 Unauthorized`.
Neu role khong du quyen, API tra ve `403 Forbidden`.

---

## 2. Health check

### Kiem tra server

```http
GET /
```

Response:

```text
Hello World!
```

---

## 3. Authentication API

### Dang ky tai khoan

```http
POST /auth/register
```

Body:

```json
{
  "email": "operator@example.com",
  "password": "password123",
  "fullName": "Nguyen Van Operator"
}
```

Quyen: khong can dang nhap.

Ghi chu: tai khoan dang ky moi mac dinh co role `operator`.

Tai khoan mau cho moi truong local duoc tao tu dong khi backend khoi dong:

| Role | Email | Mat khau |
| --- | --- | --- |
| `admin` | `admin@shrimpmate.local` | `Admin@123456` |
| `manager` | `manager@shrimpmate.local` | `Manager@123456` |

Co the thay doi cac tai khoan mau bang cac bien moi truong `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_MANAGER_EMAIL` va `SEED_MANAGER_PASSWORD`.

### Dang nhap

```http
POST /auth/login
```

Body:

```json
{
  "email": "operator@example.com",
  "password": "password123"
}
```

Quyen: khong can dang nhap.

Response gom `accessToken` va thong tin user an toan, khong bao gom `passwordHash`:

```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "operator@example.com",
    "fullName": "Nguyen Van Operator",
    "role": "operator",
    "isActive": true
  }
}
```

### Lay thong tin tai khoan hien tai

```http
GET /auth/me
```

Quyen: `admin`, `manager`, `operator`.

### Kiem tra quyen Admin

```http
GET /auth/admin-check
```

Quyen: `admin`.

Response:

```json
{
  "message": "Ban co quyen Admin"
}
```

---

## 4. Farm API

### Lay danh sach Farm

```http
GET /farms
```

Quyen: `admin`, `manager`, `operator`.

### Tao Farm

```http
POST /farms
```

Quyen: `admin`, `manager`.

Body:

```json
{
  "name": "Trang trai Tom Hung Phat",
  "address": "Bac Lieu, Viet Nam",
  "status": "active"
}
```

Gia tri `status`: `active`, `inactive`.

### Lay chi tiet Farm

```http
GET /farms/:id
```

Quyen: `admin`, `manager`, `operator`.

Vi du:

```http
GET /farms/788b3aaf-8235-45fb-8214-abe3aaed2bb5
```

### Cap nhat Farm

```http
PATCH /farms/:id
```

Quyen: `admin`, `manager`.

Body co the gui mot phan:

```json
{
  "name": "Trang trai Tom Hung Phat - Mo rong",
  "status": "active"
}
```

### Xoa Farm

```http
DELETE /farms/:id
```

Quyen: `admin`.

Luu y: xoa Farm se xoa cac Pond thuoc Farm do theo quan he cascade.

---

## 5. Pond API

### Lay danh sach Pond cua Farm

```http
GET /farms/:farmId/ponds
```

Quyen: `admin`, `manager`, `operator`.

Vi du:

```http
GET /farms/788b3aaf-8235-45fb-8214-abe3aaed2bb5/ponds
```

### Tao Pond

```http
POST /farms/:farmId/ponds
```

Quyen: `admin`, `manager`.

Body:

```json
{
  "code": "POND-05",
  "name": "Ao 5 - Nuoi thu nghiem",
  "areaM2": 2500,
  "status": "active"
}
```

Gia tri `status`: `active`, `inactive`, `maintenance`.

### Lay chi tiet Pond

```http
GET /farms/:farmId/ponds/:id
```

Quyen: `admin`, `manager`, `operator`.

### Cap nhat Pond

```http
PATCH /farms/:farmId/ponds/:id
```

Quyen: `admin`, `manager`.

Body:

```json
{
  "name": "Ao 1 - Da cap nhat",
  "areaM2": 3500,
  "status": "active"
}
```

### Xoa Pond

```http
DELETE /farms/:farmId/ponds/:id
```

Quyen: `admin`.

---

## 6. Device API

### Lay danh sach Device

```http
GET /devices
```

Quyen: `admin`, `manager`, `operator`.

### Tao Device

```http
POST /devices
```

Quyen: `admin`, `manager`.

Body:

```json
{
  "deviceUid": "DEV-FEEDER-001",
  "name": "May cho an Ao 1",
  "type": "feeder",
  "status": "online",
  "mode": "automatic",
  "pondId": "f2a0d8a7-9a19-4b6d-90f6-8c7dbe6d7d91",
  "firmwareVersion": "1.0.0",
  "metadata": {
    "zone": "north",
    "batteryLevel": 88
  }
}
```

Gia tri `type`: `feeder`, `sensor_node`, `camera`, `edge_gateway`.
Gia tri `status`: `online`, `offline`, `error`, `maintenance`.
Gia tri `mode`: `automatic`, `manual`, `emergency_stop`.

Neu `pondId` duoc gui thi phai ton tai trong `ponds`.
`deviceUid` phai unique trong he thong.

### Lay chi tiet Device

```http
GET /devices/:id
```

Quyen: `admin`, `manager`, `operator`.

### Cap nhat Device

```http
PATCH /devices/:id
```

Quyen: `admin`, `manager`.

Body co the gui mot phan:

```json
{
  "status": "maintenance",
  "mode": "manual",
  "pondId": null
}
```

### Xoa Device

```http
DELETE /devices/:id
```

Quyen: `admin`.

---

## 7. Crop Season API

Crop Season la thong tin mot vu nuoi gan voi mot Pond.

### Lay danh sach vu nuoi cua Pond

```http
GET /ponds/:pondId/crop-seasons
```

Quyen: `admin`, `manager`, `operator`.

Vi du:

```http
GET /ponds/208cf3b7-a60f-4c83-83b0-54d06fee3d97/crop-seasons
```

### Tao vu nuoi

```http
POST /ponds/:pondId/crop-seasons
```

Quyen: `admin`, `manager`.

Body:

```json
{
  "name": "Vu tom the chan trang 2026 - Dot 3",
  "stockingDate": "2026-09-15",
  "initialCount": 200000,
  "stockingDensity": 62.5,
  "initialAverageWeightG": 0.02,
  "estimatedSurvivalRate": 85,
  "status": "planned"
}
```

Gia tri `status`: `planned`, `active`, `completed`, `cancelled`.

Moi Pond chi duoc co mot Crop Season o trang thai `active`.

### Lay chi tiet vu nuoi

```http
GET /crop-seasons/:id
```

Quyen: `admin`, `manager`, `operator`.

### Cap nhat vu nuoi

```http
PATCH /crop-seasons/:id
```

Quyen: `admin`, `manager`.

Body:

```json
{
  "status": "completed"
}
```

### Xoa vu nuoi

```http
DELETE /crop-seasons/:id
```

Quyen: `admin`.

---

## 8. Feeding API

### Lay danh sach lich cho an cua Pond

```http
GET /ponds/:pondId/feeding-schedules
```

Quyen: `admin`, `manager`, `operator`.

### Tao lich cho an

```http
POST /ponds/:pondId/feeding-schedules
```

Quyen: `admin`, `manager`.

Body:

```json
{
  "name": "Lich cho an sang",
  "timeOfDay": "08:00",
  "feedAmountKg": 12.5,
  "spreadRateKgPerMinute": 1.25,
  "daysOfWeek": [1, 2, 3, 4, 5, 6, 0],
  "isEnabled": true
}
```

`timeOfDay` dung dinh dang `HH:mm` hoac `HH:mm:ss`. `daysOfWeek` dung gia tri tu `0` den `6`, trong do `0` la Chu Nhat. Khoi luong phai lon hon `0`.

### Cap nhat lich cho an

```http
PATCH /feeding-schedules/:id
```

Quyen: `admin`, `manager`.

### Xoa lich cho an

```http
DELETE /feeding-schedules/:id
```

Quyen: `admin`.

### Tao Feeding Record

```http
POST /ponds/:pondId/feeding-records
```

Quyen: `admin`, `manager`.

Body:

```json
{
  "deviceId": "uuid-cua-device",
  "scheduleId": "uuid-cua-schedule",
  "requestedAmountKg": 12.5,
  "actualAmountKg": 12.3,
  "source": "schedule",
  "status": "completed",
  "appetiteLevel": 2,
  "leftoverPercent": 3.5
}
```

Gia tri `source`: `schedule`, `manual`, `ai`. Gia tri `status`: `requested`, `running`, `completed`, `stopped`, `failed`.

`deviceId` va `scheduleId` la tuy chon, nhung neu gui thi phai ton tai va thuoc cung Pond. Neu khong gui `startedAt`, he thong tu dong dung thoi diem hien tai.

### Lay lich su cho an cua Pond

```http
GET /ponds/:pondId/feeding-records
```

Quyen: `admin`, `manager`, `operator`.

---

## 9. Du lieu seed hien tai

Ung dung tu dong tao du lieu mau khi khoi dong neu database chua co du lieu:

- 3 Farm mau
- 4 Pond mau
- 2 Crop Season mau
- 3 Device mau
- 3 Feeding Schedule mau

Du lieu seed nam tai:

- `src/database/seeds/farm-pond.seed.ts`
- `src/database/seeds/crop-season.seed.ts`
- `src/database/seeds/device.seed.ts`
- `src/database/seeds/feeding.seed.ts`

Seed co tinh idempotent: neu bang da co du lieu thi khong tao trung lan nua.

---

## 10. Module dang cho trien khai

Cac controller duoc hoan thien:

- `/devices` - hoan thien
- `/feeding`
- `/telemetry`
- `/mqtt`

Hien tai cac module con lai chua la placeholder va chua nen dung de test API nghiep vu.

---

## 11. Cach test nhanh bang Postman

1. Goi `POST /auth/login` de lay `accessToken`.
2. Trong Postman chon tab `Authorization`.
3. Chon type `Bearer Token`.
4. Paste phan token bat dau bang `eyJ...`, khong paste chu `Bearer` va khong them dau `< >`.
5. Test `GET /farms`.
6. Lay `farmId`, sau do test `GET /farms/:farmId/ponds`.
7. Lay `pondId`, sau do test `GET /ponds/:pondId/crop-seasons`.

Token co thoi han. Neu gap `401 Unauthorized`, hay dang nhap lai de lay token moi.
