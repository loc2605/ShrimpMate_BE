import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeedingFeedbacksAndLinkAiRecommendation1794000000000 implements MigrationInterface {
  name = 'CreateFeedingFeedbacksAndLinkAiRecommendation1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm liên kết ai_recommendation_id vào bảng feeding_records
    await queryRunner.query(`
      ALTER TABLE "feeding_records"
      ADD COLUMN IF NOT EXISTS "ai_recommendation_id" uuid NULL;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_feeding_records_ai_recommendation'
        ) THEN
          ALTER TABLE "feeding_records"
          ADD CONSTRAINT "FK_feeding_records_ai_recommendation"
          FOREIGN KEY ("ai_recommendation_id")
          REFERENCES "ai_recommendations"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_feeding_records_ai_recommendation"
      ON "feeding_records" ("ai_recommendation_id");
    `);

    // 2. Tạo bảng feeding_feedbacks để lưu trữ kết quả kiểm tra sàn ăn (nhá) và tính toán sai số AI
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "feeding_feedbacks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pond_id" uuid NOT NULL,
        "record_id" uuid NOT NULL,
        "recommendation_id" uuid NULL,
        "actual_amount_kg" numeric(10,3) NOT NULL,
        "leftover_percent" numeric(5,2) NOT NULL,
        "tray_inspection_minutes" integer NULL,
        "gut_fullness_score" smallint NULL,
        "effective_consumed_kg" numeric(10,3) NOT NULL,
        "predicted_amount_kg" numeric(10,3) NULL,
        "residual_kg" numeric(10,3) NULL,
        "evaluation" character varying(30) NOT NULL DEFAULT 'optimal',
        "recommended_adjustment_percent" numeric(5,2) NULL,
        "notes" text NULL,
        "features_snapshot" jsonb NOT NULL DEFAULT '{}',
        "synced_to_ai" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_feeding_feedbacks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_feeding_feedbacks_pond" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_feeding_feedbacks_record" FOREIGN KEY ("record_id") REFERENCES "feeding_records"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_feeding_feedbacks_recommendation" FOREIGN KEY ("recommendation_id") REFERENCES "ai_recommendations"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_feeding_feedbacks_pond_created"
      ON "feeding_feedbacks" ("pond_id", "created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_feeding_feedbacks_record"
      ON "feeding_feedbacks" ("record_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_feeding_feedbacks_record";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_feeding_feedbacks_pond_created";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "feeding_feedbacks";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_feeding_records_ai_recommendation";`);
    await queryRunner.query(`ALTER TABLE "feeding_records" DROP CONSTRAINT IF EXISTS "FK_feeding_records_ai_recommendation";`);
    await queryRunner.query(`ALTER TABLE "feeding_records" DROP COLUMN IF EXISTS "ai_recommendation_id";`);
  }
}
