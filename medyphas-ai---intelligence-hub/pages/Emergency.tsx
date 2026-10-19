import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HospitalList } from '../components/HospitalList';
import { Disclaimer } from '../components/Disclaimer';
import { RiskBadge } from '../components/RiskBadge';
import { useGeolocation } from '../services/useGeolocation';
import { AMBULANCE_NUMBER, EMERGENCY_NUMBER, telLink } from '../services/emergency';

// What the bystander taps -> symptom text the backend's assign_department() understands
const CHIPS: { id: string; label: string; icon: string; symptom: string }[] = [
    { id: 'bleeding', label: 'Heavy bleeding', icon: 'bloodtype', symptom: 'heavy bleeding' },
    { id: 'unconscious', label: 'Unconscious', icon: 'airline_seat_flat', symptom: 'unconscious' },
    { id: 'head', label: 'Head injury', icon: 'personal_injury', symptom: 'head injury' },
    { id: 'cantmove', label: "Can't move", icon: 'accessible', symptom: 'cannot move' },
    { id: 'chest', label: 'Chest pain', icon: 'cardiology', symptom: 'chest pain' },
    { id: 'breathing', label: 'Breathing trouble', icon: 'pulmonology', symptom: 'breathing trouble' },
    { id: 'seizure', label: 'Seizure', icon: 'neurology', symptom: 'seizure' },
];

/**
 * Bystander mode: public, no login, no typing.
 * Always Red -> Call 108 -> location to read to the operator -> best hospitals (trauma first when relevant).
 */
export const Emergency: React.FC = () => {
    const [selected, setSelected] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);
    const geo = useGeolocation(true);

    const toggle = (id: string) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const symptoms = CHIPS.filter((c) => selected.includes(c.id)).map((c) => c.symptom);
    const coords = geo.lat != null && geo.lng != null ? `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}` : null;

    const copyLocation = async () => {
        if (!coords) return;
        try {
            await navigator.clipboard.writeText(`${coords} https://www.google.com/maps?q=${geo.lat},${geo.lng}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard blocked; the numbers are on screen anyway */
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 font-display">
            {/* Sticky call bar: always one tap away */}
            <div className="sticky top-0 z-40 bg-red-600 text-white shadow-lg">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <Link to="/login" className="p-2 -ml-2 rounded-xl hover:bg-red-700" aria-label="Back">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <p className="font-black text-lg flex-1 leading-tight">Emergency help</p>
                    <a href={telLink(AMBULANCE_NUMBER)} className="px-5 py-3 rounded-2xl bg-white text-red-700 font-black text-xl flex items-center gap-2 shadow">
                        <span className="material-symbols-outlined">call</span> {AMBULANCE_NUMBER}
                    </a>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                <section>
                    <h1 className="text-3xl font-black tracking-tight">Help someone in an emergency</h1>
                    <p className="text-lg font-semibold text-slate-600 dark:text-slate-300 mt-1">
                        You can help. You don't have to give your name.
                    </p>
                </section>

                {/* Big call button */}
                <a
                    href={telLink(AMBULANCE_NUMBER)}
                    className="flex items-center justify-center gap-3 w-full py-6 rounded-3xl bg-red-600 hover:bg-red-700 text-white text-3xl font-black shadow-xl shadow-red-500/40 active:scale-[0.98] transition-transform"
                >
                    <span className="material-symbols-outlined text-4xl">call</span>
                    Call {AMBULANCE_NUMBER}
                </a>
                <a href={telLink(EMERGENCY_NUMBER)} className="block text-center font-bold text-red-700 dark:text-red-300 underline -mt-3">
                    or {EMERGENCY_NUMBER} (National Emergency)
                </a>

                {/* Location for the operator */}
                <section className="rounded-3xl p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Your location · read this to the operator</p>
                    {coords ? (
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="font-mono text-2xl font-black">{coords}</p>
                                {geo.accuracy != null && <p className="text-xs text-slate-500">Accurate to about {Math.round(geo.accuracy)} m</p>}
                            </div>
                            <button onClick={copyLocation} className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 font-bold flex items-center gap-1 shrink-0">
                                <span className="material-symbols-outlined text-[20px]">{copied ? 'check' : 'content_copy'}</span>
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    ) : (
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                            {geo.status === 'locating' ? 'Finding your location…' : 'Location not available. Tell the operator a nearby landmark.'}
                        </p>
                    )}
                </section>

                {/* What happened: tap only */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-black">What do you see?</h2>
                        <RiskBadge level="HIGH" showTitle />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {CHIPS.map((chip) => {
                            const on = selected.includes(chip.id);
                            return (
                                <button
                                    key={chip.id}
                                    onClick={() => toggle(chip.id)}
                                    aria-pressed={on}
                                    className={`flex items-center gap-2 p-3 sm:p-4 rounded-2xl text-left font-bold text-base sm:text-lg leading-tight break-words border-2 transition-colors min-h-[64px] min-w-0 ${on
                                        ? 'bg-red-600 border-red-600 text-white'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-2xl sm:text-3xl shrink-0">{chip.icon}</span>
                                    {chip.label}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Hospitals: trauma / relevant specialty first */}
                <section className="rounded-3xl p-5 bg-white/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <HospitalList symptoms={symptoms} geo={geo} limit={3} title="Best hospitals now" />
                </section>

                <Disclaimer />
            </main>
        </div>
    );
};
