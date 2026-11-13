'use client';

import { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';

async function loadPoster(source: string, signal: AbortSignal) {
	const response = await fetch(source, { signal });
	if (!response.ok) throw new Error('Poster unavailable');
	const svg = URL.createObjectURL(await response.blob());
	try {
		const image = new Image();
		image.src = svg;
		await image.decode();
		const canvas = document.createElement('canvas');
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas unavailable');
		ctx.drawImage(image, 0, 0);
		return await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error('PNG unavailable'))),
				'image/png'
			)
		);
	} finally {
		URL.revokeObjectURL(svg);
	}
}

const action =
	'inline-flex min-h-9 items-center justify-center rounded-md border px-3 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800';

function PosterActions({
	source,
	articleUrl,
	title,
	slug
}: {
	source: string;
	articleUrl: string;
	title: string;
	slug: string;
}) {
	const [poster, setPoster] = useState<{ blob: Blob; url: string }>();
	const [failed, setFailed] = useState(false);
	const [message, setMessage] = useState('');
	const [attempt, setAttempt] = useState(0);
	useEffect(() => {
		const controller = new AbortController();
		let url: string | undefined;
		loadPoster(source, controller.signal)
			.then((blob) => {
				if (controller.signal.aborted) return;
				url = URL.createObjectURL(blob);
				setPoster({ blob, url });
			})
			.catch(() => {
				if (!controller.signal.aborted) setFailed(true);
			});
		return () => {
			controller.abort();
			if (url) URL.revokeObjectURL(url);
		};
	}, [source, attempt]);

	async function copy(kind: 'article' | 'poster' | 'image') {
		try {
			if (kind === 'image' && poster) {
				await navigator.clipboard.write([
					new ClipboardItem({ 'image/png': poster.blob })
				]);
			} else {
				await navigator.clipboard.writeText(
					kind === 'article' ? articleUrl : new URL(source, articleUrl).href
				);
			}
			setMessage('已复制');
		} catch {
			setMessage(
				kind === 'image'
					? '无法复制图片，请下载 PNG。'
					: '无法访问剪贴板，请检查浏览器权限。'
			);
		}
	}
	return (
		<>
			<div className="grid min-h-32 place-items-center rounded-xl bg-zinc-100 p-2 dark:bg-zinc-900">
				{poster ? (
					// A temporary PNG generated in this browser.
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={poster.url}
						alt={title + '分享海报'}
						className="max-h-[58dvh] max-w-full object-contain"
					/>
				) : failed ? (
					<button
						className={action}
						onClick={() => {
							setFailed(false);
							setAttempt((n) => n + 1);
						}}
					>
						生成失败，重试
					</button>
				) : (
					<span role="status">正在生成海报…</span>
				)}
			</div>
			<div className="grid grid-cols-2 gap-2">
				<button className={action} onClick={() => copy('article')}>
					复制文章链接
				</button>
				<button className={action} onClick={() => copy('poster')}>
					复制海报链接
				</button>
				<button
					className={action}
					disabled={!poster}
					onClick={() => copy('image')}
				>
					复制图片
				</button>
				{poster ? (
					<a
						className={action}
						download={slug + '-poster.png'}
						href={poster.url}
					>
						下载 PNG
					</a>
				) : (
					<button className={action} disabled>
						下载 PNG
					</button>
				)}
			</div>
			<span role="status" className="text-sm">
				{message}
			</span>
		</>
	);
}

export function ArticleShare({
	articleUrl,
	slug,
	title
}: {
	articleUrl: string;
	slug: string;
	title: string;
}) {
	const { resolvedTheme } = useTheme();
	const source = `/api/share/article/${encodeURIComponent(slug)}?theme=${resolvedTheme === 'dark' ? 'dark' : 'light'}`;
	return (
		<Dialog>
			<DialogTrigger asChild>
				<button
					type="button"
					className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 hover:text-rose-500"
				>
					<Share2 className="size-3" />
					分享
				</button>
			</DialogTrigger>
			<DialogContent className="max-h-[94dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl">
				<DialogTitle>分享文章</DialogTitle>
				<DialogDescription className="sr-only">{title}</DialogDescription>
				<PosterActions
					key={source}
					source={source}
					articleUrl={articleUrl}
					slug={slug}
					title={title}
				/>
			</DialogContent>
		</Dialog>
	);
}
