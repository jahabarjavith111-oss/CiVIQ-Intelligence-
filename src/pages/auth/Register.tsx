import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterForm } from '@/utils/validators';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/common/Logo';

export default function Register() {
  const { register: reg } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6"><Logo /></div>
        <h1 className="text-xl font-bold">Create account</h1>
        <p className="mb-4 text-sm text-text-muted">Mock registration via MSW.</p>
        <form onSubmit={handleSubmit((d) => reg.mutate(d, { onSuccess: () => navigate('/dashboard') }))} className="space-y-3">
          <Input label="Name" {...register('name')} error={errors.name?.message} />
          <Input label="Email" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
          <Input label="Company (optional)" {...register('company')} />
          {reg.isError && <p className="text-xs text-red-600 dark:text-red-400">Registration failed — please try again.</p>}
          <Button className="w-full" loading={reg.isPending}>Create account</Button>
        </form>
        <p className="mt-4 text-center text-sm text-text-muted"><Link to="/login" className="font-semibold text-text-primary">Back to login</Link></p>
      </div>
    </div>
  );
}
