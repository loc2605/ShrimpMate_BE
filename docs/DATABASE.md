# ShrimpMate Database Schema

Tài liệu mô tả database hiện tại dựa trên các entity và migration của backend.

## 1. Danh sách bảng

- `users`
- `farms`
- `ponds`
- `crop_seasons`
- `devices`
- `feeding_schedules`
- `feeding_records`
- `telemetry_readings`
- `ai_recommendations`
- `safety_rules`
- `alerts`
- `user_pond_assignments`
- `password_reset_otps`

## 2. Chi tiết bảng

### `users`

Lưu tài khoản đăng nhập.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `email` | VARCHAR(255) | Unique, bắt buộc |
| `phone_number` | VARCHAR(20) | Unique, có thể rỗng với tài khoản cũ; bắt buộc khi đăng ký mới |
| `password_hash` | VARCHAR(255) | Mật khẩu đã mã hóa |
| `refresh_token_hash` | VARCHAR(255) | Có thể rỗng, hash refresh token hiện tại |
| `full_name` | VARCHAR(150) | Bắt buộc |
| `role` | ENUM | `admin`, `manager`, `operator` |
| `isActive` | BOOLEAN | Mặc định `true` |
| `created_at` | TIMESTAMPTZ | Thời gian tạo |
| `updated_at` | TIMESTAMPTZ | Thời gian cập nhật |

`users` liên kết tới `ponds` thông qua bảng trung gian `user_pond_assignments`; assignment được dùng để giới hạn `manager` và `operator` theo Pond.

### `user_pond_assignments`

Bảng trung gian giới hạn operator theo Pond.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK -> `users.id`, bắt buộc |
| `pond_id` | UUID | FK -> `ponds.id`, bắt buộc |
| `created_at` | TIMESTAMPTZ | Thời gian gán |

Unique trên (`user_id`, `pond_id`); có index riêng trên `user_id` và `pond_id`.

### `password_reset_otps`

Lưu mã OTP đặt lại mật khẩu (UC002). OTP được lưu dạng hash, không lưu plaintext.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK -> `users.id`, bắt buộc |
| `otp_hash` | VARCHAR(255) | Hash OTP 6 chữ số |
| `expires_at` | TIMESTAMPTZ | Thời điểm hết hạn |
| `used_at` | TIMESTAMPTZ | Có thể rỗng; đánh dấu OTP đã dùng hoặc bị vô hiệu |
| `attempt_count` | INTEGER | Số lần nhập OTP sai, mặc định `0` |
| `created_at` | TIMESTAMPTZ | Thời gian tạo OTP |

Index: `(user_id, created_at)`.

### `farms`

Lưu thông tin trang trại. Mỗi trang trại được gắn với một Manager sở hữu (`owner_id`), phục vụ mô hình phân quyền sở hữu ao/trang trại.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `owner_id` | UUID | FK -> `users.id`, có thể rỗng, lưu ID Manager sở hữu Farm |
| `name` | VARCHAR(150) | Bắt buộc |
| `address` | TEXT | Có thể rỗng |
| `status` | ENUM | `active`, `inactive` |
| `created_at` | TIMESTAMPTZ | Thời gian tạo |
| `updated_at` | TIMESTAMPTZ | Thời gian cập nhật |
| `deleted_at` | TIMESTAMPTZ | Có thể rỗng, dùng cho soft delete |

### `ponds`

Lưu thông tin ao nuôi.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `farm_id` | UUID | FK -> `farms.id`, bắt buộc |
| `code` | VARCHAR(50) | Mã ao |
| `name` | VARCHAR(150) | Tên ao |
| `area_m2` | NUMERIC(12,2) | Diện tích |
| `status` | ENUM | `active`, `inactive`, `maintenance` |
| `deleted_at` | TIMESTAMPTZ | Có thể rỗng, dùng cho soft delete |
| `created_at` | TIMESTAMPTZ | Thời gian tạo |
| `updated_at` | TIMESTAMPTZ | Thời gian cập nhật |

