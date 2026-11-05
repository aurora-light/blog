'use client';

import siteMetadata from '@/config/site';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavigationBar() {
	const pathname = usePathname();
	return (
		<nav
			aria-label="主导航"
			className="flex shrink-0 items-center gap-1 sm:gap-2"
		>
			{siteMetadata.navigationItems.map(({ href, text }) => {
				const active =
					pathname === href ||
					(href === '/posts' && pathname.startsWith('/posts/'));
				return (
					<Link
						key={href}
						href={href}
						aria-current={active ? 'page' : undefined}
						className={cn(
							'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-400 sm:px-3 sm:text-[13px]',
							href === '/about'
								? 'border border-violet-200/70 bg-violet-50/80 text-violet-600 hover:bg-violet-100 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300'
								: active
									? 'text-zinc-950 dark:text-white'
									: 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
						)}
					>
						{href === '/about' && (
							<Sparkles className="size-3" aria-hidden="true" />
						)}
						{text}
					</Link>
				);
			})}
		</nav>
	);
}
