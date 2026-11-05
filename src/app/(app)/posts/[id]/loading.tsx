export default function BlogPostPageSkeleton() {
	return (
		<div
			className="mx-auto max-w-[1360px] px-4 pt-8 sm:px-8 lg:px-12"
			role="status"
			aria-label="正在加载文章"
		>
			<div className="mx-auto max-w-[1080px] animate-pulse motion-reduce:animate-none">
				<div className="mb-10 h-5 w-24 rounded bg-zinc-200/70 dark:bg-white/10" />
				<div className="h-10 w-4/5 rounded bg-zinc-200/70 dark:bg-white/10" />
				<div className="mt-4 h-10 w-1/2 rounded bg-zinc-200/70 dark:bg-white/10" />
				<div className="mb-12 mt-6 h-3 w-48 rounded bg-zinc-200/70 dark:bg-white/10" />
				<div className="max-w-[760px] space-y-4">
					{[100, 96, 85, 100, 90, 72].map((width, index) => (
						<div
							key={index}
							className="h-4 rounded bg-zinc-200/60 dark:bg-white/5"
							style={{ width: `${width}%` }}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
