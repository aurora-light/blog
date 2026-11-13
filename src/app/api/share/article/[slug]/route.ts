import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { allPosts } from 'contentlayer2/generated';
import { renderSVG } from 'uqr';
import siteMetadata from '@/config/site';
import { getProxiedImage } from '@/lib/image-proxy';
import {
	buildArticleShareCardSvg,
	prepareArticleShareCardData
} from '@/lib/share/article-share-card';

async function loadCover(source: string | undefined, origin: string) {
	if (!source) return;
	try {
		const response = await fetch(
			new URL(getProxiedImage(source, { width: 1000 }), origin),
			{
				signal: AbortSignal.timeout(4000)
			}
		);
		const mime = response.headers.get('content-type')?.split(';')[0]?.trim();
		if (
			!response.ok ||
			!mime ||
			!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mime)
		)
			return;
		return `data:${mime};base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
	} catch {
		return undefined;
	}
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ slug: string }> }
) {
	const { slug } = await params;
	const post = allPosts.find((item) => item.slug === slug);
	if (!post) return new Response('Article not found', { status: 404 });
	const requestUrl = new URL(request.url);
	const articleUrl = new URL(
		`/posts/${encodeURIComponent(slug)}`,
		siteMetadata.url
	).href;
	const qr = renderSVG(articleUrl, { border: 4, ecc: 'M' });
	const [coverSrc, logo] = await Promise.all([
		loadCover(post.cover, requestUrl.origin),
		readFile(join(process.cwd(), 'public/logo.webp'))
	]);
	const svg = buildArticleShareCardSvg(
		prepareArticleShareCardData({
			title: post.title,
			summary: post.description?.trim() || post.title,
			publishedAt: new Intl.DateTimeFormat('zh-CN', {
				timeZone: 'Asia/Shanghai'
			}).format(new Date(post.date)),
			articleUrl
		}),
		{
			coverSrc,
			logoSrc: `data:image/webp;base64,${logo.toString('base64')}`,
			qrSrc: `data:image/svg+xml;base64,${Buffer.from(qr).toString('base64')}`
		},
		requestUrl.searchParams.get('theme') === 'dark' ? 'dark' : 'light'
	);
	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
