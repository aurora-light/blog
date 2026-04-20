/* eslint-disable */
require('dotenv').config();

const GitHub = require('github-api');
const fs = require('fs-extra');
const path = require('path');

const {
	GH_TOKEN,
	GH_USER = 'aurora-light',
	GH_PROJECT_NAME = 'blog'
} = process.env;

// 🚨 强制校验 token
if (!GH_TOKEN) {
	console.error('❌ 请设置 GH_TOKEN');
	process.exit(1);
}

// 🚨 校验用户名和仓库名（防止 URL 非法）
if (
	!/^[a-zA-Z0-9_-]+$/.test(GH_USER) ||
	!/^[a-zA-Z0-9_-]+$/.test(GH_PROJECT_NAME)
) {
	console.log(GH_USER, GH_PROJECT_NAME, 'GH_USER, GH_PROJECT_NAME');
	console.error('❌ GH_USER 或 GH_PROJECT_NAME 包含非法字符');
	process.exit(1);
}

const gh = new GitHub({
	token: GH_TOKEN
});

console.log('🚀 sync-post start');
console.log('GH_USER:', GH_USER);
console.log('GH_PROJECT_NAME:', GH_PROJECT_NAME);

// ================= 工具函数 =================

// ✅ YAML 安全
function safeYaml(str) {
	return JSON.stringify(str || '');
}

// ✅ URL 安全（避免 ERR_UNESCAPED_CHARACTERS）
function safeUrl(url = '') {
	try {
		return encodeURI(url);
	} catch (e) {
		console.warn('⚠️ URL encode 失败:', url);
		return url;
	}
}

// ✅ body 安全（避免奇怪字符）
function sanitizeBody(body = '') {
	return body
		.replace(/\u0000/g, '') // 移除非法字符
		.replace(/\r/g, '')
		.replace(/<br ?\/?>/g, '\n');
}

// ✅ 修复 img 标签
function closeImgTag(htmlString = '') {
	return htmlString.replace(/<img([^>]*)(?<!\/)>/g, '<img$1 />');
}

// ================= 核心逻辑 =================

const issueInstance = gh.getIssues(GH_USER, GH_PROJECT_NAME);

function generateMdx(issue, fileName) {
	try {
		const {
			title = '',
			labels = [],
			created_at,
			body = '',
			html_url = '',
			user
		} = issue;

		return `---
title: ${safeYaml(title.trim())}
date: ${created_at}
slug: ${fileName}
author: ${safeYaml(`${user?.login}：${user?.html_url}`)}
tags: ${JSON.stringify(labels.map((item) => item.name))}
---

${closeImgTag(sanitizeBody(body))}

---
此文自动发布于：<a href="${safeUrl(html_url)}" target="_blank">github issues</a>
`;
	} catch (err) {
		console.error('❌ generateMdx 失败:', err.message);
		throw err;
	}
}

const blogOutputPath = '../../data/blog';

function main() {
	const filePath = path.resolve(__dirname, blogOutputPath);

	fs.ensureDirSync(filePath);
	fs.emptyDirSync(filePath);

	const creators = ['aurora-light'];

	creators.forEach((name) => {
		console.log(`📡 正在拉取 issues: ${name}`);

		issueInstance
			.listIssues({ creator: name })
			.then(({ data }) => {
				console.log(`📄 获取到 ${data.length} 条 issues`);

				let successCount = 0;

				for (const item of data) {
					try {
						// 🔍 打印关键字段（定位问题用）
						console.log(
							`➡️ issue #${item.number} title:`,
							item.title?.slice(0, 50)
						);

						const fileName = `post-${item.number}`;
						const content = generateMdx(item, fileName);

						const fullPath = `${filePath}/${fileName}.mdx`;

						fs.writeFileSync(fullPath, content);

						console.log(`✅ ${fullPath}`);
						successCount++;
					} catch (error) {
						console.error(`❌ 处理 issue #${item.number} 失败`);
						console.error(error.message);
					}
				}

				if (successCount === data.length) {
					console.log('🎉 文章全部同步成功！', data.length);
				} else {
					console.log('⚠️ 部分失败，失败数量=', data.length - successCount);
				}
			})
			.catch((err) => {
				console.error('🚨 拉取 issues 失败');
				console.error(err.message);
				process.exit(1);
			});
	});
}

main();
