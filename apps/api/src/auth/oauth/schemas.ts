import { z } from 'zod';

export const confirmLinkSchema = z.object({
  confirmationToken: z.string().min(16).max(255),
  password: z.string().min(1),
});

export type ConfirmLinkInput = z.infer<typeof confirmLinkSchema>;
