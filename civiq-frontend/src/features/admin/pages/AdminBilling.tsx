import { useAdminBilling } from '../useAdmin';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';

export default function AdminBilling() {
  const q = useAdminBilling();

  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <QueryErrorState title="Could not load subscriptions" error={q.error} onRetry={() => q.refetch()} />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Subscriptions</h1>
      <Card>
        <CardTitle>Plans & usage limits</CardTitle>
        <div className="mt-3">
          <Badge tone="medium">{q.data.enabled ? 'enabled' : 'disabled'}</Badge>
          <p className="mt-2 text-sm text-text-muted">{q.data.message}</p>
          <p className="mt-2 text-xs text-text-muted">
            When billing is introduced, plans, seats, storage quotas and AI quotas will be managed here.
          </p>
        </div>
      </Card>
    </div>
  );
}
