import { createBrowserClient } from '@supabase/ssr'
import { processLock } from '@supabase/supabase-js'
import type { Database } from './types'

// Custom fetch wrapper to prevent infinite deadlocks when tabs hibernate/wake up.
// Supabase is known to freeze ALL requests if a token refresh gets deadlocked in the background.
const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
    // 1. We create our own strict 10s timeout promise
    // 2. We Race it against the actual Supabase fetch
    // 3. This physically guarantees no Supabase call can EVER freeze the app forever.
    const strictTimeout = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error("Supabase Network Freeze: 10s automatic timeout activated to break tab-sleep deadlock")), 10000);
    });

    return Promise.race([
        fetch(url, options),
        strictTimeout
    ]);
};

export const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        global: {
            fetch: customFetch
        },
        auth: {
            // Use an in-memory lock instead of the browser Web Locks API. The default
            // navigator lock throws "Lock ... was released because another request stole it"
            // under contention (slow networks, multiple tabs, or browsers like Brave),
            // which was crashing auth init for users. processLock serializes token
            // refreshes within the tab without relying on navigator.locks.
            lock: processLock,
        },
    }
);
