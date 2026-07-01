// src/components/admin/AdminLoginForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminLoginSchema, AdminLoginInput } from '@/schemas/auth';
import { adminLogin } from '@/actions/auth';
import { useState } from 'react';

export default function AdminLoginForm() {
    const [serverError, setServerError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AdminLoginInput>({
        resolver: zodResolver(adminLoginSchema),
    });

    async function onSubmit(data: AdminLoginInput) {
        setLoading(true);
        setServerError(null);
        const fd = new FormData();
        fd.append('email', data.email);
        fd.append('password', data.password);
        const result = await adminLogin(fd);
        if (result?.error) {
            setServerError(result.error);
            setLoading(false);
        }
        // On success, adminLogin calls redirect() server-side — no client handling needed.
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {serverError && (
                <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-danger)',
                    fontSize: '0.875rem',
                }}>
                    {serverError}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label htmlFor="email" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-surface-800)' }}>
                    البريد الإلكتروني
                </label>
                <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="input"
                    placeholder="admin@example.com"
                    {...register('email')}
                />
                {errors.email && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>{errors.email.message}</span>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label htmlFor="password" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-surface-800)' }}>
                    كلمة المرور
                </label>
                <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="input"
                    placeholder="••••••••"
                    {...register('password')}
                />
                {errors.password && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>{errors.password.message}</span>
                )}
            </div>

            <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ marginTop: '0.5rem', height: '2.75rem' }}
            >
                {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
        </form>
    );
}
