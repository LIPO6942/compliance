import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'flex items-center justify-center rounded-full overflow-hidden bg-transparent',
        className || 'h-8 w-8'
      )}
    >
      <img
        src="/mae_logo.png"
        alt="Compliance Navigator Logo"
        className="h-full w-full object-contain scale-[1.12]"
      />
    </div>
  );
}
