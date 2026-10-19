import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { backendStatus, BackendState } from '../services/backendStatus';

/**
 * Thin banner at the top of every page when the backend is slow (cold start) or unreachable.
 * Pings /api/health on load so a sleeping Render instance starts waking while the user reads the page.
 */
export const BackendStatusBanner: React.FC = () => {
    const [state, setState] = useState<BackendState>(backendStatus.get());

    useEffect(() => {
        const unsubscribe = backendStatus.subscribe(setState);
        api.health().catch(() => { /* state already updated by the request wrapper */ });
        return unsubscribe;
    }, []);

    if (state !== 'waking' && state !== 'offline') return null;

    const waking = state === 'waking';
    return (
        <div
            role="status"
            className={`fixed top-0 inset-x-0 z-[60] px-4 py-2 text-center text-sm font-bold shadow-md flex items-center justify-center gap-2 ${waking ? 'bg-amber-400 text-amber-950' : 'bg-slate-800 text-white'
                }`}
        >
            <span className={`material-symbols-outlined text-[18px] ${waking ? 'animate-spin' : ''}`}>
                {waking ? 'progress_activity' : 'cloud_off'}
            </span>
            {waking
                ? 'Waking up server… the free hosting tier sleeps when idle, this can take up to a minute.'
                : 'Server offline. Results cannot be shown until it is reachable. In an emergency call 108.'}
            {!waking && (
                <button
                    onClick={() => api.health().catch(() => { })}
                    className="ml-2 underline underline-offset-2"
                >
                    Retry
                </button>
            )}
        </div>
    );
};
