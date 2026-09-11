# ShrimpMate Backend

The backend for **ShrimpMate**, an IoT platform designed to automate and monitor shrimp farming ponds.

ShrimpMate connects ESP32 devices, environmental sensors, and automatic feeders with a Web Dashboard for farm managers and a Mobile App for shrimp farmers.

## Project Background

Feed usually accounts for approximately 50% to 60% of total shrimp farming costs. Manual feeding and visual observation through feeding trays can lead to underfeeding, overfeeding, water pollution, disease outbreaks, and delayed detection of abnormal conditions.

ShrimpMate is designed to:

- Automate feeding schedules and enable remote device control.
- Continuously monitor pH, temperature, dissolved oxygen (DO), and device status.
- Store and analyze pond data over time.
- Detect abnormal conditions and send timely alerts.
- Apply AI to analyze feeding behavior, forecast feed demand, and estimate shrimp biomass.

## Proposed Architecture

```text
ESP32 + Sensors + Feeder
       |
      MQTT
       |
       v
ShrimpMate Backend (NestJS)
  |          |          |
PostgreSQL  Redis      AI Engine
  |          |          |
  +----------+----------+
          |
     Web Dashboard / Mobile App
```

### Main Components

- **Edge devices:** ESP32, pH sensors, temperature sensors, DO sensors, and automatic feeders.
- **MQTT:** Transports sensor data, device status, and control commands in real time.
- **Backend:** NestJS and TypeScript, organized into business modules.
- **PostgreSQL:** Stores users, ponds, devices, feeding schedules, telemetry, and alerts.
- **Redis:** Provides caching and real-time device state management.
- **AI Engine:** Supports feeding behavior recognition, feed demand forecasting, biomass estimation, and anomaly detection.
- **User applications:** React Web Dashboard and React Native Mobile App.
- **Notifications:** Firebase Cloud Messaging (FCM) for urgent mobile alerts.

## Technology Stack

- Node.js
- NestJS 12
- TypeScript
- PostgreSQL
- Redis
- MQTT
- React and React Native
- Firebase Cloud Messaging
- YOLO11n and MobileNetV3
- LightGBM, LSTM, and XGBoost
- Isolation Forest

## Backend Structure

```text
src/
|-- common/                 # Shared decorators, guards, filters, interceptors, and utilities
|-- config/                 # Application and environment configuration
|-- database/               # Database connection and migrations
|-- mqtt/                   # MQTT connection, publishing, and subscriptions
|-- modules/
|   |-- ai-integration/     # AI Engine integration
|   |-- alerts/             # Anomaly and safety alerts
|   |-- devices/            # Device management and control
|   |-- feeding/            # Feeding schedules and commands
|   |-- notifications/      # FCM notification delivery
|   |-- safety-rule/        # Safety rule validation before device control
|   |-- telemetry/          # Sensor data and device status
|-- app.module.ts
|-- main.ts
```

## Current Status

The project is currently in the **backend initialization phase**:

- The NestJS application has been created and builds successfully.
- The initial business module structure is in place.
- MQTT, PostgreSQL, Redis, AI, FCM, and the main business workflows are not fully implemented yet.
- Several controllers and services are still skeletons for future development.

This README describes the target architecture and project goals. Components that do not yet have implementation code should not be considered complete.

## Installation

### Requirements

- Node.js compatible with NestJS 12 and the project's TypeScript version.
- npm.
- PostgreSQL, Redis, and an MQTT broker when the corresponding modules are implemented.

Install dependencies:

```bash
npm install
```

## Running the Backend

```bash
# Development mode
npm run start:dev

# Standard mode
npm run start

# Build for production
npm run build

# Run the production build
npm run start:prod
```

The server runs at `http://localhost:3000` by default. Set the `PORT` environment variable to use a different port.

## Quality Checks

```bash
# Lint
npm run lint

# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Development Roadmap

1. Complete environment configuration and add a health check.
2. Integrate PostgreSQL, migrations, and the data model.
3. Integrate the MQTT broker and define topics and ESP32 payloads.
4. Implement telemetry for pH, temperature, DO, and device status.
5. Implement device management, feeding schedules, and feeder control.
6. Implement the Safety Rule Engine to validate commands before they reach devices.
7. Add Redis for real-time state management.
8. Implement alerts and FCM notifications.
9. Integrate the AI Engine and data analysis pipeline.
10. Add authentication, authorization, unit tests, and integration tests.

## Expected Outcome

ShrimpMate aims to reduce feed waste and labor costs, enable remote pond monitoring, and detect risks that may affect water quality and shrimp health at an early stage.
# ShrimpMate Backend

Backend trung tam cho he thong **ShrimpMate**, mot nen tang IoT ho tro tu dong hoa va giam sat ao nuoi tom.

ShrimpMate ket noi thiet bi ESP32, cam bien moi truong va may cho an voi Web Dashboard danh cho nha quan ly va Mobile App danh cho nguoi nuoi.

## Boi canh de tai

Chi phi thuc an thuong chiem khoang 50% - 60% tong chi phi nuoi tom. Phuong phap cho an thu cong hoac chi quan sat qua nha an de dan den cho an thieu, cho an du, o nhiem nguon nuoc va kho phat hien su co som.

ShrimpMate duoc xay dung de:

- Tu dong hoa lich trinh cho an va dieu khien thiet bi tu xa.
- Giam sat lien tuc pH, nhiet do, DO va trang thai thiet bi.
- Luu tru, phan tich du lieu ao nuoi theo thoi gian.
- Phat hien bat thuong va gui canh bao kip thoi.
- Ho tro AI trong phan tich hanh vi bat moi, du bao thuc an va uoc tinh sinh khoi.

## Kien truc du kien

```text
ESP32 + Sensors + Feeder
       |
      MQTT
       |
       v
