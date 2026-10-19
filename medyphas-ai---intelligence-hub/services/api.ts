import { User, UserRole } from '../types';
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
async function request<T>(path: string, init: RequestInit, fallbackError: string): Promise<T> {
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
            return response.json();
        }
    } finally {
        clearTimeout(wakingTimer);
    }
}

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

    async quickFix(data: { symptoms: string[], history: string }): Promise<any> {
        return request('/api/quick-fix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(data),
        }, 'Quick fix analysis failed');
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
