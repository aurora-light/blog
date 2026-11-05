# @leslie/search-core

独立的 TypeScript 关键词检索与 RAG 编排包，通过 pnpm workspace 被博客引用。没有运行时依赖，不依赖 Next.js、React、AI SDK、文件系统或数据库。构建输出为 ESM JavaScript 和 TypeScript 类型声明，当前仅在仓库内部使用，尚未发布到 npm。

## 使用

```ts
import { createSearchEngine } from '@leslie/search-core';

const engine = createSearchEngine([
	{
		id: 'nextjs-ssr',
		title: 'Next.js SSR 实践',
		description: '请求时渲染页面',
		tags: ['Next.js', 'SSR'],
		content: '这里放文章正文或已经提取的 PDF 文本块。',
		date: '2026-11-04'
	}
]);

const hits = engine.search('Next.js SSR');
// [{ document, score, matchedTerms, excerpt }]
```

文档可以携带额外元数据，例如 `url`、`page`、`sourceType`，结果保留这些字段及其类型。`id`、`title`、`description`、`tags`、`content` 为必填字段，`date` 可选，日期应使用可按字典序比较的 ISO 格式。

索引只建立一次，随后重复调用 `search`。修改文档或字段配置后需重建引擎；建立索引后不要直接修改原文档对象。空问题或无有效关键词返回空数组。

## 扩展字段与权重

```ts
import { createSearchEngine, defaultSearchFields } from '@leslie/search-core';

const documents = [
	{
		id: 'ssr',
		title: '服务端渲染',
		description: '',
		tags: [],
		content: '',
		keyPoints: ['SSR', '首屏 HTML', '水合']
	}
];

const engine = createSearchEngine(documents, {
	fields: [
		...defaultSearchFields<(typeof documents)[number]>(),
		{ name: 'keyPoints', weight: 3, getText: (doc) => doc.keyPoints.join(' ') }
	],
	limit: 8,
	minimumMatchedTerms: 1,
	minimumMatchRatio: 0.5
});
```

默认每个词在标题、描述、标签、正文命中时分别加 6、3、4、1 分；同词跨字段累加，同字段重复出现不重复加分。标题包含完整查询额外加 8 分。多词查询默认至少命中两个词且覆盖一半关键词，单词查询只需命中一个。按得分降序、日期降序排序。

`fields` 替换整个字段配置。调整某个默认权重可使用 `defaultSearchFields().map(...)`；将权重设为 0 可取消该字段的关键词评分。标题完整查询加分由 `titlePhraseBoost` 单独控制，禁用时设为 0。

## 查询与结果扩展

`createSearchEngine(documents, options)` 的查询选项，也可以通过 `engine.search(query, overrides)` 临时覆盖：

| 配置                  | 默认值           | 用途                                            |
| --------------------- | ---------------- | ----------------------------------------------- |
| `limit`               | 4                | 最大返回条数；0 返回空数组                      |
| `tokenize`            | `getSearchTerms` | 替换分词器或将领域表达映射为标准检索词          |
| `minimumMatchedTerms` | 2                | 最少命中词数，不超过本次有效词数                |
| `minimumMatchRatio`   | 0.5              | 至少覆盖多少比例的查询词                        |
| `titlePhraseBoost`    | 8                | 标题包含完整查询时的加分                        |
| `excerptLength`       | 1000             | 原文节选长度，不含前后省略号                    |
| `excerptContext`      | 180 或更小       | 命中位置之前的上下文长度，必须小于节选长度      |
| `deduplicateBy`       | 不去重           | 返回来源标识；返回 `undefined` 表示该文档不去重 |
| `rerank`              | 不额外重排       | 对关键词召回结果进行同步规则重排                |

```ts
const engine = createSearchEngine(documents, {
	deduplicateBy: (doc) => doc.url,
	rerank: (hits) =>
		[...hits].sort((a, b) => {
			return (
				Number(b.document.id === 'current-article') -
					Number(a.document.id === 'current-article') || b.score - a.score
			);
		})
});
```

