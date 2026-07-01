// src/app/admin/login/page.tsx
import AdminLoginForm from '@/components/admin/AdminLoginForm';

export const metadata = {
    title: 'تسجيل الدخول | لوحة إدارة متجر آلاء',
};

export default function AdminLoginPage() {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface-900)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            direction: 'rtl',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                backgroundColor: 'var(--color-surface-0)',
                borderRadius: 'var(--radius-xl)',
                padding: '2.5rem',
                boxShadow: 'var(--shadow-modal)',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-surface-900)', marginBottom: '0.5rem' }}>
                        متجر آلاء
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-status-cancelled)' }}>
                        تسجيل دخول المدير
                    </p>
                </div>

                <AdminLoginForm />
            </div>
        </div>
    );
}
