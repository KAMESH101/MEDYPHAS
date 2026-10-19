import React, { useEffect, useState } from 'react';
import { api, RankResult } from '../services/api';
import { AMBULANCE_NUMBER, telLink } from '../services/emergency';
import { GeoState, useGeolocation } from '../services/useGeolocation';

interface HospitalListProps {
    /** Department from the triage result, e.g. "Cardiology / Emergency". */
    specialty?: string;
    /** Used by the backend (assign_department) when no specialty is given. */
    symptoms?: string[];
    limit?: number;
    /** Pass a location the parent already has (e.g. Bystander page) to avoid asking twice. */
    geo?: GeoState;
    title?: string;
}

/** Ranked hospitals (specialist match > beds > distance) with directions and call buttons. */
export const HospitalList: React.FC<HospitalListProps> = ({ specialty, symptoms, limit = 5, geo: geoProp, title = 'Nearest suitable hospitals' }) => {
    const ownGeo = useGeolocation();
    const geo = geoProp ?? ownGeo;
    const [result, setResult] = useState<RankResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const symptomKey = (symptoms || []).join(',');
    const locating = geo.status === 'locating';

    useEffect(() => {
        if (locating) return; // wait for the location (or a refusal) first
        let cancelled = false;
        setError(null);
        api.rankHospitals({ lat: geo.lat, lng: geo.lng, specialty, symptoms, limit })
            .then((r) => { if (!cancelled) setResult(r); })
            .catch((e) => { if (!cancelled) setError(e?.message || 'Could not load hospitals'); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [specialty, symptomKey, limit, geo.lat, geo.lng, locating]);

    return (
        <section className="space-y-3" aria-live="polite">
            <div className="flex items-end justify-between gap-2">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500">local_hospital</span>
                    {title}
                </h3>
                {result && result.required_specialties.length > 0 && (
                    <span className="text-xs font-bold text-slate-500">Needs: {result.required_specialties.join(', ')}</span>
                )}
            </div>

            {locating && <p className="text-sm text-slate-500">Finding your location…</p>}
            {!locating && geo.status !== 'ok' && (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    Location not available, so distance isn't used. Allow location access for the nearest hospitals.
                </p>
            )}
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            {!result && !error && !locating && <p className="text-sm text-slate-500">Ranking hospitals…</p>}

            {result?.hospitals.map((h, i) => (
                <article
                    key={h.id}
                    className={`rounded-2xl p-4 border bg-white dark:bg-slate-800/60 ${i === 0 ? 'border-red-300 dark:border-red-700 shadow-lg' : 'border-slate-200 dark:border-slate-700'}`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-black text-slate-800 dark:text-white leading-tight">
                                {i === 0 && <span className="text-red-600 mr-1">#1</span>}{h.name}
                            </p>
                            <p className="text-xs text-slate-500">{h.area}</p>
                        </div>
                        <div className="text-right shrink-0">
                            {h.distance_km != null && <p className="font-black text-slate-700 dark:text-slate-200">{h.distance_km.toFixed(1)} km</p>}
                            <p className={`text-xs font-bold ${h.beds_available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {h.beds_available > 0 ? `${h.beds_available} beds free` : 'No beds reported'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {h.has_trauma_care && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Trauma care</span>
                        )}
                        {h.matched_specialties.filter((s) => s !== 'Trauma').map((s) => (
                            <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{s}</span>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        <a
                            href={h.maps_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold"
                        >
                            <span className="material-symbols-outlined text-[18px]">directions</span> Directions
                        </a>
                        <a
                            href={telLink(AMBULANCE_NUMBER)}
                            className="flex items-center justify-center gap-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold"
                        >
                            <span className="material-symbols-outlined text-[18px]">call</span> Call {AMBULANCE_NUMBER}
                        </a>
                    </div>
                </article>
            ))}

            {result && <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{result.notice}</p>}
        </section>
    );
};
