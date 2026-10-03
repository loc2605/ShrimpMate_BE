import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CameraFisLog } from '../../database/entities/camera-fis-log.entity';
import { Device } from '../../database/entities/device.entity';
import { Pond } from '../../database/entities/pond.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import { AlertSeverity, DeviceStatus, DeviceType, UserRole } from '../../database/entities/enums';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { User } from '../../database/entities/user.entity';
import { AlertsService } from '../alerts/alerts.service';
import { CameraAiEngineService, VisionModelWeights } from './camera-ai-engine.service';
import { AnalyzeFrameDto } from './dto/analyze-frame.dto';
import { IngestCameraMetricsDto } from './dto/ingest-camera-metrics.dto';
import { QueryFisHistoryDto } from './dto/query-fis-history.dto';
import { UpdateCameraRoiDto } from './dto/update-camera-roi.dto';
import { UpdateVisionConfigDto } from './dto/update-vision-config.dto';

@Injectable()
export class CameraService {
  private readonly logger = new Logger(CameraService.name);

  constructor(
    @InjectRepository(CameraFisLog)
    private readonly fisLogRepository: Repository<CameraFisLog>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    @InjectRepository(FeedingRecord)
    private readonly feedingRecordRepository: Repository<FeedingRecord>,
    private readonly pondAccessService: PondAccessService,
    private readonly alertsService: AlertsService,
    private readonly cameraAiEngineService: CameraAiEngineService,
  ) {}

  /**
   * Phân tích khung hình từ camera (nhận ảnh base64/url, chạy song song YOLO11n-seg & MobileNetV3)
   */
  async analyzeFrame(dto: AnalyzeFrameDto, user?: User) {
    await this.ensurePondExists(dto.pondId);
    if (user) {
      await this.pondAccessService.ensureCanAccess(user, dto.pondId);
    }

    // 1. Xác định thiết bị camera (nếu có)
    let cameraDevice: Device | null = null;
    if (dto.deviceId) {
      cameraDevice = await this.deviceRepository.findOne({ where: { id: dto.deviceId } });
      if (!cameraDevice) {
        throw new NotFoundException(`Không tìm thấy thiết bị camera với id ${dto.deviceId}`);
      }
    } else {
      cameraDevice = await this.deviceRepository.findOne({
        where: { pondId: dto.pondId, type: DeviceType.CAMERA },
      });
    }

    // 2. Lấy cấu hình ROI từ device metadata nếu không truyền đè
    // 2. Lấy cấu hình ROI từ device metadata nếu không truyền đè
    const roiConfig = dto.roi
      ? ({ ...dto.roi } as Record<string, unknown>)
      : (cameraDevice?.metadata?.roi as Record<string, unknown> | undefined);

    // 3. Lấy bản ghi FIS gần nhất để tính tốc độ tiêu thụ thức ăn vt = delta Rt / delta t
    const previousLog = await this.fisLogRepository.findOne({
      where: { pondId: dto.pondId },
      order: { timestamp: 'DESC' },
    });

    const previousRt = previousLog ? Number(previousLog.remainingFeedAreaRt) : null;
    const timeDeltaSeconds = dto.timeDeltaSeconds ?? 20;

    // 4. Lấy cấu hình trọng số tùy chỉnh (nếu có trong device metadata)
    const customWeights = cameraDevice?.metadata?.visionWeights as
      | Partial<VisionModelWeights>
      | undefined;

    // 5. Chạy phân tích AI song song 2 luồng
    const fisResult = await this.cameraAiEngineService.processFrameParallel(
      dto.frameData,
      dto.frameUrl,
      roiConfig,
      previousRt,
      timeDeltaSeconds,
      customWeights,
      dto.simulatedMetrics,
    );

    // 6. Lưu vào bảng camera_fis_logs phục vụ chuỗi thời gian & huấn luyện lại mô hình
    const fisLog = this.fisLogRepository.create({
      pondId: dto.pondId,
      deviceId: cameraDevice?.id ?? null,
      feedingRecordId: dto.feedingRecordId ?? null,
      timestamp: new Date(),
      remainingFeedAreaRt: fisResult.raw.remainingFeedAreaRt,
      feedConsumptionVelocityVt: fisResult.raw.feedConsumptionVelocityVt,
      shrimpDensityDt: fisResult.raw.shrimpDensityDt,
      behaviorClassificationCt: fisResult.raw.behaviorClassificationCt,
      normalizedRt: fisResult.normalized.normalizedRt,
      normalizedVt: fisResult.normalized.normalizedVt,
      normalizedDt: fisResult.normalized.normalizedDt,
      normalizedCt: fisResult.normalized.normalizedCt,
      fisScore: fisResult.fisScore,
      appetiteLevel: fisResult.appetiteLevel,
      confidence: fisResult.confidence,
      frameUrl: dto.frameUrl ?? null,
      metadata: fisResult.metadata,
    });

    const savedLog = await this.fisLogRepository.save(fisLog);

    // 7. Cập nhật trạng thái Camera device sang ONLINE và ghi nhận lastSeenAt
    if (cameraDevice) {
      cameraDevice.status = DeviceStatus.ONLINE;
      cameraDevice.lastSeenAt = new Date();
      await this.deviceRepository.save(cameraDevice);
    }

    // 8. Liên kết và cập nhật FeedingRecord nếu có feedingRecordId
    if (dto.feedingRecordId) {
      const feedingRecord = await this.feedingRecordRepository.findOne({
        where: { id: dto.feedingRecordId },
      });
      if (feedingRecord) {
        feedingRecord.appetiteLevel = fisResult.appetiteLevel;
        feedingRecord.leftoverPercent = Number((fisResult.raw.remainingFeedAreaRt * 100).toFixed(2));
        await this.feedingRecordRepository.save(feedingRecord);
      }
    }

    // 9. Cảnh báo tự động nếu phát hiện bất thường nghiêm trọng (Độ trễ <= 5 giây)
    if (fisResult.isAnomaly) {
      await this.alertsService.createAlert({
        pondId: dto.pondId,
        deviceId: cameraDevice?.id ?? undefined,
        type: 'CAMERA_FEEDING_ANOMALY',
        severity: AlertSeverity.CRITICAL,
        message:
          fisResult.anomalyReason ||
          `Phát hiện bất thường tại sàng ăn: FIS=${fisResult.fisScore} (Mức ${fisResult.appetiteLevel}), thức ăn dư ${(fisResult.raw.remainingFeedAreaRt * 100).toFixed(1)}%`,
        metadata: {
          fisLogId: savedLog.id,
          fisScore: fisResult.fisScore,
          appetiteLevel: fisResult.appetiteLevel,
          remainingFeedAreaRt: fisResult.raw.remainingFeedAreaRt,
          shrimpDensityDt: fisResult.raw.shrimpDensityDt,
        },
      });
    }

    return {
      success: true,
      data: savedLog,
      analysisSummary: {
        fisScore: fisResult.fisScore,
        appetiteLevel: fisResult.appetiteLevel,
        appetiteLevelDescription: this.getAppetiteDescription(fisResult.appetiteLevel),
        feedLeftoverPercent: Number((fisResult.raw.remainingFeedAreaRt * 100).toFixed(1)),
        shrimpDensity: fisResult.raw.shrimpDensityDt,
        consumptionVelocity: fisResult.raw.feedConsumptionVelocityVt,
        isAnomaly: fisResult.isAnomaly,
        anomalyReason: fisResult.anomalyReason,
      },
    };
  }

