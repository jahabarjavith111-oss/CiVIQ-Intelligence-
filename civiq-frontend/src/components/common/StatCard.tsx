import { Card, CardSub, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { LucideIcon } from 'lucide-react';

export function StatCard({ title, value, sub, icon: Icon, progress }: { title: string; value: string; sub?: string; icon: LucideIcon; progress?: number }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Icon className="h-4 w-4 text-text-muted" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {sub && <CardSub>{sub}</CardSub>}
      {progress !== undefined && <Progress value={progress} className="mt-3" />}
    </Card>
  );
}
