import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Box, Bot, MoreHorizontal } from 'lucide-react';

const tabs = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/model-3d', icon: Box, label: '3D' },
  { to: '/copilot', icon: Bot, label: 'Copilot' },
  { to: '/analytics', icon: MoreHorizontal, label: 'More' },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-surface lg:hidden">
      {tabs.map((t) => (
        <NavLink key={t.label} to={t.to} className={({ isActive }) => `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${isActive ? 'text-text-primary' : 'text-text-muted'}`}>
          <t.icon className="h-5 w-5" />{t.label}
        </NavLink>
      ))}
    </nav>
  );
}
