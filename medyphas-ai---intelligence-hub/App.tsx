import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { TriageEntry } from './pages/TriageEntry';
import { PatientQueue } from './pages/PatientQueue';
import { Signup } from './pages/Signup';
import { Login } from './pages/Login';

import { Config } from './pages/Config';
import { Diagnostics } from './pages/Diagnostics';
import { MyHealth } from './pages/MyHealth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SymptomsReview } from './pages/SymptomsReview';
import { QuickFix } from './pages/QuickFix';
import { GlobalEmergencyButton } from './components/GlobalEmergencyButton';

const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const location = useLocation();

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="sticky top-0 z-20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-8 py-5 flex items-center justify-between border-b border-white/20 dark:border-slate-700/30 shadow-sm md:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <img
          src="/Logo.png"
          alt="MedyphasAI Logo"
          className="h-8 w-auto object-contain"
        />
      </div>
      <button onClick={toggleTheme} className="p-2 rounded-xl text-slate-500 dark:text-slate-300">
        <span className="material-symbols-outlined dark:hidden">dark_mode</span>
        <span className="material-symbols-outlined hidden dark:inline">light_mode</span>
      </button>
    </header>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  // If on login page, render full screen without sidebar layout
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 font-display">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Desktop Header */}
        <header className="sticky top-0 z-20 bg-white/60 dark:bg-[#161f2e]/60 backdrop-blur-xl px-8 py-5 hidden md:flex items-center justify-between border-b border-white/20 dark:border-slate-700/30 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              {location.pathname === '/' ? 'Intelligence Hub' :
                location.pathname === '/queue' ? 'Live Triage' :
                  location.pathname === '/config' ? 'Configuration' :
                    location.pathname === '/diagnostics' ? 'Diagnostics' :
                      location.pathname === '/triage' ? 'Assessment' :
                        location.pathname === '/my-health' ? 'My Health' : 'System View'}
              <span className="text-slate-400 dark:text-slate-500 font-medium text-base bg-slate-200/50 dark:bg-slate-700/50 px-3 py-1 rounded-lg">
                {user?.role === 'ADMIN' || user?.role === 'DOCTOR' ? 'Medical Staff' : 'Patient View'}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-inner text-slate-600 dark:text-slate-300">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wide">System Online</span>
            </div>
            <button
              aria-label="Toggle Dark Mode"
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 text-slate-500 shadow-clay dark:shadow-clay-dark hover:scale-95 transition-transform active:scale-90"
              onClick={toggleTheme}
            >
              <span className="material-symbols-outlined dark:hidden">dark_mode</span>
              <span className="material-symbols-outlined hidden dark:inline">light_mode</span>
            </button>
            {user?.role === 'DOCTOR' && (
              <a
                href="#/triage"
                className="bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-clay-primary hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span> New Triage
              </a>
            )}
            <button
              onClick={logout}
              className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              title="Logout"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <Header onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth relative">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <GlobalEmergencyButton />
        <Layout>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/triage" element={<ProtectedRoute><TriageEntry /></ProtectedRoute>} />
            <Route path="/symptoms-review" element={<ProtectedRoute><SymptomsReview /></ProtectedRoute>} />
            <Route path="/queue" element={<ProtectedRoute><PatientQueue /></ProtectedRoute>} />
            <Route path="/my-health" element={<ProtectedRoute><MyHealth /></ProtectedRoute>} />
            <Route path="/quick-fix" element={<ProtectedRoute><QuickFix /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/config" element={<ProtectedRoute><Config /></ProtectedRoute>} />
            <Route path="/diagnostics" element={<ProtectedRoute><Diagnostics /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}