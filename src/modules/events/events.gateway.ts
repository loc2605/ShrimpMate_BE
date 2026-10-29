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
import { Server, Socket } from 'socket.io';

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

  afterInit() {
    this.logger.log('WebSocket Gateway đã khởi tạo và sẵn sàng nhận kết nối!');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client kết nối WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ngắt kết nối WebSocket: ${client.id}`);
  }

  /**
   * Client tham gia nhận sự kiện theo Ao nuôi cụ thể (Room: pond_{pondId})
   */
  @SubscribeMessage('join:pond')
  handleJoinPond(@ConnectedSocket() client: Socket, @MessageBody() pondId: string) {
    if (pondId) {
      const room = `pond_${pondId}`;
      client.join(room);
      this.logger.debug(`Client ${client.id} đã vào room ${room}`);
      return { event: 'joined:pond', pondId, message: `Đã kết nối theo dõi ao ${pondId}` };
    }
  }

  /**
   * Client rời room theo dõi ao nuôi
   */
  @SubscribeMessage('leave:pond')
  handleLeavePond(@ConnectedSocket() client: Socket, @MessageBody() pondId: string) {
    if (pondId) {
      const room = `pond_${pondId}`;
      client.leave(room);
      this.logger.debug(`Client ${client.id} đã rời room ${room}`);
      return { event: 'left:pond', pondId };
    }
  }

  /**
   * Phát dữ liệu Telemetry cảm biến thời gian thực tới toàn bộ client và room ao nuôi
   */
  broadcastTelemetry(pondId: string, telemetry: Record<string, unknown>) {
    if (!this.server) return;
    const payload = { pondId, ...telemetry, emittedAt: new Date().toISOString() };
    this.server.to(`pond_${pondId}`).emit('telemetry:update', payload);
    this.server.emit('telemetry:update', payload);
    this.logger.debug(`[WS] Đã phát sự kiện telemetry:update cho ao ${pondId}`);
  }

  /**
   * Phát trạng thái máy cho ăn (Bắt đầu, Dừng, E-Stop, Cập nhật kg)
   */
  broadcastFeederStatus(pondId: string, statusData: Record<string, unknown>) {
    if (!this.server) return;
    const payload = { pondId, ...statusData, emittedAt: new Date().toISOString() };
    this.server.to(`pond_${pondId}`).emit('feeder:status', payload);
    this.server.emit('feeder:status', payload);
    this.logger.log(`[WS] Đã phát sự kiện feeder:status cho ao ${pondId}`);
  }

  /**
   * Phát cảnh báo mới (Alert) tới toàn bộ hệ thống
   */
  broadcastAlert(alert: Record<string, unknown>) {
    if (!this.server) return;
    const payload = { ...alert, emittedAt: new Date().toISOString() };
    if (alert.pondId) {
      this.server.to(`pond_${alert.pondId}`).emit('alert:new', payload);
    }
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
}
