import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HealthFormData, RiskLevel } from '../types';

interface HealthReviewPanelProps {
    data: HealthFormData;
    riskLevel?: RiskLevel;
    diagnosis?: string;
    aiConfidence?: number;
    recommendedActions?: string[];
}

export const HealthReviewPanel: React.FC<HealthReviewPanelProps> = ({
    data,
    riskLevel,
    diagnosis,
    aiConfidence,
    recommendedActions,
}) => {
    const navigate = useNavigate();

    return (
        <div className="bg-surface-light dark:bg-surface-dark rounded-clay p-8 border border-white/50 dark:border-slate-700 shadow-clay dark:shadow-clay-dark">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-3xl">assignment</span>
                Review Information
            </h2>

            <div className="space-y-6">
                {/* Basic Info */}
                <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 shadow-inner border border-white/50 dark:border-slate-700">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                        Basic Info
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Age:</p>
                            <p className="text-lg font-bold text-slate-800 dark:text-white">
                                {data.age} years
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Gender:</p>
                            <p className="text-lg font-bold text-slate-800 dark:text-white">{data.gender}</p>
                        </div>
                    </div>
                </section>

                {/* Vitals */}
                <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 shadow-inner border border-white/50 dark:border-slate-700">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                        Vitals
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Blood Pressure:
                            </p>
                            <p className="text-lg font-bold text-slate-800 dark:text-white">
                                {data.vitals.bpSystolic}/{data.vitals.bpDiastolic}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Heart Rate:</p>
                            <p className="text-lg font-bold text-slate-800 dark:text-white">
                                {data.vitals.heartRate} bpm
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Temperature:
                            </p>
                            <p className="text-lg font-bold text-slate-800 dark:text-white">
                                {data.vitals.temp}°C
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">SpO2:</p>
                            <p className="text-lg font-bold text-slate-800 dark:text-white">
                                {data.vitals.spo2}%
                            </p>
                        </div>
                    </div>
                </section>

                {/* Symptoms */}
                <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 shadow-inner border border-white/50 dark:border-slate-700">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                        Symptoms
                    </h3>
                    {data.symptoms.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {data.symptoms.map((symptom) => (
                                <span
                                    key={symptom}
                                    className="px-4 py-2 bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400 rounded-lg text-sm font-semibold border border-primary/20"
                                >
                                    {symptom}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">None reported</p>
                    )}
                </section>

                {/* Pre-existing Conditions */}
                <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 shadow-inner border border-white/50 dark:border-slate-700">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                        Pre-existing Conditions
                    </h3>
                    {data.preExistingConditions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {data.preExistingConditions.map((condition) => (
                                <span
                                    key={condition}
                                    className="px-4 py-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg text-sm font-semibold border border-amber-200 dark:border-amber-800"
                                >
                                    {condition}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">None reported</p>
                    )}
                </section>

                {/* AI Analysis (if available) */}
                {riskLevel && diagnosis && (
                    <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/30">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined">psychology_alt</span>
                            AI Analysis
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Risk Level:
                                </p>
                                <p
                                    className={`text-lg font-bold ${riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH
                                        ? 'text-red-600 dark:text-red-400'
                                        : riskLevel === RiskLevel.MEDIUM
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-green-600 dark:text-green-400'
                                        }`}
                                >
                                    {riskLevel}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Diagnosis:
                                </p>
                                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                                    {diagnosis}
                                </p>
                            </div>
                            {aiConfidence && (
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                                        <span className="uppercase tracking-wider">AI Confidence</span>
                                        <span className="text-primary">{aiConfidence}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 shadow-inner">
                                        <div
                                            className="bg-gradient-to-r from-blue-400 to-primary h-3 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000"
                                            style={{ width: `${aiConfidence}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                            {recommendedActions && recommendedActions.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                                        Recommended Actions:
                                    </p>
                                    <ul className="space-y-2">
                                        {recommendedActions.map((action, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0"></span>
                                                {action}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Action Buttons based on Risk */}
                            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                                {(riskLevel === RiskLevel.LOW || riskLevel === RiskLevel.MEDIUM) ? (
                                    <button
                                        onClick={() => navigate('/dashboard')}
                                        className="w-full py-3 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">calendar_add_on</span>
                                        Book Checkup Appointment
                                    </button>
                                ) : (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl space-y-3">
                                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400 font-bold">
                                            <span className="material-symbols-outlined text-2xl animate-pulse">emergency</span>
                                            <span>Critical Action Required</span>
                                        </div>
                                        <p className="text-sm text-red-700 dark:text-red-300">
                                            Immediate medical attention is recommended to prevent further health loss.
                                        </p>
                                        <button
                                            onClick={() => window.open('tel:911', '_self')}
                                            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined">local_hospital</span>
                                            Proceed to Hospital / Fast Track
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};
