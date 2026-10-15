export function Progress({ value, className = '' }: { value: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100} className={`h-2 w-full overflow-hidden rounded-full bg-surface-3 ${className}`}>
      <div className="h-full rounded-full bg-inverse transition-all" style={{ width: `${clamped}%` }} />
    </div>
  );
}
