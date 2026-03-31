import type { SiteConfig } from '@/types/siteConfig';

const url = new URL(
	process.env.NODE_ENV === 'production'
		? process.env.NEXT_PUBLIC_SITE_URL || 'https://dino.cn/'
		: 'http://localhost:3000'
);
export const baseSiteConfig: SiteConfig = {
	name: 'blog | 前端 | 开发者',
	description:
		'我是睡不醒的啊轩，一名在探索转型的开发工程师。我希望自己能和优秀的人一起共事，探索人工智能（AI），希望借此做一些自己东西。希望自己能有一个开源的项目，不虚此行。好困，希望能多睡会儿。',
	url: url.href, //'https://dino.cn/',
	// 网站预览图
	ogImage: url.origin + '/og.png',
	// https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase
	metadataBase: '/',
	keywords: [
		'睡不醒的啊轩',
		'blog',
		'前端',
		'开发者',
		'AI',
		'编程',
		'学习笔记',
		'程序员'
	],
	authors: 'dino',
	email: 'moskleslie@gmail.com',
	authorsCN: '睡不醒的啊轩',
	authorsUrl: 'https://github.com/aurora-light',
	social: [
		{
			href: 'https://github.com/aurora-light',
			text: 'github',
			icon: 'GitHubIcon'
		},
		{
			href: 'wx',
			text: '微信',
			isPicture: true,
			icon: 'WxIcon'
		},
		// {
		// 	href: 'wxPublic',
		// 	text: '微信公众号',
		// 	isPicture: true,
		// 	icon: 'WxMediaIcon'
		// },
		{
			href: 'moskleslie@gmail.com',
			text: '邮箱',
			icon: 'MailIcon'
		},
		// {
		// 	href: 'qq',
		// 	text: 'QQ',
		// 	isPicture: true,
		// 	hide: true,
		// 	icon: 'QqIcon'
		// },
		{
			href: 'https://juejin.cn/user/1451011081253272',
			text: '掘金',
			icon: 'JueJinIcon'
		}
		// {
		// 	href: 'https://x.com/haozhan05554957',
		// 	text: '推特（X）',
		// 	icon: 'XIcon'
		// },
		// {
		// 	href: 'https://www.zhihu.com/people/axing-zh',
		// 	text: '知乎',
		// 	icon: 'ZhihuIcon'
		// },
		// {
		// 	href: 'https://space.bilibili.com/1695997565',
		// 	text: '哔哩哔哩',
		// 	icon: 'BilibiliIcon'
		// },
		// {
		// 	href: 'https://www.youtube.com/@lucky2snail',
		// 	text: 'YouTube',
		// 	hide: true,
		// 	icon: 'YouTubeIcon'
		// },
		// {
		// 	href: 'douyin',
		// 	text: '抖音',
		// 	isPicture: true,
		// 	hide: true,
		// 	icon: 'TiktokIcon'
		// },
		// {
		// 	href: 'https://www.xiaohongshu.com/user/profile/5e2d938d000000000100ac82',
		// 	text: '小红书',
		// 	hide: true,
		// 	icon: 'RedBookIcon'
		// }
	],
	themeColors: [
		{ media: '(prefers-color-scheme: dark)', color: '#000212' },
		{ media: '(prefers-color-scheme: light)', color: '#fafafa' }
	],
	defaultNextTheme: 'system', // next-theme option: system | dark | light
	icons: {
		icon: '/favicon.ico',
		shortcut: '/logo.png',
		apple: '/logo.png'
	},
	navigationItems: [
		{ href: '/', text: '首页' },
		{ href: '/posts', text: '博客' },
		{ href: '/projects', text: '项目' },
		// { href: '/guestbook', text: '留言墙' },
		// { href: '/ama', text: 'AMA 咨询' },
		{ href: '/about', text: '关于我' },
		{ href: '/feed.xml', text: 'rss' }
		// { href: '/more', text: '更多', menu: true }
	],
	moreItems: {
		'/more': [
			{
				href: '/icon',
				text: '图标库'
			},
			{
				href: '/admin',
				text: '管理'
			}
		]
	},
	footerItems: [{ href: '/', text: '首页' }],
	locale: 'zh-CN',
	siteHostList: ['dino.cn', 'lucky-snail.vercel.app']
};

const siteMetadata: SiteConfig = {
	...baseSiteConfig,
	openGraph: {
		type: 'website',
		locale: baseSiteConfig.locale,
		url: baseSiteConfig.url,
		title: baseSiteConfig.authors + baseSiteConfig.name,
		description: baseSiteConfig.description,
		siteName: baseSiteConfig.name,
		images: [`${baseSiteConfig.url}og.png`]
	},
	twitter: {
		card: 'summary_large_image',
		title: baseSiteConfig.authors + baseSiteConfig.name,
		description: baseSiteConfig.description,
		images: [`${baseSiteConfig.url}og.png`],
		creator: '@haozhan05554957'
	}
};
export default siteMetadata;
