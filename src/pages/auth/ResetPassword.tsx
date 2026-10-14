import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '@/services/auth.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.pushToast);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const token = params.get('token') ?? 'mock-token';

  const submit = async () => {
    if (password.length < 8) { toast({ title: 'Minimum 8 characters', variant: 'error' }); return; }
    if (password !== confirm) { toast({ title: 'Passwords do not match', variant: 'error' }); return; }
    setLoading(true);
    try { await authApi.resetPassword({ token, password }); toast({ title: 'Password updated', variant: 'success' }); navigate('/login'); }
    catch { toast({ title: 'Reset failed', variant: 'error' }); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-surface p-8">
        <h1 className="text-xl font-bold">Set new password</h1>
        <div className="mt-4 space-y-3">
          <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button className="w-full" loading={loading} onClick={submit}>Update password</Button>
          <p className="text-center text-sm text-text-muted"><Link to="/login" className="font-semibold text-text-primary">Back to login</Link></p>
        </div>
      </div>
    </div>
  );
}