### `crop_seasons`

Lưu các vụ nuôi của ao.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `pond_id` | UUID | FK -> `ponds.id`, bắt buộc |
| `name` | VARCHAR(150) | Tên vụ nuôi |
| `stocking_date` | DATE | Ngày thả giống |
| `initial_count` | INTEGER | Số lượng ban đầu |
| `stocking_density` | NUMERIC(12,2) | Mật độ thả |
| `initial_average_weight_g` | NUMERIC(8,3) | Có thể rỗng |
| `estimated_survival_rate` | NUMERIC(5,2) | Có thể rỗng |
| `status` | ENUM | `planned`, `active`, `completed`, `cancelled` |
| `created_at` | TIMESTAMPTZ | Thời gian tạo |
| `updated_at` | TIMESTAMPTZ | Thời gian cập nhật |

Có unique partial index trên `pond_id` với điều kiện `status = 'active'`, bảo đảm mỗi Pond chỉ có một Crop Season đang hoạt động ngay cả khi có request đồng thời.

Các bảng quản lý và nghiệp vụ có `created_at` và `updated_at` để audit. Các bảng ghi nhận sự kiện bất biến dùng timestamp nghiệp vụ riêng như `measured_at`, `triggered_at` hoặc `started_at`; Telemetry đã có index theo Pond/Device và thời gian.

### `devices`

Lưu các thiết bị IoT như feeder, sensor và camera.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `pond_id` | UUID | FK -> `ponds.id`, có thể rỗng |
| `device_uid` | VARCHAR(100) | Unique |
| `name` | VARCHAR(150) | Tên thiết bị |
| `type` | ENUM | `feeder`, `sensor_node`, `camera`, `edge_gateway` |
| `status` | ENUM | `online`, `offline`, `error`, `maintenance` |
| `mode` | ENUM | `automatic`, `manual`, `emergency_stop` |
| `firmware_version` | VARCHAR(50) | Có thể rỗng |
| `last_seen_at` | TIMESTAMPTZ | Có thể rỗng |
| `metadata` | JSONB | Mặc định `{}` |
| `created_at` | TIMESTAMPTZ | Thời gian tạo |
| `updated_at` | TIMESTAMPTZ | Thời gian cập nhật |

### `feeding_schedules`

Lưu lịch cho ăn tự động.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `pond_id` | UUID | FK -> `ponds.id`, bắt buộc |
| `name` | VARCHAR(150) | Tên lịch |
| `time_of_day` | TIME | Giờ cho ăn |
| `feed_amount_kg` | NUMERIC(10,3) | Khối lượng thức ăn |
| `spread_rate_kg_per_minute` | NUMERIC(10,3) | Có thể rỗng |
| `days_of_week` | SMALLINT ARRAY | Các ngày trong tuần |
| `isEnabled` | BOOLEAN | Mặc định `true` |
| `created_at` | TIMESTAMPTZ | Thời gian tạo |
| `updated_at` | TIMESTAMPTZ | Thời gian cập nhật |

### `feeding_records`

Lưu lịch sử các lần cho ăn.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `pond_id` | UUID | FK -> `ponds.id`, bắt buộc |
| `device_id` | UUID | FK -> `devices.id`, có thể rỗng |
| `schedule_id` | UUID | FK -> `feeding_schedules.id`, có thể rỗng |
| `started_at` | TIMESTAMPTZ | Thời điểm bắt đầu |
| `finished_at` | TIMESTAMPTZ | Có thể rỗng |
| `requested_amount_kg` | NUMERIC(10,3) | Khối lượng yêu cầu |
| `actual_amount_kg` | NUMERIC(10,3) | Khối lượng thực tế, có thể rỗng |
| `source` | ENUM | `schedule`, `manual`, `ai` |
| `status` | ENUM | `requested`, `running`, `completed`, `stopped`, `failed` |
| `appetite_level` | SMALLINT | `0` none, `1` weak, `2` normal, `3` strong |
| `leftover_percent` | NUMERIC(5,2) | Có thể rỗng |
| `stopped_reason` | TEXT | Có thể rỗng |
| `created_at` | TIMESTAMPTZ | Thời gian tạo |
| `updated_at` | TIMESTAMPTZ | Thời gian cập nhật |

