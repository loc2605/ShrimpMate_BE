import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Pond } from '../../database/entities/pond.entity';
import { User } from '../../database/entities/user.entity';
import { FarmerAssignment } from '../../database/entities/farmer-assignment.entity';
import { Alert } from '../../database/entities/alert.entity';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pond, User, FarmerAssignment, Alert]),
    EventsModule,
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
