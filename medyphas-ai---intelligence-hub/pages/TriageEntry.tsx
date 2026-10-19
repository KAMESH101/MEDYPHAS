import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RiskLevel, HealthFormData } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import { EHRUpload } from '../components/EHRUpload';
import { TriageResultView } from '../components/TriageResultView';
import { HealthInputForm } from '../components/HealthInputForm';

export const TriageEntry: React.FC = () => {
  const navigate = useNavigate();
  const { apiKey } = useAuth();
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  // EHR Upload State
  const [showEHRUpload, setShowEHRUpload] = useState(true);

  // BYOK State
  const [hasStudioKey, setHasStudioKey] = useState(false);
  const [checkingStudioKey, setCheckingStudioKey] = useState(true);
  const [initialFormData, setInitialFormData] = useState<Partial<HealthFormData> | undefined>();

  useEffect(() => {
    const checkStudioKey = async () => {
      const win = window as any;
      if (win.aistudio) {
        try {
          const hasSelected = await win.aistudio.hasSelectedApiKey();
          setHasStudioKey(hasSelected);
        } catch (e) {
          console.error(e);
        }
      }
      setCheckingStudioKey(false);
    };
    checkStudioKey();
  }, []);

  const handleEHRUploadSuccess = (data: Partial<HealthFormData>) => {
    console.log('EHR data loaded for patient:', data);
    setInitialFormData({
      age: data.age,
      gender: data.gender,
      vitals: data.vitals,
      symptoms: data.symptoms,
      preExistingConditions: data.preExistingConditions
    });
    setShowEHRUpload(false);
  };

  const handleSkipEHRUpload = () => {
    setShowEHRUpload(false);
  };

  // Error State
  const [error, setError] = useState<string | null>(null);

  const handleGenerateDiagnosis = async (data: HealthFormData) => {
    // 1. Client-side Validation (handled mostly by form, but safe to double check)
    if (data.symptoms.length === 0) {
      setError('Please select at least one symptom.');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const patientData = {
        age: data.age,
        gender: data.gender === 'Male' ? 'M' : data.gender === 'Female' ? 'F' : 'Other',
        symptoms: data.symptoms,
        bp_systolic: data.vitals.bpSystolic,
        bp_diastolic: data.vitals.bpDiastolic,
        heart_rate: data.vitals.heartRate,
        temperature: data.vitals.temp,
        spo2: data.vitals.spo2,
        pre_existing: data.preExistingConditions
      };

      const assessment = await api.triage(patientData);

      setResult({
        riskLevel: assessment.risk_level,
        diagnosis: assessment.explanation.split('\n')[0],
        aiConfidence: Math.round(assessment.confidence * 100),
        recommendedActions: assessment.explanation.split('\n').filter((line: string) => line.trim().startsWith('-')).map((line: string) => line.replace('-', '').trim()).slice(0, 3) || ["Consult Specialist", "Monitor Vitals", "Review History"],
        fullExplanation: assessment.explanation,
        department: assessment.department,
        topFactors: assessment.top_factors,
        patientInfo: patientData
      });
      setShowResult(true);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate diagnosis. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden p-6 gap-6 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Left: Input Form */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="max-w-4xl mx-auto space-y-8 pb-10">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              {!showEHRUpload && (
                <button
                  onClick={() => setShowEHRUpload(true)}
                  className="p-3 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl shadow-clay dark:shadow-clay-dark hover:-translate-y-0.5 transition-all"
                  title="Back to EHR Upload"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
              )}
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Triage Assessment</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                  {showEHRUpload ? 'Upload patient EHR or enter details manually' : 'New intake powered by Medyphas AI.'}
                </p>
              </div>
            </div>
            {((window as any).aistudio && hasStudioKey) && (
              <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold border border-green-200 dark:border-green-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                AI Studio Connected
              </div>
            )}
          </div>

          {/* Conditional EHR Upload or Form */}
          {showEHRUpload ? (
            <EHRUpload
              onUploadSuccess={handleEHRUploadSuccess}
              onSkip={handleSkipEHRUpload}
              isPatientView={false}
            />
          ) : (
            <>
              {/* Stepper */}
              <nav aria-label="Progress">
                <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { step: 1, title: 'Patient Info', sub: 'EHR Upload', active: false, done: true },
                    { step: 2, title: 'Vitals', sub: 'Analysis', active: !showResult, done: showResult },
                    { step: 3, title: 'Symptoms', sub: 'Review', active: showResult, done: false }
                  ].map((s) => (
                    <li key={s.step}>
                      <div className={`group relative flex items-center p-4 rounded-2xl transition-all ${s.active ? 'bg-[#eef2f6] dark:bg-[#1e293b] shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff] dark:shadow-[inset_4px_4px_8px_#0f1521,inset_-4px_-4px_8px_#2d3d55]' : 'hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold ${s.active ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          {s.done ? '✓' : s.step}
                        </div>
                        <div className="ml-4 flex flex-col">
                          <span className={`text-xs font-bold uppercase tracking-wider ${s.active ? 'text-primary' : 'text-slate-400'}`}>{s.title}</span>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.sub}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </nav>

              {showResult ? (
                <TriageResultView result={result} onBack={() => setShowResult(false)} />
              ) : (
                <HealthInputForm
                  onSubmit={handleGenerateDiagnosis}
                  initialData={initialFormData}
                  isPatientView={false}
                  loading={loading}
                  showAIButton={true}
                />
              )}
            </>
          )}
        </div>
      </div>


      {/* Right: Insights Panel */}
      <aside className="w-full lg:w-96 bg-surface-light dark:bg-surface-dark rounded-clay shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 flex flex-col z-10 sticky lg:top-6 h-fit lg:h-[calc(100vh-140px)]">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700/30 rounded-t-[24px] bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <h2 className="flex items-center gap-2 font-black text-lg text-slate-800 dark:text-slate-100">
            <span className="material-symbols-outlined text-primary text-3xl">psychology_alt</span>
            Medyphas AI Insights
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1 pl-10">Real-time predictive analysis.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar rounded-b-[24px]">
          {!result && !loading && !error && (
            <div className="text-center py-10 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">medical_services</span>
              <p className="text-sm font-medium">Enter patient data to generate insights.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 text-center">
              <span className="material-symbols-outlined text-3xl text-danger mb-2">error</span>
              <p className="text-sm font-bold text-danger">{error}</p>
            </div>
          )}

          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
            </div>
          )}

          {result && (
            <>
              {/* Risk Alert */}
              <div className={`rounded-2xl p-5 shadow-sm border animate-in slide-in-from-right-4 duration-500 ${result.riskLevel === RiskLevel.CRITICAL || result.riskLevel === RiskLevel.HIGH
                ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'
                }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shadow-sm ${result.riskLevel === RiskLevel.CRITICAL || result.riskLevel === RiskLevel.HIGH
                    ? 'bg-red-100 dark:bg-red-900/30 text-danger'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-500'
                    }`}>
                    <span className="material-symbols-outlined text-2xl">priority_high</span>
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm mb-1 ${result.riskLevel === RiskLevel.CRITICAL || result.riskLevel === RiskLevel.HIGH
                      ? 'text-danger'
                      : 'text-amber-600'
                      }`}>{result.riskLevel} RISK DETECTED</h4>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                      {result.diagnosis}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-5 shadow-sm border border-blue-100 dark:border-blue-900/30 animate-in slide-in-from-right-4 duration-500 delay-100">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl text-primary shadow-sm">
                    <span className="material-symbols-outlined text-2xl">fact_check</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-primary mb-1">Recommended Actions</h4>
                    <ul className="text-xs font-medium text-slate-600 dark:text-slate-300 space-y-2">
                      {result.recommendedActions?.map((action: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Confidence Footer */}
        {result && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-700/30 bg-white/30 dark:bg-slate-800/30 rounded-b-[24px]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-3">
              <span className="uppercase tracking-wider">AI Confidence Score</span>
              <span className="text-primary text-base">{result.aiConfidence}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-400 to-primary h-3 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000"
                style={{ width: `${result.aiConfidence}%` }}
              ></div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};