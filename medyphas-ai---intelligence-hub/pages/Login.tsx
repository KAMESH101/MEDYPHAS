import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { api } from '../services/api';

export const Login: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<UserRole>('DOCTOR');
  const [loading, setLoading] = useState(false);

  // Controlled inputs for better UX
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');

  // Clear credentials when switching tabs (optional, or remove completely)
  useEffect(() => {
    setUsername('');
    setPassword('');
    setError('');
  }, [activeTab]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.login(username, password);
      // Backend returns User object inside response
      if (response.user) {
        // Ensure role matches intended tab, or just log them in
        if (response.user.role !== activeTab && response.user.role !== 'ADMIN') {
          // Optional: Enforce role check or just warn
          // setError(`Please login through the ${response.user.role} portal.`);
          // return;
        }
        login(response.user, response.access_token);
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed. Please check your credentials.');
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

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">

        {/* Left Side: Branding */}
        <div className="hidden lg:block space-y-8 animate-in slide-in-from-left-8 duration-700">
          <img
            src="/Logo.png"
            alt="MedyphasAI Logo"
            className="w-20 h-20 object-contain rounded-3xl"
          />
          <div>
            <h1 className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter leading-tight">
              Medyphas<span className="text-primary font-light">AI</span>
            </h1>
            <p className="text-2xl text-slate-500 dark:text-slate-400 mt-4 font-medium">
              Next-generation medical triage and diagnostic intelligence platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-12">
            <div className="p-6 rounded-3xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700">
              <span className="material-symbols-outlined text-3xl text-primary mb-3">speed</span>
              <h3 className="font-bold text-slate-800 dark:text-white">Real-time Analysis</h3>
              <p className="text-sm text-slate-500 mt-1">Instant risk stratification.</p>
            </div>
            <div className="p-6 rounded-3xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700">
              <span className="material-symbols-outlined text-3xl text-primary mb-3">security</span>
              <h3 className="font-bold text-slate-800 dark:text-white">Secure Access</h3>
              <p className="text-sm text-slate-500 mt-1">Role-based data protection.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="bg-surface-light dark:bg-surface-dark px-8 py-12 md:px-12 md:py-16 rounded-[40px] shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 animate-in slide-in-from-bottom-8 duration-700">

          <div className="text-center mb-10 lg:hidden">
            <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
              Medyphas<span className="text-primary">AI</span>
            </h1>
          </div>

          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-8 relative">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-600 rounded-xl shadow-sm transition-all duration-300 ease-spring ${activeTab === 'PATIENT' ? 'left-[calc(50%+2px)]' : 'left-1'}`}
            ></div>
            <button
              onClick={() => setActiveTab('DOCTOR')}
              className={`flex-1 relative z-10 py-3 text-sm font-bold transition-colors ${activeTab === 'DOCTOR' ? 'text-primary dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Medical Staff
            </button>
            <button
              onClick={() => setActiveTab('PATIENT')}
              className={`flex-1 relative z-10 py-3 text-sm font-bold transition-colors ${activeTab === 'PATIENT' ? 'text-primary dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Patient Portal
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-500 text-sm font-medium mb-6">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-6">

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                  person
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                  lock
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 text-white rounded-2xl font-bold text-lg shadow-clay-primary transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <>
                  <span>Access Portal</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>



          <p className="text-center mt-8 text-xs font-medium text-slate-400">
            Protected by Medyphas AI Security Protocol v2.5
          </p>

        </div>

        {/* Sign Up Link - Outside Card */}
        <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark font-black hover:underline decoration-2 underline-offset-4 transition-all hover:scale-105 active:scale-95 ml-1"
            >
              Sign Up Now <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </p>
        </div>

      </div>


    </div>
  );
};