  /**
   * Thu nhận chỉ số đã tiền xử lý từ Camera AI Edge Gateway (qua MQTT hoặc HTTP Ingestion)
   */
  async ingestMetrics(dto: IngestCameraMetricsDto) {
    await this.ensurePondExists(dto.pondId);

    let cameraDevice: Device | null = null;
    if (dto.deviceId) {
      cameraDevice = await this.deviceRepository.findOne({ where: { id: dto.deviceId } });
    } else if (dto.deviceUid) {
      cameraDevice = await this.deviceRepository.findOne({ where: { deviceUid: dto.deviceUid } });
    }

    const previousLog = await this.fisLogRepository.findOne({
      where: { pondId: dto.pondId },
      order: { timestamp: 'DESC' },
    });

    const previousRt = previousLog ? Number(previousLog.remainingFeedAreaRt) : null;
    const timeDeltaSeconds = dto.timeDeltaSeconds ?? 20;

    const customWeights = cameraDevice?.metadata?.visionWeights as
      | Partial<VisionModelWeights>
      | undefined;

    const fisResult = this.cameraAiEngineService.calculateFis(
      {
        remainingFeedAreaRt: dto.remainingFeedAreaRt,
        shrimpDensityDt: dto.shrimpDensityDt,
        behaviorClassificationCt: dto.behaviorClassificationCt,
        previousRt,
        timeDeltaSeconds,
      },
      customWeights,
      dto.metadata || {},
    );

    const fisLog = this.fisLogRepository.create({
      pondId: dto.pondId,
      deviceId: cameraDevice?.id ?? null,
      feedingRecordId: dto.feedingRecordId ?? null,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      remainingFeedAreaRt: fisResult.raw.remainingFeedAreaRt,
      feedConsumptionVelocityVt: fisResult.raw.feedConsumptionVelocityVt,
      shrimpDensityDt: fisResult.raw.shrimpDensityDt,
      behaviorClassificationCt: fisResult.raw.behaviorClassificationCt,
      normalizedRt: fisResult.normalized.normalizedRt,
      normalizedVt: fisResult.normalized.normalizedVt,
      normalizedDt: fisResult.normalized.normalizedDt,
      normalizedCt: fisResult.normalized.normalizedCt,
      fisScore: fisResult.fisScore,
      appetiteLevel: fisResult.appetiteLevel,
      confidence: dto.confidence ?? fisResult.confidence,
      frameUrl: dto.frameUrl ?? null,
      metadata: fisResult.metadata,
    });

    const savedLog = await this.fisLogRepository.save(fisLog);

    if (cameraDevice) {
      cameraDevice.status = DeviceStatus.ONLINE;
      cameraDevice.lastSeenAt = new Date();
      await this.deviceRepository.save(cameraDevice);
    }

    if (dto.feedingRecordId) {
      const feedingRecord = await this.feedingRecordRepository.findOne({
        where: { id: dto.feedingRecordId },
      });
      if (feedingRecord) {
        feedingRecord.appetiteLevel = fisResult.appetiteLevel;
        feedingRecord.leftoverPercent = Number((fisResult.raw.remainingFeedAreaRt * 100).toFixed(2));
        await this.feedingRecordRepository.save(feedingRecord);
      }
    }

    if (fisResult.isAnomaly) {
      await this.alertsService.createAlert({
        pondId: dto.pondId,
        deviceId: cameraDevice?.id ?? undefined,
        type: 'CAMERA_FEEDING_ANOMALY',
        severity: AlertSeverity.CRITICAL,
        message:
          fisResult.anomalyReason ||
          `Bất thường nghiêm trọng mức bắt mồi: FIS=${fisResult.fisScore} (Mức ${fisResult.appetiteLevel})`,
        metadata: {
          fisLogId: savedLog.id,
          fisScore: fisResult.fisScore,
          remainingFeedAreaRt: fisResult.raw.remainingFeedAreaRt,
        },
      });
    }

    return savedLog;
  }

