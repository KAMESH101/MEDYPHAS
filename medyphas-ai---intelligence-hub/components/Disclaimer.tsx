import React from 'react';
import { AMBULANCE_NUMBER, telLink } from '../services/emergency';

interface DisclaimerProps {
    /** Extra sentence, e.g. the backend's translated disclaimer. */
    text?: string;
    className?: string;
}

/** Shown on every result screen. */
export const Disclaimer: React.FC<DisclaimerProps> = ({ text, className = '' }) => (
    <div
        role="note"
        className={`flex items-start gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 ${className}`}
    >
        <span className="material-symbols-outlined text-slate-500 shrink-0">info</span>
        <div>
            <p className="font-bold text-slate-700 dark:text-slate-200">
                Not a substitute for a doctor.
            </p>
            <p>
                Medyphas AI is a prototype using demo data. It explains and prioritises; it does not diagnose or
                prescribe. In an emergency call{' '}
                <a href={telLink(AMBULANCE_NUMBER)} className="font-bold text-red-600 underline">{AMBULANCE_NUMBER}</a>.
            </p>
            {text && <p className="mt-1">{text}</p>}
        </div>
    </div>
);
