# ShrimpMate Backend

Backend service for **ShrimpMate**, an IoT-based platform for monitoring and automating shrimp farming ponds.

The backend connects ESP32 devices, environmental sensors, and automatic feeders with the Web Dashboard and Mobile App. It is responsible for device communication, telemetry processing, feeding control, data storage, safety validation, alerts, and AI service integration.

---

## 1. Project Overview

Shrimp farming requires continuous monitoring of water quality and feeding activities. Manual feeding and periodic observation can result in overfeeding, feed waste, water pollution, and delayed detection of abnormal environmental conditions.

ShrimpMate aims to provide a centralized platform that can:

* Monitor pond conditions continuously.
* Automate feeding schedules.
* Control automatic feeders remotely.
* Collect and store sensor data.
* Monitor device status in real time.
* Detect abnormal environmental conditions.
* Send alerts to shrimp farmers.
* Integrate AI services for feeding analysis, forecasting, biomass estimation, and anomaly detection.

---

## 2. System Architecture

```text
                    +----------------------+
                    |   ESP32 + Sensors    |
                    |   + Automatic Feeder |
                    +----------+-----------+
                               |
                              MQTT
                               |
                               v
                    +----------------------+
                    |  ShrimpMate Backend  |
                    |       NestJS         |
                    +----------+-----------+
                               |
          +--------------------+--------------------+
          |                    |                    |
          v                    v                    v
    +-----------+        +-----------+        +-----------+
    | PostgreSQL|        |   Redis   |        | AI Engine |
    +-----------+        +-----------+        +-----------+
          |                    |                    |
          +--------------------+--------------------+
                               |
                 +-------------+-------------+
                 |                           |
                 v                           v
        +----------------+          +----------------+
        | Web Dashboard  |          |  Mobile App   |
        |     React      |          | React Native  |
        +----------------+          +----------------+
                               |
                               v
                    +----------------------+
                    | Firebase Cloud       |
                    | Messaging (FCM)      |
                    +----------------------+
```

---

## 3. Main Components

### Edge Devices

The edge layer consists of:

* ESP32 microcontrollers
* pH sensors
* Temperature sensors
* Dissolved Oxygen (DO) sensors
* Automatic feeding mechanisms

ESP32 devices collect sensor measurements and communicate with the backend through MQTT.

### Backend

The backend is built with **NestJS and TypeScript** and provides:

* REST APIs
* MQTT communication
* Device management
* Telemetry processing
* Feeding schedule management
* Safety rule validation
* Alert management
* AI Engine integration
* Notification delivery

### PostgreSQL

PostgreSQL is used as the main relational database for storing:

* Users
* Ponds
* Devices
* Feeding schedules
* Feeding records
* Sensor telemetry
* Alerts
* System configurations

### Redis

Redis is planned for:

* Real-time device state
* Caching
* Temporary data
* Frequently accessed information

### AI Engine

The backend can communicate with a separate AI Engine to support:

* Feeding behavior recognition
* Feed demand forecasting
* Shrimp biomass estimation
* Environmental anomaly detection

### Client Applications

ShrimpMate provides two user-facing applications:

* **React Web Dashboard** for farm management and monitoring.
* **React Native Mobile App** for shrimp farmers and mobile notifications.

### Notifications

Firebase Cloud Messaging (FCM) is used to deliver important alerts to mobile devices.

---

## 4. Technology Stack

| Category                | Technology               |
| ----------------------- | ------------------------ |
| Runtime                 | Node.js                  |
| Backend Framework       | NestJS 12                |
| Language                | TypeScript               |
| Database                | PostgreSQL               |
| Cache / Real-time State | Redis                    |
| IoT Communication       | MQTT                     |
| Web Frontend            | React                    |
| Mobile Frontend         | React Native             |
| Notifications           | Firebase Cloud Messaging |
| Computer Vision         | YOLO11n, MobileNetV3     |
| Machine Learning        | LightGBM, XGBoost        |
| Time-Series Forecasting | LSTM                     |
| Anomaly Detection       | Isolation Forest         |

---

## 5. Backend Structure

```text
src/
├── common/
│   ├── decorators/
│   └── guards/
│
├── config/
│   └── configuration.ts
│
├── database/
│   ├── entities/
│   ├── migrations/
│   ├── seeds/
│   └── database.module.ts
│
├── mqtt/
│   ├── mqtt.controller.ts
│   └── mqtt.service.ts
│
├── modules/
│   ├── auth/
│   ├── farm-pond/
│   ├── crop-season/
│   ├── devices/
│   ├── feeding/
│   ├── ai-integration/   (placeholder)
│   ├── alerts/           (placeholder)
│   ├── notifications/    (placeholder)
│   ├── safety-rule/      (placeholder)
│   └── telemetry/        (placeholder)
│
├── app.module.ts
└── main.ts
```

### Module Responsibilities

