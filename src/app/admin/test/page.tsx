// src/app/admin/test/page.tsx
// TEMPORARY — delete after Task 3 is verified.

import { createClient } from '@/lib/supabase/server';

export default async function AdminTestPage() {
    const supabase = await createClient();

    const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    return (
        <main style={{ padding: '2rem', fontFamily: 'monospace' }}>
            <h1>Supabase Connection Test</h1>
            {error ? (
                <p style={{ color: 'red' }}>
                    ❌ Error: {error.message}
                </p>
            ) : (
                <p style={{ color: 'green' }}>
                    ✅ Connected — products in DB: <strong>{count}</strong>
                </p>
            )}
        </main>
    );
}
