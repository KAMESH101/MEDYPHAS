import React, { useState, useEffect } from 'react';
import { SymptomSearch } from '../components/SymptomSearch';
import { Link } from 'react-router-dom';
import { api, SpecialistAdvice } from '../services/api';
import { AMBULANCE_NUMBER, telLink } from '../services/emergency';
import { Disclaimer } from '../components/Disclaimer';

export const QuickFix: React.FC = () => {
    const [symptoms, setSymptoms] = useState<string[]>([]);
    const [history, setHistory] = useState<string>('None');
    const [historyOptions, setHistoryOptions] = useState<string[]>(['None']);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SpecialistAdvice | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            const data = await api.getSymptoms();
            if (data.history) setHistoryOptions(Array.from(new Set(['None', ...data.history])));
        };
        loadHistory();
    }, []);

    const handlePredict = async () => {
        if (symptoms.length === 0) {
            setError("Please select at least one symptom.");
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            setResult(await api.specialistHelper({ symptoms, history }));
        } catch (err: any) {
            setError(err.message || "Could not get a suggestion.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row gap-8">

                {/* Left: Input Form */}
                <div className="flex-1 space-y-8">
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                            <span className="material-symbols-outlined text-4xl text-blue-500">stethoscope</span>
                            Which Doctor?
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 text-lg">
                            Not sure who to see? Pick your symptoms and we'll suggest the kind of specialist to consult. No diagnosis, no medicines.
                        </p>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark rounded-clay p-8 border border-white/50 dark:border-slate-700 shadow-clay dark:shadow-clay-dark relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <span className="material-symbols-outlined text-9xl">pilates</span>
                        </div>

                        <div className="space-y-8 relative z-10">
                            {/* Medical History */}
                            <section>
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    Medical History
                                </label>
                                <div className="relative">
                                    <select
                                        value={history}
                                        onChange={(e) => setHistory(e.target.value)}
                                        className="w-full bg-[#eef2f6] dark:bg-[#1e293b] text-slate-700 dark:text-slate-200 font-bold rounded-2xl p-4 appearance-none outline-none shadow-inner border border-transparent focus:border-primary/50 transition-all cursor-pointer"
                                    >
                                        {historyOptions.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <span className="material-symbols-outlined">expand_more</span>
                                    </div>
                                </div>
                            </section>

                            {/* Symptoms */}
                            <section>
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    Symptoms
                                </label>
                                <SymptomSearch selectedSymptoms={symptoms} onSymptomsChange={setSymptoms} />
                            </section>

                            <button
                                onClick={handlePredict}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">person_search</span>
                                        Suggest a Specialist
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Results or Placeholder */}
                <div className="lg:w-[450px]">
                    {result ? (
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in slide-in-from-bottom-8 duration-700 space-y-6">
                            {result.urgent ? (
                                <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 space-y-3">
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black">
                                        <span className="material-symbols-outlined animate-pulse">emergency</span>
                                        Warning signs - don't wait for an appointment
                                    </div>
                                    <p className="text-sm font-medium text-red-700 dark:text-red-300">{result.message}</p>
                                    <a href={telLink(AMBULANCE_NUMBER)} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined">call</span> Call {AMBULANCE_NUMBER}
                                    </a>
                                    <Link to="/emergency" className="block text-center text-sm font-bold text-red-700 dark:text-red-300 underline">Find an emergency hospital</Link>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
                                        <span className="material-symbols-outlined text-3xl">stethoscope</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white">Suggested specialists</h3>
                                        <p className="text-xs font-medium text-slate-500">{result.message}</p>
                                    </div>
                                </div>
                            )}

                            <ol className="space-y-3">
                                {result.suggestions.map((s, i) => (
                                    <li key={s.specialty} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl">
                                        <p className="text-lg font-black text-slate-700 dark:text-slate-100">{i + 1}. {s.specialty}</p>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{s.reason}</p>
                                    </li>
                                ))}
                            </ol>

                            <Disclaimer text={result.disclaimer} />
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-surface-light/50 dark:bg-surface-dark/50 rounded-clay border-2 border-dashed border-slate-300 dark:border-slate-700">
                            <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <span className="material-symbols-outlined text-5xl text-slate-400">medical_information</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">Who should I see?</h3>
                            <p className="text-slate-400 max-w-xs">Select your symptoms. We suggest a type of doctor; we never name a disease or a medicine.</p>
                            {error && (
                                <div className="mt-6 p-4 bg-red-100 text-red-600 rounded-xl font-bold text-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
