import React from 'react';

export const GlobalEmergencyButton: React.FC = () => {
    const handleEmergencyCall = () => {
        // In a real mobile app, this would trigger the dialer
        window.location.href = 'tel:911';
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 group">
            {/* Pulsing Effect */}
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25 group-hover:opacity-40 transition-opacity duration-1000"></div>

            <button
                onClick={handleEmergencyCall}
                title="Emergency Ambulance Call"
                className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-full shadow-lg shadow-red-500/40 hover:scale-110 active:scale-95 transition-all duration-300 border-4 border-white/20 dark:border-slate-800/20 backdrop-blur-sm"
            >
                <span className="material-symbols-outlined text-3xl animate-pulse">ambulance</span>
            </button>

            {/* Hover Tooltip */}
            <div className="absolute bottom-full right-0 mb-3 w-40 p-2 bg-slate-900/90 text-white text-xs font-bold text-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none backdrop-blur-sm shadow-xl transform translate-y-2 group-hover:translate-y-0">
                Call Ambulance
                <div className="absolute top-full right-6 -mt-1 border-4 border-transparent border-t-slate-900/90"></div>
            </div>
        </div>
    );
};
