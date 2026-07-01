// src/app/admin/(shell)/page.tsx
import { createClient } from '@/lib/supabase/server';

async function getDashboardMetrics() {
    const supabase = await createClient();

    const [{ count: pendingOrders }, { count: activeProducts }, { data: orders }] =
        await Promise.all([
            supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending'),
            supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true),
            supabase
                .from('orders')
                .select('total_amount')
                .eq('status', 'completed'),
        ]);

    const totalSales = (orders ?? []).reduce(
        (sum, o) => sum + Number(o.total_amount),
        0
    );

    return {
        pendingOrders: pendingOrders ?? 0,
        activeProducts: activeProducts ?? 0,
        totalSales,
    };
}

export default async function AdminDashboardPage() {
    const { pendingOrders, activeProducts, totalSales } =
        await getDashboardMetrics();

    const metrics = [
        {
            id: 'total-sales',
            label: 'إجمالي المبيعات المكتملة',
            value: `${totalSales.toLocaleString('ar-EG')} ج.م`,
            icon: '💰',
            accent: 'var(--color-success)',
            bg: '#dcfce7',
        },
        {
            id: 'pending-orders',
            label: 'طلبات قيد الانتظار',
            value: String(pendingOrders),
            icon: '📦',
            accent: 'var(--color-warning)',
            bg: '#fef3c7',
        },
        {
            id: 'active-products',
            label: 'منتجات نشطة',
            value: String(activeProducts),
            icon: '🛍️',
            accent: 'var(--color-info)',
            bg: '#dbeafe',
        },
    ];

    return (
        <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-surface-900)', marginBottom: '1.75rem' }}>
                لوحة التحكم
            </h1>

            {/* Metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {metrics.map((m) => (
                    <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: 'var(--radius-lg)',
                            backgroundColor: m.bg, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '1.375rem', flexShrink: 0,
                        }}>
                            {m.icon}
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-status-cancelled)', marginBottom: '0.25rem' }}>
                                {m.label}
                            </p>
                            <p style={{ fontSize: '1.625rem', fontWeight: 700, color: m.accent, lineHeight: 1.1 }}>
                                {m.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick-links row */}
            <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-800)', width: '100%', fontWeight: 600, marginBottom: '0.5rem' }}>
                    روابط سريعة
                </p>
                {[
                    { href: '/admin/orders', label: 'إدارة الطلبات', icon: '📦' },
                    { href: '/admin/products', label: 'إدارة المنتجات', icon: '🛍️' },
                    { href: '/admin/reviews', label: 'إدارة التقييمات', icon: '⭐' },
                ].map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        className="btn-ghost"
                        style={{ fontSize: '0.875rem' }}
                    >
                        {link.icon} {link.label}
                    </a>
                ))}
            </div>
        </div>
    );
}
