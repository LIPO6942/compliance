import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'flex size-8 items-center justify-center overflow-hidden rounded-lg',
        className
      )}
    >
      <img
        src="/logo.png"
        alt="Compliance Navigator Logo"
        className="h-full w-full object-contain"
      />
    </div>
  );
}
