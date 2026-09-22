import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../database/entities/device.entity';
import { CropSeason } from '../../database/entities/crop-season.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import { FeedingSchedule } from '../../database/entities/feeding-schedule.entity';
import { Pond } from '../../database/entities/pond.entity';
import { AlertSeverity, CropSeasonStatus, FeedingStatus, SafetyDecision } from '../../database/entities/enums';
import { CreateFeedingRecordDto } from './dto/create-feeding-record.dto';
import { CreateFeedingScheduleDto } from './dto/create-feeding-schedule.dto';
import { UpdateFeedingScheduleDto } from './dto/update-feeding-schedule.dto';
import { UpdateFeedingRecordDto } from './dto/update-feeding-record.dto';
import { User } from '../../database/entities/user.entity';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { SafetyRuleEngineService } from '../safety-rule/safety-rule-engine.service';
import { MqttService } from '../../mqtt/mqtt.service';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class FeedingService {
	constructor(
		@InjectRepository(FeedingSchedule)
		private readonly scheduleRepository: Repository<FeedingSchedule>,
		@InjectRepository(FeedingRecord)
		private readonly recordRepository: Repository<FeedingRecord>,
		@InjectRepository(Pond)
		private readonly pondRepository: Repository<Pond>,
		@InjectRepository(Device)
		private readonly deviceRepository: Repository<Device>,
		@InjectRepository(CropSeason)
		private readonly cropSeasonRepository: Repository<CropSeason>,
		private readonly pondAccessService: PondAccessService,
		private readonly safetyRuleEngineService: SafetyRuleEngineService,
		private readonly mqttService: MqttService,
		private readonly alertsService: AlertsService,
	) { }

	async createSchedule(pondId: string, dto: CreateFeedingScheduleDto, user?: User) {
		await this.ensurePondCanReceiveFeeding(pondId, user);
		const timeOfDay = this.normalizeTime(dto.timeOfDay);
		await this.ensureNoScheduleConflict(pondId, timeOfDay, dto.daysOfWeek);
		const schedule = this.scheduleRepository.create({
			...dto,
			pondId,
			name: dto.name.trim(),
			timeOfDay,
			spreadRateKgPerMinute: dto.spreadRateKgPerMinute ?? null,
			isEnabled: dto.isEnabled ?? true,
		});
		return this.scheduleRepository.save(schedule);
	}

	async findSchedulesByPond(pondId: string, user?: User) {
		await this.findPond(pondId);
		if (user) await this.pondAccessService.ensureCanAccess(user, pondId);
		return this.scheduleRepository.find({ where: { pondId }, order: { timeOfDay: 'ASC' } });
	}

	async updateSchedule(id: string, dto: UpdateFeedingScheduleDto, user?: User) {
		const schedule = await this.findSchedule(id);
		if (user) await this.pondAccessService.ensureCanAccess(user, schedule.pondId);
		const timeOfDay = dto.timeOfDay ? this.normalizeTime(dto.timeOfDay) : schedule.timeOfDay;
		await this.ensureNoScheduleConflict(schedule.pondId, timeOfDay, dto.daysOfWeek ?? schedule.daysOfWeek, id);
		Object.assign(schedule, {
			...dto,
			name: dto.name?.trim() ?? schedule.name,
			timeOfDay,
			spreadRateKgPerMinute: dto.spreadRateKgPerMinute !== undefined
				? dto.spreadRateKgPerMinute : schedule.spreadRateKgPerMinute,
		});
		return this.scheduleRepository.save(schedule);
	}

	async removeSchedule(id: string, user?: User) {
		const schedule = await this.findSchedule(id);
		if (user) await this.pondAccessService.ensureCanAccess(user, schedule.pondId);
		await this.scheduleRepository.remove(schedule);
		return { message: `Đã xoá lịch cho ăn ${schedule.name}` };
	}

	async createRecord(pondId: string, dto: CreateFeedingRecordDto, user?: User) {
		await this.ensurePondCanReceiveFeeding(pondId, user);
		if (dto.status && dto.status !== FeedingStatus.REQUESTED) {
			throw new BadRequestException('Feeding Record mới phải bắt đầu ở trạng thái requested; dùng PATCH để cập nhật tiến trình');
		}

		let device: Device | null = null;
		if (dto.deviceId) {
			device = await this.deviceRepository.findOne({ where: { id: dto.deviceId } });
			if (!device) {
				throw new NotFoundException(`Không tìm thấy thiết bị với id ${dto.deviceId}`);
			}
			if (device.pondId && device.pondId !== pondId) {
				throw new BadRequestException('Thiết bị không được gán cho ao này');
			}
		}

		if (dto.scheduleId) {
			const schedule = await this.scheduleRepository.findOne({ where: { id: dto.scheduleId } });
			if (!schedule) {
				throw new NotFoundException(`Không tìm thấy lịch cho ăn với id ${dto.scheduleId}`);
			}
			if (schedule.pondId !== pondId) {
				throw new BadRequestException('Lịch cho ăn không thuộc ao này');
			}
		}

		// Đánh giá Safety Rule Engine trước khi tạo và kích hoạt cho ăn
		const requestedAmount = Number(dto.requestedAmountKg) || 10.0;
		const safetyResult = await this.safetyRuleEngineService.evaluateFeedingSafety(
			pondId,
			dto.deviceId ?? undefined,
			requestedAmount,
		);

		let initialStatus = FeedingStatus.REQUESTED;
		let stoppedReason: string | null = null;

		if (safetyResult.decision === SafetyDecision.BLOCKED) {
			initialStatus = FeedingStatus.STOPPED;
			stoppedReason = `Bị chặn bởi Safety Engine: ${safetyResult.reasons.join('; ')}`;

			// Tự động tạo Alert mức CRITICAL để thông báo cho người nuôi
			await this.alertsService.createAlert({
				pondId,
				deviceId: dto.deviceId ?? undefined,
				type: 'FEEDING_SAFETY_BLOCKED',
				severity: AlertSeverity.CRITICAL,
				message: `Cữ cho ăn bị chặn an toàn: ${safetyResult.reasons[0] || 'Chỉ số môi trường không đạt chuẩn'}`,
				metadata: {
					safetyResult,
					requestedAmountKg: requestedAmount,
				},
			});
		}

		const actualAmount = safetyResult.decision === SafetyDecision.BLOCKED
			? 0
			: (safetyResult.decision === SafetyDecision.ADJUSTED ? safetyResult.allowedAmountKg : (dto.actualAmountKg ?? null));

		const record = this.recordRepository.create({
			...dto,
			pondId,
			deviceId: dto.deviceId ?? null,
			scheduleId: dto.scheduleId ?? null,
			startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
			actualAmountKg: actualAmount,
			status: initialStatus,
			safetyDecision: safetyResult.decision,
			safetyReason: safetyResult.reasons.length > 0 ? safetyResult.reasons.join('; ') : 'Môi trường nước an toàn',
			appetiteLevel: dto.appetiteLevel ?? null,
			leftoverPercent: dto.leftoverPercent ?? null,
			stoppedReason: stoppedReason ?? (dto.stoppedReason?.trim() ?? null),
			finishedAt: initialStatus === FeedingStatus.STOPPED ? new Date() : null,
		});

		const savedRecord = await this.recordRepository.save(record);

		// Nếu an toàn và có thiết bị Feeder -> Gửi lệnh MQTT xuống thiết bị
		if (safetyResult.decision !== SafetyDecision.BLOCKED && device?.deviceUid) {
			const commandSent = await this.mqttService.publishFeederCommand(device.deviceUid, {
				command: 'FEED',
				recordId: savedRecord.id,
				feedAmountKg: safetyResult.allowedAmountKg,
				spreadRateKgPerMinute: 1.5,
				timestamp: new Date().toISOString(),
			});

			if (commandSent) {
				savedRecord.status = FeedingStatus.RUNNING;
				await this.recordRepository.save(savedRecord);
			}
		}

		return savedRecord;
	}

	async findRecordsByPond(pondId: string, user?: User) {
		await this.findPond(pondId);
		if (user) await this.pondAccessService.ensureCanAccess(user, pondId);
		return this.recordRepository.find({
			where: { pondId },
			relations: { device: true, schedule: true },
			order: { startedAt: 'DESC' },
		});
	}

	async updateRecord(id: string, dto: UpdateFeedingRecordDto, user?: User) {
		const record = await this.recordRepository.findOne({ where: { id } });
		if (!record) {
			throw new NotFoundException(`Không tìm thấy lần cho ăn với id ${id}`);
		}
		if (user) await this.pondAccessService.ensureCanAccess(user, record.pondId);

		if (dto.status && dto.status !== record.status) {
			this.ensureValidStatusTransition(record.status, dto.status);
			record.status = dto.status;
			record.finishedAt = [FeedingStatus.COMPLETED, FeedingStatus.STOPPED, FeedingStatus.FAILED].includes(dto.status)
				? new Date() : null;
		}
		Object.assign(record, {
			actualAmountKg: dto.actualAmountKg !== undefined ? dto.actualAmountKg : record.actualAmountKg,
			appetiteLevel: dto.appetiteLevel !== undefined ? dto.appetiteLevel : record.appetiteLevel,
			leftoverPercent: dto.leftoverPercent !== undefined ? dto.leftoverPercent : record.leftoverPercent,
			stoppedReason: dto.stoppedReason !== undefined ? dto.stoppedReason?.trim() ?? null : record.stoppedReason,
		});
		return this.recordRepository.save(record);
	}

	private async findPond(id: string) {
		const pond = await this.pondRepository.findOne({ where: { id } });
		if (!pond) {
			throw new NotFoundException(`Không tìm thấy ao nuôi với id ${id}`);
		}
		return pond;
	}

	private async findSchedule(id: string) {
		const schedule = await this.scheduleRepository.findOne({ where: { id } });
		if (!schedule) {
			throw new NotFoundException(`Không tìm thấy lịch cho ăn với id ${id}`);
		}
		return schedule;
	}

	private async ensureNoScheduleConflict(pondId: string, timeOfDay: string, daysOfWeek: number[], excludedId?: string) {
		const schedules = await this.scheduleRepository.find({ where: { pondId } });
		const conflict = schedules.find((schedule) =>
			schedule.id !== excludedId
			&& schedule.timeOfDay === timeOfDay
			&& schedule.daysOfWeek.some((day) => daysOfWeek.includes(day)),
		);
		if (conflict) {
			throw new BadRequestException('Pond đã có lịch cho ăn trùng giờ và ngày trong tuần');
		}
	}

	private normalizeTime(timeOfDay: string) {
		return timeOfDay.length === 5 ? `${timeOfDay}:00` : timeOfDay;
	}

	private ensureValidStatusTransition(currentStatus: FeedingStatus, nextStatus: FeedingStatus) {
		const transitions: Record<FeedingStatus, FeedingStatus[]> = {
			[FeedingStatus.REQUESTED]: [FeedingStatus.RUNNING, FeedingStatus.STOPPED, FeedingStatus.FAILED],
			[FeedingStatus.RUNNING]: [FeedingStatus.COMPLETED, FeedingStatus.STOPPED, FeedingStatus.FAILED],
			[FeedingStatus.COMPLETED]: [],
			[FeedingStatus.STOPPED]: [],
			[FeedingStatus.FAILED]: [],
		};
		if (!transitions[currentStatus].includes(nextStatus)) {
			throw new BadRequestException(`Không thể chuyển trạng thái từ ${currentStatus} sang ${nextStatus}`);
		}
	}

	private async ensurePondCanReceiveFeeding(pondId: string, user?: User) {
		await this.findPond(pondId);
		if (user) await this.pondAccessService.ensureCanAccess(user, pondId);
		const activeSeason = await this.cropSeasonRepository.findOne({
			where: { pondId, status: CropSeasonStatus.ACTIVE },
		});
		if (!activeSeason) {
			throw new BadRequestException('Pond chưa có Crop Season active; không thể tạo dữ liệu cho ăn mới');
		}
	}
}
