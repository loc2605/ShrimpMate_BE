import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../database/entities/device.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import { FeedingSchedule } from '../../database/entities/feeding-schedule.entity';
import { Pond } from '../../database/entities/pond.entity';
import { FeedingStatus } from '../../database/entities/enums';
import { CreateFeedingRecordDto } from './dto/create-feeding-record.dto';
import { CreateFeedingScheduleDto } from './dto/create-feeding-schedule.dto';
import { UpdateFeedingScheduleDto } from './dto/update-feeding-schedule.dto';

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
	) {}

	async createSchedule(pondId: string, dto: CreateFeedingScheduleDto) {
		await this.findPond(pondId);
		const schedule = this.scheduleRepository.create({
			...dto,
			pondId,
			name: dto.name.trim(),
			timeOfDay: dto.timeOfDay.length === 5 ? `${dto.timeOfDay}:00` : dto.timeOfDay,
			spreadRateKgPerMinute: dto.spreadRateKgPerMinute ?? null,
			isEnabled: dto.isEnabled ?? true,
		});
		return this.scheduleRepository.save(schedule);
	}

	async findSchedulesByPond(pondId: string) {
		await this.findPond(pondId);
		return this.scheduleRepository.find({ where: { pondId }, order: { timeOfDay: 'ASC' } });
	}

	async updateSchedule(id: string, dto: UpdateFeedingScheduleDto) {
		const schedule = await this.findSchedule(id);
		Object.assign(schedule, {
			...dto,
			name: dto.name?.trim() ?? schedule.name,
			timeOfDay: dto.timeOfDay
				? dto.timeOfDay.length === 5 ? `${dto.timeOfDay}:00` : dto.timeOfDay
				: schedule.timeOfDay,
			spreadRateKgPerMinute: dto.spreadRateKgPerMinute !== undefined
				? dto.spreadRateKgPerMinute : schedule.spreadRateKgPerMinute,
		});
		return this.scheduleRepository.save(schedule);
	}

	async removeSchedule(id: string) {
		const schedule = await this.findSchedule(id);
		await this.scheduleRepository.remove(schedule);
		return { message: `Đã xoá lịch cho ăn ${schedule.name}` };
	}

	async createRecord(pondId: string, dto: CreateFeedingRecordDto) {
		await this.findPond(pondId);

		if (dto.deviceId) {
			const device = await this.deviceRepository.findOne({ where: { id: dto.deviceId } });
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

		const status = dto.status ?? FeedingStatus.REQUESTED;
		const record = this.recordRepository.create({
			...dto,
			pondId,
			deviceId: dto.deviceId ?? null,
			scheduleId: dto.scheduleId ?? null,
			startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
			actualAmountKg: dto.actualAmountKg ?? null,
			status,
			appetiteLevel: dto.appetiteLevel ?? null,
			leftoverPercent: dto.leftoverPercent ?? null,
			stoppedReason: dto.stoppedReason?.trim() ?? null,
			finishedAt: [FeedingStatus.COMPLETED, FeedingStatus.STOPPED, FeedingStatus.FAILED].includes(status)
				? new Date() : null,
		});
		return this.recordRepository.save(record);
	}

	async findRecordsByPond(pondId: string) {
		await this.findPond(pondId);
		return this.recordRepository.find({
			where: { pondId },
			relations: { device: true, schedule: true },
			order: { startedAt: 'DESC' },
		});
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
}
