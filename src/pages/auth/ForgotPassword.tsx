import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/services/auth.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useUiStore((s) => s.pushToast);

  const submit = async () => {
    setLoading(true);
    try { await authApi.forgotPassword({ email }); setSent(true); }
    catch { setSent(true); toast({ title: 'If the email exists, a reset link was sent', variant: 'success' }); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-surface p-8">
        <h1 className="text-xl font-bold">Reset password</h1>
        {sent ? <p className="mt-2 text-sm text-text-muted">Check your inbox for the reset link. <Link to="/login" className="font-semibold text-text-primary">Back to login</Link></p> : (
          <div className="mt-4 space-y-3">
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            <Button className="w-full" loading={loading} onClick={submit}>Send reset link</Button>
          </div>
        )}
      </div>
    </div>
  );
}
