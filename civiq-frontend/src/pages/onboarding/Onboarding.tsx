import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';

const STEPS = ['Workspace', 'First project', 'Invite team'];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState('');
  const [project, setProject] = useState('');
  const [invite, setInvite] = useState('');
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-lg space-y-4">
        <Progress value={((step + 1) / STEPS.length) * 100} />
        <Card>
          <p className="text-xs font-semibold uppercase text-text-muted">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
          {step === 0 && (<div className="mt-3"><Input label="Company / organisation" placeholder="Acme Constructions" value={company} onChange={(e) => setCompany(e.target.value)} /><p className="mt-2 text-xs text-text-muted">Units default to metric, timezone Asia/Kolkata.</p></div>)}
          {step === 1 && (<div className="mt-3"><Input label="First project name" placeholder="Greenview Residency — Tower C" value={project} onChange={(e) => setProject(e.target.value)} /></div>)}
          {step === 2 && (<div className="mt-3"><Input label="Invite teammates (comma-separated emails)" placeholder="pm@acme.com, site@acme.com" value={invite} onChange={(e) => setInvite(e.target.value)} /></div>)}
          <div className="mt-4 flex justify-between">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
            {step < 2 ? <Button onClick={() => setStep(step + 1)}>Continue</Button>
              : <Button onClick={() => navigate('/dashboard')}>Finish → Dashboard</Button>}
          </div>
        </Card>
        <button className="mx-auto block text-xs text-text-muted" onClick={() => navigate('/dashboard')}>Skip for now</button>
      </div>
    </div>
  );
}
