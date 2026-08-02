import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_SECRET: z.string().default('super-secret-jwt-key-change-in-production'),
  JWT_REFRESH_SECRET: z.string().default('super-secret-refresh-key-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  DEFAULT_UPI_ID: z.string().default('tummystation@upi'),
  DEFAULT_UPI_NAME: z.string().default('WhatsApp Food Station'),
  CORS_ORIGIN: z.string().default('*'),
});

export const env = envSchema.parse(process.env);
