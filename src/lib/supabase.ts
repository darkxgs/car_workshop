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

const getSupabaseUrl = () => {
    if (typeof window !== "undefined") {
        // Use relative path to proxy through Next.js server to bypass ISP blocks/routing issues in Iraq
        return `${window.location.origin}/api/supabase`;
    }
    return process.env.NEXT_PUBLIC_SUPABASE_URL!;
};

const getCustomWebSocket = () => {
    if (typeof window === "undefined") return undefined;
    return class extends WebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
            let targetUrl = url.toString();
            const realUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (realUrl) {
                const realOrigin = new URL(realUrl).origin;
                const wsOrigin = realOrigin.replace(/^http/, 'ws');
                const proxyPrefix = `${window.location.origin}/api/supabase`;
                const proxyWsPrefix = proxyPrefix.replace(/^http/, 'ws');
                if (targetUrl.startsWith(proxyWsPrefix)) {
                    targetUrl = targetUrl.replace(proxyWsPrefix, wsOrigin);
                }
            }
            super(targetUrl, protocols);
        }
    };
};

export const supabase = createBrowserClient<Database>(
    getSupabaseUrl(),
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
        realtime: {
            transport: getCustomWebSocket(),
        },
    }
);