### `telemetry_readings`

Lưu dữ liệu đo từ cảm biến môi trường.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `pond_id` | UUID | FK -> `ponds.id`, bắt buộc |
| `device_id` | UUID | FK -> `devices.id`, có thể rỗng |
| `measured_at` | TIMESTAMPTZ | Thời điểm đo |
| `ph` | DOUBLE PRECISION | Có thể rỗng |
| `dissolved_oxygen_mg_l` | DOUBLE PRECISION | Có thể rỗng |
| `temperature_c` | DOUBLE PRECISION | Có thể rỗng |
| `salinity_ppt` | DOUBLE PRECISION | Có thể rỗng |
| `ammonia_mg_l` | DOUBLE PRECISION | Có thể rỗng |
| `turbidity_ntu` | DOUBLE PRECISION | Có thể rỗng |
| `rawData` | JSONB | Mặc định `{}` |

Index hiện có: `(pond_id, measured_at)` và `(device_id, measured_at)`.

Feeding Record có index theo `(pond_id, started_at)`, `(pond_id, created_at)`, `(device_id, started_at)` và `(pond_id, status)`.

### `ai_recommendations`

Lưu các đề xuất do AI tạo ra.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `pond_id` | UUID | FK -> `ponds.id`, bắt buộc |
| `model_name` | VARCHAR(100) | Tên model |
| `model_version` | VARCHAR(50) | Có thể rỗng |
| `predicted_feed_amount_kg` | NUMERIC(10,3) | Có thể rỗng |
| `spread_rate_kg_per_minute` | NUMERIC(10,3) | Có thể rỗng |
| `appetite_level` | SMALLINT | Có thể rỗng |
| `biomass_kg` | NUMERIC(12,3) | Có thể rỗng |
| `anomaly_score` | DOUBLE PRECISION | Có thể rỗng |
| `confidence` | DOUBLE PRECISION | Có thể rỗng |
| `input_snapshot` | JSONB | Dữ liệu đầu vào |
| `explanation` | TEXT | Có thể rỗng |
| `safety_decision` | ENUM | `allowed`, `adjusted`, `blocked`; có thể rỗng |
| `safety_reason` | TEXT | Có thể rỗng |
| `status` | ENUM | `pending`, `approved`, `rejected`, `executed` |
| `created_at` | TIMESTAMPTZ | Thời gian tạo |

### `safety_rules`

Lưu các luật kiểm tra an toàn.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `code` | VARCHAR(100) | Unique |
| `name` | VARCHAR(150) | Tên luật |
| `priority` | INTEGER | Mặc định `100` |
| `isEnabled` | BOOLEAN | Mặc định `true` |
| `condition` | JSONB | Điều kiện |
| `action` | JSONB | Hành động |
| `created_at` | TIMESTAMPTZ | Thời gian tạo |
| `updated_at` | TIMESTAMPTZ | Thời gian cập nhật |

Bảng này hiện chưa có quan hệ khóa ngoại với bảng khác.

### `alerts`

Lưu các cảnh báo từ ao hoặc thiết bị.

