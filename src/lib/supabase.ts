import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// Custom fetch wrapper to prevent infinite deadlocks when tabs hibernate/wake up.
// Supabase is known to freeze ALL requests if a token refresh gets deadlocked in the background.
const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
    const controller = new AbortController();
    // 10 second strict timeout for any supabase call globally
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    return fetch(url, {
        ...options,
        // Allow overriding the signal if one is provided natively
        signal: options?.signal || controller.signal,
    }).finally(() => {
        clearTimeout(timeoutId);
    });
};

export const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        global: {
            fetch: customFetch
        }
    }
);
