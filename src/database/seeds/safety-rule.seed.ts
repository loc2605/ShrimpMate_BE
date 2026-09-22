import { DataSource } from 'typeorm';
import { SafetyRule } from '../entities/safety-rule.entity';

export const defaultSafetyRules = [
  {
    code: 'DEVICE_STATUS_BLOCK',
    name: 'Chặn lệnh khi thiết bị lỗi hoặc dừng khẩn cấp',
    priority: 0,
    isEnabled: true,
    condition: { checkDevice: true },
    action: {
      decision: 'blocked',
      reason: 'Thiết bị máy cho ăn đang ở trạng thái lỗi hoặc dừng khẩn cấp (emergency stop).',
    },
  },
  {
    code: 'DO_BELOW_CRITICAL',
    name: 'Chặn cho ăn khi oxy hòa tan (DO) < 3.5 mg/L',
    priority: 1,
    isEnabled: true,
    condition: { field: 'dissolvedOxygenMgL', operator: '<', value: 3.5 },
    action: {
      decision: 'blocked',
      reason: 'Nồng độ oxy hòa tan (DO) quá thấp (< 3.5 mg/L). Cấm cho ăn để tránh tôm bị ngạt và dư thừa thức ăn gây ô nhiễm đáy ao.',
    },
  },
  {
    code: 'DO_LOW_ADJUST',
    name: 'Giảm 50% thức ăn khi DO thấp (3.5 - 4.0 mg/L)',
    priority: 2,
    isEnabled: true,
    condition: { field: 'dissolvedOxygenMgL', operator: '<', value: 4.0 },
    action: {
      decision: 'adjusted',
      factor: 0.5,
      reason: 'Nồng độ oxy hòa tan (DO) thấp (3.5 - 4.0 mg/L). Giảm 50% lượng thức ăn và bật quạt nước.',
    },
  },
  {
    code: 'TEMP_EXTREME_ADJUST',
    name: 'Giảm 50% thức ăn khi nhiệt độ nước quá lạnh (< 22°C) hoặc quá nóng (> 34°C)',
    priority: 3,
    isEnabled: true,
    condition: {
      or: [
        { field: 'temperatureC', operator: '<', value: 22 },
        { field: 'temperatureC', operator: '>', value: 34 },
      ],
    },
    action: {
      decision: 'adjusted',
      factor: 0.5,
      reason: 'Nhiệt độ nước cực đoan (< 22°C hoặc > 34°C) làm tôm giảm bắt mồi và chuyển hóa chậm. Giảm 50% lượng thức ăn.',
    },
  },
  {
    code: 'PH_CRITICAL_BLOCK',
    name: 'Chặn cho ăn khi pH cực đoan (< 7.0 hoặc > 9.0)',
    priority: 4,
    isEnabled: true,
    condition: {
      or: [
        { field: 'ph', operator: '<', value: 7.0 },
        { field: 'ph', operator: '>', value: 9.0 },
      ],
    },
    action: {
      decision: 'blocked',
      reason: 'Độ pH nước nằm ngoài ngưỡng sinh lý an toàn (< 7.0 hoặc > 9.0). Tạm dừng cho ăn để ổn định môi trường.',
    },
  },
  {
    code: 'AMMONIA_HIGH_BLOCK',
    name: 'Chặn cho ăn khi khí độc Ammonia (NH3) > 0.3 mg/L',
    priority: 5,
    isEnabled: true,
    condition: { field: 'ammoniaMgL', operator: '>', value: 0.3 },
    action: {
      decision: 'blocked',
      reason: 'Nồng độ khí độc Ammonia (NH3) ở mức nguy hiểm (> 0.3 mg/L). Cấm cho ăn để tránh gây độc cho đàn tôm.',
    },
  },
];

export async function seedSafetyRuleData(dataSource: DataSource) {
  const safetyRuleRepository = dataSource.getRepository(SafetyRule);

  for (const ruleData of defaultSafetyRules) {
    const existing = await safetyRuleRepository.findOne({ where: { code: ruleData.code } });
    if (!existing) {
      const rule = safetyRuleRepository.create(ruleData);
      await safetyRuleRepository.save(rule);
    }
  }
}
