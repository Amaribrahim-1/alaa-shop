// src/proxy.ts  ← Next.js 16 name (middleware.ts is deprecated)
// Protects all /admin/* routes (except /admin/login).
// Checks: 1) valid Supabase session  2) profiles.role === 'admin'

import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Let /admin/login through — otherwise a logged-out user would loop forever.
    if (pathname === '/admin/login') {
        return NextResponse.next();
    }

    const response = NextResponse.next();
    const supabase = createMiddlewareClient(request, response);

    // Refresh the session cookie and get the authenticated user securely.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // No user → redirect to admin login.
    if (!user) {
        const loginUrl = new URL('/admin/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // User exists — verify the role is 'admin'.
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(loginUrl);
    }

    // Valid admin session — allow through.
    return response;
}

export const config = {
    matcher: ['/admin/:path*'],
};
