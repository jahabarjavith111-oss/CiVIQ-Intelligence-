import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { boqItemSchema, type BoqItemFormInput } from '@/utils/validators';
import { boqApi } from '@/services/boq.api';
import type { CreateBOQItemData } from '@/types/boq';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { NoProjectSelected } from '@/components/common/RequireProject';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils/formatters';
import { downloadCsv } from '@/utils/export';
import { useUiStore } from '@/store/uiStore';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Download, Plus, Trash2 } from 'lucide-react';

export default function BoqPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId);
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.pushToast);
  const [wp, setWp] = useState('wp-2');
  const { register: reg, handleSubmit, reset, formState: { errors } } = useForm<BoqItemFormInput>({
    resolver: zodResolver(boqItemSchema),
    defaultValues: { code: '', description: '', unit: 'm3', quantity: 0, rate: 0 },
  });

  const wps = useQuery({ queryKey: ['boq-wp', projectId], queryFn: async () => (await boqApi.getWorkPackages(projectId!)).data, enabled: !!projectId });
  const items = useQuery({ queryKey: ['boq-items', wp], queryFn: async () => (await boqApi.getItems(wp)).data.data });
  const total = (items.data ?? []).reduce((a, i) => a + i.amount, 0);

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['boq-items', wp] }); qc.invalidateQueries({ queryKey: ['boq-wp', projectId] }); };

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { quantity?: number; rate?: number } }) => boqApi.updateItem(id, data).then((r) => r.data),
    onSuccess: () => { invalidate(); toast({ title: 'BOQ updated — amount recalculated', variant: 'success' }); },
    onError: () => toast({ title: 'Could not update BOQ item', variant: 'error' }),
  });

  const create = useMutation({
    mutationFn: (data: CreateBOQItemData) => boqApi.createItem(data.workPackageId, data).then((r) => r.data),
    onSuccess: () => { invalidate(); reset(); toast({ title: 'BOQ item added', variant: 'success' }); },
    onError: () => toast({ title: 'Could not add BOQ item', variant: 'error' }),
  });

  const num = (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
  const onAdd = (data: BoqItemFormInput) => {
    create.mutate({ workPackageId: wp, code: data.code, description: data.description, unit: data.unit, quantity: num(data.quantity), rate: num(data.rate) });
  };

  const remove = useMutation({
    mutationFn: (id: string) => boqApi.deleteItem(id),
    onSuccess: () => { invalidate(); toast({ title: 'Item deleted', variant: 'success' }); },
    onError: () => toast({ title: 'Could not delete item', variant: 'error' }),
  });

  if (!projectId) return <NoProjectSelected />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">BOQ — {formatCurrency(total)} in {wp}</h1>
        <Button variant="outline" onClick={() => downloadCsv(`boq-${wp}.csv`, (items.data ?? []).map((i) => [i.code, i.description, i.unit, i.quantity, i.rate, i.amount]), ['code', 'description', 'unit', 'qty', 'rate', 'amount'])}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardTitle>Work packages</CardTitle>
          <div className="mt-2 space-y-1">
            {(wps.data ?? []).map((w) => (
              <button key={w.id} onClick={() => setWp(w.id)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${wp === w.id ? 'bg-inverse text-on-inverse' : 'hover:bg-surface-3'}`}>
                {w.code} • {w.name}<span className="block text-xs opacity-70">{formatCurrency(w.totalAmount)}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <CardTitle>Add item → {wp}</CardTitle>
          <form onSubmit={handleSubmit(onAdd)} className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-6">
            <Input placeholder="Code" {...reg('code')} error={errors.code?.message} />
            <Input placeholder="Description" {...reg('description')} error={errors.description?.message} />
            <Input placeholder="Unit" {...reg('unit')} error={errors.unit?.message} />
            <Input placeholder="Qty" type="number" step="any" {...reg('quantity')} error={errors.quantity?.message} />
            <Input placeholder="Rate ₹" type="number" step="any" {...reg('rate')} error={errors.rate?.message} />
            <Button type="submit" loading={create.isPending}><Plus className="h-4 w-4" /> Add</Button>
          </form>
          {items.isLoading ? <PageLoader /> : items.isError ? (
            <div className="mt-3"><QueryErrorState title="Could not load BOQ items" error={items.error} onRetry={() => items.refetch()} /></div>
          ) : (items.data ?? []).length === 0 ? (
            <div className="mt-3"><EmptyState title="No items in this work package" sub="Add the first item above." /></div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-text-muted"><th className="py-2">Code</th><th>Description</th><th>Unit</th><th>Qty</th><th>Rate ₹</th><th>Amount</th><th /></tr></thead>
                <tbody className="divide-y">
                  {(items.data ?? []).map((i) => (
                    <tr key={i.id}>
                      <td className="py-2 font-mono">{i.code}</td>
                      <td>{i.description}</td>
                      <td>{i.unit}</td>
                      <td><input type="number" defaultValue={i.quantity} className="h-8 w-20 rounded border px-2"
                        onBlur={(e) => { const v = Number(e.target.value); if (v !== i.quantity) update.mutate({ id: i.id, data: { quantity: v } }); }} /></td>
                      <td><input type="number" defaultValue={i.rate} className="h-8 w-24 rounded border px-2"
                        onBlur={(e) => { const v = Number(e.target.value); if (v !== i.rate) update.mutate({ id: i.id, data: { rate: v } }); }} /></td>
                      <td className="font-semibold">{formatCurrency(i.amount)}</td>
                      <td><button aria-label="Delete item" className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/15" onClick={() => remove.mutate(i.id)}><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
