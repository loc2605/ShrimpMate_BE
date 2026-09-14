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
});