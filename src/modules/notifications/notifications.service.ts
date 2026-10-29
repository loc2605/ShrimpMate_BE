import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import nodemailer, { type Transporter } from 'nodemailer';
import { Alert } from '../../database/entities/alert.entity';
import { Pond } from '../../database/entities/pond.entity';
import { User } from '../../database/entities/user.entity';
import { FarmerAssignment } from '../../database/entities/farmer-assignment.entity';
import { normalizePhoneNumber } from '../../common/utils/phone.util';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FarmerAssignment)
    private readonly assignmentRepository: Repository<FarmerAssignment>,
    private readonly eventsGateway: EventsGateway,
  ) {
    const host = this.configService.get<string>('mail.smtpHost');
    if (host) {
      const port = this.configService.get<number>('mail.smtpPort', 587);
      const secure = this.configService.get<boolean>('mail.smtpSecure', port === 465);
      const user = this.configService.get<string>('mail.smtpUser');
      const pass = this.configService.get<string>('mail.smtpPass');

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
      });
      this.logger.log(`NotificationsService đã khởi tạo kết nối SMTP tại ${host}:${port}`);
    } else {
      this.logger.warn('Chưa cấu hình SMTP_HOST. Thông báo email sẽ chỉ được ghi log.');
    }
  }

  /**
   * Phát thông báo khẩn cấp khi có Alert mức độ CRITICAL hoặc sự cố vận hành
   */
  async notifyCriticalAlert(alert: Alert) {
    // 1. Luôn phát WebSocket tức thì tới màn hình SCADA
    this.eventsGateway.broadcastAlert({
      id: alert.id,
      pondId: alert.pondId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      status: alert.status,
      triggeredAt: alert.triggeredAt,
    });

    // 2. Tìm thông tin ao và trang trại
    const pond = await this.pondRepository.findOne({
      where: { id: alert.pondId },
      relations: { farm: true },
    });

    if (!pond) {
      this.logger.warn(`Không tìm thấy ao ${alert.pondId} để gửi thông báo cảnh báo`);
      return;
    }

    const farmName = pond.farm?.name || 'Trang trại';
    const pondName = `${pond.name} (${pond.code})`;

    // 3. Tìm danh sách người nhận (Chủ trang trại + Các Farmer phụ trách ao này)
    const recipientUsers = new Map<string, User>();

    // Chủ trang trại (Manager)
    if (pond.farm?.ownerId) {
      const owner = await this.userRepository.findOne({ where: { id: pond.farm.ownerId } });
      if (owner && owner.isActive) {
        recipientUsers.set(owner.id, owner);
      }
    }

    // Farmer được phân công ao này hoặc toàn bộ trại
    const assignments = await this.assignmentRepository.find({
      where: [
        { pondId: pond.id },
        { farmId: pond.farmId, pondId: null as any },
      ],
      relations: { farmer: true },
    });

    for (const a of assignments) {
      if (a.farmer && a.farmer.isActive) {
        recipientUsers.set(a.farmer.id, a.farmer);
      }
    }

    const recipients = Array.from(recipientUsers.values());
    if (recipients.length === 0) {
      this.logger.warn(`Không tìm thấy quản lý hoặc người nuôi nào nhận thông báo cho ao ${pondName}`);
      return;
    }

    this.logger.warn(
      `[CRITICAL ALERT] Bắt đầu gửi thông báo khẩn cấp tới ${recipients.length} người nhận cho ao ${pondName}: ${alert.message}`,
    );

    // 4. Gửi Email & SMS song song tới từng người nhận
    for (const recipient of recipients) {
      if (recipient.email) {
        await this.sendEmergencyEmail(recipient.email, recipient.fullName, farmName, pondName, alert);
      }

      if (recipient.phoneNumber) {
        await this.sendEmergencySms(recipient.phoneNumber, recipient.fullName, pondName, alert);
      }
    }
  }

  /**
   * Gửi Email cảnh báo sự cố khẩn cấp
   */
  private async sendEmergencyEmail(
    email: string,
    recipientName: string,
    farmName: string,
    pondName: string,
    alert: Alert,
  ) {
    const from = this.configService.get<string>('mail.smtpFrom', 'noreply@shrimpmate.local');
    const sender = from.includes('<') ? from : `"ShrimpMate Cảnh Báo" <${from}>`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #BA1A1A; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #BA1A1A; color: white; padding: 16px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">🚨 CẢNH BÁO NGUY CẤP: CHỈ SỐ MÔI TRƯỜNG AO TÔM</h2>
        </div>
        <div style="padding: 20px; background-color: #FFF8F5;">
          <p>Kính gửi: <strong>${recipientName}</strong>,</p>
          <p>Hệ thống SCADA ShrimpMate vừa phát hiện sự cố nghiêm trọng vượt ngưỡng an toàn:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="background: #FFE8E5;">
              <td style="padding: 8px; border: 1px solid #FFCDD2; font-weight: bold;">Trang trại:</td>
              <td style="padding: 8px; border: 1px solid #FFCDD2;">${farmName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #FFCDD2; font-weight: bold;">Ao nuôi:</td>
              <td style="padding: 8px; border: 1px solid #FFCDD2;">${pondName}</td>
            </tr>
            <tr style="background: #FFE8E5;">
              <td style="padding: 8px; border: 1px solid #FFCDD2; font-weight: bold;">Loại sự cố:</td>
              <td style="padding: 8px; border: 1px solid #FFCDD2; color: #BA1A1A; font-weight: bold;">${alert.type}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #FFCDD2; font-weight: bold;">Nội dung cảnh báo:</td>
              <td style="padding: 8px; border: 1px solid #FFCDD2;">${alert.message}</td>
            </tr>
            <tr style="background: #FFE8E5;">
              <td style="padding: 8px; border: 1px solid #FFCDD2; font-weight: bold;">Thời điểm phát hiện:</td>
              <td style="padding: 8px; border: 1px solid #FFCDD2;">${new Date(alert.triggeredAt).toLocaleString('vi-VN')}</td>
            </tr>
          </table>
          <p style="color: #BA1A1A; font-weight: bold;">Đề nghị Quản lý và Kỹ thuật viên kiểm tra bờ ao ngay lập tức (bật quạt oxy / xử lý nguồn nước) để tránh rủi ro cho đàn tôm!</p>
        </div>
        <div style="background: #F1F5F9; padding: 12px; text-align: center; font-size: 12px; color: #64748B;">
          Thông báo tự động từ Hệ thống SCADA Giám Sát & Điều Khiển Tôm ShrimpMate.
        </div>
      </div>
    `;

    if (!this.transporter) {
      this.logger.warn(`[DEV LOG EMAIL] Tới: ${email} | Tiêu đề: [CẢNH BÁO NGUY CẤP] ${pondName} - ${alert.message}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: sender,
        to: email,
        subject: `🚨 [CẢNH BÁO NGUY CẤP] ${pondName} - ${alert.message}`,
        html: htmlContent,
      });
      this.logger.log(`Đã gửi email cảnh báo nguy cấp tới ${email} cho ao ${pondName}`);
    } catch (err) {
      this.logger.error(`Gửi email cảnh báo thất bại tới ${email}`, err);
    }
  }

  /**
   * Gửi SMS cảnh báo nguy cấp qua eSMS.vn
   */
  private async sendEmergencySms(
    phoneNumber: string,
    recipientName: string,
    pondName: string,
    alert: Alert,
  ) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const apiKey = this.configService.get<string>('esms.apiKey');
    const secretKey = this.configService.get<string>('esms.secretKey');
    const brandname = this.configService.get<string>('esms.brandname', 'Baotrixemay');
    const smsType = this.configService.get<string>('esms.smsType', '2');

    // Cắt ngắn thông điệp SMS không dấu để đảm bảo tương thích nhà mạng
    const shortMessage = `[ShrimpMate] CANH BAO NGUY CAP tai ${pondName}: ${alert.type}. Vui long kiem tra ao ngay!`;

    this.logger.log(`[SMS CẢNH BÁO] Tới: ${normalizedPhone} (${recipientName}) | Nội dung: ${shortMessage}`);

    if (!apiKey || !secretKey) {
      return;
    }

    try {
      const payload: Record<string, string> = {
        ApiKey: apiKey,
        SecretKey: secretKey,
        Phone: normalizedPhone,
        Content: shortMessage,
        SmsType: smsType,
        IsUnicode: '0',
      };

      if (smsType !== '8' && brandname) {
        payload.Brandname = brandname;
      }

      const response = await fetch(
        'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      const data = (await response.json()) as { CodeResult?: string; ErrorMessage?: string; SMSID?: string };
      if (data.CodeResult === '100') {
        this.logger.log(`Đã gửi SMS cảnh báo thành công tới ${normalizedPhone} (SMSID: ${data.SMSID})`);
      } else {
        this.logger.warn(`eSMS phản hồi mã ${data.CodeResult}: ${data.ErrorMessage}`);
      }
    } catch (err) {
      this.logger.error(`Lỗi gửi SMS qua eSMS tới ${normalizedPhone}`, err);
    }
  }
}
