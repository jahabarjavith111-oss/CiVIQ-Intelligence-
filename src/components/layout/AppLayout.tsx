import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { CommandPalette } from '@/components/navigation/CommandPalette';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-surface-2">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-24 lg:p-6 lg:pb-10">
          <Breadcrumbs />
          <Outlet />
        </main>
        <MobileNav />
      </div>
      <CommandPalette />
    </div>
  );
}
