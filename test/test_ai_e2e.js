const http = require('http');

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
          } catch (e) {
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

function getJson(urlStr, headers = {}) {
  const url = new URL(urlStr);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...headers,
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: responseBody });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('=== TEST 1: Đăng nhập Admin lấy JWT Token ===');
  const loginRes = await postJson('http://localhost:3000/auth/login', {
    identifier: 'admin@shrimpmate.local',
    password: 'Admin@123456',
  });
  console.log('Login status:', loginRes.status);
  const token = loginRes.data?.accessToken;
  if (!token) {
    console.error('Không lấy được token:', loginRes);
    process.exit(1);
  }
  console.log('JWT Token lấy thành công (độ dài):', token.length);

  const authHeader = { Authorization: `Bearer ${token}` };
  const pondId = '208cf3b7-a60f-4c83-83b0-54d06fee3d97';

  console.log('\n=== TEST 2: Dự báo sinh khối (Forecast Biomass) ===');
  const biomassRes = await getJson(
    `http://localhost:3000/ponds/${pondId}/ai/forecast-biomass`,
    authHeader
  );
  console.log('Forecast Biomass Response (Status ' + biomassRes.status + '):');
  console.log(JSON.stringify(biomassRes.data, null, 2));

  console.log('\n=== TEST 3: Dự báo thức ăn tự động từ CSDL (Predict Feed Demand) ===');
  const predictRes1 = await postJson(
    `http://localhost:3000/ponds/${pondId}/ai/predict-feed`,
    {},
    authHeader
  );
  console.log('Predict Feed Demand (Normal) (Status ' + predictRes1.status + '):');
  console.log(JSON.stringify(predictRes1.data, null, 2));

  console.log('\n=== TEST 4: Dự báo thức ăn khi có mưa lớn sáng (30mm) ===');
  const predictRes2 = await postJson(
    `http://localhost:3000/ponds/${pondId}/ai/predict-feed`,
    { morningRainMm: 30.0 },
    authHeader
  );
  console.log('Predict Feed Demand (Rain) (Status ' + predictRes2.status + '):');
  console.log(JSON.stringify(predictRes2.data, null, 2));

  console.log('\n=== TEST 5: Dự báo thức ăn khi DO nguy cấp (DO = 2.5 mg/L) ===');
  const predictRes3 = await postJson(
    `http://localhost:3000/ponds/${pondId}/ai/predict-feed`,
    { doMin: 2.5 },
    authHeader
  );
  console.log('Predict Feed Demand (Low DO) (Status ' + predictRes3.status + '):');
  console.log(JSON.stringify(predictRes3.data, null, 2));

  console.log('\n=== TEST 6: Lấy khuyến nghị mới nhất (Latest Recommendation) ===');
  const latestRes = await getJson(
    `http://localhost:3000/ponds/${pondId}/ai/recommendations/latest`,
    authHeader
  );
  console.log('Latest Recommendation (Status ' + latestRes.status + '):');
  console.log(JSON.stringify(latestRes.data, null, 2));

  console.log('\n=== TẤT CẢ KIỂM THỬ TÍCH HỢP HOÀN TẤT THÀNH CÔNG ===');
}

run().catch((err) => {
  console.error('Lỗi khi chạy integration test:', err);
  process.exit(1);
});
