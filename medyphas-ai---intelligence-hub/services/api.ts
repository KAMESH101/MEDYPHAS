import { HealthFormData, User, UserRole } from '../types';
import { API_URL } from './config';
import { backendStatus } from './backendStatus';

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export interface HealthStatus {
    status: string;
    model_loaded: boolean;
    gemini_available: boolean;
    database: string;
}

export interface RankedHospital {
    id: string;
    name: string;
    area?: string;
    lat: number;
    lng: number;
    phone?: string;
    specialties: string[];
    beds_available: number;
    has_trauma_care: boolean;
    distance_km: number | null;
    score: number;
    matched_specialties: string[];
    maps_url: string;
    reasons: string[];
}

export interface RankResult {
    required_specialties: string[];
    location_used: boolean;
    notice: string;
    hospitals: RankedHospital[];
}

export interface Hospital {
    id: string;
    name: string;
    area?: string;
    lat: number;
    lng: number;
    specialties: string[];
    beds_available: number;
    has_trauma_care: boolean;
    phone?: string;
}

export type ReportLanguage = 'en' | 'ta' | 'hi';

export interface ReportAnalysis {
    patient_id: string;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    confidence: number;
    department: string;
    rule_triggered: string | null;
    top_factors: { feature: string; contribution: number; direction: string }[];
    lab_alerts: { test: string; value: number | null; unit: string | null; level: string; message: string }[];
    explanation: string;
    document_type: string;
    medicines: { name: string; dose?: string; timing?: string; duration?: string }[];
    lab_values: { name: string; value: number | null; unit?: string; reference_range?: string }[];
    language: ReportLanguage;
    report_explanation: {
        summary: string;
        medicines: { name: string; explanation: string }[];
        lab_values: { name: string; explanation: string }[];
    };
    explanation_source: 'gemini' | 'groq' | 'rules';
    cached: boolean;
    disclaimer: string;
    patient: any;
}

export interface SpecialistAdvice {
    urgent: boolean;
    red_flags: string[];
    message: string;
    suggestions: { specialty: string; matched_symptoms: string[]; reason: string }[];
    disclaimer: string;
}

