import { ArticleLibrary } from '@/components/home/ArticleLibrary';
import { getArticleCategory } from '@/lib/article-categories';
import { allPosts } from 'contentlayer2/generated';

export default function Home() {
	const articles = allPosts
		.filter((post) => post.slug !== 'about')
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.map((post) => ({
			slug: post.slug,
			title: post.title,
			description: post.description ?? '',
			date: post.date,
			cover: post.cover,
			tags: (post.tags ?? []).map((tag) => String(tag).trim()),
			category: getArticleCategory(post)
		}));
	return <ArticleLibrary articles={articles} />;
}