  /**
   * Lấy kết quả FIS mới nhất theo ao nuôi
   */
  async getLatestFis(pondId: string, user?: User) {
    await this.ensurePondExists(pondId);
    if (user) {
      await this.pondAccessService.ensureCanAccess(user, pondId);
    }

    const latestLog = await this.fisLogRepository.findOne({
      where: { pondId },
      order: { timestamp: 'DESC' },
      relations: { device: true },
    });

    if (!latestLog) {
      return {
        hasData: false,
        message: 'Chưa có dữ liệu phân tích camera/FIS cho ao nuôi này',
        pondId,
      };
    }

    // Kiểm tra độ tươi của dữ liệu (thời gian từ lần đo gần nhất)
    const ageSeconds = Math.round((Date.now() - latestLog.timestamp.getTime()) / 1000);
    const isStale = ageSeconds > 120; // Nếu quá 2 phút chưa có frame mới

    return {
      hasData: true,
      pondId,
      latestLog,
      status: {
        fisScore: Number(latestLog.fisScore),
        appetiteLevel: latestLog.appetiteLevel,
        appetiteLevelDescription: this.getAppetiteDescription(latestLog.appetiteLevel),
        remainingFeedPercent: Number((Number(latestLog.remainingFeedAreaRt) * 100).toFixed(1)),
        shrimpDensity: Number(latestLog.shrimpDensityDt),
        consumptionVelocity: Number(latestLog.feedConsumptionVelocityVt),
        timestamp: latestLog.timestamp,
        ageSeconds,
        isStale,
      },
      camera: latestLog.device
        ? {
            id: latestLog.device.id,
            name: latestLog.device.name,
            status: latestLog.device.status,
            lastSeenAt: latestLog.device.lastSeenAt,
          }
        : null,
    };
  }