const WAKING_AFTER_MS = 3000;
const RETRY_STATUSES = [502, 503, 504]; // Render returns these while a sleeping service boots
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const authHeader = (): Record<string, string> => {
    const token = localStorage.getItem('medyphas_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// FastAPI errors are either {detail: "msg"} or {detail: [{msg, loc}, ...]} for validation errors.
const errorMessage = async (response: Response, fallback: string): Promise<string> => {
    try {
        const body = await response.json();
        if (typeof body.detail === 'string') return body.detail;
        if (Array.isArray(body.detail)) {
            return body.detail.map((d: any) => `${(d.loc || []).slice(1).join('.')}: ${d.msg}`).join('; ');
        }
    } catch {
        // non-JSON body
    }
    return `${fallback} (HTTP ${response.status})`;
};

/**
 * fetch() wrapper that reports backend reachability to the status banner.
 * No silent mock data: if the server is down, callers get a real error.
 */
async function request<T>(path: string, init: RequestInit, fallbackError: string, raw = false): Promise<T> {
    const wakingTimer = setTimeout(() => backendStatus.set('waking'), WAKING_AFTER_MS);
    try {
        for (let attempt = 0; ; attempt++) {
            let response: Response;
            try {
                response = await fetch(`${API_URL}${path}`, init);
            } catch {
                backendStatus.set('offline');
                throw new Error('Cannot reach the Medyphas server. It may be offline or waking up - please try again in a moment.');
            }

            if (RETRY_STATUSES.includes(response.status) && attempt < MAX_RETRIES) {
                backendStatus.set('waking');
                await sleep(5000);
                continue;
            }

            backendStatus.set('ok');
            if (!response.ok) {
                throw new Error(await errorMessage(response, fallbackError));
            }
            return (raw ? response.blob() : response.json()) as Promise<T>;
        }
    } finally {
        clearTimeout(wakingTimer);
    }
}

/** Form data (camelCase) -> backend PatientInput (snake_case). */
export const toTriagePayload = (data: HealthFormData) => ({
    age: data.age,
    gender: data.gender === 'Male' ? 'M' : data.gender === 'Female' ? 'F' : 'Other',
    symptoms: data.symptoms,
    bp_systolic: data.vitals.bpSystolic,
    bp_diastolic: data.vitals.bpDiastolic,
    heart_rate: data.vitals.heartRate,
    temperature: data.vitals.temp,
    spo2: data.vitals.spo2,
    pre_existing: data.preExistingConditions,
});

const toUser = (u: any): User => ({
    id: u.id,
    name: u.username ?? u.name,
    role: u.role,
    isDoctor: u.is_doctor ?? u.isDoctor,
    avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(u.username ?? u.name)}`,
});

export const api = {
    async login(username: string, password: string): Promise<AuthResponse> {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        const data = await request<any>('/auth/login', { method: 'POST', body: formData }, 'Login failed');
        return { ...data, user: toUser(data.user) };
    },

    async signup(username: string, password: string, role: UserRole, isDoctor: boolean = false): Promise<User> {
        const data = await request<any>('/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role, is_doctor: isDoctor }),
        }, 'Signup failed');
        return toUser(data);
    },

    async triage(patientData: any): Promise<any> {
        return request('/api/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(patientData),
        }, 'Triage analysis failed');
    },

    async getSymptoms(): Promise<{ symptoms: string[], history: string[] }> {
        try {
            return await request('/api/symptoms', { method: 'GET', headers: authHeader() }, 'Failed to fetch symptoms');
        } catch (error) {
            // Only the pick-list falls back; no results are ever invented.
            console.warn('Using built-in symptom list:', error);
            return {
                symptoms: ['Fever', 'Cough', 'Headache', 'Fatigue', 'Nausea', 'Chest Pain', 'Shortness of Breath'],
                history: ['None', 'Diabetes', 'Hypertension', 'Asthma'],
            };
        }
    },

    async specialistHelper(data: { symptoms: string[], history: string }): Promise<SpecialistAdvice> {
        return request('/api/specialist-helper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }, 'Specialist helper failed');
    },

    /** Patient mode: upload a prescription / lab report (PDF, PNG, JPG) and get it explained. */
    async analyzeReport(file: File, language: ReportLanguage): Promise<ReportAnalysis> {
        const form = new FormData();
        form.append('file', file);
        form.append('language', language);
        return request('/api/triage/upload', { method: 'POST', headers: authHeader(), body: form }, 'Could not read the document');
    },

    async rankHospitals(params: { lat?: number | null, lng?: number | null, specialty?: string, symptoms?: string[], limit?: number }): Promise<RankResult> {
        const query = new URLSearchParams();
        if (params.lat != null && params.lng != null) {
            query.set('lat', String(params.lat));
            query.set('lng', String(params.lng));
        }
        if (params.specialty) query.set('specialty', params.specialty);
        if (params.symptoms?.length) query.set('symptoms', params.symptoms.join(','));
        if (params.limit) query.set('limit', String(params.limit));
        return request(`/api/hospitals/rank?${query}`, { method: 'GET' }, 'Could not load hospitals');
    },

    async listHospitals(): Promise<Hospital[]> {
        return request('/api/hospitals', { method: 'GET' }, 'Could not load hospitals');
    },

    async updateBeds(hospitalId: string, beds: number): Promise<Hospital> {
        return request(`/api/hospitals/${encodeURIComponent(hospitalId)}/beds`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify({ beds_available: beds }),
        }, 'Could not update beds');
    },

    /** Gemini TTS through the backend; throws if unavailable so callers can use speechSynthesis. */
    async speak(text: string, language: ReportLanguage): Promise<Blob> {
        return request('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, language }),
        }, 'Text-to-speech unavailable', true);
    },

    async health(): Promise<HealthStatus> {
        return request('/api/health', { method: 'GET' }, 'Health check failed');
    },

    async assistantChat(history: { role: 'user' | 'model', text: string }[], message: string): Promise<string> {
        const data = await request<{ reply: string }>('/api/assistant/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify({ history, message }),
        }, 'AI assistant unavailable');
        return data.reply;
    },
};