| Cột | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `pond_id` | UUID | FK -> `ponds.id`, bắt buộc |
| `device_id` | UUID | FK -> `devices.id`, có thể rỗng |
| `type` | VARCHAR(100) | Loại cảnh báo |
| `severity` | ENUM | `1` monitoring, `2` warning, `3` critical |
| `status` | ENUM | `open`, `acknowledged`, `resolved` |
| `message` | VARCHAR(255) | Nội dung cảnh báo |
| `triggered_at` | TIMESTAMPTZ | Thời điểm phát sinh |
| `acknowledged_at` | TIMESTAMPTZ | Có thể rỗng |
| `resolved_at` | TIMESTAMPTZ | Có thể rỗng |
| `metadata` | JSONB | Mặc định `{}` |
| `created_at` | TIMESTAMPTZ | Thời gian tạo |
| `updated_at` | TIMESTAMPTZ | Thời gian cập nhật |

## 3. Quan hệ giữa các bảng

| Quan hệ | Cardinality | On delete |
|---|---:|---|
| `farms` -> `ponds` | 1 - N | Soft delete farm đồng thời soft delete ponds trong service |
| `ponds` -> `crop_seasons` | 1 - N | FK cascade chỉ áp dụng khi hard delete; API hiện dùng soft delete |
| `ponds` -> `devices` | 1 - N | Xóa pond sẽ set `devices.pond_id = NULL` |
| `ponds` -> `feeding_schedules` | 1 - N | FK cascade khi hard delete; soft delete API giữ dữ liệu |
| `ponds` -> `feeding_records` | 1 - N | FK cascade khi hard delete; soft delete API giữ dữ liệu |
| `ponds` -> `telemetry_readings` | 1 - N | FK cascade khi hard delete; soft delete API giữ dữ liệu |
| `ponds` -> `ai_recommendations` | 1 - N | FK cascade khi hard delete; soft delete API giữ dữ liệu |
| `ponds` -> `alerts` | 1 - N | FK cascade khi hard delete; soft delete API giữ dữ liệu |
| `devices` -> `feeding_records` | 1 - N, tùy chọn | Xóa device sẽ set FK thành `NULL` |
| `devices` -> `telemetry_readings` | 1 - N, tùy chọn | Xóa device sẽ set FK thành `NULL` |
| `devices` -> `alerts` | 1 - N, tùy chọn | Xóa device sẽ set FK thành `NULL` |
| `feeding_schedules` -> `feeding_records` | 1 - N, tùy chọn | Xóa schedule sẽ set FK thành `NULL` |
| `users` -> `user_pond_assignments` | 1 - N | Xóa user sẽ xóa assignment |
| `ponds` -> `user_pond_assignments` | 1 - N | Xóa pond sẽ xóa assignment |
| `users` -> `password_reset_otps` | 1 - N | Xóa user sẽ xóa OTP |

