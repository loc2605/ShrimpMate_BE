import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiRecommendation } from '../../database/entities/ai-recommendation.entity';
import { Pond } from '../../database/entities/pond.entity';
import { CameraFisLog } from '../../database/entities/camera-fis-log.entity';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AiIntegrationService {
  constructor(
    @InjectRepository(AiRecommendation)
    private readonly recommendationRepository: Repository<AiRecommendation>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    @InjectRepository(CameraFisLog)
    private readonly cameraFisLogRepository: Repository<CameraFisLog>,
    private readonly pondAccessService: PondAccessService,
  ) {}

  async getLatestRecommendation(pondId: string, user: User) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    const [recommendation, latestFis] = await Promise.all([
      this.recommendationRepository.findOne({
        where: { pondId },
        order: { createdAt: 'DESC' },
      }),
      this.cameraFisLogRepository.findOne({
        where: { pondId },
        order: { timestamp: 'DESC' },
      }),
    ]);

    if (!recommendation && !latestFis) {
      return { message: 'Chưa có dữ liệu khuyến nghị AI cho ao này' };
    }

    return {
      recommendation: recommendation ?? null,
      visionInsights: latestFis
        ? {
            fisScore: Number(latestFis.fisScore),
            appetiteLevel: latestFis.appetiteLevel,
            remainingFeedAreaRt: Number(latestFis.remainingFeedAreaRt),
            shrimpDensityDt: Number(latestFis.shrimpDensityDt),
            measuredAt: latestFis.timestamp,
          }
        : null,
    };
  }

  async getRecommendations(pondId: string, user: User, limit = 10) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    return this.recommendationRepository.find({
      where: { pondId },
      order: { createdAt: 'DESC' },
      take: Math.min(100, Math.max(1, limit)),
    });
  }

  private async ensurePondExists(pondId: string) {
    const pond = await this.pondRepository.findOne({ where: { id: pondId } });
    if (!pond) {
      throw new NotFoundException(`Không tìm thấy ao nuôi với id ${pondId}`);
    }
    return pond;
  }
}

