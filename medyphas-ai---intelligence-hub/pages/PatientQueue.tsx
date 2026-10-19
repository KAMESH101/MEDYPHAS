import React from 'react';
import { RiskLevel } from '../types';

const patients = [
  { id: '#PT-8832', age: 45, sex: 'Male', symptom: 'Severe Chest Pain', detail: 'Radiating to left arm', dept: 'Cardiology', risk: RiskLevel.CRITICAL, confidence: 98, wait: '5m' },
  { id: '#PT-8841', age: 62, sex: 'Female', symptom: 'Unconscious', detail: 'History of stroke, slurred', dept: 'Neurology', risk: RiskLevel.HIGH, confidence: 92, wait: '12m' },
  { id: '#PT-8805', age: 28, sex: 'Male', symptom: 'Deep Laceration', detail: 'Right forearm bleeding', dept: 'Trauma', risk: RiskLevel.MEDIUM, confidence: 85, wait: '35m' },
  { id: '#PT-8799', age: 19, sex: 'Female', symptom: 'Abdominal Pain', detail: 'Lower right quadrant', dept: 'General', risk: RiskLevel.MEDIUM, confidence: 78, wait: '42m' },
  { id: '#PT-8756', age: 34, sex: 'Male', symptom: 'Sprained Ankle', detail: 'Swelling, unable to bear weight', dept: 'Orthopedics', risk: RiskLevel.LOW, confidence: 99, wait: '1h 10m' },
];

export const PatientQueue: React.FC = () => {
  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight drop-shadow-sm">ER Patient Queue</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Real-time AI triage assessment and risk prioritization.</p>
        </div>
        <div className="flex gap-4">
           <button className="flex items-center gap-2 px-5 py-2.5 rounded-clay-sm bg-surface-light dark:bg-surface-dark text-slate-600 dark:text-slate-300 font-bold shadow-clay dark:shadow-clay-dark hover:-translate-y-0.5 transition-all">
             <span className="material-symbols-outlined text-lg">filter_list</span> Filter
           </button>
           <button className="flex items-center gap-2 px-5 py-2.5 rounded-clay-sm bg-primary text-white font-bold shadow-clay-primary hover:-translate-y-0.5 transition-all">
             <span className="material-symbols-outlined text-lg">download</span> Export
           </button>
        </div>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark rounded-clay p-6 shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto -mx-6 px-6 pb-4">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider pl-8">Risk Profile</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Patient ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Demographics</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-1/4">Symptoms</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Dept</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">AI Confidence</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Wait</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((pt) => (
                <tr key={pt.id} className="group transition-transform hover:scale-[1.01] hover:bg-slate-50 dark:hover:bg-slate-800/40 relative z-0 hover:z-10">
                  <td className="px-6 py-5 whitespace-nowrap pl-8 rounded-l-2xl bg-white dark:bg-[#1e293b] shadow-sm border border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-700">
                     <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-extrabold shadow-sm border ${
                        pt.risk === RiskLevel.CRITICAL ? 'bg-red-100 text-danger border-red-200' :
                        pt.risk === RiskLevel.HIGH ? 'bg-red-100 text-danger border-red-200' :
                        pt.risk === RiskLevel.MEDIUM ? 'bg-amber-100 text-amber-600 border-amber-200' :
                        'bg-green-100 text-green-600 border-green-200'
                     }`}>
                       <span className={`h-2.5 w-2.5 rounded-full mr-2 ${
                          pt.risk === RiskLevel.CRITICAL ? 'bg-danger animate-pulse' :
                          pt.risk === RiskLevel.HIGH ? 'bg-danger' :
                          pt.risk === RiskLevel.MEDIUM ? 'bg-amber-500' : 'bg-green-500'
                       }`}></span>
                       {pt.risk}
                     </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap bg-white dark:bg-[#1e293b] shadow-sm">
                    <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">{pt.id}</span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-[#1e293b] shadow-sm">
                     {pt.age} yrs <span className="text-slate-300 dark:text-slate-600 mx-1">|</span> {pt.sex}
                  </td>
                  <td className="px-6 py-5 bg-white dark:bg-[#1e293b] shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{pt.symptom}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{pt.detail}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap bg-white dark:bg-[#1e293b] shadow-sm">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">{pt.dept}</span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap bg-white dark:bg-[#1e293b] shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full w-[${pt.confidence}%] ${pt.confidence > 90 ? 'bg-green-500' : 'bg-amber-500'}`} style={{width: `${pt.confidence}%`}}></div>
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{pt.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-slate-500 bg-white dark:bg-[#1e293b] shadow-sm">
                    {pt.wait}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right rounded-r-2xl pr-8 bg-white dark:bg-[#1e293b] shadow-sm border-r border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-700">
                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:text-white hover:bg-primary transition-all shadow-inner hover:shadow-lg">
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