## 4. ERD Mermaid

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email UK
        varchar phone_number UK
        varchar password_hash
        varchar refresh_token_hash
        varchar full_name
        enum role
        boolean isActive
        timestamptz created_at
        timestamptz updated_at
    }

    USER_POND_ASSIGNMENTS {
        uuid id PK
        uuid user_id FK
        uuid pond_id FK
        timestamptz created_at
    }

    PASSWORD_RESET_OTPS {
        uuid id PK
        uuid user_id FK
        varchar otp_hash
        timestamptz expires_at
        timestamptz used_at
        integer attempt_count
        timestamptz created_at
    }

    FARMS {
        uuid id PK
        varchar name
        text address
        enum status
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    PONDS {
        uuid id PK
        uuid farm_id FK
        varchar code
        varchar name
        numeric area_m2
        enum status
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    CROP_SEASONS {
        uuid id PK
        uuid pond_id FK
        varchar name
        date stocking_date
        integer initial_count
        numeric stocking_density
        numeric initial_average_weight_g
        numeric estimated_survival_rate
        enum status
        timestamptz created_at
        timestamptz updated_at
    }

    DEVICES {
        uuid id PK
        uuid pond_id FK
        varchar device_uid UK
        varchar name
        enum type
        enum status
        enum mode
        varchar firmware_version
        timestamptz last_seen_at
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }

    FEEDING_SCHEDULES {
        uuid id PK
        uuid pond_id FK
        varchar name
        time time_of_day
        numeric feed_amount_kg
        numeric spread_rate_kg_per_minute
        smallint_array days_of_week
        boolean isEnabled
        timestamptz created_at
        timestamptz updated_at
    }

    FEEDING_RECORDS {
        uuid id PK
        uuid pond_id FK
        uuid device_id FK
        uuid schedule_id FK
        timestamptz started_at
        timestamptz finished_at
        numeric requested_amount_kg
        numeric actual_amount_kg
        enum source
        enum status
        smallint appetite_level
        numeric leftover_percent
        text stopped_reason
        timestamptz created_at
        timestamptz updated_at
    }

    TELEMETRY_READINGS {
        uuid id PK
        uuid pond_id FK
        uuid device_id FK
        timestamptz measured_at
        double ph
        double dissolved_oxygen_mg_l
        double temperature_c
        double salinity_ppt
        double ammonia_mg_l
        double turbidity_ntu
        jsonb rawData
    }

    AI_RECOMMENDATIONS {
        uuid id PK
        uuid pond_id FK
        varchar model_name
        varchar model_version
        numeric predicted_feed_amount_kg
        numeric spread_rate_kg_per_minute
        smallint appetite_level
        numeric biomass_kg
        double anomaly_score
        double confidence
        jsonb input_snapshot
        text explanation
        enum safety_decision
        text safety_reason
        enum status
        timestamptz created_at
    }

    SAFETY_RULES {
        uuid id PK
        varchar code UK
        varchar name
        integer priority
        boolean isEnabled
        jsonb condition
        jsonb action
        timestamptz created_at
        timestamptz updated_at
    }

    ALERTS {
        uuid id PK
        uuid pond_id FK
        uuid device_id FK
        varchar type
        enum severity
        enum status
        varchar message
        timestamptz triggered_at
        timestamptz acknowledged_at
        timestamptz resolved_at
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }

    FARMS ||--o{ PONDS : contains
    PONDS ||--o{ CROP_SEASONS : has
    PONDS ||--o{ DEVICES : assigned_to
    PONDS ||--o{ FEEDING_SCHEDULES : has
    PONDS ||--o{ FEEDING_RECORDS : records
    PONDS ||--o{ TELEMETRY_READINGS : receives
    PONDS ||--o{ AI_RECOMMENDATIONS : receives
    PONDS ||--o{ ALERTS : generates
    USERS ||--o{ USER_POND_ASSIGNMENTS : receives
    USERS ||--o{ PASSWORD_RESET_OTPS : requests
    PONDS ||--o{ USER_POND_ASSIGNMENTS : grants
    DEVICES o|--o{ FEEDING_RECORDS : executes
    DEVICES o|--o{ TELEMETRY_READINGS : sends
    DEVICES o|--o{ ALERTS : triggers
    FEEDING_SCHEDULES o|--o{ FEEDING_RECORDS : creates
```

## 5. Lưu ý khi vẽ ERD

- Tất cả bảng đều dùng UUID làm khóa chính.
- `PK` là khóa chính, `FK` là khóa ngoại và `UK` là unique key.
- `device_id` và `schedule_id` trong các bảng nghiệp vụ là khóa ngoại tùy chọn.
- `pond_id` của `devices` là tùy chọn vì thiết bị có thể tồn tại trước khi được gán vào ao.
- `safety_rules` hiện là bảng độc lập; `users` liên kết với `ponds` qua `user_pond_assignments`.
- `user_pond_assignments` là bảng trung gian; manager và operator chỉ truy cập Pond được gán, còn admin giữ quyền toàn hệ thống.
- Một số tên cột dùng camelCase trong database là `isActive` (users), `isEnabled` (feeding_schedules, safety_rules) và `rawData` (telemetry_readings); các cột còn lại chủ yếu dùng snake_case.
- Bảng `users` không có soft delete; chỉ `farms` và `ponds` dùng `deleted_at`.