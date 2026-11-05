# 博客文章检索

当前实现采用文章与公开 PDF 的关键词检索，不使用 embedding 或外部数据库。通用检索实现已提取为 pnpm workspace 包 `@leslie/search-core`，源码、配置选项与使用示例见 `packages/search-core/README.md`。

## 数据与构建

- 从 `posts/**/*.mdx`、`data/blog/**/*.mdx` 读取文章，与 Contentlayer 的输入范围一致。
- 提取标题、描述、标签、日期和清理后的正文前 4000 字符。普通 `.md` 不进入索引。
- `pnpm generate-article-index` 全量生成 `src/generated/article-index.json`，删除文章也会移除旧记录。
- JSON 是忽略提交的构建产物；`pnpm dev`、`pnpm build` 的前置脚本都会重新生成。直接执行 `next build` 或首次运行 `tsc` 前，需先运行 `pnpm build:search` 和索引生成命令。
- 索引通过服务端静态 import 随部署打包，不放入 `public`，不在运行时写 Vercel 文件系统，也不上传到 Redis。
- 索引包含内容哈希版本，不包含凭证或聊天记录。相同的文章、PDF 提取文本和元数据生成相同的版本。

## 请求链路

`/api/chat` 校验消息并限流后，调用 `src/lib/rag/index.ts`：首次建立规范化内存检索数组，随后在同一服务实例内复用。冷启动会重建内存数组，但不会重新解析 MDX 或 PDF。

关键词使用中文分词及英文技术词，标题/标签/描述权重高于正文。多词问题至少匹配两个词，且覆盖不少于一半检索词，避免仅因“参数”等单个通用词召回无关文章。最多召回 4 条来源，每条提供最多约 1000 字符的命中位置节选；同一 PDF 页仅保留得分最高的文本块；附带服务器生成的文章链接、标题、日期和描述。该预算是字符预算，不是精确 token 计数。

默认通过一次有超时限制的模型调用理解对话指代，生成核心词与扩展查询，并进行最多三路检索。模型规划失败时回退到本地分词和简单追问规则。当前没有 AI 摘要生成、模型重排或前端当前文章优先功能。

模型获得原文证据和引用规则，可直接输出 Markdown 文章链接，沿用现有聊天渲染。无结果时提示模型明确说明没有命中，通用知识与作者事实应区分。引用目前由模型遵守提示词生成，尚无独立引用验证器；上线后仍需抽样核对引用是否支撑结论。

## 检索执行轨迹

聊天响应通过 AI SDK `createUIMessageStream` 先发送消息开始事件，再发送 `data-article-retrieval` 的 `searching` 与 `complete` 状态，然后合并模型输出。状态使用相同数据 ID，在当前 assistant 消息中原位更新，不追加两份来源列表。校验和限流仍在打开流之前完成，超限返回 HTTP 429。

完成事件仅发送真实命中来源的标题、站内 URL、短描述和耗时，不发送全文或模型证据节选。前端使用从 shadcn/ui 官方 registry 导入的 Radix Nova Trace 源码，复用项目已有 Collapsible，搜索和生成初期展开，正文出现后默认收起；手动展开/收起优先。文章在新标签页打开，并提供键盘操作和屏幕阅读器提示。没有命中、检索失败、生成失败和停止生成分别展示，检索来源不等同于模型最终实际引用的来源。

Trace 源码来源为 `https://ui.shadcn.com/r/styles/radix-nova/trace.json`，导入日期为 2026-11-04。组件保留官方结构、props 与样式，只将 registry 内部路径映射为本项目路径、将 `cn` 映射为已有工具函数，并把图标占位符解析为 `ChevronRightIcon`。MIT 许可证保存在 `docs/vendor/shadcn-trace.LICENSE`。文章长标题的换行在业务组件中通过 `className` 调整，不修改官方基础组件。

导入时上游 `trace.tsx` 原文的 SHA-256 为 `17f86b0e19fcfc7a8277061efa8c1af9b8f779436f60e1adb70c95f3e20b4468`，便于以后核对升级。

`src/style/shadcn-trace.css` 摘取官方 `packages/shadcn/src/tailwind.css` 中所需的开关状态变体、折叠关键帧、shimmer 和 reduced-motion 支持，通过全局 CSS 导入。项目主题补充折叠动画变量，避免为这些 CSS 工具类引入整个 shadcn CLI 依赖。

事件持久保存在各自消息的 `parts` 中，因此后续提问不会覆盖之前的来源。它们不再重复存入全局 dataStream。前端为数据部分配置 schema，接受站内 `/posts/` 文章链接，以及 `/resume/文件名.pdf#page=页码`、`/documents/文件名.pdf#page=页码` 链接。清空聊天或重新生成时，来源跟随消息生命周期处理。模型提供的 reasoning 继续单独展示，不把检索轨迹称为模型内部思考。

