// Backend risk levels (LOW / MEDIUM / HIGH) shown as traffic lights everywhere in the UI.
// Risk always comes from the backend rules + ML; the frontend never decides it.
export type TrafficLight = 'GREEN' | 'YELLOW' | 'RED';

export interface TrafficInfo {
  light: TrafficLight;
  label: string;        // "Red"
  title: string;        // "Urgent"
  action: string;       // what to do
  text: string;         // text colour classes
  dot: string;          // solid background classes
  soft: string;         // light card classes
  gradient: string;     // gradient classes
  gauge: number;        // 0-100 for the gauge ring
}

const INFO: Record<TrafficLight, TrafficInfo> = {
  RED: {
    light: 'RED',
    label: 'Red',
    title: 'Urgent',
    action: 'Go to a hospital now or call 108.',
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
    soft: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50',
    gradient: 'from-red-500 to-rose-600',
    gauge: 90,
  },
  YELLOW: {
    light: 'YELLOW',
    label: 'Yellow',
    title: 'See a doctor soon',
    action: 'Book a doctor visit within a day or two. Seek care sooner if you get worse.',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-400',
    soft: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50',
    gradient: 'from-amber-400 to-orange-500',
    gauge: 55,
  },
  GREEN: {
    light: 'GREEN',
    label: 'Green',
    title: 'Not urgent',
    action: "No urgent warning signs found. Follow your doctor's advice.",
    text: 'text-green-600 dark:text-green-400',
    dot: 'bg-green-500',
    soft: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50',
    gradient: 'from-emerald-400 to-green-500',
    gauge: 20,
  },
};

export const toTrafficLight = (level?: string | null): TrafficLight => {
  switch ((level || '').toUpperCase()) {
    case 'HIGH':
    case 'CRITICAL':
    case 'RED':
      return 'RED';
    case 'MEDIUM':
    case 'YELLOW':
      return 'YELLOW';
    default:
      return 'GREEN';
  }
};

export const riskInfo = (level?: string | null): TrafficInfo => INFO[toTrafficLight(level)];
