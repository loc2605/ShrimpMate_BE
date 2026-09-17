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
- `operator`: chi xem du lieu trong cac Pond duoc gan, duoc phep dung emergency stop Device

Neu khong co token hoac token khong hop le, API tra ve `401 Unauthorized`.
Neu role khong du quyen, API tra ve `403 Forbidden`.

### Format loi chung

Loi validation `400 Bad Request`:

```json
{
  "statusCode": 400,
  "message": [
    "areaM2 must be a number conforming to the specified constraints",
    "Diện tích ao phải lớn hơn 0"
  ],
  "error": "Bad Request"
}
```

`message` la mang cac loi validation; FE nen hien thi hoac map theo tung truong input. Cac loi nghiep vu cung dung `400` nhung `message` co the la mot chuoi, vi du `Mỗi ao chỉ được có một vụ nuôi đang hoạt động`.

Loi khong tim thay `404 Not Found`:

```json
{
  "statusCode": 404,
  "message": "Không tìm thấy ao nuôi với id <pondId>",
  "error": "Not Found"
}
```

FE nen xu ly `statusCode` truoc, sau do doc `message` de hien thi thong bao phu hop.

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
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "operator@example.com",
    "fullName": "Nguyen Van Operator",
    "role": "operator",
    "isActive": true,
    "createdAt": "2026-09-17T05:20:14.217Z",
    "updatedAt": "2026-09-17T05:20:14.217Z"
  }
}
```

`accessToken` dung de goi API va co thoi han theo `JWT_EXPIRES_IN`. Khi access token het han, gui `refreshToken` den `POST /auth/refresh-token` de nhan cap token moi. Refresh token duoc rotate moi lan refresh.

### Lam moi token

```http
POST /auth/refresh-token
```

Quyen: khong can access token, nhung bat buoc co refresh token hop le.

Body:

```json
{
  "refreshToken": "eyJ..."
}
```

### Doi mat khau

```http
PATCH /auth/change-password
```

Quyen: user da dang nhap.

Body:

```json
{
  "currentPassword": "password-cu",
  "newPassword": "password-moi-123"
}
```

Doi mat khau se huy refresh token hien tai; user can dang nhap lai tren cac thiet bi.

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
  "message": "Bạn có quyền Admin"
}
```

### Lay danh sach tai khoan

```http
GET /auth/users
```

Quyen: `admin`.

### Khoa hoac mo khoa tai khoan

```http
PATCH /auth/users/:id/status
```

Quyen: `admin`.

Body:

```json
{
  "isActive": false
}
```

Tai khoan bi khoa khong the dang nhap va cac refresh token cua tai khoan do bi huy. Admin khong the tu khoa tai khoan dang dang nhap.

### Gan User vao Pond

```http
POST /auth/users/:userId/ponds
```

Quyen: `admin`.

Body: `{ "pondId": "uuid-cua-pond" }`.

### Huy gan User khoi Pond

```http
DELETE /auth/users/:userId/ponds/:pondId
```

Quyen: `admin`.

Operator chi xem va thao tac tren cac Pond duoc gan; manager/admin van co quyen toan he thong theo role hien tai.

---

## 4. Farm API

### Lay danh sach Farm

```http
GET /farms
```

Quyen: `admin`, `manager`, `operator`.

Query tuy chon: `page` (mac dinh `1`) va `limit` (mac dinh `20`, toi da `100`). Vi du: `GET /farms?page=1&limit=20`.
Response gom `data` va `meta` (`page`, `limit`, `total`, `pageCount`).

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

`name` khong duoc rong hoac chi gom khoang trang.

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

Luu y: Farm va cac Pond thuoc Farm duoc soft delete bang `deletedAt`, khong xoa cung du lieu lich su Crop Season, Feeding Record, Telemetry va Alert.

---

## 5. Pond API

### Lay danh sach Pond cua Farm

```http
GET /farms/:farmId/ponds
```

Quyen: `admin`, `manager`, `operator`.

Query tuy chon: `page` (mac dinh `1`) va `limit` (mac dinh `20`, toi da `100`). Vi du: `GET /farms/:farmId/ponds?page=1&limit=20`.
Response gom `data` va `meta` (`page`, `limit`, `total`, `pageCount`).

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

`name` khong duoc rong hoac chi gom khoang trang; `areaM2` phai lon hon `0`.

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
`deviceUid` phai unique trong he thong. Rang buoc unique duoc dat o database, nen truong hop hai request dong thoi dang ky cung UID van bi chan.

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

### Dừng khẩn cấp Device

```http
POST /devices/:id/emergency-stop
```

Quyen: `admin`, `manager`, `operator`.

Endpoint này chỉ đổi `mode` sang `emergency_stop`; operator không được dùng `PATCH /devices/:id` để thay đổi các thuộc tính quản trị khác.

### Cập nhật heartbeat Device

