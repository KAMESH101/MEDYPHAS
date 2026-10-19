import React, { useEffect, useState } from 'react';
import { api, HealthStatus } from '../services/api';
import { API_URL } from '../services/config';

const StatusRow: React.FC<{ label: string; ok: boolean | undefined; detail?: string }> = ({ label, ok, detail }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-200/60 dark:border-slate-700/50 last:border-0">
    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    <span className={`flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-lg ${ok === undefined
      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
      : ok
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      }`}>
      <span className={`w-2 h-2 rounded-full ${ok === undefined ? 'bg-slate-400' : ok ? 'bg-green-500' : 'bg-amber-500'}`}></span>
      {detail ?? (ok === undefined ? 'Checking…' : ok ? 'OK' : 'Unavailable')}
    </span>
  </div>
);

export const Config: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setHealth(await api.health());
    } catch (err: any) {
      setHealth(null);
      setError(err?.message || 'Backend unreachable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const pending = loading && !health;

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">System Status</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Live status of the Medyphas AI backend.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-clay shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
                <span className="material-symbols-outlined text-2xl">monitor_heart</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Backend</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono break-all">{API_URL}</p>
              </div>
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-primary text-white shadow-clay-primary hover:-translate-y-0.5 transition-all disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              Refresh
            </button>
          </div>

          {error ? (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl flex gap-3">
              <span className="material-symbols-outlined text-amber-500 shrink-0">cloud_off</span>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                <p className="font-bold text-amber-700 dark:text-amber-500">Server offline or waking up</p>
                <p>{error}. The free hosting tier sleeps when idle; the first request can take up to a minute.</p>
              </div>
            </div>
          ) : (
            <div>
              <StatusRow label="API" ok={pending ? undefined : health?.status === 'ok'} detail={pending ? undefined : health?.status} />
              <StatusRow label="Database" ok={pending ? undefined : health?.database === 'connected'} detail={pending ? undefined : health?.database} />
              <StatusRow label="ML risk model" ok={pending ? undefined : health?.model_loaded} detail={pending ? undefined : health?.model_loaded ? 'Loaded' : 'Rules only'} />
              <StatusRow label="AI explanations (Gemini)" ok={pending ? undefined : health?.gemini_available} detail={pending ? undefined : health?.gemini_available ? 'Available' : 'Fallback text'} />
            </div>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-clay border border-blue-100 dark:border-blue-900/30 flex gap-3">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 shrink-0">lock</span>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            AI API keys are configured only on the server (backend <code className="font-mono">.env</code>). The browser never sees or stores them.
          </p>
        </div>
      </div>
    </div>
  );
};
