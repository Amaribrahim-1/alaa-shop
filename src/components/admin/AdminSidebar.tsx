// src/components/admin/AdminSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
    href: string;
    label: string;
    icon: string;
};

const navItems: NavItem[] = [
    { href: '/admin', label: 'لوحة التحكم', icon: '📊' },
    { href: '/admin/orders', label: 'الطلبات', icon: '📦' },
    { href: '/admin/products', label: 'المنتجات', icon: '🛍️' },
    { href: '/admin/reviews', label: 'التقييمات', icon: '⭐' },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside
            style={{
                width: '240px',
                minHeight: '100vh',
                backgroundColor: 'var(--color-surface-900)',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem 0',
                flexShrink: 0,
            }}
        >
            {/* Logo / store name */}
            <div
                style={{
                    padding: '0 1.5rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    marginBottom: '1rem',
                }}
            >
                <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-brand-400)' }}>
                    متجر آلاء
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-status-cancelled)', marginTop: '0.25rem' }}>
                    لوحة الإدارة
                </p>
            </div>

            {/* Nav links */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.75rem' }}>
                {navItems.map((item) => {
                    // Exact match for dashboard; prefix match for sub-pages
                    const isActive =
                        item.href === '/admin'
                            ? pathname === '/admin'
                            : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.625rem 0.875rem',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.9rem',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'var(--color-brand-300)' : 'rgba(255,255,255,0.75)',
                                backgroundColor: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'background-color 150ms ease, color 150ms ease',
                            }}
                        >
                            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer hint */}
            <div style={{ padding: '1rem 1.5rem 0', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '1rem' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--color-status-cancelled)' }}>
                    Alaa Store Admin v1.0
                </p>
            </div>
        </aside>
    );
}
