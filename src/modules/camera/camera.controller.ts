import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { CameraService } from './camera.service';
import { AnalyzeFrameDto } from './dto/analyze-frame.dto';
import { IngestCameraMetricsDto } from './dto/ingest-camera-metrics.dto';
import { QueryFisHistoryDto } from './dto/query-fis-history.dto';
import { UpdateCameraRoiDto } from './dto/update-camera-roi.dto';
import { UpdateVisionConfigDto } from './dto/update-vision-config.dto';

@Controller('camera')
@UseGuards(JwtAuthGuard)
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  /**
   * Phân tích khung hình camera bằng 2 luồng AI song song (YOLO11n-seg + MobileNetV3-Small)
   */
  @Post('analyze')
  async analyzeFrame(@Body() dto: AnalyzeFrameDto, @CurrentUser() user: User) {
    return this.cameraService.analyzeFrame(dto, user);
  }

  /**
   * Thu nhận chỉ số tiền xử lý từ Camera AI Edge Gateway / IoT
   */
  @Post('ingest-metrics')
  async ingestMetrics(@Body() dto: IngestCameraMetricsDto) {
    return this.cameraService.ingestMetrics(dto);
  }

  /**
   * Lấy kết quả FIS mới nhất theo ao nuôi
   */
  @Get('ponds/:pondId/latest-fis')
  async getLatestFis(
    @Param('pondId', ParseUUIDPipe) pondId: string,
    @CurrentUser() user: User,
  ) {
    return this.cameraService.getLatestFis(pondId, user);
  }

  /**
   * Lấy lịch sử chỉ số FIS theo thời gian phục vụ biểu đồ trực quan hóa
   */
  @Get('ponds/:pondId/fis-history')
  async getFisHistory(
    @Param('pondId', ParseUUIDPipe) pondId: string,
    @Query() query: QueryFisHistoryDto,
    @CurrentUser() user: User,
  ) {
    return this.cameraService.getFisHistory(pondId, query, user);
  }

  /**
   * Danh sách thiết bị camera trong ao nuôi
   */
  @Get('ponds/:pondId/devices')
  async getCamerasByPond(
    @Param('pondId', ParseUUIDPipe) pondId: string,
    @CurrentUser() user: User,
  ) {
    return this.cameraService.getCamerasByPond(pondId, user);
  }

  /**
   * Cập nhật vùng quan sát ROI cố định cho camera
   */
  @Patch('devices/:deviceId/roi')
  async updateCameraRoi(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() roiDto: UpdateCameraRoiDto,
    @CurrentUser() user: User,
  ) {
    return this.cameraService.updateCameraRoi(deviceId, roiDto, user);
  }

  /**
   * Tinh chỉnh trọng số w1-w4 và các ngưỡng phân vị q25/q50/q75 của thuật toán FIS
   */
  @Patch('ponds/:pondId/weights')
  async updateVisionWeights(
    @Param('pondId', ParseUUIDPipe) pondId: string,
    @Body() weightsDto: UpdateVisionConfigDto,
    @CurrentUser() user: User,
  ) {
    return this.cameraService.updateVisionWeights(pondId, weightsDto, user);
  }
}
