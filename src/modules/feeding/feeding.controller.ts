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
	@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
	findSchedules(@Param('pondId') pondId: string, @CurrentUser() user: User) {
		return this.feedingService.findSchedulesByPond(pondId, user);
	}

	@Post('ponds/:pondId/feeding-schedules')
	@Roles(UserRole.ADMIN, UserRole.MANAGER)
	createSchedule(@Param('pondId') pondId: string, @Body() dto: CreateFeedingScheduleDto) {
		return this.feedingService.createSchedule(pondId, dto);
	}

	@Patch('feeding-schedules/:id')
	@Roles(UserRole.ADMIN, UserRole.MANAGER)
	updateSchedule(@Param('id') id: string, @Body() dto: UpdateFeedingScheduleDto) {
		return this.feedingService.updateSchedule(id, dto);
	}

	@Delete('feeding-schedules/:id')
	@Roles(UserRole.ADMIN)
	removeSchedule(@Param('id') id: string) {
		return this.feedingService.removeSchedule(id);
	}

	@Get('ponds/:pondId/feeding-records')
	@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
	findRecords(@Param('pondId') pondId: string, @CurrentUser() user: User) {
		return this.feedingService.findRecordsByPond(pondId, user);
	}

	@Post('ponds/:pondId/feeding-records')
	@Roles(UserRole.ADMIN, UserRole.MANAGER)
	createRecord(@Param('pondId') pondId: string, @Body() dto: CreateFeedingRecordDto) {
		return this.feedingService.createRecord(pondId, dto);
	}

	@Patch('feeding-records/:id')
	@Roles(UserRole.ADMIN, UserRole.MANAGER)
	updateRecord(@Param('id') id: string, @Body() dto: UpdateFeedingRecordDto) {
		return this.feedingService.updateRecord(id, dto);
	}
}
