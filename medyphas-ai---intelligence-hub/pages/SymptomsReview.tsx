import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RiskLevel } from '../types';
import { TriageResultView } from '../components/TriageResultView';

export const SymptomsReview: React.FC = () => {
    const location = useLocation();
    const result = location.state?.result;
    const navigate = useNavigate();

    if (!result) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">analytics</span>
                <h2 className="text-2xl font-bold text-slate-600 dark:text-slate-300">No Assessment Data</h2>
                <p className="text-slate-500 mb-8">Please complete a triage assessment first.</p>
                <button
                    onClick={() => navigate('/triage')}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-clay-primary hover:shadow-lg transition-all"
                >
                    Go to Triage
                </button>
            </div>
        );
    }

    return <TriageResultView result={result} />;
};
