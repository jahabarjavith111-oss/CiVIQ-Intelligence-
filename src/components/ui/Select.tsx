import { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; }

export const Select = forwardRef<HTMLSelectElement, Props>(({ label, className, children, id: idProp, ...rest }, ref) => {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="mb-1 block text-sm font-medium text-text-secondary">{label}</label>}
      <select ref={ref} id={id} className={cn('h-10 w-full rounded-lg border border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:ring-2', className)} {...rest}>
        {children}
      </select>
    </div>
  );
});
Select.displayName = 'Select';
