import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useUiStore } from '@/store/uiStore';

export default function SettingsPage() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const toast = useUiStore((s) => s.pushToast);
  const [units, setUnits] = useState('metric');
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(true);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardTitle>Appearance</CardTitle>
        <div className="mt-3 w-56">
          <Select label="Theme" value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)}>
            <option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>
          </Select>
        </div>
      </Card>
      <Card>
        <CardTitle>Project defaults</CardTitle>
        <div className="mt-3 w-56">
          <Select label="Units" value={units} onChange={(e) => setUnits(e.target.value)}>
            <option value="metric">Metric (m, kg)</option><option value="imperial">Imperial (ft, lb)</option>
          </Select>
        </div>
      </Card>
      <Card>
        <CardTitle>Notifications</CardTitle>
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email digests</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} /> Push for critical clashes & risks</label>
        </div>
        <Button className="mt-4" onClick={() => toast({ title: 'Settings saved', description: `${units} • theme ${theme}`, variant: 'success' })}>Save settings</Button>
      </Card>
    </div>
  );
}
