import React, { useState } from 'react';
import { HealthInputForm } from '../components/HealthInputForm';
import { HealthReviewPanel } from '../components/HealthReviewPanel';
import { EHRUpload } from '../components/EHRUpload';
import { HealthFormData } from '../types';
import { api } from '../services/api';

export const MyHealth: React.FC = () => {
    const [showEHRUpload, setShowEHRUpload] = useState(true);
    const [submittedData, setSubmittedData] = useState<HealthFormData | null>(null);
    const [showReview, setShowReview] = useState(false);
    const [initialFormData, setInitialFormData] = useState<Partial<HealthFormData> | undefined>();
    const [triageResult, setTriageResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (data: HealthFormData) => {
        setSubmittedData(data);
        setIsLoading(true);
        try {
            // Call Triage API
            console.log("Submitting for triage...", data);
            const result = await api.triage(data);
            console.log("Triage Result:", result);
            setTriageResult(result);
        } catch (error) {
            console.error("Triage error:", error);
            // Fallback or error handling
        } finally {
            setIsLoading(false);
            setShowReview(true);
        }
    };

    const handleEdit = () => {
        setShowReview(false);
    };

    const handleEHRUploadSuccess = (data: Partial<HealthFormData>) => {
        console.log('EHR data loaded:', data);
        setInitialFormData(data);
        setShowEHRUpload(false);
    };

    const handleSkipEHRUpload = () => {
        setShowEHRUpload(false);
    };

    return (
        <div className="p-6 space-y-8 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    {!showEHRUpload && !showReview && (
                        <button
                            onClick={() => setShowEHRUpload(true)}
                            className="p-3 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl shadow-clay dark:shadow-clay-dark hover:-translate-y-0.5 transition-all"
                            title="Back to EHR Upload"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                    )}
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            My Health
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                            {showEHRUpload
                                ? 'Upload your EHR or enter details manually'
                                : 'Track and manage your health information'}
                        </p>
                    </div>
                </div>
                {showReview && (
                    <button
                        onClick={handleEdit}
                        className="px-6 py-3 bg-white dark:bg-slate-700 text-primary dark:text-blue-400 rounded-2xl font-bold shadow-clay dark:shadow-clay-dark hover:-translate-y-0.5 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">edit</span>
                        Edit Information
                    </button>
                )}
            </div>

            {/* Progress Steps */}
            {!showReview && !showEHRUpload && (
                <nav aria-label="Progress">
                    <ol className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { step: 1, title: 'Basic Info', sub: 'Age & Gender', active: true, done: false },
                            { step: 2, title: 'Vitals', sub: 'Health Metrics', active: true, done: false },
                            { step: 3, title: 'Symptoms', sub: 'Current Issues', active: true, done: false },
                            { step: 4, title: 'Review', sub: 'Confirm', active: false, done: false },
                        ].map((s) => (
                            <li key={s.step}>
                                <div
                                    className={`group relative flex items-center p-4 rounded-2xl transition-all ${s.active
                                        ? 'bg-[#eef2f6] dark:bg-[#1e293b] shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff] dark:shadow-[inset_4px_4px_8px_#0f1521,inset_-4px_-4px_8px_#2d3d55]'
                                        : 'hover:bg-white/50 dark:hover:bg-slate-800/50'
                                        }`}
                                >
                                    <div
                                        className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold ${s.active
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                            }`}
                                    >
                                        {s.done ? '✓' : s.step}
                                    </div>
                                    <div className="ml-4 flex flex-col">
                                        <span
                                            className={`text-xs font-bold uppercase tracking-wider ${s.active ? 'text-primary' : 'text-slate-400'
                                                }`}
                                        >
                                            {s.title}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            {s.sub}
                                        </span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>
                </nav>
            )}

            {/* Content */}
            {showEHRUpload ? (
                <EHRUpload
                    onUploadSuccess={handleEHRUploadSuccess}
                    onSkip={handleSkipEHRUpload}
                    isPatientView={true}
                />
            ) : !showReview ? (
                <HealthInputForm onSubmit={handleSubmit} isPatientView={true} initialData={initialFormData} />
            ) : (
                submittedData && (
                    isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
                            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-xl font-bold text-slate-600 dark:text-slate-300">Analyzing Health Data...</p>
                            <p className="text-sm text-slate-400">Please wait while our AI assesses your vitals.</p>
                        </div>
                    ) : (
                        <HealthReviewPanel
                            data={submittedData}
                            riskLevel={triageResult?.risk_level}
                            diagnosis={triageResult?.explanation}
                            aiConfidence={triageResult?.confidence ? Math.round(triageResult.confidence * 100) : undefined}
                            recommendedActions={triageResult?.recommended_actions}
                        />
                    )
                )
            )}

            {/* Info Cards */}
            {!showReview && !showEHRUpload && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-clay shadow-clay-primary text-white">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="material-symbols-outlined text-3xl">favorite</span>
                            <h3 className="font-bold text-lg">Track Your Health</h3>
                        </div>
                        <p className="text-sm text-blue-100 leading-relaxed">
                            Keep a record of your vital signs and symptoms for better healthcare management.
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-6 rounded-clay shadow-clay-primary text-white">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="material-symbols-outlined text-3xl">health_and_safety</span>
                            <h3 className="font-bold text-lg">Share with Doctors</h3>
                        </div>
                        <p className="text-sm text-purple-100 leading-relaxed">
                            Easily share your health information with medical professionals when needed.
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-clay shadow-clay-primary text-white">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="material-symbols-outlined text-3xl">trending_up</span>
                            <h3 className="font-bold text-lg">Monitor Progress</h3>
                        </div>
                        <p className="text-sm text-amber-100 leading-relaxed">
                            Track changes in your health metrics over time to identify trends and patterns.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
