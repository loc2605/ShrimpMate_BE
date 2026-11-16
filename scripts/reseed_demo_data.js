const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function reseed() {
  const client = new Client({
    connectionString: 'postgresql://postgres:26052004@localhost:5432/postgres',
  });
  await client.connect();
  console.log('Connected to PostgreSQL database.');

  // 1. Truncate business & telemetry tables safely
  console.log('Cleaning up old test data...');
  await client.query(`
    TRUNCATE TABLE 
      ai_recommendations,
      alerts,
      telemetry_readings,
      feeding_records,
      feeding_schedules,
      crop_seasons,
      devices,
      farmer_assignments,
      ponds,
      farms,
      password_reset_otps
    CASCADE;
  `);

  // 2. Ensure core users exist and are active
  console.log('Configuring core users...');
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 12);
  const managerPasswordHash = await bcrypt.hash('Manager@123456', 12);
  const farmerPasswordHash = await bcrypt.hash('Farmer@123456', 12);

  // Admin
  const adminRes = await client.query(`
    INSERT INTO users (id, email, phone_number, password_hash, full_name, role, "isActive", must_change_password, is_admin_locked, token_version)
    VALUES ('101c409e-7518-498c-b8bb-1d05035e0b1f', 'admin@shrimpmate.local', '0901000001', $1, 'ShrimpMate Admin', 'admin', true, false, false, 0)
    ON CONFLICT (email) DO UPDATE SET 
      password_hash = $1, "isActive" = true, is_admin_locked = false, locked_until = NULL, role = 'admin'
    RETURNING id, email, role;
  `, [adminPasswordHash]);

  // Manager
  const managerRes = await client.query(`
    INSERT INTO users (id, email, phone_number, password_hash, full_name, role, "isActive", must_change_password, is_admin_locked, token_version)
    VALUES ('5289f404-39cb-4ca0-9fa2-0f463a61fce7', 'manager@shrimpmate.local', '0901000002', $1, 'ShrimpMate Manager', 'manager', true, false, false, 0)
    ON CONFLICT (email) DO UPDATE SET 
      password_hash = $1, "isActive" = true, is_admin_locked = false, locked_until = NULL, role = 'manager'
    RETURNING id, email, role;
  `, [managerPasswordHash]);
  const managerId = managerRes.rows[0].id;

  // Farmer
  const farmerRes = await client.query(`
    INSERT INTO users (id, email, phone_number, password_hash, full_name, role, "isActive", must_change_password, is_admin_locked, token_version, manager_id)
    VALUES ('a5d41bff-cc28-47c0-8c19-3fc2e966821e', 'farmer@shrimpmate.local', '0901000003', $1, 'ShrimpMate Farmer', 'farmer', true, false, false, 0, $2)
    ON CONFLICT (email) DO UPDATE SET 
      password_hash = $1, "isActive" = true, is_admin_locked = false, locked_until = NULL, role = 'farmer', manager_id = $2
    RETURNING id, email, role;
  `, [farmerPasswordHash, managerId]);
  const farmerId = farmerRes.rows[0].id;

  console.log(`Users verified: Admin (${adminRes.rows[0].email}), Manager (${managerRes.rows[0].email}), Farmer (${farmerRes.rows[0].email})`);

  // 3. Create 2 Farms owned by manager@shrimpmate.local
  console.log('Seeding 2 Farms for Manager...');
  const farm1Id = '788b3aaf-8235-45fb-8214-abe3aaed2bb5';
  const farm2Id = 'f2eb0d82-d932-4d07-a508-14f9653ba022';

  await client.query(`
    INSERT INTO farms (id, name, address, status, owner_id)
    VALUES 
      ($1, 'Trang trại Sóng Xanh', 'Bạc Liêu, Việt Nam', 'active', $3),
      ($2, 'Trang trại Cà Mau Eco-Shrimp', 'Cà Mau, Việt Nam', 'active', $3);
  `, [farm1Id, farm2Id, managerId]);

  // 4. Create 4 Ponds (2 ponds per farm)
  console.log('Seeding 4 Ponds (2 per farm)...');
  const pond1Id = '208cf3b7-a60f-4c83-83b0-54d06fee3d97'; // Ao 1 (Ao test chính)
  const pond2Id = '9449a7a5-4c28-4b18-aabb-ff0171116a74'; // Ao 2
  const pond3Id = '7466260a-ff2b-4e3c-870b-2b8f1a6a82bc'; // Ao 3
  const pond4Id = '624bbafc-1caa-4a5f-a345-26cc29ed8466'; // Ao 4

  await client.query(`
    INSERT INTO ponds (id, farm_id, code, name, area_m2, status)
    VALUES
      ($1, $5, 'POND-01', 'Ao 1 - Giai đoạn tăng trưởng', 3200, 'active'),
      ($2, $5, 'POND-02', 'Ao 2 - Giai đoạn nuôi thương phẩm', 2800, 'active'),
      ($3, $6, 'POND-03', 'Ao 3 - Ương giống công nghệ cao', 2000, 'active'),
      ($4, $6, 'POND-04', 'Ao 4 - Nuôi tuần hoàn RAS', 2500, 'active');
  `, [pond1Id, pond2Id, pond3Id, pond4Id, farm1Id, farm2Id]);

  // 5. Assign Farmer to Farm 1 & Pond 1
  console.log('Assigning Farmer to Farm 1 & Pond 1...');
  await client.query(`
    INSERT INTO farmer_assignments (farmer_id, farm_id, pond_id)
    VALUES ($1, $2, $3);
  `, [farmerId, farm1Id, pond1Id]);

  // 6. Seed IoT Devices (Feeder & Sensor assigned to Ao 1 test; 2 free devices in catalog)
  console.log('Seeding IoT Devices...');
  const feeder1Id = '52c77a02-f1d4-4b0f-ac37-48f5473ac820';
  const sensor1Id = '3811bc6e-0d53-4e8b-a581-32771f85a103';

  await client.query(`
    INSERT INTO devices (id, pond_id, device_uid, name, type, status, mode, firmware_version, metadata)
    VALUES
      ($1, $3, 'DEV-FEEDER-001', 'Máy cho ăn thông minh Ao 1', 'feeder', 'online', 'automatic', 'v2.1.0', '{"feederCapacityKg": 50, "spreadRadiusM": 12}'),
      ($2, $3, 'DEV-SENSOR-001', 'Trạm cảm biến đa chỉ tiêu Ao 1', 'sensor_node', 'online', 'automatic', 'v2.1.0', '{"probes": ["DO", "pH", "temp", "salinity", "NH3"]}'),
      (gen_random_uuid(), NULL, 'DEV-FEEDER-002', 'Máy cho ăn tự động 02 (Kho)', 'feeder', 'online', 'automatic', 'v2.0.0', '{"feederCapacityKg": 50}'),
      (gen_random_uuid(), NULL, 'DEV-SENSOR-002', 'Sensor giám sát nước 02 (Kho)', 'sensor_node', 'online', 'automatic', 'v2.0.0', '{"probes": ["DO", "pH"]}');
  `, [feeder1Id, sensor1Id, pond1Id]);

  // 7. Seed Crop Season for Ao 1 (Active, DOC = 45 days)
  console.log('Seeding Crop Season for Pond 1...');
  const stockingDate = new Date();
  stockingDate.setDate(stockingDate.getDate() - 45); // 45 ngày trước
  const stockingDateStr = stockingDate.toISOString().split('T')[0];

  const seasonRes = await client.query(`
    INSERT INTO crop_seasons (id, pond_id, name, stocking_date, initial_count, stocking_density, initial_average_weight_g, estimated_survival_rate, status)
    VALUES 
      (gen_random_uuid(), $1, 'Vụ tôm thẻ chân trắng 2026 - Đợt 1', $2, 180000, 56.25, 0.8, 85.0, 'active'),
      (gen_random_uuid(), $3, 'Vụ tôm thẻ chân trắng 2026 - Đợt 2', '2026-09-01', 150000, 53.57, 0.8, 90.0, 'planned')
    RETURNING id;
  `, [pond1Id, stockingDateStr, pond2Id]);
  const activeSeasonId = seasonRes.rows[0].id;

  // 8. Seed Feeding Schedule for Ao 1
  console.log('Seeding Feeding Schedules for Pond 1...');
  const scheduleRes = await client.query(`
    INSERT INTO feeding_schedules (id, pond_id, name, time_of_day, feed_amount_kg, spread_rate_kg_per_minute, days_of_week, "isEnabled")
    VALUES
      (gen_random_uuid(), $1, 'Lịch cho ăn sáng Ao 1 (08:00)', '08:00:00', 12.5, 1.5, '{0,1,2,3,4,5,6}', true),
      (gen_random_uuid(), $1, 'Lịch cho ăn chiều Ao 1 (16:00)', '16:00:00', 15.0, 1.5, '{0,1,2,3,4,5,6}', true)
    RETURNING id;
  `, [pond1Id]);
  const morningScheduleId = scheduleRes.rows[0].id;

  // 9. Seed specific Feeding Record for Ao 1 (1 cữ ăn cụ thể đã hoàn thành sáng nay)
  console.log('Seeding Completed Feeding Record for Pond 1...');
  const todayMorning = new Date();
  todayMorning.setHours(8, 0, 0, 0);
  const todayMorningFinished = new Date();
  todayMorningFinished.setHours(8, 10, 0, 0);

  await client.query(`
    INSERT INTO feeding_records (
      id, pond_id, device_id, schedule_id, started_at, finished_at,
      requested_amount_kg, actual_amount_kg, source, status,
      safety_decision, safety_reason, appetite_level, leftover_percent
    )
    VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5,
      12.5, 12.5, 'schedule', 'completed',
      'allowed', 'Chỉ số môi trường nước đạt chuẩn an toàn', 1, 0.0
    );
  `, [pond1Id, feeder1Id, morningScheduleId, todayMorning.toISOString(), todayMorningFinished.toISOString()]);

  // 10. Seed Telemetry Readings for Ao 1 (Đảm bảo an toàn cho AI và Safety Engine)
  console.log('Seeding Telemetry Readings for Pond 1...');
  const now = new Date();
  const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const twentyMinsAgo = new Date(now.getTime() - 20 * 60 * 1000);

  await client.query(`
    INSERT INTO telemetry_readings (
      pond_id, device_id, dissolved_oxygen_mg_l, ph, temperature_c,
      salinity_ppt, ammonia_mg_l, turbidity_ntu, measured_at, "rawData"
    )
    VALUES 
      ($1, $2, 5.80, 7.85, 28.5, 15.0, 0.02, 12.0, $3, '{"rainMm": 0.0, "waterChangeM3": 0.0}'),
      ($1, $2, 5.90, 7.82, 28.6, 15.0, 0.02, 11.5, $4, '{"rainMm": 0.0, "waterChangeM3": 0.0}');
  `, [pond1Id, sensor1Id, tenMinsAgo.toISOString(), twentyMinsAgo.toISOString()]);

  console.log('====================================================');
  console.log('SUCCESS: DỮ LIỆU DEMO ĐÃ ĐƯỢC TẠO LẠI HOÀN CHỈNH!');
  console.log('Tài khoản Manager:');
  console.log('  - Email: manager@shrimpmate.local');
  console.log('  - Password: Manager@123456');
  console.log('  - Quản lý 2 Trang trại:');
  console.log('    1. Trang trại Sóng Xanh (Bạc Liêu)');
  console.log('       - Ao 1 (POND-01): 3200m2 [Ao test chính]');
  console.log('       - Ao 2 (POND-02): 2800m2');
  console.log('    2. Trang trại Cà Mau Eco-Shrimp (Cà Mau)');
  console.log('       - Ao 3 (POND-03): 2000m2');
  console.log('       - Ao 4 (POND-04): 2500m2');
  console.log('Thiết bị gán cho Ao 1 (POND-01):');
  console.log('  - Máy cho ăn: DEV-FEEDER-001 (Online)');
  console.log('  - Trạm cảm biến: DEV-SENSOR-001 (Online)');
  console.log('Cữ ăn Ao 1 (POND-01):');
  console.log('  - Lịch ăn: 08:00 (12.5kg) & 16:00 (15kg)');
  console.log('  - 1 cữ ăn sáng nay 08:00 đã COMPLETED (12.5kg, allowed)');
  console.log('====================================================');

  await client.end();
}

reseed().catch((err) => {
  console.error('Lỗi khi reseed:', err);
  process.exit(1);
});
