import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const Config: React.FC = () => {
  const { apiKey, setApiKey } = useAuth();
  const [localKey, setLocalKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalKey(apiKey);
  }, [apiKey]);

  const handleSave = () => {
    setApiKey(localKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">System Configuration</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Manage API connections and system preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* API Key Section */}
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-clay shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700">
           <div className="flex items-start gap-4 mb-6">
             <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
               <span className="material-symbols-outlined text-2xl">key</span>
             </div>
             <div>
               <h3 className="text-xl font-bold text-slate-800 dark:text-white">Gemini API Configuration</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Connect your own Google Cloud project for extended limits.</p>
             </div>
           </div>

           <div className="space-y-4">
             <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl flex gap-3">
               <span className="material-symbols-outlined text-amber-500 shrink-0">warning</span>
               <div className="text-xs text-slate-600 dark:text-slate-300">
                 <p className="font-bold mb-1 text-amber-700 dark:text-amber-500">Bring Your Own Key (BYOK)</p>
                 <p>For high-volume usage or to use the advanced Diagnostic features, please provide a valid Google Gemini API Key. This key is stored locally in your browser.</p>
               </div>
             </div>

             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 mt-6">API Key</label>
             <div className="relative">
               <input 
                 type={showKey ? "text" : "password"}
                 value={localKey}
                 onChange={(e) => setLocalKey(e.target.value)}
                 placeholder="AIzaSy..."
                 className="w-full pl-5 pr-12 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
               />
               <button 
                 onClick={() => setShowKey(!showKey)}
                 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
               >
                 <span className="material-symbols-outlined">{showKey ? 'visibility_off' : 'visibility'}</span>
               </button>
             </div>
             
             <div className="flex justify-end pt-4">
               <button 
                 onClick={handleSave}
                 className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
                   saved 
                   ? 'bg-green-500 text-white shadow-lg scale-105' 
                   : 'bg-primary text-white shadow-clay-primary hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
                 }`}
               >
                 {saved ? (
                   <>
                     <span className="material-symbols-outlined">check</span>
                     Saved
                   </>
                 ) : (
                   <>
                     <span className="material-symbols-outlined">save</span>
                     Save Configuration
                   </>
                 )}
               </button>
             </div>
           </div>
        </div>

        {/* Other settings placeholders */}
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-clay shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 opacity-60 pointer-events-none grayscale">
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-slate-800 dark:text-white">Hospital System Integration (EHR)</h3>
             <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">COMING SOON</span>
           </div>
           <p className="text-sm text-slate-500">Direct integration with Epic/Cerner systems is currently under development.</p>
        </div>
      </div>
    </div>
  );
};
