import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(100),
});

export const emailOnlySchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
});

export const passwordResetSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  token: z.string().min(20),
  password: z.string().min(10).max(100),
});