ShrimpMate Backend (NestJS)
  |          |          |
PostgreSQL  Redis      AI Engine
  |          |          |
  +----------+----------+
          |
     Web Dashboard / Mobile App
```

### Cac thanh phan chinh

- **Thiet bi bien:** ESP32, cam bien pH, nhiet do, DO va co cau may cho an.
- **MQTT:** Truyen du lieu cam bien, trang thai thiet bi va lenh dieu khien theo thoi gian thuc.
- **Backend:** NestJS va TypeScript, to chuc theo cac module nghiep vu.
- **PostgreSQL:** Luu thong tin nguoi dung, ao nuoi, thiet bi, lich cho an, telemetry va canh bao.
- **Redis:** Cache va quan ly trang thai thiet bi theo thoi gian thuc.
- **AI Engine:** Nhan dien hanh vi an, du bao nhu cau thuc an, uoc tinh sinh khoi va phat hien bat thuong.
- **Ung dung nguoi dung:** React Web Dashboard va React Native Mobile App.
- **Thong bao:** Firebase Cloud Messaging (FCM) cho canh bao khan cap tren dien thoai.

## Cong nghe

- Node.js
- NestJS 12
- TypeScript
- PostgreSQL
- Redis
- MQTT
- React va React Native
- Firebase Cloud Messaging
- YOLO11n, MobileNetV3
- LightGBM, LSTM, XGBoost
- Isolation Forest

## Cau truc backend

```text
src/
├── common/                 # Decorator, guard, filter, interceptor va tien ich dung chung
├── config/                 # Cau hinh ung dung va moi truong
├── database/               # Ket noi database va migration
├── mqtt/                   # Ket noi, publish va subscribe MQTT
├── modules/
│   ├── ai-integration/     # Tich hop AI Engine
│   ├── alerts/             # Canh bao bat thuong va canh bao an toan
│   ├── devices/            # Quan ly va dieu khien thiet bi
│   ├── feeding/            # Lich trinh va lenh cho an
│   ├── notifications/      # Gui thong bao FCM
│   ├── safety-rule/        # Kiem tra lenh theo luat an toan
│   └── telemetry/          # Du lieu cam bien va trang thai thiet bi
├── app.module.ts
└── main.ts
```

## Trang thai hien tai

Project dang o giai doan **khoi tao backend**:

- NestJS app da duoc tao va build thanh cong.
- Cau truc module nghiep vu da duoc chuan bi.
- MQTT, PostgreSQL, Redis, AI, FCM va cac nghiep vu chinh chua duoc trien khai day du.
- Mot so controller/service hien van la skeleton de chuan bi cho cac buoc phat trien tiep theo.

README nay mo ta kien truc va muc tieu cua de tai; khong xem cac thanh phan chua co code la da hoan thien.

## Cai dat

Yeu cau:

- Node.js phien ban ho tro TypeScript va NestJS 12.
- npm.
- PostgreSQL, Redis va MQTT broker khi cac module tuong ung duoc trien khai.

Cai dat dependency:

```bash
npm install
```

## Chay backend

```bash
# Moi truong phat trien
npm run start:dev

# Chay thong thuong
npm run start

# Build production
npm run build

# Chay ban da build
npm run start:prod
```

Mac dinh server chay tai `http://localhost:3000`. Co the thay doi port bang bien moi truong `PORT`.

## Kiem tra chat luong

```bash
# Lint
npm run lint

# Unit test
npm run test

# E2E test
npm run test:e2e

# Coverage
npm run test:cov
```

## Lo trinh phat trien

1. Hoan thien cau hinh moi truong va health check.
2. Tich hop PostgreSQL, migration va mo hinh du lieu.
3. Tich hop MQTT broker, topic va quy uoc payload cho ESP32.
4. Xay dung telemetry cho pH, nhiet do, DO va trang thai thiet bi.
5. Xay dung quan ly thiet bi, lich cho an va dieu khien may cho an.
6. Xay dung Safety Rule Engine de kiem tra lenh truoc khi gui xuong thiet bi.
7. Bo sung Redis de luu trang thai thoi gian thuc.
8. Xay dung canh bao va tich hop FCM.
9. Tich hop AI Engine va luong phan tich du lieu.
10. Bo sung authentication, authorization, unit test va integration test.

## Muc tieu dau ra

ShrimpMate huong toi viec giup nguoi nuoi giam lang phi thuc an, giam nhan cong, theo doi ao nuoi tu xa va phat hien som cac rui ro anh huong den moi truong cung nhu suc khoe dan tom.
<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observer](https://observer.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
