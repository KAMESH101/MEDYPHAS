import React from 'react';
import { riskInfo } from '../services/risk';

interface RiskBadgeProps {
    level?: string | null;
    size?: 'sm' | 'lg';
    showTitle?: boolean;
}

/** Traffic-light badge: coloured dot + "Red / Yellow / Green" (+ optional meaning). */
export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'sm', showTitle = false }) => {
    const info = riskInfo(level);
    const large = size === 'lg';
    return (
        <span
            className={`inline-flex items-center gap-2 rounded-xl border font-black ${info.soft} ${info.text} ${large ? 'px-4 py-2 text-lg' : 'px-3 py-1 text-xs'}`}
            aria-label={`Urgency ${info.label}: ${info.title}`}
        >
            <span className={`rounded-full ${info.dot} ${large ? 'w-4 h-4' : 'w-2.5 h-2.5'} ${info.light === 'RED' ? 'animate-pulse' : ''}`}></span>
            {info.label}
            {showTitle && <span className="font-semibold opacity-80">· {info.title}</span>}
        </span>
    );
};
