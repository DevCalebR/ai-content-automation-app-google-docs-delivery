import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  NEXTAUTH_URL: z.url(),
  NEXTAUTH_SECRET: z.string().min(32),
  SEED_DEMO_ACCOUNT: z.enum(["true", "false"]).optional(),
  SEED_DEMO_EMAIL: z.email().optional(),
  SEED_DEMO_PASSWORD: z.string().min(8).optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? process.env.APP_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  SEED_DEMO_ACCOUNT: process.env.SEED_DEMO_ACCOUNT,
  SEED_DEMO_EMAIL: process.env.SEED_DEMO_EMAIL,
  SEED_DEMO_PASSWORD: process.env.SEED_DEMO_PASSWORD,
});