## 更新与限制

新增或修改文章后重新构建部署；本地开发新增文章后运行 `pnpm generate-article-index`，必要时重启开发服务。当前没有文件监听或定时刷新。

MDX 正文 4000 字符之后的内容不可搜索；PDF 则索引所有可提取文字的页面。关键词检索不保证同义表达召回，也不能可靠判断所有自然语言问题是否相关。清理过程是保守的文本提取，不执行 JSX，但不等同于完整 MDX AST 解析。AI 查询改写已经接入；后续可通过文章全文分块、结构化解析和混合检索继续改善。

只有已允许公开的文章应放在上述目录。接口仍调用外部聊天模型，因此检索命中的原文会作为请求上下文发送给已配置的模型供应商。

## 检查

```bash
pnpm build:search
pnpm generate-article-index
pnpm test:search
pnpm test:rag
pnpm exec tsc --noEmit --incremental false
pnpm build
```

测试使用模拟模型和限流模块，不发送真实模型请求或连接 Redis。覆盖索引生成、删除同步、重复 slug、中文/英文检索、无结果、追问、命中位置节选、缓存复用、聊天提示词接入以及 429 提前拦截。

## PDF 与简历检索

`data/retrieval-pdfs.json` 是公开 PDF 的白名单，默认接入现有简历。新增文件时放入 `public/resume/` 或 `public/documents/`，文件名使用英文字母、数字、短横线或下划线，在清单中填写 `id`、`file`（相对 public）、`title`、`description`、`tags`，再运行 `pnpm generate-article-index`。例如：

```json
[
	{
		"id": "leslie-resume",
		"file": "resume/leslie-frontend.pdf",
		"title": "个人简历",
		"description": "作者的个人简历，包含技术栈、工作经历与项目经验。",
		"tags": ["简历", "工作经历", "项目经验", "resume"]
	}
]
```

