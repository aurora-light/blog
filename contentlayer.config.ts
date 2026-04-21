import { defineDocumentType, makeSource } from 'contentlayer/source-files';
import readingTime from 'reading-time';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrismPlus from 'rehype-prism-plus';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

export const JsonPost = defineDocumentType(() => ({
	name: 'JsonPost',
	filePathPattern: `**/*.json`,
	contentType: 'data', // ⚠️ 关键点：不是 mdx，而是 data
	fields: {
		title: { type: 'string', required: true },
		slug: { type: 'string', required: true },
		date: { type: 'date', required: true }
	},
	computedFields: {
		url: {
			type: 'string',
			resolve: (doc) => `/jsonData/${doc.slug}`
		},
		readingTime: {
			type: 'nested',
			resolve: (doc) => readingTime(doc.date)
		}
	}
}));

export const Post = defineDocumentType(() => ({
	name: 'Post',
	filePathPattern: `**/*.mdx`,
	contentType: 'mdx',
	fields: {
		title: { type: 'string', required: true },
		description: { type: 'string', required: false },
		tags: { type: 'list', of: { type: 'string' }, required: true },
		slug: { type: 'string', required: true },
		author: { type: 'string', required: true },
		cover: { type: 'string', required: false },
		date: { type: 'date', required: true }
	},
	computedFields: {
		url: {
			type: 'string',
			resolve: (post) => `/posts/${post.slug}`
		},
		readingTime: {
			type: 'nested',
			resolve: (doc) => readingTime(doc.body.code)
		}
	}
}));

export default makeSource({
	// contentDirPath: 'posts',
	contentDirPath: '.',
	contentDirInclude: ['posts', 'data/blog', 'jsonData'],
	documentTypes: [Post, JsonPost],
	mdx: {
		remarkPlugins: [remarkGfm],
		rehypePlugins: [
			// 为代码添加特殊样式
			// @ts-ignore
			[rehypePrismPlus, { defaultLanguage: 'js', ignoreMissing: true }],
			// 为每个 header 添加 id
			rehypeSlug,
			//为 header 添加链接
			[
				rehypeAutolinkHeadings,
				{
					behavior: 'wrap',
					properties: {
						className: ['anchor']
					}
				}
			]
		]
	}
});
