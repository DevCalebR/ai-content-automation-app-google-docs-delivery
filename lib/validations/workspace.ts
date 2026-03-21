import { z } from "zod";

export const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(280).optional().default(""),
});
