import React, { useState } from 'react';
import { HealthFormData } from '../types';
import { SymptomSearch } from './SymptomSearch';

interface HealthInputFormProps {
    onSubmit: (data: HealthFormData) => void;
    initialData?: Partial<HealthFormData>;
    isPatientView?: boolean;
    loading?: boolean;
    showAIButton?: boolean;
}

export const HealthInputForm: React.FC<HealthInputFormProps> = ({
    onSubmit,
    initialData,
    isPatientView = false,
    loading = false,
    showAIButton = false,
}) => {
    const [age, setAge] = useState<number>(initialData?.age || 30);
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(initialData?.gender || 'Male');
    const [symptoms, setSymptoms] = useState<string[]>(initialData?.symptoms || []);
    const [vitals, setVitals] = useState({
        bpSystolic: initialData?.vitals?.bpSystolic || 120,
        bpDiastolic: initialData?.vitals?.bpDiastolic || 80,
        heartRate: initialData?.vitals?.heartRate || 75,
        temp: initialData?.vitals?.temp || 37.0,
        spo2: initialData?.vitals?.spo2 || 98,
    });
    const [preExistingConditions, setPreExistingConditions] = useState<string[]>(
        initialData?.preExistingConditions || []
    );

    const handleSymptomToggle = (symptom: string) => {
        if (symptoms.includes(symptom)) {
            setSymptoms(symptoms.filter((s) => s !== symptom));
        } else {
            setSymptoms([...symptoms, symptom]);
        }
    };

    const handleConditionToggle = (condition: string) => {
        if (preExistingConditions.includes(condition)) {
            setPreExistingConditions(preExistingConditions.filter((c) => c !== condition));
        } else {
            setPreExistingConditions([...preExistingConditions, condition]);
        }
    };

    const handleSubmit = () => {
        const formData: HealthFormData = {
            age,
            gender,
            vitals,
            symptoms,
            preExistingConditions,
        };
        onSubmit(formData);
    };

    const availableSymptoms = [
        'Chest Pain',
        'Shortness of Breath',
        'Fever > 38°C',
        'Nausea',
        'Dizziness',
        'Abdominal Pain',
        'Headache',
        'Fatigue',
    ];

    const availableConditions = [
        'Diabetes',
        'Hypertension',
        'Asthma',
        'Heart Disease',
        'Allergies',
        'Arthritis',
        'Kidney Disease',
        'Thyroid Disorder',
    ];

    return (
        <div className="bg-surface-light dark:bg-surface-dark rounded-clay p-8 border border-white/50 dark:border-slate-700 shadow-clay dark:shadow-clay-dark">
            <div className="space-y-10">
                {/* Demographics */}
                <section>
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-6 pl-1">
                        <span className="material-symbols-outlined text-lg">person</span>{' '}
                        {isPatientView ? 'Basic Information' : 'Patient Demographics'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 ml-1">
                                Age
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={age}
                                    onChange={(e) => setAge(parseInt(e.target.value))}
                                    className="block w-full text-lg p-4 font-bold text-slate-700 dark:text-slate-200 outline-none bg-[#eef2f6] dark:bg-[#1e293b] rounded-2xl shadow-[inset_5px_5px_10px_#d6dbe4,inset_-5px_-5px_10px_#ffffff] dark:shadow-[inset_4px_4px_8px_#0f1521,inset_-4px_-4px_8px_#2d3d55] border-none focus:ring-2 focus:ring-primary/50"
                                />
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                    <span className="text-slate-400 font-semibold text-sm">Years</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 ml-1">
                                Gender
                            </label>
                            <div className="grid grid-cols-3 gap-3 p-2 bg-[#eef2f6] dark:bg-[#1e293b] rounded-2xl shadow-[inset_5px_5px_10px_#d6dbe4,inset_-5px_-5px_10px_#ffffff] dark:shadow-[inset_4px_4px_8px_#0f1521,inset_-4px_-4px_8px_#2d3d55] h-[64px] items-center">
                                {['Male', 'Female', 'Other'].map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setGender(opt as 'Male' | 'Female' | 'Other')}
                                        className={`h-full rounded-xl text-sm font-bold transition-all ${gender === opt
                                            ? 'bg-white dark:bg-slate-600 shadow-md text-primary dark:text-white'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Vitals */}
                <section>
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-6 pl-1">
                        <span className="material-symbols-outlined text-lg">ecg_heart</span> Vitals
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                        {[
                            {
                                label: 'BP Systolic',
                                key: 'bpSystolic',
                                unit: 'mmHg',
                                critical: vitals.bpSystolic > 160,
                            },
                            {
                                label: 'BP Diastolic',
                                key: 'bpDiastolic',
                                unit: 'mmHg',
                                critical: false,
                            },
                            {
                                label: 'Heart Rate',
                                key: 'heartRate',
                                unit: 'bpm',
                                critical: vitals.heartRate > 100,
                            },
                            { label: 'Temp', key: 'temp', unit: '°C', critical: false },
                            { label: 'SpO2', key: 'spo2', unit: '%', critical: vitals.spo2 < 95 },
                        ].map((vital: any) => (
                            <div
                                key={vital.key}
                                className={`relative group rounded-2xl p-5 transition-all bg-[#eef2f6] dark:bg-[#1e293b] shadow-[inset_5px_5px_10px_#d6dbe4,inset_-5px_-5px_10px_#ffffff] dark:shadow-[inset_4px_4px_8px_#0f1521,inset_-4px_-4px_8px_#2d3d55] ${vital.critical
                                    ? 'shadow-[inset_4px_4px_8px_rgba(239,68,68,0.2),inset_-4px_-4px_8px_rgba(255,255,255,0.1),0_0_15px_rgba(239,68,68,0.4)] border border-danger/30'
                                    : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <label
                                        className={`text-xs font-bold uppercase tracking-wide ${vital.critical ? 'text-danger' : 'text-slate-400'
                                            }`}
                                    >
                                        {vital.label}
                                    </label>
                                    {vital.critical && (
                                        <span className="h-2 w-2 rounded-full bg-danger animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <input
                                        type="number"
                                        value={(vitals as any)[vital.key]}
                                        onChange={(e) =>
                                            setVitals({ ...vitals, [vital.key]: parseFloat(e.target.value) })
                                        }
                                        className={`w-full bg-transparent border-none p-0 text-3xl font-black focus:ring-0 ${vital.critical ? 'text-danger' : 'text-slate-700 dark:text-slate-200'
                                            }`}
                                    />
                                    <span
                                        className={`text-xs font-bold ${vital.critical ? 'text-danger/70' : 'text-slate-400'
                                            }`}
                                    >
                                        {vital.unit}
                                    </span>
                                </div>
                                {vital.critical && (
                                    <div className="mt-3 text-[10px] font-black text-white bg-danger px-2 py-1 rounded-lg inline-block shadow-sm">
                                        CRITICAL
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Symptoms */}
                <section>
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-6 pl-1">
                        <span className="material-symbols-outlined text-lg">stethoscope</span> Symptoms
                    </h3>
                    <div className="w-full">
                        <SymptomSearch selectedSymptoms={symptoms} onSymptomsChange={setSymptoms} />
                    </div>
                </section>

                {/* Pre-existing Conditions */}
                <section>
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-6 pl-1">
                        <span className="material-symbols-outlined text-lg">history</span> Pre-existing
                        Conditions
                    </h3>
                    <div className="flex flex-wrap gap-4">
                        {availableConditions.map((condition) => (
                            <button
                                key={condition}
                                type="button"
                                onClick={() => handleConditionToggle(condition)}
                                className={`group select-none rounded-[50px] px-6 py-3 text-sm font-bold transition-all border border-transparent ${preExistingConditions.includes(condition)
                                    ? 'bg-[#eef2f6] dark:bg-[#1e293b] text-amber-600 dark:text-amber-400 shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff] dark:shadow-[inset_4px_4px_8px_#0f1521,inset_-4px_-4px_8px_#2d3d55] translate-y-[1px]'
                                    : 'bg-[#eef2f6] dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 shadow-[5px_5px_10px_#d1d9e6,-5px_-5px_10px_#ffffff] dark:shadow-[5px_5px_10px_#0b1120,-5px_-5px_10px_#31415e] hover:-translate-y-[2px]'
                                    }`}
                            >
                                {condition}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Action Buttons */}
                <div className="pt-8 border-t border-slate-200 dark:border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <span className="material-symbols-outlined text-xl">info</span>
                        <span className="text-xs font-bold uppercase tracking-wider">
                            {isPatientView ? 'Track your health' : 'Patient Assessment'}
                        </span>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <button
                            className="flex-1 md:flex-none px-8 py-4 rounded-xl font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                            type="button"
                        >
                            Clear
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 md:flex-none bg-gradient-to-br from-primary to-primary-dark text-white px-10 py-4 rounded-xl font-bold shadow-clay-primary hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner transition-all flex justify-center items-center gap-3 group"
                            type="button"
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                    <span>{showAIButton ? 'Analyzing...' : 'Saving...'}</span>
                                </>
                            ) : (
                                <>
                                    <span>{showAIButton ? 'Generate AI Diagnosis' : 'Save Health Data'}</span>
                                    <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">
                                        {showAIButton ? 'auto_awesome' : 'save'}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
