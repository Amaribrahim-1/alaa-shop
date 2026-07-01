// src/app/admin/layout.tsx
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata = {
    title: 'لوحة الإدارة | متجر آلاء',
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            style={{
                display: 'flex',
                minHeight: '100vh',
                backgroundColor: 'var(--color-surface-50)',
                direction: 'rtl',
            }}
        >
            <AdminSidebar />

            {/* Main content area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Top bar */}
                <header
                    style={{
                        height: '56px',
                        backgroundColor: 'var(--color-surface-0)',
                        borderBottom: '1px solid var(--color-surface-200)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 1.5rem',
                        flexShrink: 0,
                        boxShadow: 'var(--shadow-card)',
                    }}
                >
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-surface-800)' }}>
                        مرحباً، المدير
                    </span>
                </header>

                {/* Page content */}
                <main
                    style={{
                        flex: 1,
                        padding: '1.5rem',
                        overflowY: 'auto',
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
