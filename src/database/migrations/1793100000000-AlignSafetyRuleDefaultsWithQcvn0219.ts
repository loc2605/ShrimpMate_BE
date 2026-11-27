import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignSafetyRuleDefaultsWithQcvn0219_1793100000000 implements MigrationInterface {
  name = 'AlignSafetyRuleDefaultsWithQcvn0219_1793100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "safety_rules"
      SET
        "name" = 'Heuristic: giảm 50% thức ăn khi nhiệt độ ngoài giới hạn QCVN (18 - 33°C)',
        "condition" = jsonb_set(
          jsonb_set("condition", '{or,0,value}', '18'::jsonb),
          '{or,1,value}',
          '33'::jsonb
        ),
        "action" = jsonb_set(
          "action",
          '{reason}',
          '"Nhiệt độ ngoài giới hạn QCVN 18 - 33°C; giảm 50% lượng thức ăn theo heuristic của đề tài."'::jsonb
        )
      WHERE "code" = 'TEMP_EXTREME_ADJUST'
        AND "condition" #>> '{or,0,value}' = '22'
        AND "condition" #>> '{or,1,value}' = '34'
    `);

    await queryRunner.query(`
      UPDATE "safety_rules"
      SET
        "name" = 'Chặn cho ăn khi NH3 đạt hoặc vượt giới hạn QCVN (0.3 mg/L)',
        "condition" = jsonb_set("condition", '{operator}', '">="'::jsonb),
        "action" = jsonb_set(
          "action",
          '{reason}',
          '"NH3 phải thấp hơn 0.3 mg/L theo QCVN. Cấm cho ăn theo chính sách an toàn của đề tài."'::jsonb
        )
      WHERE "code" = 'AMMONIA_HIGH_BLOCK'
        AND "condition" ->> 'operator' = '>'
        AND "condition" ->> 'value' = '0.3'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "safety_rules"
      SET
        "name" = 'Giảm 50% thức ăn khi nhiệt độ nước quá lạnh (< 22°C) hoặc quá nóng (> 34°C)',
        "condition" = jsonb_set(
          jsonb_set("condition", '{or,0,value}', '22'::jsonb),
          '{or,1,value}',
          '34'::jsonb
        ),
        "action" = jsonb_set(
          "action",
          '{reason}',
          '"Nhiệt độ nước cực đoan (< 22°C hoặc > 34°C) làm tôm giảm bắt mồi và chuyển hóa chậm. Giảm 50% lượng thức ăn."'::jsonb
        )
      WHERE "code" = 'TEMP_EXTREME_ADJUST'
        AND "condition" #>> '{or,0,value}' = '18'
        AND "condition" #>> '{or,1,value}' = '33'
    `);

    await queryRunner.query(`
      UPDATE "safety_rules"
      SET
        "name" = 'Chặn cho ăn khi khí độc Ammonia (NH3) > 0.3 mg/L',
        "condition" = jsonb_set("condition", '{operator}', '">"'::jsonb),
        "action" = jsonb_set(
          "action",
          '{reason}',
          '"Nồng độ khí độc Ammonia (NH3) ở mức nguy hiểm (> 0.3 mg/L). Cấm cho ăn để tránh gây độc cho đàn tôm."'::jsonb
        )
      WHERE "code" = 'AMMONIA_HIGH_BLOCK'
        AND "condition" ->> 'operator' = '>='
        AND "condition" ->> 'value' = '0.3'
    `);
  }
}
