import React, { useState } from 'react';
import { HealthFormData } from '../types';
import { api, ReportAnalysis, ReportLanguage } from '../services/api';

interface EHRUploadProps {
    /** Prefill mode: receives the age / vitals / symptoms read from the document. */
    onUploadSuccess?: (data: Partial<HealthFormData>) => void;
    /** Patient mode: receives the full analysis (medicines, lab values, urgency, explanation). */
    onAnalyzed?: (analysis: ReportAnalysis) => void;
    onSkip?: () => void;
    isPatientView?: boolean;
    language?: ReportLanguage;
}

const VALID_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_MB = 10;

/** Backend PatientInput (snake_case) -> form data. Missing values stay undefined (never invented). */
const toFormData = (p: any): Partial<HealthFormData> => ({
    age: p?.age,
    gender: p?.gender === 'M' ? 'Male' : p?.gender === 'F' ? 'Female' : 'Other',
    vitals: {
        bpSystolic: p?.bp_systolic ?? undefined,
        bpDiastolic: p?.bp_diastolic ?? undefined,
        heartRate: p?.heart_rate ?? undefined,
        temp: p?.temperature ?? undefined,
        spo2: p?.spo2 ?? undefined,
    } as HealthFormData['vitals'],
    symptoms: (p?.symptoms || []).filter((s: string) => s !== 'no symptoms reported'),
    preExistingConditions: p?.pre_existing || [],
});

export const EHRUpload: React.FC<EHRUploadProps> = ({
    onUploadSuccess,
    onAnalyzed,
    onSkip,
    isPatientView = false,
    language = 'en' as ReportLanguage,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFile = (file: File) => {
        if (!VALID_TYPES.includes(file.type)) {
            setError('Invalid file type. Please upload a PDF, PNG or JPG (a photo of the prescription or report works).');
            return;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
            setError(`File too large. Maximum size is ${MAX_MB} MB.`);
            return;
        }

        setUploadedFile(file);
        setError(null);
    };

    const handleUpload = async () => {
        if (!uploadedFile) return;

        setUploading(true);
        setError(null);

        try {
            const analysis = await api.analyzeReport(uploadedFile, language);
            onAnalyzed?.(analysis);
            onUploadSuccess?.(toFormData(analysis.patient));
        } catch (err: any) {
            setError(err?.message || 'Failed to read the document. Please try again or enter details manually.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-surface-light dark:bg-surface-dark rounded-clay p-8 border border-white/50 dark:border-slate-700 shadow-clay dark:shadow-clay-dark">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                    <span className="material-symbols-outlined text-4xl">upload_file</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                    {isPatientView ? 'Upload a prescription or lab report' : 'Upload Electronic Health Record'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {isPatientView
                        ? 'A clear photo or PDF. We read it and explain it in simple words.'
                        : 'Upload the patient\'s record for faster assessment'}
                </p>
            </div>

            {/* Upload Area */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-12 transition-all ${isDragging
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary'
                    }`}
            >
                <input
                    type="file"
                    id="ehr-upload"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    onChange={handleFileInput}
                />

                {!uploadedFile ? (
                    <label
                        htmlFor="ehr-upload"
                        className="cursor-pointer flex flex-col items-center gap-4"
                    >
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-slate-400">
                                cloud_upload
                            </span>
                        </div>
                        <div className="text-center">
                            <p className="text-slate-700 dark:text-slate-200 font-semibold mb-1">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                PDF, PNG or JPG (max {MAX_MB} MB)
                            </p>
                        </div>
                    </label>
                ) : (
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl text-primary">
                                    description
                                </span>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-white">
                                    {uploadedFile.name}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {(uploadedFile.size / 1024).toFixed(2)} KB
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setUploadedFile(null)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            aria-label="Remove file"
                        >
                            <span className="material-symbols-outlined text-slate-500">close</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
                {onSkip && (
                    <button
                        onClick={onSkip}
                        className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">edit</span>
                        Skip & Enter Manually
                    </button>
                )}
                <button
                    onClick={handleUpload}
                    disabled={!uploadedFile || uploading}
                    className="flex-1 bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-4 rounded-xl font-bold shadow-clay-primary hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                    {uploading ? (
                        <>
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            Reading document...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">check_circle</span>
                            {isPatientView ? 'Read & Explain' : 'Process Record'}
                        </>
                    )}
                </button>
            </div>

            {/* Privacy note */}
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl">
                        privacy_tip
                    </span>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        Prototype: documents are read by a free-tier AI service that may use submitted data.
                        Please upload <strong>sample documents only</strong>, not real patient records.
                    </p>
                </div>
            </div>
        </div>
    );
};
