import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'default', size = 'md', loading, className, children, disabled, ...rest }, ref) => {
    const variants: Record<string, string> = {
      default: 'bg-inverse text-on-inverse hover:bg-inverse-hover',
      secondary: 'bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-slate-950',
      outline: 'border border-strong bg-surface text-text-primary hover:bg-surface-2',
      ghost: 'text-text-secondary hover:bg-surface-3 hover:text-text-primary',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
    };
    const sizes: Record<string, string> = {
      sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base', icon: 'h-10 w-10',
    };
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50', variants[variant], sizes[size], className)}
        {...rest}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