  /**
   * Lấy lịch sử chuỗi thời gian FIS phục vụ biểu đồ (Web/Mobile)
   */
  async getFisHistory(pondId: string, query: QueryFisHistoryDto, user?: User) {
    await this.ensurePondExists(pondId);
    if (user) {
      await this.pondAccessService.ensureCanAccess(user, pondId);
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(500, Math.max(1, query.limit || 50));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<CameraFisLog> = { pondId };

    if (query.deviceId) {
      where.deviceId = query.deviceId;
    }

    if (query.feedingRecordId) {
      where.feedingRecordId = query.feedingRecordId;
    }

    if (query.appetiteLevel !== undefined) {
      where.appetiteLevel = query.appetiteLevel;
    }

    if (query.from && query.to) {
      where.timestamp = Between(new Date(query.from), new Date(query.to));
    } else if (query.from) {
      where.timestamp = MoreThanOrEqual(new Date(query.from));
    } else if (query.to) {
      where.timestamp = LessThanOrEqual(new Date(query.to));
    }

    const [items, total] = await this.fisLogRepository.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      take: limit,
      skip,
      relations: { device: true },
    });

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        avgFisScore:
          items.length > 0
            ? Number(
                (items.reduce((acc, curr) => acc + Number(curr.fisScore), 0) / items.length).toFixed(4),
              )
            : 0,
        distribution: {
          none: items.filter((i) => i.appetiteLevel === 0).length,
          weak: items.filter((i) => i.appetiteLevel === 1).length,
          normal: items.filter((i) => i.appetiteLevel === 2).length,
          strong: items.filter((i) => i.appetiteLevel === 3).length,
        },
      },
    };
  }

  /**
   * Cập nhật cấu hình vùng quan sát ROI (Region of Interest) cố định cho camera
   */
  async updateCameraRoi(deviceId: string, roiDto: UpdateCameraRoiDto, user?: User) {
    const device = await this.deviceRepository.findOne({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException(`Không tìm thấy thiết bị với id ${deviceId}`);
    }

    if (device.type !== DeviceType.CAMERA) {
      throw new BadRequestException(`Thiết bị ${device.name} không phải là loại CAMERA`);
    }

    if (user && device.pondId) {
      await this.pondAccessService.ensureCanAccess(user, device.pondId);
    }

    const currentMetadata = device.metadata || {};
    device.metadata = {
      ...currentMetadata,
      roi: {
        x: roiDto.x,
        y: roiDto.y,
        width: roiDto.width,
        height: roiDto.height,
        polygon: roiDto.polygon ?? null,
        resolutionWidth: roiDto.resolutionWidth ?? 1920,
        resolutionHeight: roiDto.resolutionHeight ?? 1080,
        updatedAt: new Date().toISOString(),
      },
    };

    return this.deviceRepository.save(device);
  }

  /**
   * Cấu hình trọng số và phân vị thuật toán FIS cho camera trong ao nuôi
   */
  async updateVisionWeights(pondId: string, weightsDto: UpdateVisionConfigDto, user?: User) {
    await this.ensurePondExists(pondId);
    if (user) {
      await this.pondAccessService.ensureCanAccess(user, pondId);
    }

    const cameras = await this.deviceRepository.find({
      where: { pondId, type: DeviceType.CAMERA },
    });

    if (cameras.length === 0) {
      return {
        message: 'Cấu hình đã ghi nhận; chưa có camera nào được gán cho ao này để áp dụng trực tiếp',
        weights: weightsDto,
      };
    }

    for (const camera of cameras) {
      const currentMetadata = camera.metadata || {};
      camera.metadata = {
        ...currentMetadata,
        visionWeights: {
          ...(currentMetadata.visionWeights as Record<string, unknown> | undefined),
          ...weightsDto,
          updatedAt: new Date().toISOString(),
        },
      };
      await this.deviceRepository.save(camera);
    }

    return {
      message: `Đã cập nhật trọng số và phân vị FIS cho ${cameras.length} camera trong ao`,
      weights: weightsDto,
    };
  }

  /**
   * Lấy danh sách camera trong ao nuôi
   */
  async getCamerasByPond(pondId: string, user?: User) {
    await this.ensurePondExists(pondId);
    if (user) {
      await this.pondAccessService.ensureCanAccess(user, pondId);
    }

    return this.deviceRepository.find({
      where: { pondId, type: DeviceType.CAMERA },
      order: { createdAt: 'DESC' },
    });
  }

  private async ensurePondExists(pondId: string) {
    const pond = await this.pondRepository.findOne({ where: { id: pondId } });
    if (!pond) {
      throw new NotFoundException(`Không tìm thấy ao nuôi với id ${pondId}`);
    }
    return pond;
  }

  private getAppetiteDescription(level: number): string {
    switch (level) {
      case 0:
        return 'Không ăn (Mức 0)';
      case 1:
        return 'Ăn yếu (Mức 1)';
      case 2:
        return 'Ăn bình thường (Mức 2)';
      case 3:
        return 'Ăn mạnh (Mức 3)';
      default:
        return 'Chưa xác định';
    }
  }
}
