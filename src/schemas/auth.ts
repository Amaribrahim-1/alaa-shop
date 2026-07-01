// src/schemas/auth.ts
import { z } from 'zod';

export const adminLoginSchema = z.object({
    email: z.string().email({ message: 'بريد إلكتروني غير صالح' }),
    password: z.string().min(6, { message: 'كلمة المرور قصيرة جداً' }),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
