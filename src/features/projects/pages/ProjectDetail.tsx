import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProject } from '@/hooks/useProject';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { Box, Bot, FileImage } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();
  const { detailQuery } = useProject(id);
  const [tab, setTab] = useState('overview');
  if (detailQuery.isLoading) return <PageLoader />;
  if (detailQuery.isError) return <QueryErrorState title="Could not load project" onRetry={() => detailQuery.refetch()} />;
  const p = detailQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-2xl font-bold">{p?.name}</h1><p className="text-sm text-text-muted">{p?.description}</p></div>
        <div className="flex gap-2">
          <Link to={`/projects/${id}/model-3d`}><Button variant="outline"><Box className="h-4 w-4" /> Open 3D</Button></Link>
          <Link to={`/projects/${id}/copilot`}><Button variant="secondary"><Bot className="h-4 w-4" /> Ask Copilot</Button></Link>
        </div>
      </div>
      <Tabs tabs={[{ key: 'overview', label: 'Overview' }, { key: 'drawings', label: 'Drawings' }, { key: 'team', label: 'Team' }, { key: 'settings', label: 'Settings' }]} active={tab} onChange={setTab} />
      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><p className="text-sm text-text-muted">Status</p><p className="text-lg font-bold">{p?.status}</p></Card>
          <Card><p className="text-sm text-text-muted">Schedule</p><p className="text-lg font-bold">{p?.startDate} → {p?.endDate}</p></Card>
          <Card><p className="text-sm text-text-muted">Budget</p><p className="text-lg font-bold">₹ {(p?.budget ?? 0).toLocaleString('en-IN')}</p></Card>
        </div>
      )}
      {tab === 'drawings' && (<Card><Link to="/drawings" className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-sky-400"><FileImage className="h-4 w-4" /> View all drawings →</Link></Card>)}
      {tab === 'team' && (<Card><Link to="/team" className="text-sm font-semibold text-blue-700 dark:text-sky-400">Manage members and roles under Team →</Link></Card>)}
      {tab === 'settings' && (<Card><p className="text-sm text-text-muted">Units: {p?.settings.units ?? 'metric'} • Timezone: {p?.settings.timezone ?? 'Asia/Kolkata'} • Language: {p?.settings.language ?? 'en'}</p></Card>)}
    </div>
  );
}