上例 `documents` 应包含 `url` 字段。重排发生在默认评分排序后、去重和条数限制之前，可用于当前文章优先等业务策略；应仅重排已有命中。自定义分词结果会再次规范化、去重，最多保留 24 个词，查询最多处理 1000 字符。默认分词支持中文分词与带标点的英文技术词，具体中文分词受运行环境的 ICU 词典影响。

包的 `rag` 入口负责 AI 查询规划、对话指代处理、多路检索、失败降级和上下文组装，通过注入的模型函数完成实际请求。核心路与扩展路分别搜索，不将所有扩展词塞进同一个覆盖率门槛。`retrieval` 入口提供加权 RRF 融合。当前没有内置 embedding、BM25、向量检索或模型重排。

底层 API `createSearchIndex` 和 `searchDocuments` 也可分别调用，便于应用自行管理索引缓存。

## 与博客的职责划分

- 本包负责分词、字段评分、排序、节选、去重，以及整个检索增强编排流程。
- `scripts/build-article-index.mjs`、`scripts/build-pdf-index.mjs` 负责内容读取与 PDF 文本提取。
- `src/lib/rag/search.ts` 只保留博客文档字段适配与兼容函数；追问规则和证据提示词实现已移入包。
- 博客保持最多 4 条来源与同 PDF 页去重；包自身允许其他项目配置更多结果。
- `src/lib/rag/index.ts` 负责服务端索引缓存和管线实例配置；聊天路由提供模型请求适配、限流与流式事件发送。

## 构建与验证

从仓库根目录执行：

```bash
pnpm build:search
pnpm test:search
pnpm test:rag
```

`pnpm dev`、`pnpm build` 会先构建本包。直接执行 `next dev`、`next build` 或首次执行根目录类型检查前，需要先运行 `pnpm build:search`。修改包源码后，重新运行构建命令即可更新 `dist`；目前没有自动监听。

包可单独执行 `pnpm --filter @leslie/search-core build`；`prepack` 会自动构建，打包仅包含 `dist`、README 和包元信息。`dist` 不提交 Git。需要移植到其他项目时，可以复制整个包目录并安装其开发依赖后构建，或使用打包生成的 tgz；当前 `private: true` 防止误发布。

## RAG 与多路检索入口

三个入口分别是基础搜索 `@leslie/search-core`、排名融合 `@leslie/search-core/retrieval` 和完整流程 `@leslie/search-core/rag`。后两个入口不引入第三方模型 SDK，模型通过函数注入。

```ts
import { createSearchEngine } from '@leslie/search-core';
import { createRagPipeline, createRagInput } from '@leslie/search-core/rag';

const documents = [
	{
		id: 'ssr',
		title: 'SSR 实践',
		description: '',
		tags: ['SSR'],
		content: '服务端渲染实践。',
		url: '/posts/ssr'
	}
];
const engine = createSearchEngine(documents);
const pipeline = createRagPipeline({
	retrieve: (query, { limit }) => engine.search(query, { limit }),
	getSourceKey: (doc) => doc.url,
	generateQueryPlan: async ({ system, prompt, signal }) => {
		// 适配你自己的模型 SDK，返回模型生成的 JSON 文本。
		return callYourModel({ system, prompt, signal });
	}
});

const result = await pipeline.retrieve({
	...createRagInput(messages),
	signal: request.signal,
	onEvent: (trace) => sendTraceToClient(trace)
});
// result: { hits, sources, context, trace }
```

示例中的 `messages`、`request`、`callYourModel` 和 `sendTraceToClient` 由宿主应用提供。`createRagInput` 接受带 `role` 和文本 `parts` 的消息，只保留最后一个用户问题及此前最多 4 条用户/助手文本，每条历史最多 600 字符，当前问题最多 1000 字符，忽略 reasoning 和数据事件。也可直接传 `question`、`history`。

包内负责构造规划提示词，模型返回如下 JSON 文本：

