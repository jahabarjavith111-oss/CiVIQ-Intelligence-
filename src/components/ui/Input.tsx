import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(({ error, label, className, id: idProp, ...rest }, ref) => {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errId = error ? `${id}-error` : undefined;
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="mb-1 block text-sm font-medium text-text-secondary">{label}</label>}
      <input
        ref={ref}
        id={id}
        aria-invalid={!!error}
        aria-describedby={errId}
        className={cn('h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:ring-2 focus:ring-inverse/20', error ? 'border-red-400' : 'border-strong', className)}
        {...rest}
      />
      {error && <p id={errId} className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';
