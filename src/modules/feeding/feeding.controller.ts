import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { CreateFeedingRecordDto } from './dto/create-feeding-record.dto';
import { CreateFeedingScheduleDto } from './dto/create-feeding-schedule.dto';
import { UpdateFeedingScheduleDto } from './dto/update-feeding-schedule.dto';
import { UpdateFeedingRecordDto } from './dto/update-feeding-record.dto';
import { FeedingService } from './feeding.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedingController {
	constructor(private readonly feedingService: FeedingService) {}

	@Get('ponds/:pondId/feeding-schedules')
	@Roles(UserRole.FARMER)
	findSchedules(@Param('pondId') pondId: string, @CurrentUser() user: User) {
		return this.feedingService.findSchedulesByPond(pondId, user);
	}

	@Post('ponds/:pondId/feeding-schedules')
	@Roles(UserRole.FARMER)
	createSchedule(@Param('pondId') pondId: string, @Body() dto: CreateFeedingScheduleDto, @CurrentUser() user: User) {
		return this.feedingService.createSchedule(pondId, dto, user);
	}

	@Patch('feeding-schedules/:id')
	@Roles(UserRole.FARMER)
	updateSchedule(@Param('id') id: string, @Body() dto: UpdateFeedingScheduleDto, @CurrentUser() user: User) {
		return this.feedingService.updateSchedule(id, dto, user);
	}

	@Delete('feeding-schedules/:id')
	@Roles(UserRole.FARMER)
	removeSchedule(@Param('id') id: string, @CurrentUser() user: User) {
		return this.feedingService.removeSchedule(id, user);
	}

	@Get('ponds/:pondId/feeding-records')
	@Roles(UserRole.FARMER)
	findRecords(@Param('pondId') pondId: string, @CurrentUser() user: User) {
		return this.feedingService.findRecordsByPond(pondId, user);
	}

	@Post('ponds/:pondId/feeding-records')
	@Roles(UserRole.FARMER)
	createRecord(@Param('pondId') pondId: string, @Body() dto: CreateFeedingRecordDto, @CurrentUser() user: User) {
		return this.feedingService.createRecord(pondId, dto, user);
	}

	@Patch('feeding-records/:id')
	@Roles(UserRole.FARMER)
	updateRecord(@Param('id') id: string, @Body() dto: UpdateFeedingRecordDto, @CurrentUser() user: User) {
		return this.feedingService.updateRecord(id, dto, user);
	}
}
