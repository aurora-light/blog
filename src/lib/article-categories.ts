export const articleCategories = [
	{ id: 'all', label: '最新' },
	{ id: 'ai', label: 'AI 与 Agent' },
	{ id: 'backend', label: 'Java 与后端' },
	{ id: 'web', label: 'Web 开发' },
	{ id: 'engineering', label: '工程实践' },
	{ id: 'life', label: '生活随笔' },
	{ id: 'reading', label: '阅读与思考' }
] as const;
export type ArticleCategory = Exclude<
	(typeof articleCategories)[number]['id'],
	'all'
>;
export type ArticleCategoryFilter = (typeof articleCategories)[number]['id'];

const rules: ReadonlyArray<{ category: ArticleCategory; pattern: RegExp }> = [
	{
		category: 'ai',
		pattern: /\bai\b|agent|\brag\b|copilot|cursor|trae|提示词|检索增强/i
	},
	{
		category: 'backend',
		pattern: /\bjava\b|spring|redis|mybatis|后端|node\.?js|短信|令牌|定时任务/i
	},
	{
		category: 'engineering',
		pattern:
			/docker|工程化|vite|webpack|rollup|mono-repo|multi-repo|项目管理|代码仓库/i
	},
	{ category: 'life', pattern: /年中|年度|碎碎念|规划|杂谈|生活/i },
	{
		category: 'web',
		pattern:
			/react|vue|next\.?js|前端|css|javascript|typescript|低代码|图片压缩|微信小程序|iconfont|resizeobserver|动画|antd|bug/i
	}
];

export function getArticleCategory(post: {
	title: string;
	tags?: readonly unknown[];
}): ArticleCategory {
	const tags = (post.tags ?? []).map((tag) => String(tag).trim()).join(' ');
	return (
		rules.find((rule) => rule.pattern.test(tags))?.category ??
		rules.find((rule) => rule.pattern.test(post.title))?.category ??
		'reading'
	);
}

export interface HomeArticle {
	slug: string;
	title: string;
	description: string;
	date: string;
	tags: string[];
	cover?: string;
	category: ArticleCategory;
}

export type SearchArticle = Pick<
	HomeArticle,
	'slug' | 'title' | 'cover' | 'category'
> & { url: string };

export function filterHomeArticles(
	articles: readonly HomeArticle[],
	category: ArticleCategoryFilter,
	query: string
) {
	const normalized = query.normalize('NFKC').trim().toLowerCase();
	return articles.filter(
		(article) =>
			(category === 'all' || article.category === category) &&
			(!normalized ||
				[article.title, article.description, ...article.tags]
					.join(' ')
					.normalize('NFKC')
					.toLowerCase()
					.includes(normalized))
	);
}

export function getArticleCategoryHref(
	category: ArticleCategoryFilter
): string {
	return category === 'all' ? '/' : `/#category=${category}`;
}

export function getArticleCategoryFromHash(
	hash: string
): ArticleCategoryFilter {
	const value = hash.startsWith('#category=')
		? hash.slice('#category='.length)
		: 'all';
	return (
		articleCategories.find((category) => category.id === value)?.id ?? 'all'
	);
}

export function getAdjacentArticles<T extends { slug: string; date: string }>(
	articles: readonly T[],
	slug: string
) {
	const sorted = articles
		.filter((article) => article.slug !== 'about')
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	const index = sorted.findIndex((article) => article.slug === slug);
	return index < 0
		? { previous: undefined, next: undefined }
		: { previous: sorted[index - 1], next: sorted[index + 1] };
}
