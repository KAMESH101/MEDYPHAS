import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { UserRole } from '../types';

export const Signup: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<UserRole>('DOCTOR');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isDoctor, setIsDoctor] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.signup(username, password, activeTab, activeTab === 'DOCTOR' ? isDoctor : false);
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark p-8 rounded-[40px] shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 relative z-10 animate-in fade-in zoom-in duration-500">

                <div className="text-center mb-8">
                    <img
                        src="/Logo.png"
                        alt="MedyphasAI Logo"
                        className="w-16 h-16 mx-auto mb-4 object-contain rounded-2xl shadow-sm"
                    />
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        Create Account
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Join MedyphasAI network</p>
                </div>

                <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-8 relative">
                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-600 rounded-xl shadow-sm transition-all duration-300 ease-spring ${activeTab === 'PATIENT' ? 'left-[calc(50%+2px)]' : 'left-1'}`}
                    ></div>
                    <button
                        onClick={() => { setActiveTab('DOCTOR'); setIsDoctor(false); }}
                        className={`flex-1 relative z-10 py-3 text-sm font-bold transition-colors ${activeTab === 'DOCTOR' ? 'text-primary dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        Medical Staff
                    </button>
                    <button
                        onClick={() => setActiveTab('PATIENT')}
                        className={`flex-1 relative z-10 py-3 text-sm font-bold transition-colors ${activeTab === 'PATIENT' ? 'text-primary dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        Patient
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-500 text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                            Username
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">person</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="Choose a username"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                            Password
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">lock</span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="Choose a password"
                            />
                        </div>
                    </div>

                    {activeTab === 'DOCTOR' && (
                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={isDoctor}
                                    onChange={(e) => setIsDoctor(e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-primary focus:ring-offset-0 focus:ring-2 focus:ring-primary/50 transition-all checked:bg-primary checked:border-primary"
                                />
                            </div>
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer" onClick={() => setIsDoctor(!isDoctor)}>
                                I am a certified Doctor
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 text-white rounded-2xl font-bold text-lg shadow-clay-primary transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                            <>
                                <span>Create Account</span>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center mt-8 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary hover:text-primary-dark transition-colors font-bold">
                        Sign In
                    </Link>
                </p>

            </div>
        </div>
    );
};
