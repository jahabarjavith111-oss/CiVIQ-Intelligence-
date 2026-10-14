import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Bot } from 'lucide-react';
import type { DashboardInsight } from '../types';

export function InsightCarousel({ insights }: { insights: DashboardInsight[] }) {
  return (
    <Card>
      <p className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-blue-700 dark:text-sky-400" /> AI insights</p>
      <div className="mt-2 space-y-2">
        {insights.map((i) => (
          <div key={i.id} className="rounded-xl bg-surface-2 p-3 text-sm">
            <Badge tone={i.severity === 'critical' ? 'critical' : i.severity === 'warning' ? 'medium' : 'low'}>{i.severity}</Badge>
            <p className="mt-1 text-text-secondary">{i.text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
