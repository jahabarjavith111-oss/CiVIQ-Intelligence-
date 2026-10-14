import { cn } from '@/lib/utils';

const SRC = '/brand/civiq-logo.png';

/**
 * CivIQ brand logo.
 * - `full`: the complete lockup (mark + wordmark + tagline), for auth cards and landing.
 * - `mark`: the "C" emblem cropped from the lockup, for the sidebar and other tight spots.
 * The source artwork has a light background, so it always sits on a white
 * rounded tile — this keeps it crisp in both light and dark themes.
 */
export function Logo({ variant = 'full', className }: { variant?: 'full' | 'mark'; className?: string }) {
  if (variant === 'mark') {
    return (
      <span className={cn('block h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm', className)}>
        <img
          src={SRC}
          alt="CivIQ"
          className="h-full w-full origin-top scale-[2] object-cover"
          draggable={false}
        />
      </span>
    );
  }
  return (
    <span className={cn('block overflow-hidden rounded-2xl bg-white px-4 py-2 shadow-sm', className)}>
      <img src={SRC} alt="CivIQ — Intelligence for Every Stage of Construction" className="mx-auto h-24 w-auto" draggable={false} />
    </span>
  );
}
