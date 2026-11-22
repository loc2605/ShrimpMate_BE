import {
	BadGatewayException,
	BadRequestException,
	Injectable,
	NotFoundException,
	ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Device } from '../../database/entities/device.entity';
import { CropSeason } from '../../database/entities/crop-season.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import { FeedingSchedule } from '../../database/entities/feeding-schedule.entity';
import { Pond } from '../../database/entities/pond.entity';
import {
	AlertSeverity,
	CropSeasonStatus,
	DeviceStatus,
	FeedingStatus,
	SafetyDecision,
} from '../../database/entities/enums';
import { CreateFeedingRecordDto } from './dto/create-feeding-record.dto';
import { CreateFeedingScheduleDto } from './dto/create-feeding-schedule.dto';
import { UpdateFeedingScheduleDto } from './dto/update-feeding-schedule.dto';
import { UpdateFeedingRecordDto } from './dto/update-feeding-record.dto';
import { User } from '../../database/entities/user.entity';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { SafetyRuleEngineService } from '../safety-rule/safety-rule-engine.service';
import { MqttService } from '../../mqtt/mqtt.service';
import { AlertsService } from '../alerts/alerts.service';
import { AiIntegrationService } from '../ai-integration/ai-integration.service';
import { DeviceType } from '../../database/entities/enums';
import { EventsGateway } from '../events/events.gateway';

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
		private readonly aiService: AiIntegrationService,
		private readonly eventsGateway: EventsGateway,
	) { }

	async createSchedule(pondId: string, dto: CreateFeedingScheduleDto, user?: User) {
		const pond = await this.ensurePondCanReceiveFeeding(pondId, user);
		const timeOfDay = this.normalizeTime(dto.timeOfDay);
		await this.ensureNoScheduleConflict(pondId, timeOfDay, dto.daysOfWeek);

		// Chuẩn hóa và tự động sinh tên cữ ăn chuẩn: [Tên ao/Mã ao] - [Tên cữ] (HH:mm)
		const validatedName = this.resolveAndValidateScheduleName(timeOfDay, pond.name || pond.code, dto.name);

		const schedule = this.scheduleRepository.create({
			...dto,
			pondId,
			name: validatedName,
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

	/**
	 * Lấy ngưỡng thức ăn giới hạn và gợi ý cữ ăn hợp lý cho ao nuôi
	 * Giúp Frontend hiển thị trực quan khi tạo lịch hoặc giám sát cữ ăn
	 */
	async getFeedingRecommendation(pondId: string, user?: User) {
		await this.findPond(pondId);
		if (user) await this.pondAccessService.ensureCanAccess(user, pondId);

		// 1. Kiểm tra vụ nuôi đang hoạt động
		const activeSeason = await this.cropSeasonRepository.findOne({
			where: { pondId, status: CropSeasonStatus.ACTIVE },
		});

		if (!activeSeason) {
			return {
				hasActiveSeason: false,
				message: 'Ao chưa có vụ nuôi đang hoạt động (ACTIVE). Vui lòng tạo vụ nuôi trước khi lập lịch.',
				pondId,
				daysOfCulture: 0,
				estimatedBiomassKg: 0,
				feedLimits: {
					dailyDemandKg: 0,
					maxDailyLimitKg: 0,
					minDailyLimitKg: 0,
					totalFedTodayKg: 0,
					remainingAllowanceTodayKg: 0,
				},
				scheduleRecommendation: {
					existingScheduleCount: 0,
					suggestedMealCount: 4,
					suggestedAmountPerMealKg: 0,
					minSafeMealKg: 0,
					maxSafeMealKg: 0,
					suggestedSpreadRate: 1.5,
				},
			};
		}

		// 2. Tính toán ngày tuổi (DOC), trọng lượng trung bình (ABW) và sinh khối (Biomass)
		const diffDays = Math.max(
			1,
			Math.floor((Date.now() - new Date(activeSeason.stockingDate).getTime()) / (1000 * 60 * 60 * 24)),
		);
		const initialWeight = Number(activeSeason.initialAverageWeightG) || 0.8;
		const currentWeightG = Number((initialWeight + diffDays * 0.28).toFixed(2));
		const survivalRate = (Number(activeSeason.estimatedSurvivalRate) || 85) / 100;
		const currentCount = Math.floor(activeSeason.initialCount * survivalRate);
		const estimatedBiomassKg = Number(((currentCount * currentWeightG) / 1000).toFixed(2));

		// 3. Tính nhu cầu ăn tiêu chuẩn trong 1 ngày theo đường cong sinh học (Feed Demand Curve)
		const dailyDemandRatePercent = Number((6.5 / Math.pow(currentWeightG, 0.28)).toFixed(2));
		const dailyDemandKg = Number(((estimatedBiomassKg * dailyDemandRatePercent) / 100).toFixed(2));
		const maxDailyLimitKg = Number((dailyDemandKg * 1.2).toFixed(2)); // +20% trần an toàn
		const minDailyLimitKg = Number((dailyDemandKg * 0.8).toFixed(2)); // -20% sàn dinh dưỡng

		// 4. Tính tổng lượng thức ăn thực tế đã rải trong ngày hôm nay (00:00:00 -> 23:59:59)
		const startOfDay = new Date();
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date();
		endOfDay.setHours(23, 59, 59, 999);

		const todayRecords = await this.recordRepository.find({
			where: {
				pondId,
				startedAt: Between(startOfDay, endOfDay),
			},
		});

		const totalFedTodayKg = Number(
			todayRecords
				.filter((r) => r.status === FeedingStatus.COMPLETED || r.status === FeedingStatus.RUNNING)
				.reduce((sum, r) => sum + (Number(r.actualAmountKg) || 0), 0)
				.toFixed(2),
		);

		const remainingAllowanceTodayKg = Math.max(0, Number((maxDailyLimitKg - totalFedTodayKg).toFixed(2)));

		// 5. Đếm số cữ ăn đã cấu hình cho ao
		const existingSchedules = await this.scheduleRepository.find({
			where: { pondId, isEnabled: true },
		});
		const existingScheduleCount = existingSchedules.length;

		// 6. Số cữ ăn khuyến nghị theo giai đoạn phát triển của tôm
		let suggestedMealCount = 4;
		if (diffDays <= 20) {
			suggestedMealCount = 5; // Tôm nhỏ ăn nhiều cữ, ít lượng
		} else if (diffDays <= 60) {
			suggestedMealCount = 4;
		} else {
			suggestedMealCount = 4; // Tôm lớn duy trì 4 cữ chính
		}

		// Khẩu phần khuyến nghị cho 1 cữ ăn dựa trên số cữ đang áp dụng hoặc số cữ gợi ý
		const divisor = existingScheduleCount > 0 ? existingScheduleCount : suggestedMealCount;
		const suggestedAmountPerMealKg = Number((dailyDemandKg / divisor).toFixed(2));
		const minSafeMealKg = Number((suggestedAmountPerMealKg * 0.75).toFixed(2)); // -25%
		const maxSafeMealKg = Number((suggestedAmountPerMealKg * 1.25).toFixed(2)); // +25%

		return {
			hasActiveSeason: true,
			pondId,
			cropSeasonId: activeSeason.id,
			daysOfCulture: diffDays,
			estimatedAverageWeightG: currentWeightG,
			estimatedBiomassKg,
			feedLimits: {
				dailyDemandRatePercent,
				dailyDemandKg,
				maxDailyLimitKg,
				minDailyLimitKg,
				totalFedTodayKg,
				remainingAllowanceTodayKg,
			},
			scheduleRecommendation: {
				existingScheduleCount,
				suggestedMealCount,
				suggestedAmountPerMealKg,
				minSafeMealKg,
				maxSafeMealKg,
				suggestedSpreadRate: 1.5,
			},
		};
	}

	async updateSchedule(id: string, dto: UpdateFeedingScheduleDto, user?: User) {
		const schedule = await this.findSchedule(id);
		if (user) await this.pondAccessService.ensureCanAccess(user, schedule.pondId);
		const timeOfDay = dto.timeOfDay ? this.normalizeTime(dto.timeOfDay) : schedule.timeOfDay;
		await this.ensureNoScheduleConflict(schedule.pondId, timeOfDay, dto.daysOfWeek ?? schedule.daysOfWeek, id);

		const pond = await this.findPond(schedule.pondId);
		const resolvedName = this.resolveAndValidateScheduleName(timeOfDay, pond.name || pond.code, dto.name ?? schedule.name);

		Object.assign(schedule, {
			...dto,
			name: resolvedName,
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
		} else {
			// Tự động tìm thiết bị Feeder đã gán cho ao
			device = await this.deviceRepository.findOne({
				where: { pondId, type: DeviceType.FEEDER },
			});
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

		// 1. Tự động tính toán lượng thức ăn bằng AI nếu có cờ useAiPrediction hoặc không chỉ định số kg
		let requestedAmount = Number(dto.requestedAmountKg);
		if (dto.useAiPrediction || isNaN(requestedAmount) || requestedAmount <= 0) {
			if (user) {
				try {
					const aiResult = await this.aiService.predictFeedDemand(pondId, user);
					requestedAmount = aiResult.predictedFeedAmountKg;
				} catch {
					requestedAmount = Number(dto.requestedAmountKg) || 10.0;
				}
			} else {
				requestedAmount = Number(dto.requestedAmountKg) || 10.0;
			}
		}

		// 2. Đánh giá Safety Rule Engine trước khi tạo và kích hoạt cho ăn
		const safetyResult = await this.safetyRuleEngineService.evaluateFeedingSafety(
			pondId,
			device?.id ?? dto.deviceId ?? undefined,
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
				deviceId: device?.id ?? dto.deviceId ?? undefined,
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
			deviceId: device?.id ?? dto.deviceId ?? null,
			scheduleId: dto.scheduleId ?? null,
			startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
			requestedAmountKg: requestedAmount,
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

		if (safetyResult.decision === SafetyDecision.BLOCKED) {
			this.eventsGateway.broadcastFeederStatus(pondId, {
				recordId: savedRecord.id,
				status: FeedingStatus.STOPPED,
				safetyDecision: SafetyDecision.BLOCKED,
				reason: stoppedReason,
			});
		}

		// Nếu an toàn và có thiết bị Feeder -> Gửi lệnh MQTT thực tế xuống thiết bị
		if (safetyResult.decision !== SafetyDecision.BLOCKED && device?.deviceUid) {
			if (device.status === DeviceStatus.OFFLINE) {
				savedRecord.status = FeedingStatus.FAILED;
				savedRecord.finishedAt = new Date();
				savedRecord.stoppedReason = `Thiết bị máy cho ăn (${device.name} - ${device.deviceUid}) đang ở trạng thái Ngoại tuyến (Offline). Không thể kích hoạt cữ ăn!`;
				await this.recordRepository.save(savedRecord);
				this.eventsGateway.broadcastFeederStatus(pondId, {
					recordId: savedRecord.id,
					status: FeedingStatus.FAILED,
					stoppedReason: savedRecord.stoppedReason,
				});
				throw new BadRequestException(savedRecord.stoppedReason);
			}

			if (!this.mqttService.getIsConnected()) {
				savedRecord.status = FeedingStatus.FAILED;
				savedRecord.finishedAt = new Date();
				savedRecord.stoppedReason = 'Hệ thống chưa kết nối tới MQTT Broker. Không thể truyền lệnh điều khiển tới thiết bị phần cứng!';
				await this.recordRepository.save(savedRecord);
				this.eventsGateway.broadcastFeederStatus(pondId, {
					recordId: savedRecord.id,
					status: FeedingStatus.FAILED,
					stoppedReason: savedRecord.stoppedReason,
				});
				throw new ServiceUnavailableException(savedRecord.stoppedReason);
			}

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
				this.eventsGateway.broadcastFeederStatus(pondId, {
					recordId: savedRecord.id,
					status: FeedingStatus.RUNNING,
					requestedAmountKg: savedRecord.requestedAmountKg,
					actualAmountKg: savedRecord.actualAmountKg,
					safetyDecision: safetyResult.decision,
					deviceUid: device.deviceUid,
				});
			} else {
				savedRecord.status = FeedingStatus.FAILED;
				savedRecord.finishedAt = new Date();
				savedRecord.stoppedReason = `Gửi lệnh điều khiển qua MQTT tới thiết bị (${device.deviceUid}) thất bại. Thiết bị không phản hồi!`;
				await this.recordRepository.save(savedRecord);
				this.eventsGateway.broadcastFeederStatus(pondId, {
					recordId: savedRecord.id,
					status: FeedingStatus.FAILED,
					stoppedReason: savedRecord.stoppedReason,
				});
				throw new BadGatewayException(savedRecord.stoppedReason);
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
		const saved = await this.recordRepository.save(record);

		// Phát sự kiện WebSocket realtime khi cữ ăn được cập nhật trạng thái (đang ăn, hoàn tất, dừng)
		this.eventsGateway.broadcastFeederStatus(record.pondId, {
			recordId: saved.id,
			status: saved.status,
			actualAmountKg: saved.actualAmountKg,
			stoppedReason: saved.stoppedReason,
			finishedAt: saved.finishedAt,
		});

		return saved;
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

	/**
	 * Tự động chuẩn hóa tên cữ ăn theo mẫu: [Tên Ao/Mã Ao] - [Tên Cữ] (HH:mm)
	 * Người nuôi không cần tự gõ tên; nếu tự gõ sẽ được kiểm tra tính nhất quán với khung giờ.
	 */
	private resolveAndValidateScheduleName(timeOfDay: string, pondDisplayName: string, rawName?: string): string {
		const [hourStr, minStr] = timeOfDay.split(':');
		const hour = parseInt(hourStr, 10);
		const minute = parseInt(minStr || '0', 10);
		const totalMinutes = hour * 60 + minute;
		const formattedTime = timeOfDay.slice(0, 5);

		// 1. Chặn các khung giờ đêm khuya nguy hiểm (sau 19:30 hoặc trước 06:00)
		if (totalMinutes < 6 * 60 || totalMinutes > 19 * 60 + 30) {
			throw new BadRequestException(
				`Khung giờ cho ăn ${formattedTime} không an toàn! Máy cho ăn tự động chỉ được phép vận hành từ 06:00 đến 19:30 để phòng ngừa tôm ngạt khí ban đêm.`,
			);
		}

		// 2. Xác định danh xưng chuẩn của cữ ăn theo khung giờ sinh học
		let standardMealTag = 'Cữ sáng';
		if (totalMinutes >= 6 * 60 && totalMinutes <= 10 * 60 + 29) {
			standardMealTag = 'Cữ sáng';
		} else if (totalMinutes >= 10 * 60 + 30 && totalMinutes <= 13 * 60 + 29) {
			standardMealTag = 'Cữ trưa';
		} else if (totalMinutes >= 13 * 60 + 30 && totalMinutes <= 16 * 60 + 29) {
			standardMealTag = 'Cữ xế';
		} else {
			standardMealTag = 'Cữ chiều';
		}

		// Định dạng chuẩn tự sinh: "Ao 1 - Cữ sáng (07:30)"
		const autoGeneratedName = `${pondDisplayName} - ${standardMealTag} (${formattedTime})`;

		const cleanName = rawName?.trim();
		// Nếu người dùng không nhập tên hoặc nhập rỗng -> Dùng luôn tên tự sinh
		if (!cleanName) {
			return autoGeneratedName;
		}

		const lowerName = cleanName.toLowerCase();

		// 3. Kiểm tra tính mâu thuẫn nếu người nuôi cố tình gõ tên lệch múi giờ
		if (lowerName.includes('sáng') && standardMealTag !== 'Cữ sáng') {
			throw new BadRequestException(
				`Tên cữ ăn "${cleanName}" mâu thuẫn với khung giờ ${formattedTime}! Khung giờ này thuộc về ${standardMealTag}, không phải Cữ sáng.`,
			);
		}
		if (lowerName.includes('trưa') && standardMealTag !== 'Cữ trưa') {
			throw new BadRequestException(
				`Tên cữ ăn "${cleanName}" mâu thuẫn với khung giờ ${formattedTime}! Khung giờ này thuộc về ${standardMealTag}, không phải Cữ trưa.`,
			);
		}
		if ((lowerName.includes('xế') || lowerName.includes('chiều')) && standardMealTag !== 'Cữ xế' && standardMealTag !== 'Cữ chiều') {
			throw new BadRequestException(
				`Tên cữ ăn "${cleanName}" mâu thuẫn với khung giờ ${formattedTime}! Khung giờ này thuộc về ${standardMealTag}.`,
			);
		}

		// Nếu tên người nuôi gõ không chứa tên ao -> Bổ sung tiền tố tên ao để hiển thị chuyên nghiệp
		if (!lowerName.includes(pondDisplayName.toLowerCase())) {
			return `${pondDisplayName} - ${cleanName}`;
		}

		return cleanName;
	}

	private async ensurePondCanReceiveFeeding(pondId: string, user?: User): Promise<Pond> {
		const pond = await this.findPond(pondId);
		if (user) await this.pondAccessService.ensureCanAccess(user, pondId);
		const activeSeason = await this.cropSeasonRepository.findOne({
			where: { pondId, status: CropSeasonStatus.ACTIVE },
		});
		if (!activeSeason) {
			throw new BadRequestException('Pond chưa có Crop Season active; không thể tạo dữ liệu cho ăn mới');
		}
		return pond;
	}
}
