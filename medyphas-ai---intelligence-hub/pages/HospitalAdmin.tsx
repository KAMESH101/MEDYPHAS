import React, { useEffect, useState } from 'react';
import { api, Hospital } from '../services/api';

/** Hospital update dashboard: staff keep free-bed counts current (DEMO DATA). */
export const HospitalAdmin: React.FC = () => {
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [drafts, setDrafts] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.listHospitals()
            .then((list) => {
                setHospitals(list);
                setDrafts(Object.fromEntries(list.map((h) => [h.id, h.beds_available])));
            })
            .catch((e) => setError(e?.message || 'Could not load hospitals'));
    }, []);

    const save = async (id: string) => {
        setSaving(id);
        setMessage(null);
        try {
            const updated = await api.updateBeds(id, drafts[id]);
            setHospitals((list) => list.map((h) => (h.id === id ? updated : h)));
            setMessage({ id, text: 'Saved', ok: true });
        } catch (e: any) {
            setMessage({ id, text: e?.message || 'Save failed', ok: false });
        } finally {
            setSaving(null);
        }
    };

    const change = (id: string, value: number) =>
        setDrafts((d) => ({ ...d, [id]: Math.max(0, Number.isFinite(value) ? Math.round(value) : 0) }));

    return (
        <div className="p-6 md:p-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Hospital Beds</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
                    Update free beds so emergency routing sends patients where there is space.
                </p>
                <p className="mt-2 inline-block text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    Demo data: fictional hospitals. Changes reset when the server restarts.
                </p>
            </div>

            {error && <p className="p-4 rounded-xl bg-red-50 text-red-700 font-medium">{error}</p>}

            <div className="space-y-3">
                {hospitals.map((h) => {
                    const dirty = drafts[h.id] !== h.beds_available;
                    return (
                        <div key={h.id} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 md:p-5 shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-800 dark:text-white">{h.name}</p>
                                <p className="text-xs text-slate-500">{h.area}{h.has_trauma_care ? ' · Trauma care' : ''}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {h.specialties.map((s) => (
                                        <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{s}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => change(h.id, drafts[h.id] - 1)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 font-black" aria-label={`Fewer beds at ${h.name}`}>−</button>
                                <input
                                    type="number"
                                    min={0}
                                    value={drafts[h.id] ?? 0}
                                    onChange={(e) => change(h.id, parseInt(e.target.value, 10))}
                                    className="w-20 text-center text-xl font-black bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2"
                                    aria-label={`Free beds at ${h.name}`}
                                />
                                <button onClick={() => change(h.id, drafts[h.id] + 1)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 font-black" aria-label={`More beds at ${h.name}`}>+</button>
                                <button
                                    onClick={() => save(h.id)}
                                    disabled={!dirty || saving === h.id}
                                    className="ml-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold disabled:opacity-40"
                                >
                                    {saving === h.id ? 'Saving…' : 'Save'}
                                </button>
                                {message?.id === h.id && (
                                    <span className={`text-xs font-bold ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