```json
{
	"standaloneQuery": "简历中的电商项目使用了哪些技术栈",
	"primaryTerms": ["电商项目", "技术栈"],
	"relatedTerms": ["技术选型", "框架"],
	"queries": ["电商项目 技术栈", "电商项目 技术选型", "电商项目 框架"]
}
```

输出必须通过包内运行时校验。核心词 1–4 个、扩展词 0–6 个；模型最多给 3 个查询，包会将核心词组合成主路、对查询规范化去重并最多保留 3 路。主路权重 1、扩展路 0.7。模型需要自行保持实体和主题，格式校验不保证语义正确，因此不把模型输出当成事实依据。

默认规划超时 3500 ms，最多 3 路，每路最多 8 条候选，单路检索超时 1500 ms，最终最多 4 条来源，上下文最多 6500 字符（包含 JSON 转义开销）。以上预算可在 `createRagPipeline` 中配置；`maxQueries` 上限 3、`candidatesPerQuery` 上限 30、`maxSources` 上限 10。引用来源只包含实际放入上下文的证据，UI 元数据不携带原文节选。

规划超时、JSON 无效或模型失败会降级为本地查询；不提供 `generateQueryPlan` 时直接使用本地规则，包括简单的追问指代补全。单路失败或超时会跳过该路；所有路失败则抛错。父级 `AbortSignal` 的取消会向下传递，不再触发本地降级或回答生成。适配器应遵守传入的 signal，才能及时停止底层网络请求。

`onEvent` 接收独立快照，包含 `phase`、独立问题、核心词、扩展词、各路状态/命中数/耗时，以及融合数量。快照不包含历史正文、模型原始输出、内部错误、API Key 或证据节选。事件生命周期只覆盖检索，不将其当成模型内部思考。阶段为 `planning → retrieving → fusing → complete`；快照通过宿主应用接到任意 Trace UI。

`fuseSearchResults` 使用 `weight / (60 + rank)` 累加排名贡献，每路同一来源只计一次。`getSourceKey` 决定来源身份，例如 PDF 使用文件 URL 加页码。结果保留 `score`（基础关键词分数）、`fusionScore`、命中路由和代表性的原文节选，不能将两种分数视为同一量纲。

包仅编排任务，不负责读取文件、数据库连接、API Key、Redis、HTTP 或 UI。它能并发等待异步检索器；同步内存检索仍在当前线程执行。

## 回答后的推荐追问

`@leslie/search-core/rag` 额外导出 `generateSuggestions`、`buildSuggestionsPrompt`、`parseSuggestions`。

```ts
const recommendations = await generateSuggestions(
	{ question, reply, knowledgeBase: evidenceContext, signal },
	{
		timeoutMs: 2500,
		generate: async ({ system, prompt, signal }) => {
			// 由宿主应用使用模型 SDK 的结构化输出，返回 { questions: string[] }。
			return callStructuredModel({ system, prompt, signal });
		}
	}
);
```

包内负责提示词、问题去重、过滤当前问题、校验最多三条/每条最多六十字符、超时与可选功能降级。输入最多为问题 2000 字符、回答 8000 字符和知识证据 6500 字符。没有回答或证据时不调用模型；失败、超时或格式错误返回空数组；父级取消则传播取消状态。提示词要求追问有知识依据、优先深入本轮主题并避免重复已回答内容，但格式校验不能证明语义上一定可回答。

宿主应用可以在回答结束后通过独立接口调用，不必延长正文流的生命周期。博客的 `/api/chat/suggestions` 使用 AI SDK `generateText` 和 `Output.object`，返回校验后的 JSON；前端完整读取后展示按钮。

## 提示词目录

固定提示词集中在 `src/lib/prompts/`，按 `query-planner.ts`、`retrieval.ts`、`suggestions.ts` 划分，统一入口为 `src/lib/prompts/index.ts`，公开导出路径为 `@leslie/search-core/prompts`。业务函数只引用模板，不再内联固定规则。动态历史、问题、证据和回答仍由对应构建函数按预算组装，保持模板与输入数据分离。
