import siteMetadata from '@/config/site';
import { allPosts } from 'contentlayer2/generated';
import { notFound } from 'next/navigation';
import { ArticleDetail } from './_components/ArticleDetail';

interface PageProps {
	params: Promise<{ id: string }>;
}

function getPost(id: string) {
	const post = allPosts.find((post) => post.slug === id);
	if (!post) notFound();
	return post;
}

export async function generateStaticParams() {
	return allPosts.map((post) => ({ id: post.slug }));
}
export async function generateMetadata({ params }: PageProps) {
	const { id } = await params;
	const post = getPost(id);
	const title = post.title;
	const description = post.description ?? `${title} - ${siteMetadata.authors}`;
	return {
		title,
		description,
		openGraph: { title, description },
		twitter: { title, description },
		keywords: post.tags?.map(String).join(',')
	};
}

export default async function Page({ params }: PageProps) {
	const { id } = await params;
	return <ArticleDetail post={getPost(id)} />;
}
