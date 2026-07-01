// src/actions/auth.ts
'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminLoginSchema } from '@/schemas/auth';

export async function adminLogin(formData: FormData) {
    const raw = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    };

    const parsed = adminLoginSchema.safeParse(raw);
    if (!parsed.success) {
        return { error: 'بيانات غير صالحة' };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
        return { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
    }

    redirect('/admin');
}
