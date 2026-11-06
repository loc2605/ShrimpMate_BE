const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:26052004@localhost:5432/postgres',
});

async function main() {
  await client.connect();
  const rules = [
    {
      code: 'DELTA_TAN_SPIKE_ADJUST',
      name: 'Giảm 50% thức ăn khi biến thiên Ammonia ΔTAN > 0.5 mg/L',
      priority: 6,
      isEnabled: true,
      condition: { field: 'deltaTan', operator: '>', value: 0.5 },
      action: {
        decision: 'adjusted',
        factor: 0.5,
        reason:
          'Biến thiên đạm Amoniac gia tăng đột biến (ΔTAN > 0.5 mg/L). Cảnh báo tồn đọng hữu cơ đáy ao, giảm 50% lượng thức ăn.',
      },
    },
    {
      code: 'HEAVY_RAIN_ADJUST',
      name: 'Giảm 30% thức ăn khi có mưa lớn sáng sớm (≥ 15 mm)',
      priority: 7,
      isEnabled: true,
      condition: { field: 'morningRainMm', operator: '>=', value: 15.0 },
      action: {
        decision: 'adjusted',
        factor: 0.7,
        reason:
          'Ghi nhận mưa lớn sáng sớm (≥ 15 mm) gây nguy cơ phân tầng và sụt nhiệt độ nước. Giảm 30% lượng thức ăn để chống sốc môi trường.',
      },
    },
  ];

  for (const r of rules) {
    const check = await client.query('SELECT id FROM safety_rules WHERE code = $1', [r.code]);
    if (check.rows.length === 0) {
      await client.query(
        'INSERT INTO safety_rules (code, name, priority, "isEnabled", condition, action, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
        [r.code, r.name, r.priority, r.isEnabled, JSON.stringify(r.condition), JSON.stringify(r.action)]
      );
      console.log('Inserted rule:', r.code);
    } else {
      console.log('Rule already exists:', r.code);
    }
  }

  // Cập nhật hoặc thêm một máy cho ăn (Feeder) vào Ao 1 để sẵn sàng cho cữ ăn thông minh
  const pondId = '208cf3b7-a60f-4c83-83b0-54d06fee3d97';
  const feederCheck = await client.query("SELECT id FROM devices WHERE pond_id = $1 AND type = 'feeder'", [pondId]);
  if (feederCheck.rows.length === 0) {
    await client.query(
      "INSERT INTO devices (name, type, device_uid, mode, status, pond_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())",
      ['Máy cho ăn thông minh Ao 1', 'feeder', 'DEV-FEEDER-AO1', 'automatic', 'online', pondId]
    );
    console.log('Đã tạo máy cho ăn Feeder DEV-FEEDER-AO1 cho Ao 1');
  } else {
    console.log('Ao 1 đã có thiết bị Feeder:', feederCheck.rows[0].id);
  }

  const allRules = await client.query('SELECT code, name, priority, action FROM safety_rules ORDER BY priority ASC');
  console.log('ALL RULES IN DB (COUNT: ' + allRules.rows.length + '):');
  console.log(allRules.rows);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
