import React from 'react';
import easykolIcon from '~/public/easykol.png';
import dinoBlogIcon from '~/public/logo.png';
import { ProjectCard } from './ProjectCard';

export function Projects(): React.ReactElement {
	const projects: ProjectItem[] = [
		{
			id: '8',
			url: 'https://easykol.com/',
			icon: easykolIcon,
			name: 'Easykol',
			description:
				'最好用的海外营销工具，帮你快速找到你想要的红人，并且内置邮件模板和批量发邮件建联。支持 Tiktok，instagram，youtube，小红书，抖音等主流平台，无论性价比还是质量都遥遥领先行业内竞品产品',
			tags: ['公司']
		},
		{
			id: '3',
			url: 'https://www.dino.cn',
			icon: dinoBlogIcon,
			name: 'dino 的个人博客',
			description: '基于 Next.js 创建的博客网站，',
			tags: ['个人']
		}
	];

	return (
		<ul
			role="list"
			className="grid grid-cols-1 gap-x-12 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
		>
			{projects.map((project) => (
				<ProjectCard project={project} key={project.id} />
			))}
		</ul>
	);
}
