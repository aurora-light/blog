import {
	articleCategories,
	getArticleCategoryHref,
	type ArticleCategoryFilter
} from '@/lib/article-categories';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function ArticleCategoryNav({
	active,
	counts,
	onSelect
}: {
	active: ArticleCategoryFilter;
	counts: Record<string, number>;
	onSelect?: (category: ArticleCategoryFilter) => void;
}) {
	return (
		<nav
			aria-label="文章分类"
			className="sticky top-16 z-30 -mx-4 overflow-x-auto border-b border-zinc-200/80 bg-[#fafaf8]/95 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12"
			style={{ scrollbarWidth: 'none' }}
		>
			<div className="flex min-w-max items-center justify-center gap-4 py-6 sm:gap-6 sm:py-7">
				{articleCategories.map((item, index) => {
					const selected = active === item.id;
					const className = cn(
						'relative whitespace-nowrap rounded-sm pb-1 font-serif text-[15px] tracking-wide transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400 sm:text-base',
						selected
							? 'text-rose-500 dark:text-rose-400'
							: 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
					);
					const content = (
						<>
							{item.label}
							<span className="ml-1.5 align-super font-sans text-[9px] tabular-nums opacity-50">
								{counts[item.id]}
							</span>
							{selected && (
								<span className="absolute inset-x-0 -bottom-6 h-px bg-rose-400 sm:-bottom-7" />
							)}
						</>
					);
					return (
						<div key={item.id} className="flex items-center gap-4 sm:gap-6">
							{index > 0 && (
								<span
									aria-hidden="true"
									className="font-serif text-xs text-zinc-300 dark:text-zinc-700"
								>
									/
								</span>
							)}
							{onSelect ? (
								<button
									type="button"
									aria-pressed={selected}
									onClick={() => onSelect(item.id)}
									className={className}
								>
									{content}
								</button>
							) : (
								<Link
									href={getArticleCategoryHref(item.id)}
									className={className}
									aria-current={selected ? 'true' : undefined}
								>
									{content}
								</Link>
							)}
						</div>
					);
				})}
			</div>
		</nav>
	);
}
