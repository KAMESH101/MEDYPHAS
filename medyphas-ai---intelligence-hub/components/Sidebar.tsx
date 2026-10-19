import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  // Close sidebar when route changes on mobile
  React.useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [location.pathname]);

  const NavItem = ({ to, icon, label, badge }: { to: string; icon: string; label: string; badge?: string }) => (
    <Link
      to={to}
      className={`flex items-center gap-4 px-5 py-4 rounded-clay transition-all transform hover:-translate-y-0.5 border ${isActive(to)
        ? 'bg-[#1e293b] text-white shadow-[inset_4px_4px_8px_rgba(0,0,0,0.2),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] border-slate-700'
        : 'text-slate-400 hover:text-white hover:bg-[#1e293b] border-transparent hover:shadow-[5px_5px_10px_rgba(0,0,0,0.3),-5px_-5px_10px_rgba(255,255,255,0.05)]'
        }`}
    >
      <span className={`material-symbols-outlined ${isActive(to) ? 'filled text-indigo-400' : ''}`}>{icon}</span>
      <span className="font-medium">{label}</span>
      {badge && (
        <span className="ml-auto bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md">
          {badge}
        </span>
      )}
    </Link>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />

      <aside
        className={`
          w-[280px] md:w-80 bg-slate-900 dark:bg-[#0f172a] flex-shrink-0 flex flex-col h-screen 
          fixed md:sticky top-0 z-40 text-slate-300 shadow-xl overflow-y-auto
          transition-transform duration-300 ease-spring
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/Logo.png"
              alt="MedyphasAI Logo"
              className="w-12 h-12 object-contain transform transition-transform hover:scale-105"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white leading-none">
                Medyphas<span className="text-indigo-400 font-light">AI</span>
              </h1>
              <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em] font-bold mt-1">Intelligence Hub</p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 px-6 space-y-3 mt-2">
          <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4 ml-1">Platform</p>
          <NavItem to="/" icon="dashboard" label="Dashboard" />

          {user?.role === 'DOCTOR' && (
            <>
              <NavItem to="/queue" icon="monitor_heart" label="Live Triage" badge="LIVE" />
              <NavItem to="/diagnostics" icon="psychology" label="AI Diagnostics" />
              <NavItem to="/queue" icon="monitor_heart" label="Live Triage" badge="LIVE" />
              <NavItem to="/diagnostics" icon="psychology" label="AI Diagnostics" />
              <NavItem to="/analytics" icon="analytics" label="Analytics" />
              <NavItem to="/quick-fix" icon="medication" label="Quick Fix AI" badge="NEW" />
            </>
          )}

          {user?.role === 'PATIENT' && (
            <>
              <NavItem to="/my-health" icon="vital_signs" label="My Health" />
              <NavItem to="/quick-fix" icon="medication" label="Quick Fix AI" badge="NEW" />
            </>
          )}

          <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-8 ml-1">System</p>
          <NavItem to="/config" icon="settings" label="Configuration" />
        </nav>

        <div className="p-6 mt-auto">
          <div className="p-4 rounded-clay bg-[#1e293b] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(255,255,255,0.05)] border border-slate-700/30">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-slate-600"
                  src={user?.avatar || "https://picsum.photos/100/100"}
                  alt="Profile"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-[3px] border-[#1e293b] rounded-full shadow-sm"></span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{user?.role?.toLowerCase() || 'Guest'}</p>
              </div>
              <button onClick={logout} className="text-slate-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-slate-700/50">
                <span className="material-symbols-outlined">logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};