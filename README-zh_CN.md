这是一个使用 [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) 引导创建的 [Next.js](https://nextjs.org/) 项目。项目更多信息：https://blog-dinos-projects.vercel.app/posts/post-7

## 开始使用

首先，运行开发服务器：

```bash
npm run dev
# 或者
yarn dev
# 或者
pnpm dev
# 或者
bun dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看结果。

你可以通过修改 `app/page.tsx` 文件来开始编辑页面。当你编辑文件时，页面会自动更新。

本项目使用 [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) 来自动优化和加载 Inter，这是一种自定义的 Google 字体。

## 特性

- 背景使用了 https://bg.ibelick.com/
- 使用 [`react email`](https://react.email/docs/introduction) 支持内容在邮箱中展示
-

## 了解更多

要深入了解 Next.js，可以查看以下资源：

- [Next.js 文档](https://nextjs.org/docs) - 学习 Next.js 的特性和 API。
- [学习 Next.js](https://nextjs.org/learn) - 一个交互式的 Next.js 教程。

你可以查看 [Next.js 的 GitHub 仓库](https://github.com/vercel/next.js/) - 欢迎你的反馈和贡献！

## 部署到 Vercel

部署 Next.js 应用的最简单方法是使用 [Vercel 平台](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)，它由 Next.js 的创建者提供。

查看我们的 [Next.js 部署文档](https://nextjs.org/docs/deployment) 了解更多详情。

## 提交规范

参考：

1. https://devv.ai/search?threadId=drssm68cp1j4
2. https://www.npmjs.com/package/@commitlint/config-conventional

## 工作流

这段代码定义了一个名为“Sync Post”的 GitHub Actions 工作流程，用于自动同步博客文章到代码仓库。

代码解析:

name: Sync Post: 定义工作流程的名称。
on: 定义触发工作流程的事件。
issues: 当 GitHub 仓库中发生以下事件时，触发工作流程：
edited: 当 issue 标题或者内容被修改时触发。这个官方的文档没有写

env: 定义工作流程的环境变量。
GH_TOKEN: GitHub 个人访问令牌，用于访问 GitHub API。
GH_USER: GitHub 用户名。
GH_PROJECT_NAME: 博客项目名称。
jobs: 定义工作流程中的任务。
Publish: 定义一个名为 “Publish” 的任务，用于发布博客文章。
runs-on: 指定任务运行的环境，此处为 ubuntu-latest。
steps: 定义任务中的步骤。
Checkout 🛎️: 使用 actions/checkout@v2 动作将仓库代码检出到工作目录。
Git config 🔧: 配置 Git 用户信息，以便后续提交代码。
Display runtime info ✨: 打印当前工作目录，用于调试。
Install 🔧: 使用 yarn 安装项目的依赖包。
Update blog files ⛏️: 执行 yarn sync-post 命令同步博客文章到仓库，然后使用 Git 添加更改、提交更改并推送到远程仓库。
总结:

该工作流程通过监听 GitHub 仓库中的 issue 事件来触发博客文章同步操作。当 issue 被创建、关闭、重命名、添加或移除标签、重新打开或代码被修改时，工作流程会自动执行 yarn sync-post 命令同步博客文章到仓库，并提交更改。

## TODO

- [x] sitemap.xml
- [x] rss
- [ ] 友链
- [ ] 登录
- [ ] 评论
- [ ] 留言板
- [ ] 搜索
- [x] 头像转圈圈，仿掘金
- [ ] 收藏夹

## 注意事项

- github 写帖子，不要纯数字标题