构建环境需要 Node.js 22.13+（22.x）或 24+；PDF.js 仅作为构建依赖，不进入聊天接口的解析流程。构建脚本通过 PDF.js 提取文字，使用方式参考 [官方 Node.js 示例](https://github.com/mozilla/pdf.js/blob/master/examples/node/getinfo.mjs)。每页独立切分，每块最多 1200 字符，相邻块重叠 180 字符，优先在中文句号处结束。PDF 不受文章前 4000 字符限制，所有可提取文本的页面均参与索引。没有可核实的更新时间时不生成日期，避免把构建时间当成简历更新时间。

查询与文章共用关键词检索和模型上下文预算；来源显示「个人简历 · 第 N 页」，链接保留 `#page=N`，在新标签页交给浏览器 PDF 查看器打开（页码跳转取决于查看器支持）。同页多块只返回得分最高的一块，避免重复来源挤占四条引用预算。页面分块可能遗漏跨页语义，关键词匹配也不等同于语义检索。

替换 PDF 后重新生成索引；从清单移除后重新生成即可删除该 PDF 的所有索引记录。清单中仍引用已删除、损坏或无法提取文字的文件会使构建失败，避免悄悄部署旧索引。单文件限制为 20 MB、100 页。仅含图片的扫描件需要先 OCR；混合 PDF 中没有可提取文字的页面会跳过，不提供图片、表格或复杂多栏的布局理解。当前没有访客上传与在线 OCR 功能。

PDF 本身位于 public，属于公开资源；检索片段会随问题发送给已配置的模型供应商。只将愿意公开并用于问答的资料加入清单。解析只发生在本地生成或部署构建时，线上请求直接使用已生成的 JSON，不逐次读取或解析 PDF。

## 独立检索包

`packages/search-core` 输出独立 ESM JavaScript 与类型声明，通过根项目的 `workspace:*` 依赖使用，包本身没有运行时依赖。通用分词、评分、原文节选，以及查询规划、对话处理、多路检索、RRF 融合、降级、证据上下文与流程事件均由包提供。博客负责 MDX/PDF 读取、来源身份规则、模型调用适配、限流、服务端索引缓存与 UI。

单路关键词评分保持不变，聊天流程使用主路权重 1、扩展路权重 0.7 的加权 RRF 融合，最多返回四条来源。可以继续配置字段、分词器和重排函数。博客已接入 AI 查询规划，尚未增加摘要生成或模型重排序。

`pnpm dev` 和 `pnpm build` 的前置脚本先构建该包。修改包源码后，本地需执行 `pnpm build:search` 更新构建产物；直接执行 `next` 命令或首次类型检查前也需先构建。完整验证使用 `pnpm test:search`（包级扩展能力）和 `pnpm test:rag`（真实文章/PDF 与聊天链路）。

## 查询规划与多路 Trace

`@leslie/search-core/rag` 的 `createRagPipeline` 承担完整检索增强流程：有限历史 → 模型规划 → 输出校验 → 每路独立召回 → 来源去重与加权 RRF → 证据预算与引用提示词。`@leslie/search-core/retrieval` 的 `fuseSearchResults` 也可以单独复用。包的 README 包含完整接口与示例。

`/api/chat` 在限流后通过注入函数调用 AI SDK `generateText`，每次提问默认增加一次规划调用，输出预算 400 tokens，不重试；包内控制 3500 ms 超时。`AI_QUERY_MODEL` 可以单独指定规划模型，默认使用回答模型，沿用服务端 provider 与凭证。设置 `AI_QUERY_PLANNING=false` 可停用模型规划，保持本地单路检索。测试不读取真实凭证，不调用外部模型或 Redis。

模型最多生成 3 路查询，每路最多 8 条候选；每路检索超时 1500 ms，部分失败会跳过，全部失败会显示检索失败。回退、失败和父级取消分别处理，取消不会再触发回退搜索。同步内存检索不因 Promise.all 变成多线程，异步检索适配器则可以并发等待。

Trace 事件沿用同一个 `data-article-retrieval` ID，新增可选 `trace` 字段，包含问题改写、核心词、扩展词、查询列表、运行状态、命中数、耗时以及融合前/去重后/选取数量。前端展示真实执行状态，规划不可用时明确展示回退信息。旧消息没有该字段时仍能显示原有来源。手动折叠优先逻辑保留。

上下文预算以序列化后的实际字符数控制，来源列表仅包含实际装入上下文的证据；不将全文或证据节选发给 Trace。检索索引在服务实例内缓存，查询计划和历史仅存在于当前请求，不进入索引缓存。多路召回提高覆盖面的效果仍需用实际问答样本评估，格式校验无法保证模型改写语义正确。

## 动态推荐追问

助手成功回答结束后，客户端独立请求 `/api/chat/suggestions`，提交本轮 `question`、`reply` 和最多四条 `sourceSlugs`。正文对话流先结束，推荐生成不阻塞下一轮输入；点击推荐按钮走原有发送流程。推荐只展示在最新一条助手回答下，空结果不占位。

接口不接受客户端提供的知识正文，而是通过来源 ID 查询服务端已生成的文章/PDF 索引。无来源 ID 时可按问题执行一次本地检索；传入来源 ID 但无法匹配公开资料时直接返回空数组。这样指代追问也能沿用本轮实际命中的来源，而不依赖单独一句“它还有什么细节”重新匹配。

通用提示词、输入预算、去重、校验与超时逻辑放在 `search-core/rag` 导出的 `generateSuggestions` 中。提示词结合问题、已完成回答和证据，优先生成知识库可支撑且回答尚未覆盖的追问。AI SDK 适配使用 `Output.object({ schema: suggestionsSchema })`，最多三条、每条六十字符，最多 400 输出 tokens，不重试，超时 2500 ms。返回完整、校验后的 JSON，不向 UI 展示尚未完成的 JSON 片段。

`AI_SUGGESTIONS_MODEL` 可指定推荐模型，默认沿用回答模型和服务端 provider；设置 `AI_SUGGESTIONS=false` 停用额外模型调用。成功且有检索依据的回答默认增加一次推荐生成调用。该模型需支持所用 provider 的结构化输出；不支持、失败或超时会返回空列表，不影响正文答案。

推荐接口独立使用 `ip-rate-limit:suggestions:<ip>` Redis 计数，每小时最多十次，沿用现有限流环境与 Redis 连接策略，不占用 `ip-rate-limit:<ip>` 的聊天额度。前端为推荐请求设置取消和代际校验，新提问、重生成、停止、清空或卸载会取消旧请求；即使旧请求忽略取消并晚到，也不会覆盖新回答。推荐结果只保存在当前聊天界面的状态中，不写入文章索引、Redis 或模型对话历史。

## 提示词管理

博客专用人设、作者事实与文章索引范围规则集中在单文件 `src/lib/prompts.ts`，应用通过 `@/lib/prompts` 引用。

查询规划、证据与引用规则、无结果提示和推荐追问模板集中到 `packages/search-core/src/lib/prompts/`，通过 `@leslie/search-core/prompts` 导出，不通过博客的 `prompts.ts` 转导出。通用文本只有一份定义，搜索包不依赖博客路径。修改通用提示词后需重新构建包；每轮问题、历史、回答和证据仍在请求时动态组装。
