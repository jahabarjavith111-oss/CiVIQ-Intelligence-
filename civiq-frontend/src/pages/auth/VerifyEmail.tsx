import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '@/services/auth.api';
import { Button } from '@/components/ui/Button';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'done' | 'error'>('verifying');
  const token = params.get('token') ?? 'mock-token';

  useEffect(() => {
    authApi.verifyEmail({ token }).then(() => setStatus('done')).catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-surface p-8 text-center">
        <h1 className="text-xl font-bold">Email verification</h1>
        <p className="mt-2 text-sm text-text-muted">
          {status === 'verifying' && 'Verifying your email…'}
          {status === 'done' && 'Email verified. Welcome to CivIQ.'}
          {status === 'error' && 'Verification link expired. Request a new one from login.'}
        </p>
        <Link to="/dashboard"><Button className="mt-4">Continue to dashboard</Button></Link>
      </div>
    </div>
  );
}
