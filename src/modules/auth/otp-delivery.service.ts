import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

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

  async sendPasswordResetOtp(email: string, otp: string) {
    const nodeEnv = this.configService.get<string>('app.nodeEnv', 'development');
    const expiresInMinutes = this.configService.get<number>('auth.passwordReset.otpExpiresInMinutes', 5);

    if (nodeEnv !== 'production') {
      this.logger.log(`[DEV] Mã OTP đặt lại mật khẩu cho ${email}: ${otp}`);
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

    try {
      await this.transporter.sendMail({
        from,
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
}
