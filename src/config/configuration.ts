export default () => ({
  app: {
    port: Number.parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883',
  },
  ai: {
    engineUrl: process.env.AI_ENGINE_URL,
  },
  mail: {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: Number.parseInt(process.env.SMTP_PORT ?? '587', 10),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFrom: process.env.SMTP_FROM,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    passwordReset: {
      otpExpiresInMinutes: Number.parseInt(process.env.OTP_EXPIRES_IN_MINUTES ?? '5', 10),
      otpRequestCooldownSeconds: Number.parseInt(process.env.OTP_REQUEST_COOLDOWN_SECONDS ?? '60', 10),
      otpMaxAttempts: Number.parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
    },
  },
});