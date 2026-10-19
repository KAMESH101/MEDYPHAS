export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Patient {
  id: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  symptoms: string[];
  vitals: {
    bpSystolic: number;
    bpDiastolic: number;
    heartRate: number;
    temp: number;
    spo2: number;
  };
  riskLevel: RiskLevel;
  department: string;
  arrivalTime: string;
  aiConfidence: number;
  diagnosis?: string;
  recommendedActions?: string[];
  preExistingConditions?: string[];
}

export interface HealthFormData {
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  vitals: {
    bpSystolic: number;
    bpDiastolic: number;
    heartRate: number;
    temp: number;
    spo2: number;
  };
  symptoms: string[];
  preExistingConditions: string[];
}

export interface ChartDataPoint {
  time: string;
  total: number;
  critical: number;
}

export type UserRole = 'DOCTOR' | 'PATIENT' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isDoctor?: boolean;
}

export interface Appointment {
  id: string;
  patientName: string;
  doctorName?: string;
  date: string;
  time: string;
  reason: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

