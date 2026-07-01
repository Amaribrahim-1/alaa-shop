// src/lib/supabase/middleware.ts
// Supabase client for use inside proxy.ts — reads cookies from NextRequest directly.

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseEnv } from './env';

export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
    const { url, anonKey } = getSupabaseEnv();

    return createServerClient(url, anonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                );
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                );
            },
        },
    });
}
