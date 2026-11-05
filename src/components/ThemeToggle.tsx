'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';

export default function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	useEffect(() => {
		if (!resolvedTheme) return;
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href =
			resolvedTheme === 'dark'
				? '/style/prism-coldark-dark.css'
				: '/style/prism-gruvbox-light.css';
		document.head.appendChild(link);
		return () => link.remove();
	}, [resolvedTheme]);
	const toggle = () => {
		const update = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
		if (
			typeof document.startViewTransition === 'function' &&
			!window.matchMedia('(prefers-reduced-motion: reduce)').matches
		) {
			document.startViewTransition(update);
		} else update();
	};
	return (
		<button
			type="button"
			onClick={toggle}
			aria-label="切换明暗主题"
			title="切换明暗主题"
			className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-400 dark:hover:bg-white/10 dark:hover:text-white"
		>
			<Sun className="size-4 dark:hidden" aria-hidden="true" />
			<Moon className="hidden size-4 dark:block" aria-hidden="true" />
		</button>
	);
}
