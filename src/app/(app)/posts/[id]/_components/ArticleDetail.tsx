import { ArticleCategoryNav } from '@/components/ArticleCategoryNav';
import MDXComponents from '@/components/MDXComponents';
import {
	articleCategories,
	getArticleCategory,
	getAdjacentArticles
} from '@/lib/article-categories';
import { allPosts, type Post } from 'contentlayer2/generated';
import { getMDXComponent } from 'next-contentlayer2/hooks';
import Toc from '../../Toc';
import { ArticleHeader } from './ArticleHeader';
import { ArticleNavigation } from './ArticleNavigation';

export function ArticleDetail({ post }: { post: Post }) {
	const publishedPosts = allPosts.filter((post) => post.slug !== 'about');
	const category = getArticleCategory(post);
	const counts = Object.fromEntries(
		articleCategories.map((item) => [
			item.id,
			item.id === 'all'
				? publishedPosts.length
				: publishedPosts.filter((post) => getArticleCategory(post) === item.id)
						.length
		])
	);
	const { previous, next } = getAdjacentArticles(publishedPosts, post.slug);
	const MDXContent = getMDXComponent(post.body.code);
	return (
		<div className="mx-auto max-w-[1360px] px-4 pb-12 sm:px-8 lg:px-12">
			<ArticleCategoryNav active={category} counts={counts} />
			<article
				data-postid={post._id}
				className="mx-auto grid min-w-0 max-w-[1080px] gap-x-12 pb-8 pt-8 lg:grid-cols-[minmax(0,760px)_200px] lg:pt-12 xl:gap-x-20"
			>
				<ArticleHeader post={post} category={category} />
				<aside
					aria-label="文章目录"
					className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-3"
				>
					<div className="lg:sticky lg:top-44">
						<Toc key={post.slug} />
					</div>
				</aside>
				<div className="rich-text-viewer article-body js-toc-content min-w-0 lg:col-start-1">
					<MDXContent components={MDXComponents} />
				</div>
				<ArticleNavigation previous={previous} next={next} />
			</article>
		</div>
	);
}
