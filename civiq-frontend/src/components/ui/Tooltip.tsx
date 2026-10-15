import { ReactNode, useId } from 'react';

export function Tooltip({ children, tip }: { children: ReactNode; tip: string }) {
  const id = useId();
  return (
    <span className="group relative inline-flex" tabIndex={0} aria-describedby={id}>
      {children}
      <span id={id} role="tooltip" className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-inverse px-2 py-1 text-[11px] text-on-inverse opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">
        {tip}
      </span>
    </span>
  );
}
