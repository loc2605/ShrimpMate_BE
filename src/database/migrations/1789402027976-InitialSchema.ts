import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1789402027976 implements MigrationInterface {
    name = 'InitialSchema1789402027976'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TYPE "public"."farms_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "farms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "address" text, "status" "public"."farms_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_39aff9c35006b14025bba5a43d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."ponds_status_enum" AS ENUM('active', 'inactive', 'maintenance')`);
        await queryRunner.query(`CREATE TABLE "ponds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "farm_id" uuid NOT NULL, "code" character varying(50) NOT NULL, "name" character varying(150) NOT NULL, "area_m2" numeric(12,2) NOT NULL, "status" "public"."ponds_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "PK_98593ba3923a9edc0ddefd425ee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."devices_type_enum" AS ENUM('feeder', 'sensor_node', 'camera', 'edge_gateway')`);
        await queryRunner.query(`CREATE TYPE "public"."devices_status_enum" AS ENUM('online', 'offline', 'error', 'maintenance')`);
        await queryRunner.query(`CREATE TYPE "public"."devices_mode_enum" AS ENUM('automatic', 'manual', 'emergency_stop')`);
        await queryRunner.query(`CREATE TABLE "devices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pond_id" uuid, "device_uid" character varying(100) NOT NULL, "name" character varying(150) NOT NULL, "type" "public"."devices_type_enum" NOT NULL, "status" "public"."devices_status_enum" NOT NULL DEFAULT 'offline', "mode" "public"."devices_mode_enum" NOT NULL DEFAULT 'manual', "firmware_version" character varying(50), "last_seen_at" TIMESTAMP WITH TIME ZONE, "metadata" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_3b728a2508a3ada65357779d4ba" UNIQUE ("device_uid"), CONSTRAINT "PK_b1514758245c12daf43486dd1f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."alerts_severity_enum" AS ENUM('1', '2', '3')`);
        await queryRunner.query(`CREATE TYPE "public"."alerts_status_enum" AS ENUM('open', 'acknowledged', 'resolved')`);
        await queryRunner.query(`CREATE TABLE "alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pond_id" uuid NOT NULL, "device_id" uuid, "type" character varying(100) NOT NULL, "severity" "public"."alerts_severity_enum" NOT NULL, "status" "public"."alerts_status_enum" NOT NULL DEFAULT 'open', "message" character varying(255) NOT NULL, "triggered_at" TIMESTAMP WITH TIME ZONE NOT NULL, "acknowledged_at" TIMESTAMP WITH TIME ZONE, "resolved_at" TIMESTAMP WITH TIME ZONE, "metadata" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."ai_recommendations_safety_decision_enum" AS ENUM('allowed', 'adjusted', 'blocked')`);
        await queryRunner.query(`CREATE TYPE "public"."ai_recommendations_status_enum" AS ENUM('pending', 'approved', 'rejected', 'executed')`);
        await queryRunner.query(`CREATE TABLE "ai_recommendations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pond_id" uuid NOT NULL, "model_name" character varying(100) NOT NULL, "model_version" character varying(50), "predicted_feed_amount_kg" numeric(10,3), "spread_rate_kg_per_minute" numeric(10,3), "appetite_level" smallint, "biomass_kg" numeric(12,3), "anomaly_score" double precision, "confidence" double precision, "input_snapshot" jsonb NOT NULL, "explanation" text, "safety_decision" "public"."ai_recommendations_safety_decision_enum", "safety_reason" text, "status" "public"."ai_recommendations_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_57aa33b4356a91e94e98bcd3f2d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."crop_seasons_status_enum" AS ENUM('planned', 'active', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "crop_seasons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pond_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "stocking_date" date NOT NULL, "initial_count" integer NOT NULL, "stocking_density" numeric(12,2) NOT NULL, "initial_average_weight_g" numeric(8,3), "estimated_survival_rate" numeric(5,2), "status" "public"."crop_seasons_status_enum" NOT NULL DEFAULT 'planned', CONSTRAINT "PK_d4ac8a47c6fd84757663b9a9697" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "feeding_schedules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pond_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "time_of_day" TIME NOT NULL, "feed_amount_kg" numeric(10,3) NOT NULL, "spread_rate_kg_per_minute" numeric(10,3), "days_of_week" smallint array NOT NULL DEFAULT '{}', "isEnabled" boolean NOT NULL DEFAULT true, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1183a28b91c5169683b5d8d84f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."feeding_records_source_enum" AS ENUM('schedule', 'manual', 'ai')`);
        await queryRunner.query(`CREATE TYPE "public"."feeding_records_status_enum" AS ENUM('requested', 'running', 'completed', 'stopped', 'failed')`);
        await queryRunner.query(`CREATE TABLE "feeding_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pond_id" uuid NOT NULL, "device_id" uuid, "schedule_id" uuid, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "finished_at" TIMESTAMP WITH TIME ZONE, "requested_amount_kg" numeric(10,3) NOT NULL, "actual_amount_kg" numeric(10,3), "source" "public"."feeding_records_source_enum" NOT NULL, "status" "public"."feeding_records_status_enum" NOT NULL DEFAULT 'requested', "appetite_level" smallint, "leftover_percent" numeric(5,2), "stopped_reason" text, CONSTRAINT "PK_7e9258bc22a3cae38ab6d3c1088" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "safety_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(100) NOT NULL, "name" character varying(150) NOT NULL, "priority" integer NOT NULL DEFAULT '100', "isEnabled" boolean NOT NULL DEFAULT true, "condition" jsonb NOT NULL, "action" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_88f1e45274c59a74b19933509f3" UNIQUE ("code"), CONSTRAINT "PK_1cc0e053722736ef4639d1e6bf4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "telemetry_readings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pond_id" uuid NOT NULL, "device_id" uuid, "measured_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ph" double precision, "dissolved_oxygen_mg_l" double precision, "temperature_c" double precision, "salinity_ppt" double precision, "ammonia_mg_l" double precision, "turbidity_ntu" double precision, "rawData" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_3c576a1d50104b70a55fb0025ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fee11c8361b2cb1b847d3a98a6" ON "telemetry_readings"  ("device_id", "measured_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_4d867ce73acd6fc23d31b89d3e" ON "telemetry_readings"  ("pond_id", "measured_at") `);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'manager', 'operator')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "full_name" character varying(150) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'operator', "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "ponds" ADD CONSTRAINT "FK_ee74014c78c9bd5a81f3bba44eb" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "devices" ADD CONSTRAINT "FK_ad1b589914114e31593f7ee5abf" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD CONSTRAINT "FK_85f99b1dbee6f39c253b25de6d5" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD CONSTRAINT "FK_bde35b32d03b804b0944331ac85" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ai_recommendations" ADD CONSTRAINT "FK_285546b99e6b76d2a242999f1e3" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "crop_seasons" ADD CONSTRAINT "FK_6b77b35d6df769c4a3d5525de3e" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "feeding_schedules" ADD CONSTRAINT "FK_639ddc3cb0047837a3e134de849" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "feeding_records" ADD CONSTRAINT "FK_9a7e2a3e0e06be413287a93ac36" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "feeding_records" ADD CONSTRAINT "FK_ea527c917587061061940c24f1f" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "feeding_records" ADD CONSTRAINT "FK_92f83de843691fdb41bf7953d73" FOREIGN KEY ("schedule_id") REFERENCES "feeding_schedules"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "telemetry_readings" ADD CONSTRAINT "FK_4663e6d553c3f399c2d6c0dfff8" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "telemetry_readings" ADD CONSTRAINT "FK_2c08291364d84eeb9c0cbd19720" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "telemetry_readings" DROP CONSTRAINT "FK_2c08291364d84eeb9c0cbd19720"`);
        await queryRunner.query(`ALTER TABLE "telemetry_readings" DROP CONSTRAINT "FK_4663e6d553c3f399c2d6c0dfff8"`);
        await queryRunner.query(`ALTER TABLE "feeding_records" DROP CONSTRAINT "FK_92f83de843691fdb41bf7953d73"`);
        await queryRunner.query(`ALTER TABLE "feeding_records" DROP CONSTRAINT "FK_ea527c917587061061940c24f1f"`);
        await queryRunner.query(`ALTER TABLE "feeding_records" DROP CONSTRAINT "FK_9a7e2a3e0e06be413287a93ac36"`);
        await queryRunner.query(`ALTER TABLE "feeding_schedules" DROP CONSTRAINT "FK_639ddc3cb0047837a3e134de849"`);
        await queryRunner.query(`ALTER TABLE "crop_seasons" DROP CONSTRAINT "FK_6b77b35d6df769c4a3d5525de3e"`);
        await queryRunner.query(`ALTER TABLE "ai_recommendations" DROP CONSTRAINT "FK_285546b99e6b76d2a242999f1e3"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_bde35b32d03b804b0944331ac85"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_85f99b1dbee6f39c253b25de6d5"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT "FK_ad1b589914114e31593f7ee5abf"`);
        await queryRunner.query(`ALTER TABLE "ponds" DROP CONSTRAINT "FK_ee74014c78c9bd5a81f3bba44eb"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4d867ce73acd6fc23d31b89d3e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fee11c8361b2cb1b847d3a98a6"`);
        await queryRunner.query(`DROP TABLE "telemetry_readings"`);
        await queryRunner.query(`DROP TABLE "safety_rules"`);
        await queryRunner.query(`DROP TABLE "feeding_records"`);
        await queryRunner.query(`DROP TYPE "public"."feeding_records_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."feeding_records_source_enum"`);
        await queryRunner.query(`DROP TABLE "feeding_schedules"`);
        await queryRunner.query(`DROP TABLE "crop_seasons"`);
        await queryRunner.query(`DROP TYPE "public"."crop_seasons_status_enum"`);
        await queryRunner.query(`DROP TABLE "ai_recommendations"`);
        await queryRunner.query(`DROP TYPE "public"."ai_recommendations_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ai_recommendations_safety_decision_enum"`);
        await queryRunner.query(`DROP TABLE "alerts"`);
        await queryRunner.query(`DROP TYPE "public"."alerts_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."alerts_severity_enum"`);
        await queryRunner.query(`DROP TABLE "devices"`);
        await queryRunner.query(`DROP TYPE "public"."devices_mode_enum"`);
        await queryRunner.query(`DROP TYPE "public"."devices_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."devices_type_enum"`);
        await queryRunner.query(`DROP TABLE "ponds"`);
        await queryRunner.query(`DROP TYPE "public"."ponds_status_enum"`);
        await queryRunner.query(`DROP TABLE "farms"`);
        await queryRunner.query(`DROP TYPE "public"."farms_status_enum"`);
    }

}
