import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { RiskLevel, Appointment } from '../types';
import { appointmentService } from '../services/appointmentService';
import { useAuth } from '../context/AuthContext';

const data = [
  { time: '8am', total: 45, critical: 5 },
  { time: '10am', total: 80, critical: 12 },
  { time: '12pm', total: 110, critical: 15 },
  { time: '2pm', total: 95, critical: 8 },
  { time: '4pm', total: 70, critical: 10 },
  { time: 'Now', total: 82, critical: 12 },
];

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // WebSocket integration
  useEffect(() => {
    // Load appointments
    const allAppointments = appointmentService.getAll();
    setAppointments(allAppointments);

    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onopen = () => console.log('Connected to WebSocket');
    ws.onmessage = (event) => console.log('Update received:', event.data);
    return () => ws.close();
  }, []);

  const refreshAppointments = () => {
    setAppointments(appointmentService.getAll());
  };

  if (!user) return null;

  if (user.role === 'PATIENT') {
    return <PatientDashboard user={user} appointments={appointments.filter(a => a.patientName === user.name)} onRefresh={refreshAppointments} />;
  }

  return <DoctorDashboard user={user} appointments={appointments} />;
};

// --- Patient Dashboard Component ---
const PatientDashboard: React.FC<{ user: any, appointments: Appointment[], onRefresh: () => void }> = ({ user, appointments, onRefresh }) => {
  const [booking, setBooking] = useState({ date: '', time: '', reason: '', doctor: '' });
  const [successMsg, setSuccessMsg] = useState('');

  const doctors = [
    'Dr. Gregory House',
    'Dr. Meredith Grey',
    'Dr. Shaun Murphy',
    'Dr. Stephen Strange',
    'Dr. Doogie Howser'
  ];

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    appointmentService.add({
      patientName: user.name,
      doctorName: booking.doctor || 'Dr. Assigned',
      date: booking.date,
      time: booking.time,
      reason: booking.reason
    });
    setSuccessMsg('Appointment booked successfully!');
    setBooking({ date: '', time: '', reason: '', doctor: '' });
    onRefresh();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-8 max-w-5xl mx-auto">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-clay p-8 text-white shadow-clay-primary relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user.name}</h2>
          <p className="text-indigo-100 opacity-90">Your health is our priority. Manage your appointments and check your latest updates here.</p>
        </div>
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mb-16 pointer-events-none"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Book Appointment */}
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-clay shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-primary">
              <span className="material-symbols-outlined text-2xl">calendar_add_on</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Book Appointment</h3>
              <p className="text-sm text-slate-500 font-medium">Schedule a visit with your doctor.</p>
            </div>
          </div>

          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-xl text-green-600 dark:text-green-400 font-bold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleBookAppointment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Date</label>
                <input
                  type="date"
                  required
                  value={booking.date}
                  onChange={e => setBooking({ ...booking, date: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Time</label>
                <input
                  type="time"
                  required
                  value={booking.time}
                  onChange={e => setBooking({ ...booking, time: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Doctor</label>
              <select
                required
                value={booking.doctor}
                onChange={e => setBooking({ ...booking, doctor: e.target.value })}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Select a Doctor</option>
                {doctors.map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Reason for Visit</label>
              <textarea
                required
                value={booking.reason}
                onChange={e => setBooking({ ...booking, reason: e.target.value })}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-primary outline-none h-24 resize-none"
                placeholder="Briefly describe your symptoms..."
              ></textarea>
            </div>
            <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-clay-primary hover:shadow-lg hover:-translate-y-0.5 transition-all">
              Confirm Booking
            </button>
          </form>
        </div>

        {/* My Appointments */}
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-clay shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-500">
                <span className="material-symbols-outlined text-2xl">event_available</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">My Appointments</h3>
                <p className="text-sm text-slate-500 font-medium">Your schedule.</p>
              </div>
            </div>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              {appointments.length} Upcoming
            </span>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {appointments.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_busy</span>
                <p>No upcoming appointments.</p>
              </div>
            ) : (
              appointments.map((apt) => (
                <div key={apt.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-primary flex items-center justify-center font-bold text-lg">
                      {apt.date.split('-')[2]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">{apt.reason}</h4>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{apt.date} • {apt.time}</p>
                      {apt.doctorName && <p className="text-xs text-primary font-bold mt-1">{apt.doctorName}</p>}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${apt.status === 'CONFIRMED' ? 'bg-green-50 text-green-600 border-green-200' :
                    apt.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-red-50 text-red-600 border-red-200'
                    }`}>
                    {apt.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Doctor Dashboard Component ---
const DoctorDashboard: React.FC<{ user: any, appointments: Appointment[] }> = ({ user, appointments }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Row Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Readiness Gauge Card */}
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark p-8 rounded-clay shadow-clay dark:shadow-clay-dark flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group border border-white/50 dark:border-slate-700">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>

          <div className="relative w-56 h-56 flex-shrink-0 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full shadow-clay-dial dark:shadow-clay-dial-dark"></div>
            <div className="absolute inset-4 rounded-full bg-slate-100 dark:bg-slate-700 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.5)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.05)]"></div>

            {/* Custom SVG Gauge */}
            <svg className="w-full h-full transform -rotate-90 relative z-10 filter drop-shadow-lg" viewBox="0 0 100 100">
              <circle className="text-slate-200 dark:text-slate-600" cx="50" cy="50" fill="none" r="38" stroke="currentColor" strokeLinecap="round" strokeWidth="8"></circle>
              <circle className="gauge-arc transition-all duration-1000 ease-out" cx="50" cy="50" fill="none" r="38" stroke="url(#gradient-readiness)" strokeDasharray="239" strokeDashoffset="52" strokeLinecap="round" strokeWidth="8"></circle>
              <defs>
                <linearGradient id="gradient-readiness" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6"></stop>
                  <stop offset="100%" stopColor="#8b5cf6"></stop>
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
              <span className="text-5xl font-extrabold text-slate-800 dark:text-white tracking-tighter drop-shadow-sm">78<span className="text-2xl align-top text-primary opacity-80">%</span></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Readiness</span>
            </div>
          </div>

          <div className="flex-1 w-full z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Global Readiness Score</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-md">Composite metric based on staff availability, bed capacity, and current patient load. System is operating efficiently.</p>
              </div>
              <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-4 py-2 rounded-xl text-xs font-bold border border-green-200 dark:border-green-800 shadow-sm uppercase tracking-wide">Optimal</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {[{ label: 'Staffing', val: 92, color: 'blue' }, { label: 'Equipment', val: 84, color: 'purple' }, { label: 'Beds', val: 65, color: 'amber' }].map((item) => (
                <div key={item.label} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl shadow-inner border border-white/50 dark:border-slate-700">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    <span>{item.label}</span>
                    <span className="text-slate-900 dark:text-white">{item.val}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
                    <div className={`h-full bg-gradient-to-r from-${item.color}-400 to-${item.color}-600 rounded-full shadow-md`} style={{ width: `${item.val}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Total Patients Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-8 rounded-clay shadow-clay-primary text-white flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/10 to-transparent pointer-events-none"></div>
          <div className="absolute right-0 top-0 w-40 h-40 bg-white/20 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-700"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner border border-white/10">
                <span className="material-symbols-outlined text-white">groups</span>
              </div>
              <span className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-lg text-white backdrop-blur-md shadow-lg border border-white/10 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">trending_up</span> +12%
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-5xl font-extrabold tracking-tight drop-shadow-md">145</h3>
              <p className="text-sm text-indigo-100 font-medium opacity-90 mt-2 tracking-wide uppercase">Total Patients Today</p>
            </div>
          </div>

          {/* Mini chart decoration */}
          <div className="mt-6 h-16 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <Area type="monotone" dataKey="total" stroke="white" strokeWidth={3} fill="rgba(255,255,255,0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-clay-sm shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 transition-all hover:-translate-y-1 hover:shadow-xl">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">AI Confidence</p>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-primary">
              <span className="material-symbols-outlined text-xl">psychology</span>
            </div>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">94.2%</h3>
            <span className="text-xs text-green-600 dark:text-green-400 font-bold mb-1.5 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md">▲ 2.4%</span>
          </div>
          <div className="h-10 w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl shadow-inner">
            <div className="w-full h-full bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 bg-safe-green w-[94%]"></div>
            </div>
          </div>
        </div>

        {/* Metric 2 - Critical */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-clay-sm shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-critical-red"></div>
          <div className="flex justify-between items-start mb-3 pl-2">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Critical Cases</p>
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-critical-red">
              <span className="material-symbols-outlined text-xl animate-pulse">warning</span>
            </div>
          </div>
          <div className="flex items-end gap-3 mb-4 pl-2">
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">12</h3>
            <span className="text-xs text-critical-red font-bold mb-1.5 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-md">Attention</span>
          </div>
          <div className="h-10 w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl shadow-inner ml-1">
            {/* Simple sparkline simulation */}
            <div className="flex items-end h-full gap-1 justify-between px-1">
              {[40, 60, 30, 80, 50, 90, 70, 100, 60, 80].map((h, i) => (
                <div key={i} className="w-1.5 bg-red-400/50 rounded-sm" style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-clay-sm shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 transition-all hover:-translate-y-1 hover:shadow-xl">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg Wait Time</p>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-500">
              <span className="material-symbols-outlined text-xl">schedule</span>
            </div>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">14m</h3>
            <span className="text-xs text-amber-500 font-bold mb-1.5 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">▼ 2m</span>
          </div>
          <div className="h-10 w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl shadow-inner">
            <div className="w-full h-full flex items-center px-2">
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full relative">
                <div className="absolute h-4 w-4 bg-amber-500 rounded-full -top-1 left-[30%] shadow-md border-2 border-white dark:border-slate-800"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-clay-sm shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 transition-all hover:-translate-y-1 hover:shadow-xl">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Doctors Active</p>
            <div className="p-2 bg-sky-50 dark:bg-sky-900/20 rounded-xl text-medical-blue">
              <span className="material-symbols-outlined text-xl">stethoscope</span>
            </div>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">8</h3>
            <span className="text-xs text-slate-400 font-bold mb-1.5">/ 10 Total</span>
          </div>
          <div className="h-10 w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl shadow-inner">
            <div className="flex gap-1.5 h-full items-end justify-between px-1">
              {[60, 80, 100, 100, 90, 70, 80].map((h, i) => (
                <div key={i} className={`w-2.5 rounded-md h-[${h}%] shadow-sm ${h === 100 ? 'bg-medical-blue shadow-sky-400/30' : 'bg-slate-200 dark:bg-slate-600'}`} style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-clay shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Risk Stratification</h3>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-500"><span className="material-symbols-outlined font-bold">more_horiz</span></button>
          </div>
          <div className="relative flex-1 flex items-center justify-center min-h-[280px]">
            <div className="absolute w-48 h-48 rounded-full shadow-clay-pressed dark:shadow-clay-dark-pressed opacity-50"></div>
            {/* Simplified Radial representation */}
            <div className="relative w-64 h-64">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#10b981" strokeWidth="6" strokeDasharray="264" strokeDashoffset="105" strokeLinecap="round" className="opacity-90"></circle>
                <circle cx="50" cy="50" r="32" fill="none" stroke="#f59e0b" strokeWidth="6" strokeDasharray="201" strokeDashoffset="140" strokeLinecap="round" className="opacity-90"></circle>
                <circle cx="50" cy="50" r="22" fill="none" stroke="#ef4444" strokeWidth="6" strokeDasharray="138" strokeDashoffset="124" strokeLinecap="round" className="opacity-90"></circle>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800 shadow-clay dark:shadow-clay-dark flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-slate-400">donut_large</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4 mt-6">
            {[
              { label: 'Low Risk', val: '60%', color: 'safe-green', bg: 'bg-safe-green' },
              { label: 'Medium Risk', val: '30%', color: 'warning-amber', bg: 'bg-warning-amber' },
              { label: 'High Risk', val: '10%', color: 'critical-red', bg: 'bg-critical-red' }
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl shadow-sm border border-white/50 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <span className={`w-4 h-4 rounded-full ${item.bg} shadow-md ring-2 ring-white dark:ring-slate-700`}></span>
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">{item.label}</span>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white">{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-clay shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Intake Trends</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Hourly volume vs Critical cases</p>
            </div>
            <div className="flex gap-4 text-sm bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-700 rounded-lg shadow-sm text-slate-700 dark:text-slate-300 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span> Total
              </div>
              <div className="flex items-center gap-2 px-3 py-1 text-slate-500 dark:text-slate-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-critical-red"></span> Critical
              </div>
            </div>
          </div>

          <div className="flex-1 w-full relative min-h-[320px] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 shadow-inner border border-slate-100 dark:border-slate-800/50">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                  itemStyle={{ color: '#1e293b', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="critical" stroke="#f43f5e" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorCritical)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Appointment Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Doctor/All: Upcoming Appointments */}
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-clay shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 col-span-1 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-500">
                <span className="material-symbols-outlined text-2xl">event_available</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Upcoming Appointments</h3>
                <p className="text-sm text-slate-500 font-medium">Next scheduled visits.</p>
              </div>
            </div>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              {appointments.length} Total
            </span>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {appointments.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p>No upcoming appointments.</p>
              </div>
            ) : (
              appointments.map((apt) => (
                <div key={apt.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-primary flex items-center justify-center font-bold text-lg">
                      {apt.date.split('-')[2]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">{apt.patientName}</h4>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{apt.time} • {apt.reason}</p>
                      {apt.doctorName && <p className="text-xs text-slate-400 font-semibold mt-0.5">with {apt.doctorName}</p>}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${apt.status === 'CONFIRMED' ? 'bg-green-50 text-green-600 border-green-200' :
                    apt.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-red-50 text-red-600 border-red-200'
                    }`}>
                    {apt.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
