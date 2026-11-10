import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { User } from '../../database/entities/user.entity';
import { PondAccessService } from '../../common/guards/pond-access.service';

interface AuthenticatedSocket extends Socket {
  user?: User;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly pondAccessService: PondAccessService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway đã khởi tạo và sẵn sàng nhận kết nối an toàn!');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const user = await this.authenticateSocket(client);
      if (user) {
        client.user = user;
        this.logger.log(
          `[WS] Client đã kết nối & xác thực thành công: ${user.fullName} (${user.role}) - Socket: ${client.id}`,
        );
      } else {
        this.logger.log(`[WS] Client kết nối ẩn danh (chưa đăng nhập): ${client.id}`);
      }
    } catch {
      this.logger.log(`[WS] Client kết nối: ${client.id}`);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`[WS] Client ngắt kết nối: ${client.id} (${client.user?.email ?? 'Anonymous'})`);
  }

  /**
   * Client tham gia nhận sự kiện theo Ao nuôi cụ thể (Room: pond_{pondId})
   * CÓ BẢO MẬT & PHÂN QUYỀN: Người dùng chỉ được vào room ao nuôi mà họ được phân công / quản lý
   */
  @SubscribeMessage('join:pond')
  @SubscribeMessage('subscribe_pond')
  async handleSubscribePond(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: string | { pondId: string },
  ) {
    const pondId = typeof payload === 'string' ? payload : payload?.pondId;

    if (!pondId) {
      return { event: 'error', success: false, message: 'Thiếu mã định danh ao nuôi (pondId)' };
    }

    // 1. Xác thực danh tính người dùng nếu chưa có sẵn trên socket
    if (!client.user) {
      client.user = await this.authenticateSocket(client);
    }

    if (!client.user) {
      this.logger.warn(`[WS-Security] Từ chối truy cập ao ${pondId} vì client ${client.id} chưa xác thực`);
      client.emit('error', {
        message: 'Yêu cầu đăng nhập (cung cấp Bearer JWT token) để theo dõi dữ liệu ao nuôi',
      });
      return { event: 'error', success: false, message: 'Yêu cầu đăng nhập để theo dõi ao' };
    }

    // 2. Kiểm tra phân quyền truy cập CSDL ao nuôi (PondAccessService)
    try {
      await this.pondAccessService.ensureCanAccess(client.user, pondId);
    } catch (err: any) {
      this.logger.warn(
        `[WS-Security] ⛔ Người dùng [${client.user.email}] (${client.user.role}) BỊ TỪ CHỐI truy cập room ao ${pondId}: ${err.message}`,
      );
      client.emit('error', {
        message: `Bạn không có quyền theo dõi dữ liệu của ao nuôi ${pondId}`,
      });
      return {
        event: 'error',
        success: false,
        message: `Từ chối phân quyền: không được phép theo dõi ao ${pondId}`,
      };
    }

    // 3. Gia nhập Room biệt lập cho ao này
    const room = `pond_${pondId}`;
    client.join(room);
    this.logger.log(
      `[WS-Security] ✅ Cấp quyền thành công: [${client.user.fullName}] (${client.user.role}) đã vào room ${room}`,
    );

    return {
      event: 'joined:pond',
      success: true,
      pondId,
      message: `Đã kết nối theo dõi an toàn ao nuôi ${pondId}`,
    };
  }

  /**
   * Client rời room theo dõi ao nuôi
   */
  @SubscribeMessage('leave:pond')
  @SubscribeMessage('unsubscribe_pond')
  handleLeavePond(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: string | { pondId: string },
  ) {
    const pondId = typeof payload === 'string' ? payload : payload?.pondId;
    if (pondId) {
      const room = `pond_${pondId}`;
      client.leave(room);
      this.logger.debug(`Client ${client.id} đã rời room ${room}`);
      return { event: 'left:pond', pondId };
    }
  }

  /**
   * Phát dữ liệu Telemetry cảm biến thời gian thực ĐẾN ĐÚNG ROOM CỦA AO ĐÓ (Không leak sang ao khác)
   */
  broadcastTelemetry(pondId: string, telemetry: Record<string, unknown>) {
    if (!this.server) return;
    const payload = { pondId, ...telemetry, emittedAt: new Date().toISOString() };
    this.server.to(`pond_${pondId}`).emit('telemetry:update', payload);
  }

  /**
   * Phát trạng thái máy cho ăn (Bắt đầu, Dừng, E-Stop, Cập nhật kg) tới đúng room ao
   */
  broadcastFeederStatus(pondId: string, statusData: Record<string, unknown>) {
    if (!this.server) return;
    const payload = { pondId, ...statusData, emittedAt: new Date().toISOString() };
    this.server.to(`pond_${pondId}`).emit('feeder:status', payload);
    this.logger.log(`[WS] Đã phát sự kiện feeder:status cho ao ${pondId}`);
  }

  /**
   * Phát cảnh báo mới (Alert) tới đúng room ao nuôi và quản trị viên
   */
  broadcastAlert(alert: Record<string, unknown>) {
    if (!this.server) return;
    const payload = { ...alert, emittedAt: new Date().toISOString() };
    if (alert.pondId) {
      this.server.to(`pond_${alert.pondId}`).emit('alert:new', payload);
    }
    // Phát cho toàn bộ quản trị viên SCADA
    this.server.emit('alert:new', payload);
    this.logger.warn(`[WS] Đã phát sự kiện alert:new: ${alert.message || alert.type}`);
  }

  /**
   * Phát trạng thái kết nối phần cứng (Device Online / Offline / Heartbeat)
   */
  broadcastDeviceStatus(deviceId: string, deviceData: Record<string, unknown>) {
    if (!this.server) return;
    const payload = { deviceId, ...deviceData, emittedAt: new Date().toISOString() };
    this.server.emit('device:status', payload);
  }

  /**
   * Trích xuất và xác thực token JWT từ handshake của socket client
   */
  private async authenticateSocket(client: Socket): Promise<User | undefined> {
    const rawToken =
      (client.handshake.auth?.token as string) ||
      (client.handshake.query?.token as string) ||
      client.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (!rawToken) {
      return undefined;
    }

    try {
      const secret = this.configService.getOrThrow<string>('auth.jwtSecret');
      const payload = await this.jwtService.verifyAsync<{ sub: string; tokenVersion?: number }>(
        rawToken,
        { secret },
      );

      if (!payload?.sub) {
        return undefined;
      }

      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user || !user.isActive || user.isAdminLocked) {
        return undefined;
      }

      if (
        payload.tokenVersion !== undefined &&
        user.tokenVersion !== undefined &&
        payload.tokenVersion < user.tokenVersion
      ) {
        return undefined;
      }

      return user;
    } catch {
      return undefined;
    }
  }
}