```http
POST /devices/:id/heartbeat
```

Quyen: `admin`, `manager` cho thao tác REST test/thủ công. Operator không gọi endpoint này. Thiết bị thật nên gửi heartbeat qua MQTT; khi đó MQTT là nguồn cập nhật `lastSeenAt` chính.

Endpoint cập nhật `lastSeenAt` thành thời điểm hiện tại để theo dõi thiết bị mất kết nối. MQTT có thể gọi cùng service này khi tích hợp.

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

`name` khong duoc rong; `stockingDate` khong duoc vuot qua mot nam trong tuong lai; `initialCount` va `stockingDensity` phai lon hon `0`. Moi Pond chi duoc co mot Crop Season o trang thai `active`, duoc bao ve boi unique partial index o database.

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
Khong the tao hoac cap nhat hai lich cua cung Pond neu trung `timeOfDay` va co it nhat mot ngay trong `daysOfWeek` trung nhau.

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
  "source": "schedule"
}
```

Gia tri `source`: `schedule`, `manual`, `ai`. Gia tri `status`: `requested`, `running`, `completed`, `stopped`, `failed`.

Record moi luon bat dau o trang thai `requested`; dung PATCH de chuyen sang `running`, `completed`, `stopped` hoac `failed`.

`deviceId` va `scheduleId` la tuy chon, nhung neu gui thi phai ton tai va thuoc cung Pond. Pond phai co Crop Season dang `active`; sau khi vu chuyen sang `completed`, he thong khong cho tao Feeding Schedule/Record moi. Neu khong gui `startedAt`, he thong tu dong dung thoi diem hien tai.

`appetiteLevel` va `leftoverPercent` hien la input thu cong de phuc vu demo/vận hành. Khi tich hop AI, AI service co the cap nhat cung record qua PATCH nay; khong can doi schema hay tao luong ghi moi.

### Lay lich su cho an cua Pond

```http
GET /ponds/:pondId/feeding-records
```

Quyen: `admin`, `manager`, `operator`.

### Cap nhat Feeding Record

```http
PATCH /feeding-records/:id
```

Quyen: `admin`, `manager`.

Dung de cap nhat trang thai theo luong `requested` -> `running` -> `completed` (hoac `stopped`/`failed`) va bo sung `actualAmountKg` khi thiet bi bao ket qua.

Body:

```json
{
  "status": "completed",
  "actualAmountKg": 12.3,
  "appetiteLevel": 2,
  "leftoverPercent": 3.5
}
```

Khong the chuyen nguoc trang thai hoac cap nhat record da ket thuc sang trang thai khac.

---

## 9. Du lieu seed hien tai

Ung dung tu dong tao du lieu mau khi khoi dong neu database chua co du lieu:

- 3 Farm mau
- 4 Pond mau
- 2 Crop Season mau
- 3 Device mau
- 3 Feeding Schedule mau
- 3 tai khoan mau trong moi truong khong phai production

Du lieu seed nam tai:

- `src/database/seeds/farm-pond.seed.ts`
- `src/database/seeds/crop-season.seed.ts`
- `src/database/seeds/device.seed.ts`
- `src/database/seeds/feeding.seed.ts`
- `src/database/seeds/user.seed.ts`
- `src/database/seeds/user-pond-assignment.seed.ts`

Seed co tinh idempotent: neu bang da co du lieu thi khong tao trung lan nua.
User operator mau duoc gan hai Pond dau tien boi `user-pond-assignment.seed.ts`; cac user dang ky moi khong duoc gan Pond tu dong va can Admin gan qua API assignment.

Heartbeat thiet bi that se duoc chuyen sang MQTT khi module MQTT duoc trien khai; endpoint REST hien chi phuc vu test/thao tac thu cong.

---

## 10. Module dang cho trien khai

Cac module/controller da hoan thien:

- `/devices` - hoan thien
- `/feeding` - hoan thien

Cac controller/service sau hien la placeholder, chua co endpoint nghiep vu:

- `/telemetry`
- `/mqtt`
- `AlertsModule`
- `SafetyRuleModule`
- `AiIntegrationModule`
- `NotificationsModule`

Khong nen dung cac module nay de test API nghiep vu cho den khi co implementation.

---

## 11. Cach test nhanh bang Postman

1. Goi `POST /auth/login` de lay `accessToken`.
2. Trong Postman chon tab `Authorization`.
3. Chon type `Bearer Token`.
4. Paste phan token bat dau bang `eyJ...`, khong paste chu `Bearer` va khong them dau `< >`.
5. Test `GET /farms`.
6. Lay `farmId`, sau do test `GET /farms/:farmId/ponds`.
7. Lay `pondId`, sau do test `GET /ponds/:pondId/crop-seasons`.

Token co thoi han. Neu gap `401 Unauthorized` do access token het han, goi `POST /auth/refresh-token` thay vi bat user dang nhap lai.
