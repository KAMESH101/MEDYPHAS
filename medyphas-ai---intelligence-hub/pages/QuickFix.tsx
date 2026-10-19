import React, { useState, useEffect } from 'react';
import { SymptomSearch } from '../components/SymptomSearch';
import { api } from '../services/api';

export const QuickFix: React.FC = () => {
    const [symptoms, setSymptoms] = useState<string[]>([]);
    const [history, setHistory] = useState<string>('None');
    const [historyOptions, setHistoryOptions] = useState<string[]>(['None']);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            const data = await api.getSymptoms();
            if (data.history) setHistoryOptions(['None', ...data.history]);
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
            const prediction = await api.quickFix({ symptoms, history });
            setResult(prediction);
        } catch (err: any) {
            setError(err.message || "Failed to predict.");
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
                            <span className="material-symbols-outlined text-4xl text-blue-500">medication_liquid</span>
                            Quick Fix AI
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 text-lg">
                            Get instant, AI-powered medication recommendations based on your symptoms.
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
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">auto_awesome</span>
                                        Find Quick Fix
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Results or Placeholder */}
                <div className="lg:w-[450px]">
                    {result ? (
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in slide-in-from-bottom-8 duration-700">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
                                    <span className="material-symbols-outlined text-3xl">check_circle</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white">Analysis Complete</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{Math.round(result.confidence * 100)}% Confidence</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-5 bg-slate-50 dark:bg-slate-700/30 rounded-2xl">
                                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Detected Condition</span>
                                    <p className="text-xl font-black text-slate-700 dark:text-slate-100">{result.disease}</p>
                                </div>

                                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-lg shadow-blue-500/20">
                                    <div className="absolute top-0 right-0 p-4 opacity-20">
                                        <span className="material-symbols-outlined text-6xl">pill</span>
                                    </div>
                                    <span className="text-xs font-bold text-blue-100 uppercase block mb-2">Recommended Medication</span>
                                    <p className="text-2xl font-black leading-tight">{result.medicine}</p>
                                    <div className="mt-4 pt-4 border-t border-white/20 text-xs font-medium text-blue-100 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">info</span>
                                        Consult a pharmacist before use.
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-medium leading-relaxed flex gap-3">
                                    <span className="material-symbols-outlined shrink-0">warning</span>
                                    <p>This is an AI prediction. It is not a substitute for professional medical advice. If symptoms persist, see a doctor.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-surface-light/50 dark:bg-surface-dark/50 rounded-clay border-2 border-dashed border-slate-300 dark:border-slate-700">
                            <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <span className="material-symbols-outlined text-5xl text-slate-400">medical_information</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">Ready to Assist</h3>
                            <p className="text-slate-400 max-w-xs">Select your symptoms and medical history to get an instant AI recommendation.</p>
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
