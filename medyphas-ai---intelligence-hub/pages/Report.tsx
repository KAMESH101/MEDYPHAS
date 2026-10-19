import React, { useState } from 'react';
import { EHRUpload } from '../components/EHRUpload';
import { RiskBadge } from '../components/RiskBadge';
import { Disclaimer } from '../components/Disclaimer';
import { HospitalList } from '../components/HospitalList';
import { ListenButton } from '../components/ListenButton';
import { ReportAnalysis, ReportLanguage } from '../services/api';
import { riskInfo } from '../services/risk';
import { AMBULANCE_NUMBER, telLink } from '../services/emergency';

const LANGUAGES: { code: ReportLanguage; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
];

const DOC_TYPE: Record<string, string> = {
    prescription: 'Prescription',
    lab_report: 'Lab report',
    clinical_note: 'Clinical note',
    other: 'Medical document',
};

const SOURCE: Record<string, string> = {
    gemini: 'Explained by Gemini',
    groq: 'Explained by Groq (backup AI)',
    rules: 'Basic explanation (AI busy)',
};

/** Patient mode: upload -> explanation in English/Tamil/Hindi -> Green/Yellow/Red -> hospitals if Red. */
export const Report: React.FC = () => {
    const [language, setLanguage] = useState<ReportLanguage>('en');
    const [analysis, setAnalysis] = useState<ReportAnalysis | null>(null);

    const risk = riskInfo(analysis?.risk_level);
    const explanation = analysis?.report_explanation;
    const medicineNotes = new Map((explanation?.medicines || []).map((m) => [m.name.toLowerCase(), m.explanation]));
    const labNotes = new Map((explanation?.lab_values || []).map((l) => [l.name.toLowerCase(), l.explanation]));
    const alertFor = (name: string) => analysis?.lab_alerts.find((a) => a.test.toLowerCase() === name.toLowerCase());

    const readAloud = explanation
        ? [explanation.summary, ...explanation.medicines.map((m) => `${m.name}. ${m.explanation}`), ...explanation.lab_values.map((l) => `${l.name}. ${l.explanation}`)].join(' ')
        : '';

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Understand My Report</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Upload a prescription or lab report. We explain it simply and check if it's urgent.
                    </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined">translate</span>
                    <select
                        value={language}
                        onChange={(e) => { setLanguage(e.target.value as ReportLanguage); setAnalysis(null); }}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                        aria-label="Explanation language"
                    >
                        {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                </label>
            </div>

            {!analysis ? (
                <EHRUpload isPatientView language={language} onAnalyzed={setAnalysis} />
            ) : (
                <div className="space-y-6">
                    {/* Urgency */}
                    <section className={`rounded-clay p-6 border ${risk.soft}`}>
                        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-full ${risk.dot} shadow-lg flex items-center justify-center text-white ${risk.light === 'RED' ? 'animate-pulse' : ''}`}>
                                    <span className="material-symbols-outlined text-3xl">traffic</span>
                                </div>
                                <div>
                                    <RiskBadge level={analysis.risk_level} size="lg" showTitle />
                                    <p className={`mt-2 font-bold ${risk.text}`}>{risk.action}</p>
                                </div>
                            </div>
                            {risk.light === 'RED' && (
                                <a href={telLink(AMBULANCE_NUMBER)} className="px-6 py-4 rounded-2xl bg-red-600 text-white text-lg font-black flex items-center justify-center gap-2 shadow-lg">
                                    <span className="material-symbols-outlined">call</span> Call {AMBULANCE_NUMBER}
                                </a>
                            )}
                        </div>
                        {analysis.lab_alerts.length > 0 && (
                            <ul className="mt-4 space-y-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                                {analysis.lab_alerts.map((a, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${a.level === 'HIGH' ? 'bg-red-500' : 'bg-amber-400'}`}></span>
                                        {a.test}: {a.value} {a.unit} - {a.message}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Hospitals first when it's urgent */}
                    {risk.light === 'RED' && (
                        <section className="bg-surface-light dark:bg-surface-dark rounded-clay p-6 shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700">
                            <HospitalList specialty={analysis.department} />
                        </section>
                    )}

                    {/* Explanation */}
                    <section className="bg-surface-light dark:bg-surface-dark rounded-clay p-6 shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    {DOC_TYPE[analysis.document_type] || 'Document'} · {SOURCE[analysis.explanation_source]}{analysis.cached ? ' · cached' : ''}
                                </p>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white">What it says</h2>
                            </div>
                            <ListenButton text={readAloud} language={analysis.language} />
                        </div>
                        <p className="text-base leading-relaxed text-slate-700 dark:text-slate-200">{explanation?.summary}</p>
                    </section>

                    {/* Medicines (only those written by the doctor) */}
                    {analysis.medicines.length > 0 && (
                        <section className="bg-surface-light dark:bg-surface-dark rounded-clay p-6 shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700">
                            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">pill</span> Your prescribed medicines
                            </h2>
                            <p className="text-xs text-slate-500 mb-4">Exactly as written by your doctor. Don't change or stop a medicine without asking your doctor.</p>
                            <div className="space-y-3">
                                {analysis.medicines.map((m, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                                        <p className="font-black text-slate-800 dark:text-white">{m.name}</p>
                                        <div className="flex flex-wrap gap-2 mt-1 text-xs font-bold">
                                            {m.dose && <span className="px-2 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">{m.dose}</span>}
                                            {m.timing && <span className="px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">{m.timing}</span>}
                                            {m.duration && <span className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">{m.duration}</span>}
                                        </div>
                                        {medicineNotes.get(m.name.toLowerCase()) && (
                                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{medicineNotes.get(m.name.toLowerCase())}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Lab values */}
                    {analysis.lab_values.length > 0 && (
                        <section className="bg-surface-light dark:bg-surface-dark rounded-clay p-6 shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700">
                            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-500">lab_research</span> Your test results
                            </h2>
                            <div className="space-y-3">
                                {analysis.lab_values.map((lab, i) => {
                                    const alert = alertFor(lab.name);
                                    const dot = alert ? (alert.level === 'HIGH' ? 'bg-red-500' : 'bg-amber-400') : 'bg-green-500';
                                    return (
                                        <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                                                    <span className={`w-2.5 h-2.5 rounded-full ${dot}`}></span>{lab.name}
                                                </p>
                                                <p className="font-mono font-bold text-slate-700 dark:text-slate-200 text-right">
                                                    {lab.value ?? '-'} {lab.unit}
                                                    {lab.reference_range && <span className="block text-[11px] text-slate-400">range {lab.reference_range}</span>}
                                                </p>
                                            </div>
                                            {labNotes.get(lab.name.toLowerCase()) && (
                                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{labNotes.get(lab.name.toLowerCase())}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <Disclaimer text={analysis.disclaimer} />

                    <button
                        onClick={() => setAnalysis(null)}
                        className="px-6 py-3 bg-white dark:bg-slate-700 text-primary dark:text-blue-300 rounded-2xl font-bold shadow-clay dark:shadow-clay-dark flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">upload_file</span> Upload another document
                    </button>
                </div>
            )}
        </div>
    );
};
