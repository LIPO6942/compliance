import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Logo(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'flex size-8 items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground',
        props.className
      )}
    >
      C
    </div>
  );
}
