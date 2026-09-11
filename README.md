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
│   ├── guards/
│   ├── filters/
│   ├── interceptors/
│   └── utils/
│
├── config/
│   └── configuration/
│
├── database/
│   ├── migrations/
│   └── database.module.ts
│
├── mqtt/
│   ├── mqtt.module.ts
│   ├── mqtt.service.ts
│   └── mqtt.constants.ts
│
├── modules/
│   ├── ai-integration/
│   ├── alerts/
│   ├── devices/
│   ├── feeding/
│   ├── notifications/
│   ├── safety-rule/
│   └── telemetry/
│
├── app.module.ts
└── main.ts
```

### Module Responsibilities

| Module           | Responsibility                                          |
| ---------------- | ------------------------------------------------------- |
| `ai-integration` | Communicates with the AI Engine                         |
| `alerts`         | Handles abnormal conditions and safety alerts           |
| `devices`        | Manages ESP32 devices and feeder control                |
| `feeding`        | Manages feeding schedules and feeding commands          |
| `notifications`  | Sends mobile notifications through FCM                  |
| `safety-rule`    | Validates device commands before execution              |
| `telemetry`      | Processes and stores sensor and device data             |
| `mqtt`           | Handles MQTT connections, subscriptions, and publishing |
| `database`       | Manages PostgreSQL connection and migrations            |
| `common`         | Shared backend utilities and infrastructure             |
| `config`         | Application and environment configuration               |

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

The project is currently in the **backend initialization phase**.

### Completed

* NestJS application initialized.
* TypeScript configuration established.
* Initial backend module structure created.
* Application successfully builds.

### In Progress / Planned

* Environment configuration
* PostgreSQL integration
* Database models and migrations
* MQTT broker integration
* ESP32 communication protocol
* Sensor telemetry
* Device management
* Feeding schedules
* Safety Rule Engine
* Redis integration
* Alert processing
* FCM notifications
* AI Engine integration
* Authentication and authorization
* Unit and integration testing

> This README describes the target backend architecture. Features that have not been implemented yet should not be considered production-ready.

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

**Status:** Backend initialization

**Architecture:** NestJS + PostgreSQL + Redis + MQTT + AI Engine

**Target:** IoT-based shrimp pond monitoring and automated feeding platform
