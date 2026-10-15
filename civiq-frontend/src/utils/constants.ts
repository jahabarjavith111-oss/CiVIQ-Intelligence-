export const INDIAN_STATES = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Gujarat', 'Delhi', 'Uttar Pradesh', 'West Bengal'];

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham' },
];

export const UNITS = ['m', 'm2', 'm3', 'kg', 't', 'nos', 'bags', 'L', 'hr', 'day', 'lot', 'm/day'];

export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  planning: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  'on-hold': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  completed: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};

export const DEMO_PROJECT_ID = 'proj-greenview-01';
export const DEMO_MODEL_URL = '/models/sample.glb';
