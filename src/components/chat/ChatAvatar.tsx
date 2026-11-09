import Image from 'next/image';
import { cn } from '@/lib/utils';

export function ChatAvatar({ className }: { className: string }) {
	return (
		<span className={cn('relative block shrink-0', className)}>
			<Image
				src="/logo.webp"
				alt=""
				fill
				unoptimized
				className="rounded-[inherit] object-cover"
			/>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-5 items-center justify-center rounded-full border border-white bg-violet-700 px-1 font-sans text-[9px] font-bold leading-none text-white shadow-sm dark:border-zinc-900 dark:bg-violet-600"
			>
				AI
			</span>
		</span>
	);
}
