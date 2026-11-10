import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiRecommendationIdToAlerts1792000000000 implements MigrationInterface {
  name = 'AddAiRecommendationIdToAlerts1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "alerts"
      ADD COLUMN IF NOT EXISTS "ai_recommendation_id" uuid NULL;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_alerts_ai_recommendation'
        ) THEN
          ALTER TABLE "alerts"
          ADD CONSTRAINT "FK_alerts_ai_recommendation"
          FOREIGN KEY ("ai_recommendation_id")
          REFERENCES "ai_recommendations"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alerts_ai_recommendation"
      ON "alerts" ("ai_recommendation_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_ai_recommendation";`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "FK_alerts_ai_recommendation";`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN IF EXISTS "ai_recommendation_id";`);
  }
}

