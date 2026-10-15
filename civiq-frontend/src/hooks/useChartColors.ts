import { useEffect, useState } from 'react';

export interface ChartColors {
  ink: string;
  grid: string;
  teal: string;
  amber: string;
  red: string;
  slate: string;
  tooltipBg: string;
  tooltipBorder: string;
}

const LIGHT: ChartColors = {
  ink: '#0f172a', grid: '#e2e8f0', teal: '#0d9488', amber: '#d97706',
  red: '#dc2626', slate: '#64748b', tooltipBg: '#ffffff', tooltipBorder: '#e2e8f0',
};

const DARK: ChartColors = {
  ink: '#dbe4f0', grid: '#2b3b54', teal: '#2dd4bf', amber: '#fbbf24',
  red: '#f87171', slate: '#8fa1b8', tooltipBg: '#16233a', tooltipBorder: '#2b3b54',
};

/** Recharts colors that follow the app theme (light/dark class on <html>). */
export function useChartColors(): ChartColors {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark ? DARK : LIGHT;
}
