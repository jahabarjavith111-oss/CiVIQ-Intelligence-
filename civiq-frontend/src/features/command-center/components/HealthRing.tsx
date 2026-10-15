import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';

const RING: Record<string, string> = {
  overall: 'text-text-primary', cost: 'text-amber-600', schedule: 'text-blue-600 dark:text-sky-400',
  quality: 'text-emerald-600', safety: 'text-teal-600', risk: 'text-red-500',
};

export function HealthRing({ label, value }: { label: string; value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <Card className="flex items-center gap-3">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="7"
          strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} strokeLinecap="round"
          className={RING[label.toLowerCase()] ?? 'text-text-primary'} transform="rotate(-90 32 32)" />
        <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="700">{value}</text>
      </svg>
      <div><p className="text-sm font-semibold capitalize">{label}</p><Progress value={value} className="mt-1 w-24" /></div>
    </Card>
  );
}
