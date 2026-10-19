import { Appointment } from '../types';

const STORAGE_KEY = 'medyphas_appointments';

// Mock data for initial state
const MOCK_APPOINTMENTS: Appointment[] = [
    {
        id: '1',
        patientName: 'Sarah Jenkins',
        doctorName: 'Dr. Gregory House',
        date: '2024-02-15',
        time: '09:00',
        reason: 'Regular Checkup',
        status: 'CONFIRMED'
    },
    {
        id: '2',
        patientName: 'Mike Ross',
        doctorName: 'Dr. Meredith Grey',
        date: '2024-02-15',
        time: '14:30',
        reason: 'Cardiology Review',
        status: 'PENDING'
    }
];

export const appointmentService = {
    getAll: (): Appointment[] => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            // Initialize with mock data if empty
            localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_APPOINTMENTS));
            return MOCK_APPOINTMENTS;
        }
        return JSON.parse(stored);
    },

    add: (appointment: Omit<Appointment, 'id' | 'status'>) => {
        const appointments = appointmentService.getAll();
        const newAppointment: Appointment = {
            ...appointment,
            id: Math.random().toString(36).substr(2, 9),
            status: 'PENDING'
        };
        const updated = [newAppointment, ...appointments];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return newAppointment;
    },

    delete: (id: string) => {
        const appointments = appointmentService.getAll();
        const updated = appointments.filter(a => a.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
};
