'use client';

import '@/style/tocbot.css';
import { ChevronDown, List } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import tocbot from 'tocbot';

export default function Toc() {
	const [open, setOpen] = useState(false);
	const id = useId();
	useEffect(() => {
		tocbot.init({
			tocSelector: '.js-toc',
			contentSelector: '.js-toc-content',
			headingSelector: 'h1, h2, h3, h4, h5, h6',
			linkClass: 'toc-link',
			activeListItemClass: 'is-active-li',
			listClass: 'toc-list',
			listItemClass: 'toc-list-item',
			collapseDepth: 6,
			scrollSmooth: true,
			scrollSmoothDuration: 320,
			scrollSmoothOffset: -180,
			headingsOffset: 180
		});
		return () => tocbot.destroy();
	}, []);
	return (
		<div className="article-toc mb-8 rounded-xl border border-zinc-200/80 px-4 py-3 dark:border-white/10 lg:mb-0 lg:rounded-none lg:border-0 lg:px-0 lg:py-1">
			<button
				type="button"
				aria-expanded={open}
				aria-controls={id}
				onClick={() => setOpen((value) => !value)}
				className="flex w-full items-center justify-between rounded-sm text-xs text-zinc-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400 dark:text-zinc-400 lg:hidden"
			>
				<span className="inline-flex items-center gap-2">
					<List className="size-3.5" aria-hidden="true" />
					本文目录
				</span>
				<ChevronDown
					className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
					aria-hidden="true"
				/>
			</button>
			<p className="mb-5 hidden text-[10px] tracking-[0.18em] text-zinc-400 lg:block">
				本文目录
			</p>
			<nav
				id={id}
				aria-label="章节导航"
				className={`${open ? 'block' : 'hidden'} js-toc max-h-[min(60vh,500px)] overflow-y-auto overscroll-contain pt-4 lg:block lg:max-h-[calc(100vh-230px)] lg:pt-0`}
				style={{ scrollbarWidth: 'thin' }}
			/>
		</div>
	);
}
