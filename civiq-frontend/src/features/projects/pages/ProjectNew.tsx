import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { projectSchema } from '@/utils/validators';
import { useProject } from '@/hooks/useProject';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';

// z.coerce makes the schema input type differ from its output type;
// the form works with the input shape and normalizes on submit.
type ProjectFormInput = z.input<typeof projectSchema>;

export default function ProjectNew() {
  const navigate = useNavigate();
  const { create } = useProject();
  const toast = useUiStore((s) => s.pushToast);
  const [step, setStep] = useState(1);
  const { register, handleSubmit, formState: { errors } } = useForm<ProjectFormInput>({ resolver: zodResolver(projectSchema) });

  const onSubmit = (data: ProjectFormInput) => {
    create.mutate({ ...data, budget: typeof data.budget === 'number' ? data.budget : undefined }, {
      onSuccess: (p) => { toast({ title: 'Project created', description: p.name, variant: 'success' }); navigate(`/projects/${p.id}`); },
      onError: () => toast({ title: 'Create failed (mock)', variant: 'error' }),
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">New project <span className="text-sm font-normal text-text-muted">— step {step}/3</span></h1>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {step === 1 && (<>
            <Input label="Project name" placeholder="Greenview Residency — Tower C" {...register('name')} error={errors.name?.message} />
            <Input label="Description" placeholder="G+10 residential…" {...register('description')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start date" type="date" {...register('startDate')} error={errors.startDate?.message} />
              <Input label="End date" type="date" {...register('endDate')} />
            </div>
            <Input label="Budget (₹)" type="number" placeholder="45000000" {...register('budget')} />
          </>)}
          {step === 2 && (<div className="text-sm text-text-secondary"><p className="font-semibold">Team (mock)</p><p>Invite by email after creation. Default roles: manager, engineer, viewer.</p></div>)}
          {step === 3 && (<div className="text-sm text-text-secondary"><p className="font-semibold">3D setup (mock)</p><p>Upload a .glb after creation under Model Workspace. Sample model path: /models/sample.glb</p></div>)}
          <div className="flex justify-between">
            <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</Button>
            {step < 3 ? <Button type="button" onClick={() => setStep(step + 1)}>Next</Button>
              : <Button type="submit" loading={create.isPending}>Create project</Button>}
          </div>
        </form>
      </Card>
    </div>
  );
}
