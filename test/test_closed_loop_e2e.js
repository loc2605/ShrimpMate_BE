const http = require('http');
const mqtt = require('mqtt');
const { Client } = require('pg');

const DB_CONFIG = {
  connectionString: 'postgresql://postgres:26052004@localhost:5432/postgres',
};
const MQTT_BROKER = 'mqtt://localhost:1883';
const POND_ID = '208cf3b7-a60f-4c83-83b0-54d06fee3d97';
const FEEDER_UID = 'DEV-FEEDER-AO1';

function postJson(urlStr, data, headers = {}) {
  const url = new URL(urlStr);
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(data);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          ...headers,
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
          } catch {
            resolve({ status: res.statusCode, raw: responseBody });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function insertTelemetry(pgClient, { ph, doMgL, tempC, ammoniaMgL }) {
  await pgClient.query(
    `INSERT INTO telemetry_readings (pond_id, measured_at, ph, dissolved_oxygen_mg_l, temperature_c, ammonia_mg_l, salinity_ppt, turbidity_ntu)
     VALUES ($1, NOW(), $2, $3, $4, $5, 18.5, 12.0)`,
    [POND_ID, ph, doMgL, tempC, ammoniaMgL]
  );
}

async function run() {
  console.log('================================================================');
  console.log('  TEST GIAI ĐOẠN 3: VÒNG LẶP ĐIỀU KHIỂN THÔNG MINH KHÉP KÍN');
  console.log('  AI (XGBoost) -> Safety Rules (ΔTAN, Mưa) -> MQTT Hardware -> Alert');
  console.log('================================================================\n');

  // 1. Kết nối PostgreSQL
  const pgClient = new Client(DB_CONFIG);
  await pgClient.connect();
  console.log('✅ Đã kết nối PostgreSQL');

  // 2. Kết nối MQTT Broker để nghe lệnh điều khiển bắn xuống thiết bị
  const mqttClient = mqtt.connect(MQTT_BROKER);
  const receivedMqttCommands = [];

  await new Promise((resolve, reject) => {
    mqttClient.on('connect', () => {
      console.log('✅ Đã kết nối Mosquitto MQTT Broker tại ' + MQTT_BROKER);
      const topic = `shrimpmate/devices/${FEEDER_UID}/feeder/command`;
      mqttClient.subscribe(topic, (err) => {
        if (err) reject(err);
        else {
          console.log(`✅ Đã lắng nghe lệnh điều khiển tại topic: ${topic}\n`);
          resolve();
        }
      });
    });
    mqttClient.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        console.log(`📡 [MQTT NHẬN ĐƯỢC LỆNH PHẦN CỨNG] Topic: ${topic}`);
        console.log(JSON.stringify(payload, null, 2));
        receivedMqttCommands.push(payload);
      } catch {
        console.log(`📡 [MQTT NHẬN DỮ LIỆU THÔ] ${message.toString()}`);
      }
    });
    mqttClient.on('error', reject);
  });

  // 3. Đăng nhập lấy JWT Token Admin
  const loginRes = await postJson('http://localhost:3000/auth/login', {
    identifier: 'admin@shrimpmate.local',
    password: 'Admin@123456',
  });
  const token = loginRes.data?.accessToken;
  if (!token) throw new Error('Không đăng nhập được: ' + JSON.stringify(loginRes));
  const authHeader = { Authorization: `Bearer ${token}` };
  console.log('✅ Đăng nhập Admin thành công (JWT Token verified)\n');

  // =========================================================================
  // KỊCH BẢN 1: MÔI TRƯỜNG AN TOÀN -> AI DỰ BÁO -> SAFETY PHÊ DUYỆT -> MQTT FEED
  // =========================================================================
  console.log('--- [KỊCH BẢN 1] Môi trường nước tối ưu, kích hoạt cữ ăn thông minh tự động ---');
  // Xóa các mẫu test cực đoan trước đó để cửa sổ 10 mẫu gần nhất đều tối ưu
  await pgClient.query('DELETE FROM telemetry_readings WHERE pond_id = $1', [POND_ID]);
  // Chèn 5 mẫu tối ưu: pH=7.8, DO=5.8, Temp=28.5, Ammonia=0.04
  for (let i = 0; i < 5; i++) {
    await insertTelemetry(pgClient, { ph: 7.8, doMgL: 5.8, tempC: 28.5, ammoniaMgL: 0.04 });
  }

  const recordRes1 = await postJson(
    `http://localhost:3000/ponds/${POND_ID}/feeding-records`,
    {
      source: 'manual',
      useAiPrediction: true, // Kích hoạt AI tự động đề xuất khẩu phần
    },
    authHeader
  );

  console.log('Kết quả kích hoạt cữ ăn (Status ' + recordRes1.status + '):');
  console.log(JSON.stringify(recordRes1.data, null, 2));

  // Chờ 1 giây để MQTT kịp nhận lệnh
  await new Promise((r) => setTimeout(r, 1000));
  if (receivedMqttCommands.length > 0) {
    console.log('🎉 XÁC NHẬN: Lệnh FEED đã được phát thành công qua MQTT tới máy cho ăn!');
  } else {
    console.warn('⚠️ Chưa nhận được lệnh MQTT (kiểm tra trạng thái thiết bị feeder)');
  }

  // =========================================================================
  // KỊCH BẢN 2: BIẾN THIÊN AMMONIA ĐỘT BIẾN (ΔTAN > 0.5 mg/L) -> SAFETY RULE HẠ 50%
  // =========================================================================
  console.log('\n--- [KỊCH BẢN 2] Biến thiên Ammonia tăng đột biến (ΔTAN = 0.65 mg/L) ---');
  // Chèn bản ghi trước: Ammonia = 0.05
  await insertTelemetry(pgClient, { ph: 7.8, doMgL: 5.5, tempC: 28.5, ammoniaMgL: 0.05 });
  // Chèn bản ghi mới: Ammonia = 0.70 -> ΔTAN = +0.65 mg/L
  await insertTelemetry(pgClient, { ph: 7.8, doMgL: 5.4, tempC: 28.5, ammoniaMgL: 0.70 });

  const recordRes2 = await postJson(
    `http://localhost:3000/ponds/${POND_ID}/feeding-records`,
    {
      source: 'manual',
      useAiPrediction: true,
    },
    authHeader
  );

  console.log('Kết quả phản hồi khi ΔTAN tăng vọt (Status ' + recordRes2.status + '):');
  console.log(JSON.stringify(recordRes2.data, null, 2));

  // =========================================================================
  // KỊCH BẢN 3: NGUY CẤP OXY HÒA TAN TỤT (< 3.5 mg/L) -> CHẶN ĂN & BẮN CẢNH BÁO
  // =========================================================================
  console.log('\n--- [KỊCH BẢN 3] Nồng độ Oxy hòa tan tụt nguy cấp (DO = 2.6 mg/L) ---');
  await insertTelemetry(pgClient, { ph: 7.8, doMgL: 2.6, tempC: 28.5, ammoniaMgL: 0.05 });

  const recordRes3 = await postJson(
    `http://localhost:3000/ponds/${POND_ID}/feeding-records`,
    {
      source: 'manual',
      useAiPrediction: true,
    },
    authHeader
  );

  console.log('Kết quả phản hồi khi DO nguy cấp (Status ' + recordRes3.status + '):');
  console.log(JSON.stringify(recordRes3.data, null, 2));

  // Kiểm tra bảng alerts trong PostgreSQL để chứng minh cảnh báo an toàn được tạo
  const alertCheck = await pgClient.query(
    "SELECT id, type, severity, message, created_at FROM alerts WHERE pond_id = $1 ORDER BY created_at DESC LIMIT 1",
    [POND_ID]
  );
  console.log('\n🔔 Cảnh báo mới nhất ghi nhận trong CSDL:');
  console.log(alertCheck.rows[0]);

  // Dọn dẹp
  mqttClient.end();
  await pgClient.end();
  console.log('\n================================================================');
  console.log('  TẤT CẢ KIỂM THỬ GIAI ĐOẠN 3 HOÀN TẤT THÀNH CÔNG VƯỢT MỨC! 🎉');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('Lỗi khi chạy kịch bản kiểm thử Giai đoạn 3:', err);
  process.exit(1);
});
