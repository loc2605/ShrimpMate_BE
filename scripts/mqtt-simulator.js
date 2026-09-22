/**
 * ShrimpMate MQTT Simulator
 * Script mô phỏng thiết bị ESP32 (Sensor Node & Feeder) giao tiếp với Backend
 * 
 * Cách chạy:
 *   node scripts/mqtt-simulator.js [feeder | telemetry | abnormal]
 */

const mqtt = require('mqtt');

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const SENSOR_UID = process.env.SENSOR_UID || 'ESP32_SENSOR_01';
const FEEDER_UID = process.env.FEEDER_UID || 'ESP32_FEEDER_01';

console.log(`[Simulator] Đang kết nối tới MQTT Broker: ${BROKER_URL}...`);
const client = mqtt.connect(BROKER_URL, {
  clientId: `shrimpmate_sim_${Math.random().toString(16).slice(2, 6)}`,
  clean: true,
});

client.on('connect', () => {
  console.log('[Simulator] Đã kết nối MQTT Broker thành công!');

  const mode = process.argv[2] || 'feeder';

  if (mode === 'feeder') {
    runFeederSimulator();
  } else if (mode === 'telemetry') {
    sendNormalTelemetry();
  } else if (mode === 'abnormal') {
    sendAbnormalTelemetry();
  }
});

client.on('error', (err) => {
  console.error('[Simulator] Lỗi kết nối MQTT:', err.message);
});

function runFeederSimulator() {
  const commandTopic = `shrimpmate/devices/${FEEDER_UID}/feeder/command`;
  console.log(`[Simulator - Feeder] Đang lắng nghe lệnh tại: ${commandTopic}`);

  client.subscribe(commandTopic, { qos: 1 }, (err) => {
    if (err) {
      console.error('[Simulator] Lỗi subscribe:', err);
      return;
    }
    console.log('[Simulator] Sẵn sàng nhận lệnh cho ăn từ Backend...');
  });

  client.on('message', (topic, payload) => {
    if (topic === commandTopic) {
      try {
        const cmd = JSON.parse(payload.toString());
        console.log(`[Simulator] ===> NHẬN LỆNH CHO ĂN TỪ BACKEND:`, cmd);

        const statusTopic = `shrimpmate/devices/${FEEDER_UID}/feeder/status`;

        // 1. Phản hồi trạng thái RUNNING
        const runningMsg = {
          deviceUid: FEEDER_UID,
          recordId: cmd.recordId,
          status: 'running',
          timestamp: new Date().toISOString(),
        };
        client.publish(statusTopic, JSON.stringify(runningMsg), { qos: 1 });
        console.log(`[Simulator] <=== Đang cho ăn (status: running)...`);

        // 2. Sau 3 giây, mô phỏng hoàn thành (COMPLETED)
        setTimeout(() => {
          const completedMsg = {
            deviceUid: FEEDER_UID,
            recordId: cmd.recordId,
            status: 'completed',
            actualAmountKg: cmd.feedAmountKg,
            timestamp: new Date().toISOString(),
          };
          client.publish(statusTopic, JSON.stringify(completedMsg), { qos: 1 });
          console.log(`[Simulator] <=== Đã cho ăn xong! Gửi hoàn thành (status: completed):`, completedMsg);
        }, 3000);
      } catch (err) {
        console.error('[Simulator] Lỗi parse lệnh:', err);
      }
    }
  });

  // Gửi heartbeat định kỳ mỗi 30s
  setInterval(() => {
    const heartbeatTopic = `shrimpmate/devices/${FEEDER_UID}/heartbeat`;
    const hb = {
      deviceUid: FEEDER_UID,
      status: 'online',
      firmwareVersion: '1.2.0',
      timestamp: new Date().toISOString(),
    };
    client.publish(heartbeatTopic, JSON.stringify(hb));
  }, 30000);
}

function sendNormalTelemetry() {
  const topic = `shrimpmate/telemetry/${SENSOR_UID}`;
  const payload = {
    deviceUid: SENSOR_UID,
    ph: 7.9,
    dissolvedOxygenMgL: 5.8,
    temperatureC: 29.2,
    salinityPpt: 16.5,
    ammoniaMgL: 0.02,
    turbidityNtu: 25.0,
    measuredAt: new Date().toISOString(),
  };

  client.publish(topic, JSON.stringify(payload), { qos: 1 }, () => {
    console.log(`[Simulator] Đã gửi telemetry BÌNH THƯỜNG tới topic ${topic}:`, payload);
    setTimeout(() => {
      client.end();
      process.exit(0);
    }, 500);
  });
}

function sendAbnormalTelemetry() {
  const topic = `shrimpmate/telemetry/${SENSOR_UID}`;
  const payload = {
    deviceUid: SENSOR_UID,
    ph: 6.8, // Quá thấp
    dissolvedOxygenMgL: 3.1, // Nguy cấp (< 3.5)
    temperatureC: 34.5, // Cảnh báo
    salinityPpt: 14.0,
    ammoniaMgL: 0.25, // Cảnh báo
    turbidityNtu: 30.0,
    measuredAt: new Date().toISOString(),
  };

  client.publish(topic, JSON.stringify(payload), { qos: 1 }, () => {
    console.log(`[Simulator] Đã gửi telemetry VƯỢT NGƯỠNG NGUY CẤP tới topic ${topic}:`, payload);
    setTimeout(() => {
      client.end();
      process.exit(0);
    }, 500);
  });
}
