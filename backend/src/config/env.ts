import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/tummy_bot?schema=public'),
  JWT_SECRET: z.string().default('super-secret-jwt-key-change-in-production'),
  JWT_REFRESH_SECRET: z.string().default('super-secret-refresh-key-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  WHATSAPP_PROVIDER: z.enum(['meta', 'twilio', 'baileys']).default('meta'),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_WHATSAPP_TOKEN: z.string().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().default('tummy_bot_verify_token_12345'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  DEFAULT_UPI_ID: z.string().default('foodorder@upi'),
  DEFAULT_UPI_NAME: z.string().default('WhatsApp Food Station'),
  PAYMENT_VERIFICATION_AUTO: z.string().default('false'),
  CORS_ORIGIN: z.string().default('*'),
});

export const env = envSchema.parse(process.env);
