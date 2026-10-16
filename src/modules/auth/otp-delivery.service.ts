import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { isEmailIdentifier, normalizePhoneNumber } from '../../common/utils/phone.util';

@Injectable()
export class OtpDeliveryService {
  private readonly logger = new Logger(OtpDeliveryService.name);
  private readonly transporter: Transporter | null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('mail.smtpHost');
    if (!host) {
      this.transporter = null;
      return;
    }

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
  }

  async sendPasswordResetOtp(identifier: string, otp: string) {
    if (isEmailIdentifier(identifier)) {
      await this.sendViaEmail(identifier.trim().toLowerCase(), otp);
      return;
    }

    await this.sendViaPhone(normalizePhoneNumber(identifier), otp);
  }

  private async sendViaEmail(email: string, otp: string) {
    const nodeEnv = this.configService.get<string>('app.nodeEnv', 'development');
    const expiresInMinutes = this.configService.get<number>('auth.passwordReset.otpExpiresInMinutes', 5);

    if (nodeEnv !== 'production') {
      this.logger.log(`[DEV] Mã OTP đặt lại mật khẩu (email) cho ${email}: ${otp}`);
    }

    if (!this.transporter) {
      if (nodeEnv === 'production') {
        this.logger.warn(
          `Password reset OTP requested for ${email} but SMTP is not configured. Set SMTP_HOST and related env vars.`,
        );
      }
      return;
    }

    const from = this.configService.get<string>('mail.smtpFrom', 'noreply@shrimpmate.local');
    const sender = from.includes('<') ? from : `"ShrimpMate" <${from}>`;

    try {
      await this.transporter.sendMail({
        from: sender,
        to: email,
        subject: 'ShrimpMate - Mã OTP đặt lại mật khẩu',
        text: [
          'Bạn đã yêu cầu đặt lại mật khẩu ShrimpMate.',
          '',
          `Mã OTP: ${otp}`,
          `Mã có hiệu lực trong ${expiresInMinutes} phút.`,
          '',
          'Nếu bạn không yêu cầu, hãy bỏ qua email này.',
        ].join('\n'),
        html: [
          '<p>Bạn đã yêu cầu đặt lại mật khẩu ShrimpMate.</p>',
          `<p>Mã OTP: <strong>${otp}</strong></p>`,
          `<p>Mã có hiệu lực trong ${expiresInMinutes} phút.</p>`,
          '<p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>',
        ].join(''),
      });
      this.logger.log(`Password reset OTP emailed to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP to ${email}`, error instanceof Error ? error.stack : error);
    }
  }

  private async sendViaPhone(phoneNumber: string, otp: string) {
    const nodeEnv = this.configService.get<string>('app.nodeEnv', 'development');
    const expiresInMinutes = this.configService.get<number>('auth.passwordReset.otpExpiresInMinutes', 5);

    if (nodeEnv !== 'production') {
      this.logger.log(
        `[DEV] Mã OTP đặt lại mật khẩu (SMS) cho ${phoneNumber}: ${otp} (hiệu lực ${expiresInMinutes} phút)`,
      );
    }

    const esmsApiKey = this.configService.get<string>('esms.apiKey');
    const esmsSecretKey = this.configService.get<string>('esms.secretKey');

    if (esmsApiKey && esmsSecretKey) {
      await this.sendViaEsms(phoneNumber, otp, esmsApiKey, esmsSecretKey, expiresInMinutes);
      return;
    }

    if (nodeEnv === 'production') {
      this.logger.warn(
        `Password reset OTP requested for ${phoneNumber} but eSMS is not configured. Set ESMS_API_KEY and ESMS_SECRET_KEY.`,
      );
    }
  }

  private async sendViaEsms(
    phoneNumber: string,
    otp: string,
    apiKey: string,
    secretKey: string,
    expiresInMinutes: number,
  ) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const brandname = this.configService.get<string>('esms.brandname', 'Baotrixemay');
    const smsType = this.configService.get<string>('esms.smsType', '2');
    // Nếu dùng SmsType=2 với brandname test "Baotrixemay", bắt buộc đúng cú pháp nhà mạng đã duyệt:
    // "{OTP} la ma xac minh dang ky Baotrixemay cua ban".
    // Khi gửi qua đầu số cố định 10 số (SmsType=8) hoặc brandname riêng, dùng cú pháp chuẩn ShrimpMate:
    const content =
      smsType === '2' && brandname === 'Baotrixemay'
        ? `${otp} la ma xac minh dang ky Baotrixemay cua ban`
        : `${otp} la ma xac minh dat lai mat khau ShrimpMate cua ban. Ma co hieu luc trong ${expiresInMinutes} phut.`;

    const payload: Record<string, string> = {
      ApiKey: apiKey,
      SecretKey: secretKey,
      Phone: normalizedPhone,
      Content: content,
      SmsType: smsType,
      IsUnicode: '0',
    };

    if (smsType !== '8' && brandname) {
      payload.Brandname = brandname;
    }

    try {
      const response = await fetch(
        'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      const data = (await response.json()) as { CodeResult?: string; ErrorMessage?: string; SMSID?: string };

      if (data.CodeResult !== '100') {
        this.logger.error(
          `eSMS gửi thất bại tới ${normalizedPhone} (CodeResult: ${data.CodeResult}): ${data.ErrorMessage || 'Lỗi không xác định từ eSMS'}`,
        );
        return;
      }

      this.logger.log(`Password reset OTP SMS sent via eSMS to ${normalizedPhone} (SMSID: ${data.SMSID})`);
    } catch (error) {
      this.logger.error(
        `Failed to send SMS OTP via eSMS to ${normalizedPhone}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
