import React from 'react';
import { useNavigate } from 'react-router-dom';

interface TriageResultViewProps {
    result: any;
    onBack?: () => void;
}

export const TriageResultView: React.FC<TriageResultViewProps> = ({ result, onBack }) => {
    const navigate = useNavigate();

    // Determine colors based on risk
    const getRiskColor = (level: string) => {
        switch (level) {
            case 'CRITICAL': return 'text-red-600 dark:text-red-500';
            case 'HIGH': return 'text-orange-600 dark:text-orange-500';
            case 'MEDIUM': return 'text-amber-500';
            default: return 'text-green-500';
        }
    };

    const getRiskBg = (level: string) => {
        switch (level) {
            case 'CRITICAL': return 'bg-red-500';
            case 'HIGH': return 'bg-orange-500';
            case 'MEDIUM': return 'bg-amber-500';
            default: return 'bg-green-500';
        }
    };

    const getRiskGradient = (level: string) => {
        switch (level) {
            case 'CRITICAL': return 'from-red-500 to-pink-600';
            case 'HIGH': return 'from-orange-500 to-red-500';
            case 'MEDIUM': return 'from-amber-400 to-orange-500';
            default: return 'from-emerald-400 to-green-500';
        }
    };

    const riskLevel = result.riskLevel;
    const riskPercentage = riskLevel === 'CRITICAL' ? 95 : riskLevel === 'HIGH' ? 75 : riskLevel === 'MEDIUM' ? 50 : 25;

    return (
        <div className="p-6 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <button
                    onClick={onBack || (() => navigate('/triage'))}
                    className="flex items-center gap-2 text-slate-500 hover:text-primary transition-all font-bold group px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    Back to Triage Form
                </button>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-clay dark:shadow-clay-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:-translate-y-0.5 transition-transform">
                        <span className="material-symbols-outlined text-[20px]">print</span>
                        Print Report
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-clay dark:shadow-clay-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:-translate-y-0.5 transition-transform">
                        <span className="material-symbols-outlined text-[20px]">share</span>
                        Share
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Result Card */}
                <div className="lg:col-span-2 space-y-8">

                    {/* AI Analysis Header Card */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-8 shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 relative overflow-hidden group">
                        {/* Background Glow */}
                        <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[100px] opacity-20 ${getRiskBg(riskLevel)}`}></div>

                        <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">

                            {/* Risk Gauge */}
                            <div className="relative w-40 h-40 shrink-0">
                                {/* Outer Ring */}
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="70"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="transparent"
                                        className="text-slate-200 dark:text-slate-700"
                                    />
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="70"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="transparent"
                                        strokeDasharray={440}
                                        strokeDashoffset={440 - (440 * riskPercentage) / 100}
                                        className={`${getRiskColor(riskLevel)} transition-all duration-1000 ease-out`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                {/* Center Text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className={`text-sm font-black uppercase tracking-wider ${getRiskColor(riskLevel)}`}>{riskLevel}</span>
                                    <span className="text-[10px] font-bold text-slate-400">RISK LEVEL</span>
                                </div>
                                {/* Pulse Effect for High Risk */}
                                {(riskLevel === 'HIGH' || riskLevel === 'CRITICAL') && (
                                    <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${getRiskBg(riskLevel)}`}></div>
                                )}
                            </div>

                            {/* Title and Summary */}
                            <div className="flex-1 text-center md:text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 mb-3 border border-slate-200 dark:border-slate-700">
                                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                                    AI-POWERED ASSESSMENT
                                </div>
                                <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2 leading-tight">
                                    Triage Analysis Complete
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-lg">
                                    Assessment for patient <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 rounded">#{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>.
                                    Analysis indicates <strong className={getRiskColor(riskLevel)}>{riskLevel.toLowerCase()} risk</strong> requiring attention.
                                </p>
                            </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-200 dark:border-slate-700/50">
                            {[
                                { label: 'Recommended Action', value: 'Timely evaluation', sub: 'Est. wait: 15-45m', icon: 'schedule', color: 'text-blue-500' },
                                { label: 'Recommended Dept', value: result.department || 'General Medicine', sub: 'Based on symptoms', icon: 'medical_services', color: 'text-purple-500' },
                                { label: 'AI Confidence', value: `${result.aiConfidence}%`, sub: '+2% vs average', icon: 'verified', color: 'text-teal-500' }
                            ].map((metric, i) => (
                                <div key={i} className="bg-white/60 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 ${metric.color} bg-opacity-10`}>
                                            <span className="material-symbols-outlined">{metric.icon}</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{metric.label}</p>
                                            <p className="text-sm font-black text-slate-700 dark:text-slate-200">{metric.value}</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{metric.sub}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Contributing Factors */}
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 px-2">
                            Top Contributing Factors
                        </h3>
                        {result.topFactors && result.topFactors.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {result.topFactors.map((factor: any, i: number) => {
                                    const impact = Math.round(factor.contribution * 100);
                                    return (
                                        <div key={i} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                                            {/* Progress Bar Background */}
                                            <div className="absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-slate-700 w-full">
                                                <div
                                                    className={`h-full ${factor.direction === 'increases' ? 'bg-red-500' : 'bg-green-500'}`}
                                                    style={{ width: `${impact}%` }}
                                                ></div>
                                            </div>

                                            <div className="flex justify-between items-start mb-2">
                                                <div className={`p-2 rounded-lg ${factor.direction === 'increases' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-green-50 dark:bg-green-900/20 text-green-500'}`}>
                                                    <span className="material-symbols-outlined text-xl">
                                                        {factor.direction === 'increases' ? 'trending_up' : 'trending_down'}
                                                    </span>
                                                </div>
                                                <span className="text-2xl font-black text-slate-700 dark:text-slate-200">{impact}%</span>
                                            </div>

                                            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-0.5">{factor.feature}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Impact Score</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                                <p className="text-sm font-medium text-slate-500">No specific factors identified (Rule-based decision).</p>
                            </div>
                        )}
                    </div>

                    {/* Detailed Explanation */}
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-[24px] p-6 border border-indigo-100 dark:border-indigo-900/20">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                                <span className="material-symbols-outlined text-xl">psychology</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm mb-2">Clinical Reasoning</h4>
                                <p className="text-sm font-medium text-indigo-800/80 dark:text-indigo-200/80 leading-relaxed">
                                    {result.explanation || result.fullExplanation || "Moderate risk factors present based on clinical assessment rules. Timely evaluation is recommended to rule out underlying conditions."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Patient Review */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-8 shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 h-fit sticky top-6">
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-8">
                        <span className="material-symbols-outlined text-lg">folder_shared</span> Patient Information
                    </h3>

                    <div className="space-y-6 relative">
                        {/* Timeline Line */}
                        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700"></div>

                        {[
                            { icon: 'person', label: 'Basic Info', value: `${result.patientInfo.age} Years, ${result.patientInfo.gender}` },
                            { icon: 'ecg_heart', label: 'Vitals', value: `BP: ${result.patientInfo.bp_systolic}/${result.patientInfo.bp_diastolic}, HR: ${result.patientInfo.heart_rate}` },
                            { icon: 'thermometer', label: 'Temperature', value: `${result.patientInfo.temperature}°C` },
                            { icon: 'clinical_notes', label: 'Symptoms', value: result.patientInfo.symptoms.join(', ') },
                            { icon: 'history', label: 'History', value: result.patientInfo.pre_existing.length > 0 ? result.patientInfo.pre_existing.join(', ') : 'None' }
                        ].map((item, i) => (
                            <div key={i} className="relative flex gap-4 group">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 z-10 flex items-center justify-center text-slate-400 shrink-0 group-hover:border-primary/50 group-hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-sm">{item.icon}</span>
                                </div>
                                <div className="pt-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{item.label}</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm leading-snug">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700/50">
                        <button
                            onClick={() => navigate('/diagnostics')}
                            className="w-full py-4 bg-slate-800 dark:bg-white text-white dark:text-slate-800 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        >
                            <span>Analyze with AI Chat</span>
                            <span className="material-symbols-outlined">chat</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