| Module           | Status        | Responsibility                                          |
| ---------------- | ------------- | ------------------------------------------------------- |
| `auth`           | Implemented   | JWT authentication, user management, pond assignment  |
| `farm-pond`      | Implemented   | Farm and pond CRUD with soft delete                     |
| `crop-season`    | Implemented   | Crop season lifecycle per pond                          |
| `devices`        | Implemented   | ESP32 device management and feeder control              |
| `feeding`        | Implemented   | Feeding schedules and feeding records                   |
| `telemetry`      | Placeholder   | Processes and stores sensor and device data             |
| `mqtt`           | Placeholder   | MQTT connections, subscriptions, and publishing         |
| `alerts`         | Placeholder   | Handles abnormal conditions and safety alerts           |
| `safety-rule`    | Placeholder   | Validates device commands before execution              |
| `ai-integration` | Placeholder   | Communicates with the AI Engine                         |
| `notifications`  | Placeholder   | Sends mobile notifications through FCM                  |
| `database`       | Implemented   | Manages PostgreSQL connection and migrations            |
| `common`         | Implemented   | Shared guards, decorators, and pond access control      |
| `config`         | Implemented   | Application and environment configuration               |

REST API details are documented in `docs/API.md`. Database schema is documented in `docs/DATABASE.md`.

---

## 6. Communication Flow

### Sensor Data

```text
Sensor
   |
   v
ESP32
   |
   | MQTT
   v
MQTT Broker
   |
   v
ShrimpMate Backend
   |
   +----> Validate data
   |
   +----> Store telemetry
   |
   +----> Update device state
   |
   +----> Check safety rules
   |
   +----> Trigger alert if necessary
```

### Feeding Control

```text
Web / Mobile App
       |
       v
ShrimpMate Backend
       |
       v
Safety Rule Engine
       |
       v
MQTT Command
       |
       v
ESP32 Feeder
       |
       v
Feeding Operation
```

---

## 7. Current Development Status

The project is in the **core backend phase**: authentication, farm management, devices, and feeding are implemented; IoT and alerting layers are still pending.

### Completed

* NestJS application with TypeScript, build, and lint.
* Environment configuration with Joi validation.
* PostgreSQL integration via TypeORM, migrations, and idempotent seeds.
* JWT authentication with refresh token rotation and RBAC (`admin`, `manager`, `operator`).
* User-Pond assignment for scoped manager/operator access.
* CRUD for Farm, Pond, Crop Season, Device, Feeding Schedule, and Feeding Record.
* API and database documentation (`docs/API.md`, `docs/DATABASE.md`).

### In Progress / Planned

* Telemetry ingestion and query APIs.
* Alert processing and Safety Rule Engine.
* MQTT broker integration and ESP32 communication protocol.
* Redis for real-time device state and caching.
* FCM notifications and AI Engine integration.
* Unit, integration, and end-to-end testing.

> Modules marked **Placeholder** above have entity/schema support but no business endpoints yet. See `docs/API.md` section 10 for the current API surface.

---

## 8. Installation

### Requirements

Make sure the following software is installed:

* Node.js
* npm
* PostgreSQL
* Redis
* MQTT Broker

PostgreSQL, Redis, and MQTT are required when their corresponding modules are enabled.

### Install Dependencies

```bash
npm install
```

---

## 9. Environment Configuration

Create a `.env` file in the project root.

Example:

```env
PORT=3000

DATABASE_URL=postgresql://username:password@localhost:5432/shrimpmate

REDIS_HOST=localhost
REDIS_PORT=6379

MQTT_BROKER_URL=mqtt://localhost:1883

AI_ENGINE_URL=http://localhost:8000

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Do not commit sensitive credentials or private keys to the repository.

---

## 10. Running the Backend

### Development

```bash
npm run start:dev
```

### Standard

```bash
npm run start
```

### Build

```bash
npm run build
```

### Production

```bash
npm run start:prod
```

The backend runs on:

```text
http://localhost:3000
```

The port can be changed through the `PORT` environment variable.

---

## 11. Quality Checks

### Lint

```bash
npm run lint
```

### Unit Tests

```bash
npm run test
```

### End-to-End Tests

```bash
npm run test:e2e
```

### Test Coverage

```bash
npm run test:cov
```

---

## 12. Development Roadmap

The backend will be developed in the following stages:

1. Configure environment variables and health checks.
2. Integrate PostgreSQL and database migrations.
3. Define the database model.
4. Integrate MQTT communication.
5. Define MQTT topics and ESP32 payload formats.
6. Implement sensor telemetry.
7. Implement device management.
8. Implement feeding schedules and feeder control.
9. Implement the Safety Rule Engine.
10. Integrate Redis for real-time device state.
11. Implement alerts and FCM notifications.
12. Integrate the AI Engine.
13. Implement authentication and authorization.
14. Add unit, integration, and end-to-end tests.

---

## 13. Expected Outcome

ShrimpMate is expected to provide a centralized backend platform that helps shrimp farmers:

* Reduce feed waste.
* Reduce manual labor.
* Monitor pond conditions remotely.
* Control feeding equipment remotely.
* Detect abnormal water-quality conditions earlier.
* Receive timely alerts.
* Use historical data and AI-based analysis to support farming decisions.

---

## 14. Project Status

**Status:** Core backend implemented; IoT/alerting layers pending

**Architecture:** NestJS + PostgreSQL (+ Redis, MQTT, AI Engine planned)

**Target:** IoT-based shrimp pond monitoring and automated feeding platform
