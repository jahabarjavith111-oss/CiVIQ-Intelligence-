import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/common/Logo';
import { Box, Bot, FileImage, IndianRupee } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <Logo variant="mark" />
          <p className="text-xl font-bold">Civ<span className="text-blue-600 dark:text-sky-400">IQ</span></p>
        </div>
        <div className="flex gap-2"><Link to="/login"><Button variant="outline">Sign in</Button></Link><Link to="/dashboard"><Button>Open app</Button></Link></div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700 dark:text-sky-400">CivIQ — Construction Intelligence</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold md:text-6xl">Intelligence for Every Stage of Construction.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-text-muted">Drawings → 3D → Quantities → BOQ → Cost → Schedule → Risks — unified with Copilot AI, evidence, and verification.</p>
        <div className="mt-8 flex justify-center gap-3"><Link to="/dashboard"><Button>Launch Command Center</Button></Link><Link to="/register"><Button variant="outline">Get started</Button></Link></div>
        <div className="mt-12 grid gap-4 text-left md:grid-cols-4">
          {[{ Icon: FileImage, t: 'Drawing Intelligence', s: 'OCR, walls, columns, doors, dims @ confidence' }, { Icon: Box, t: '3D Workspace', s: 'Floors, layers, clashes, inspector' }, { Icon: IndianRupee, t: 'Cost Intelligence', s: 'Budget, forecast, variance, S-curve' }, { Icon: Bot, t: 'Copilot', s: '12 tools, evidence, verification' }].map(({ Icon, t, s }) => (
            <div key={t} className="rounded-2xl border border-border p-5">
              <Icon className="h-5 w-5 text-blue-700 dark:text-sky-400" />
              <p className="mt-2 font-semibold">{t}</p><p className="text-sm text-text-muted">{s}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
