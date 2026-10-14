import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginForm } from '@/utils/validators';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/common/Logo';

export default function Login() {
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: 'demo@civiq.ai', password: 'demo1234' } });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6"><Logo /></div>
        <h1 className="text-xl font-bold">Welcome back</h1>
        <p className="mb-4 text-sm text-text-muted">Mock login — any demo credentials work via MSW.</p>
        <form onSubmit={handleSubmit((d) => login.mutate(d))} className="space-y-3">
          <Input label="Email" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
          {login.isError && <p className="text-xs text-red-600 dark:text-red-400">Sign-in failed — check your email and password, then try again.</p>}
          <Button className="w-full" loading={login.isPending}>Sign in</Button>
          <Link to="/dashboard"><Button variant="outline" className="w-full" type="button">Skip to dashboard (dev)</Button></Link>
        </form>
        <p className="mt-4 text-center text-sm text-text-muted">No account? <Link to="/register" className="font-semibold text-text-primary">Register</Link></p>
      </div>
    </div>
  );
}
