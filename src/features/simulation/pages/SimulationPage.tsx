import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { simulationApi } from '@/services/simulation.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEMO_PROJECT_ID } from '@/utils/constants';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';
import { Input } from '@/components/ui/Input';

export default function SimulationPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId) ?? DEMO_PROJECT_ID;
  const toast = useUiStore((s) => s.pushToast);
  const [name, setName] = useState('Steel surge + monsoon delay');
  const [steel, setSteel] = useState(10);
  const [labour, setLabour] = useState(-5);
  const [days, setDays] = useState(-20);
  const [concrete, setConcrete] = useState(5);

  const run = useMutation({
    mutationFn: async () => {
      const created = (await simulationApi.create(projectId, { name, description: 'what-if', inputs: { steelPercent: steel, labourPercent: labour, durationDays: days, concretePercent: concrete } })).data;
      return (await simulationApi.run(created.id)).data;
    },
    onSuccess: () => toast({ title: 'Scenario complete', variant: 'success' }),
    onError: () => toast({ title: 'Scenario failed', variant: 'error' }),
  });
  const ran = !!run.data?.results;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Simulation — what-if scenarios</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Inputs</CardTitle>
          <div className="mt-3"><Input label="Scenario name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          {([['Steel %', steel, setSteel], ['Labour %', labour, setLabour], ['Duration (days)', days, setDays], ['Concrete %', concrete, setConcrete]] as const).map(([l, v, set]) => (
            <label key={l} className="mt-3 block text-sm">{l}: <b>{v}</b>
              <input type="range" min={-30} max={30} value={v} onChange={(e) => set(+e.target.value)} className="w-full" /></label>
          ))}
          <Button className="mt-4" loading={run.isPending} onClick={() => run.mutate()}>Run scenario</Button>
        </Card>
        <Card>
          <CardTitle>Results {ran ? `(${run.data!.id})` : '(press Run)'}</CardTitle>
          {ran ? (
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-text-muted">Cost impact</p><p className="font-bold">+₹{(run.data!.results!.costImpact.value / 100000).toFixed(1)}L (+{run.data!.results!.costImpact.percent}%)</p></div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-text-muted">Schedule</p><p className="font-bold">{run.data!.results!.scheduleImpact.days}d → finish {run.data!.results!.scheduleImpact.newFinish}</p></div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-text-muted">Risk</p><p className="font-bold">+{run.data!.results!.riskImpact.scoreDelta} pts</p></div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-text-muted">Material</p><p className="font-bold">+{run.data!.results!.materialImpact.items[0].delta}t steel</p></div>
            </div>
          ) : <p className="mt-2 text-sm text-text-muted">Adjust sliders, then run — persisted via /simulations API.</p>}
        </Card>
      </div>
    </div>
  );
}
