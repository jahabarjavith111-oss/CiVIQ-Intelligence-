import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { takeoffItemSchema, type TakeoffItemFormInput } from '@/utils/validators';
import { takeoffApi } from '@/services/takeoff.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEMO_PROJECT_ID } from '@/utils/constants';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TRADE_CATEGORIES } from '@/app/config';
import type { TradeCategory } from '@/types/takeoff';
import { downloadCsv } from '@/utils/export';
import { useUiStore } from '@/store/uiStore';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Download, Plus, Trash2 } from 'lucide-react';

export default function TakeoffPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId) ?? DEMO_PROJECT_ID;
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.pushToast);
  const [trade, setTrade] = useState<TradeCategory | 'all'>('all');
  const { register: reg, handleSubmit, reset, formState: { errors } } = useForm<TakeoffItemFormInput>({
    resolver: zodResolver(takeoffItemSchema),
    defaultValues: { code: '', description: '', unit: 'm3', quantity: 0 },
  });

  const q = useQuery({ queryKey: ['takeoff', projectId], queryFn: async () => (await takeoffApi.list(projectId)).data.data });
  const items = (q.data ?? []).filter((i) => trade === 'all' || i.trade === trade);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['takeoff', projectId] });

  const updateQty = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => takeoffApi.update(id, { quantity }).then((r) => r.data),
    onSuccess: () => { invalidate(); toast({ title: 'Quantity updated', variant: 'success' }); },
    onError: () => toast({ title: 'Could not update quantity', variant: 'error' }),
  });

  const create = useMutation({
    mutationFn: (data: { code: string; description: string; unit: string; quantity: number }) => takeoffApi.create(projectId, {
      trade: trade === 'all' ? 'concrete' : trade, category: 'General',
      code: data.code, description: data.description, unit: data.unit,
      quantity: data.quantity, status: 'draft', drawingReferences: [], modelReferences: [],
    }).then((r) => r.data),
    onSuccess: () => { invalidate(); reset(); toast({ title: 'Takeoff item added', variant: 'success' }); },
    onError: () => toast({ title: 'Could not add takeoff item', variant: 'error' }),
  });

  const onAdd = (data: TakeoffItemFormInput) => {
    const qty = typeof data.quantity === 'number' && !Number.isNaN(data.quantity) ? data.quantity : 0;
    create.mutate({ code: data.code, description: data.description, unit: data.unit, quantity: qty });
  };

  const remove = useMutation({
    mutationFn: (id: string) => takeoffApi.delete(id),
    onSuccess: () => { invalidate(); toast({ title: 'Item deleted', variant: 'success' }); },
    onError: () => toast({ title: 'Could not delete item', variant: 'error' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Quantify — Takeoff</h1>
        <Button variant="outline" onClick={() => downloadCsv(`takeoff-${trade}.csv`, items.map((i) => [i.code, i.description, i.unit, i.quantity, i.status]), ['code', 'description', 'unit', 'quantity', 'status'])}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {['all', ...TRADE_CATEGORIES].map((t) => (
          <button key={t} onClick={() => setTrade(t as TradeCategory | 'all')} className={`rounded-full px-3 py-1 text-xs font-medium ${trade === t ? 'bg-inverse text-on-inverse' : 'bg-surface-3 text-text-secondary'}`}>{t}</button>
        ))}
      </div>
      <Card>
        <CardTitle>Add item → {trade === 'all' ? 'concrete' : trade}</CardTitle>
        <form onSubmit={handleSubmit(onAdd)} className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
          <Input placeholder="Code (C-02)" {...reg('code')} error={errors.code?.message} />
          <Input placeholder="Description" {...reg('description')} error={errors.description?.message} />
          <Input placeholder="Unit" {...reg('unit')} error={errors.unit?.message} />
          <Input placeholder="Qty" type="number" step="any" {...reg('quantity')} error={errors.quantity?.message} />
          <Button type="submit" loading={create.isPending}><Plus className="h-4 w-4" /> Add</Button>
        </form>
      </Card>
      <Card>
        <CardTitle>{items.length} items • edit quantity inline</CardTitle>
        {q.isLoading ? <PageLoader /> : q.isError ? (
          <div className="mt-3"><QueryErrorState title="Could not load takeoff items" onRetry={() => q.refetch()} /></div>
        ) : items.length === 0 ? <div className="mt-3"><EmptyState title="No items in this trade" sub="Add the first one above." /></div> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-text-muted"><th className="py-2">Code</th><th>Description</th><th>Unit</th><th>Qty (editable)</th><th>Status</th><th /></tr></thead>
              <tbody className="divide-y">
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 font-mono">{r.code}</td>
                    <td>{r.description}</td>
                    <td>{r.unit}</td>
                    <td><input type="number" defaultValue={r.quantity} className="h-8 w-24 rounded border px-2"
                      onBlur={(e) => { const v = Number(e.target.value); if (v !== r.quantity) updateQty.mutate({ id: r.id, quantity: v }); }} /></td>
                    <td><Badge tone={r.status === 'approved' ? 'low' : 'medium'}>{r.status}</Badge></td>
                    <td><button aria-label="Delete item" className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/15" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
