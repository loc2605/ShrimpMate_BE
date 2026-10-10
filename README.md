# ShrimpMate Backend

[![NestJS](https://img.shields.io/badge/NestJS-12.x-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MQTT](https://img.shields.io/badge/MQTT-5.x-660066?logo=eclipsemosquitto&logoColor=white)](https://mqtt.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B%20%2F%2024-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-UNLICENSED-lightgrey.svg)]()

> Centralized IoT & AI-driven backend engine for **ShrimpMate** — an intelligent shrimp aquaculture monitoring and automated feeding ecosystem.

---

## 1. System Overview

**ShrimpMate Backend** bridges physical pond edge devices (ESP32 microcontrollers, water quality sensors, automatic feeders, and underwater cameras) with mobile and web client interfaces. It orchestrates telemetry streaming, pre-feeding safety validation, emergency controls, real-time alert dispatching, and computer vision-based appetite estimation.

### Key Capabilities

- **Real-Time Water Telemetry**: Ingests temperature, pH, Dissolved Oxygen (DO), salinity, turbidity, and ammonia (NH₃). Automatically triggers incident alerts with a 15-minute anti-spam debounce window.
- **Safety Rule Engine**: Validates environmental criteria before any feeding operation executes. Automatically blocks feeder activation (`decision: blocked`) and prevents MQTT dispatch if conditions are unsafe (e.g. DO < 3.5 mg/L).
- **Dual Computer Vision FIS Pipeline**: Analyzes feeding tray frames using YOLO11n-seg (residual feed & shrimp density) and MobileNetV3 (feeding behavior classification) to calculate the **Feeding Intensity Score (FIS)** across 4 appetite levels (`0: None`, `1: Weak`, `2: Normal`, `3: Strong`).
- **Crop Season & FCR Analytics**: Automatically tracks Days of Culture (DOC), surviving population, feed consumed, biomass gain, and Feed Conversion Ratio (FCR).
- **Hardware Catalog & Claiming**: Admins manage standardized IoT hardware (`deviceUid`); managers securely claim devices to their ponds.
- **Role-Based Ecosystem**: Strict separation of concerns between `admin` (platform governance & hardware catalog), `manager` (farm, pond & farmer operations via Web App), and `farmer` (pond-side field monitoring & quick emergency controls via Mobile App).

---

## 2. Multi-Application Ecosystem

```text
                  [ Authentication: POST /auth/login ]
                                   |
                   +---------------+---------------+
                   |               |               |
            role === 'admin' role === 'manager' role === 'farmer'
                   |               |               |
                   v               v               v
         [ ADMIN WEB DASH ] [ MANAGER WEB APP ] [ FARMER MOBILE APP ]
         (Ban quản trị)     (Văn phòng / nhà)   (Ngoài bờ ao)
         - User Acct Mgmt   - Self-registration - Assigned Ponds Only
         - Lock/Unlock Users- Create/Manage Fm  - Real-Time Gauges
         - Hardware Catalog - Assign Farms/Ponds- AI Feed Summary
         - Safety Rules CRUD- Farm & Pond CRUD  - 1-Tap Emergency Stop
         - Global Audit & FCR- Crop Seasons/FCR - 1-Tap Quick-Feed
         - System Oversight - Weekly Schedules  - Push Alerts (FCM)
                            - Time-Series Charts- Incident Resolution
                            - Camera ROI & FIS
```

---

## 3. Architecture & Data Flow

```text
  [ ESP32 + Sensors ]            [ Underwater Camera ]
           |                               |
        (MQTT)                       (HTTP / MQTT)
           |                               |
           v                               v
    +-------------+                 +--------------+
    | MQTT Broker |                 | Edge Gateway |
    +------+------+                 +-------+------+
           |                                |
           +----------------+---------------+
                            |
                            v
             +------------------------------+
             |      ShrimpMate Backend      |
             |       (NestJS 12 + TS)       |
             +--------------+---------------+
                            |
           +----------------+----------------+
           |                |                |
           v                v                v
     +------------+   +-----------+   +--------------+
     | PostgreSQL |   | Safety    |   | Camera FIS   |
     | (TypeORM)  |   | Rule Eng. |   | Dual AI Pipe |
     +------------+   +-----------+   +--------------+
                            |
           +----------------+----------------+
           |                |                |
           v                v                v
   [ Admin Dashboard ] [ Manager Web App ] [ Farmer Mobile App ]
```

---

## 4. Technology Stack

| Layer | Technologies | Purpose |
| --- | --- | --- |
| **Runtime & Core** | Node.js (v20+ / v24), NestJS 12, TypeScript 5.x | High-throughput asynchronous backend service |
| **Database & ORM** | PostgreSQL 16, TypeORM | Relational persistence, migrations, and transactions |
| **IoT Protocol** | MQTT 5.x (`mqtt.js`) | Bidirectional pub/sub messaging with ESP32 nodes |
| **Security & Auth** | Passport JWT, Bcrypt | Stateless JWT access/refresh token authentication & RBAC |
| **Validation** | `class-validator`, `class-transformer` | Strict runtime DTO schema validation |
| **Computer Vision** | YOLO11n-seg, MobileNetV3 | Tray segmentation, shrimp density, and appetite scoring |
| **Testing & Quality**| Jest (ESM mode), Oxlint | Unit and integration test suites, linting |

---

## 5. Repository Structure

```text
src/
├── common/             # Shared decorators, guards, and pond access security
│   ├── decorators/     # CurrentUser, Roles decorators
│   └── guards/         # JwtAuthGuard, RolesGuard, PondAccessService
├── config/             # Environment configuration and schema validation
├── database/           # TypeORM setup, entity models, migrations, and seeds
│   ├── entities/       # User, Farm, Pond, Device, Feeding, Telemetry, Camera, Alert...
│   ├── migrations/     # Versioned relational schema migrations
│   └── seeds/          # Default admin, farmer, and sample farm datasets
├── mqtt/               # MQTT client service and hardware diagnostic controller
└── modules/
    ├── admin/          # Platform overview, operational reports, and system FCR
    ├── ai-integration/ # Feed optimization and biomass recommendations
    ├── alerts/         # Incident detection, acknowledgment, and resolution
    ├── auth/           # Registration, login, OTP recovery, and user management
    ├── camera/         # Computer vision engine, FIS scoring, and ROI management
    ├── crop-season/    # Season lifecycle, stocking density, and FCR statistics
    ├── devices/        # Hardware catalog, claim/unassign, and emergency stop
    ├── farm-pond/      # Farm & pond CRUD with soft deletion
    ├── farmers/        # Manager's farmer management and pond assignments (UC020, UC021)
    ├── feeding/        # Weekly schedules and safety-checked feeding records
    ├── safety-rule/    # Water threshold rule engine & pre-execution evaluations
    └── telemetry/      # Sensor metric ingestion, threshold alerts, and history
```

---

## 6. Installation & Quick Start

### Prerequisites

- **Node.js**: >= 20.x (tested on v24)
- **PostgreSQL**: >= 15.x
- **MQTT Broker**: Mosquitto, EMQX, or HiveMQ

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/loc2605/ShrimpMate_BE.git
cd ShrimpMate_BE
npm install
```

### 2. Environment Configuration

Copy the example environment file and update your credentials:

```bash
cp .env.example .env
```

Key configuration variables (`.env`):

```env
PORT=3000
NODE_ENV=development

# Database connection URL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shrimpmate

# Authentication
JWT_SECRET=super_secret_jwt_access_key
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=super_secret_jwt_refresh_key
JWT_REFRESH_EXPIRES_IN=30d

# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883

# AI Engine Service URL (optional in standalone mode)
AI_ENGINE_URL=http://localhost:8000
```

### 3. Database Migrations

```bash
# Run database migrations
npm run migration:run
```

*(Note: In development mode, default seeds run automatically on application bootstrap).*

### 4. Run the Application

```bash
# Development (with auto-reload watcher)
npm run start:dev

# Production build and run
npm run build
npm run start:prod
```

Server will be running at `http://localhost:3000`.

---

## 7. Testing & Quality Checks

```bash
# Run all unit and integration tests
npm test

# Run code linter
npm run lint

# Compile production bundle
npm run build
```

---

## 8. Default Pre-Seeded Accounts

| Role | Client Application | Username / Identifier | Password | Access Scope |
| --- | --- | --- | --- | --- |
| `admin` | **Web Dashboard** | `admin@shrimpmate.local` / `0901000001` | `Admin@123456` | Full platform governance, catalog, safety rules, FCR reports |
| `manager` | **Web App** | `manager@shrimpmate.local` / `0901000002` | `Manager@123456` | Farm & pond owner, farmer supervisor, schedules, AI configs, analytics |
| `farmer` | **Mobile App** | `farmer@shrimpmate.local` / `0901000003` | `Farmer@123456` | Assigned pond operator, pond telemetry, quick feed, emergency stop, alerts |

---

## 9. Technical Documentation Index

Detailed specifications and integration guides are maintained in the [`docs/`](./docs) directory:

- **[API Specification (`docs/API.md`)](./docs/API.md)**: Exhaustive documentation of all endpoints, request bodies, query parameters, response structures, and HTTP error codes.
- **[API Summary Reference (`docs/API_SUMMARY.md`)](./docs/API_SUMMARY.md)**: Master numbered quick-reference table covering all 85 endpoints and MQTT topics across Admin, Manager, and Farmer.
- **[Database Architecture (`docs/DATABASE.md`)](./docs/DATABASE.md)**: Complete database schema, table specifications, `farmer_assignments`, `users.manager_id`, indices, cascading rules, and Mermaid ERD diagram.
- **[Roles & Permissions Specification (`docs/ROLES_AND_PERMISSIONS.md`)](./docs/ROLES_AND_PERMISSIONS.md)**: RBAC permission matrix comparing Admin Web Dashboard, Manager Web App, and Farmer Mobile App scopes (UC001–UC021).
- **[Postman Test Collections (`docs/POSTMAN_SAMPLES.md`)](./docs/POSTMAN_SAMPLES.md)**: Ready-to-use Postman test scenarios, flow diagrams, and raw payload bodies.
- **[Postman End-to-End Test Flows (`docs/POSTMAN_TEST_FLOWS.md`)](./docs/POSTMAN_TEST_FLOWS.md)**: 5 core business testing flows covering 100% features across Admin, Manager, and Farmer.
