# AI 接口机器人检测

`src/instrumentation-client.ts` 为 `/api/chat` 和 `/api/chat/suggestions` 的 POST 请求附加 BotID 验证信息。
两个接口在解析正文和调用模型前执行 `checkBotProtection()`，并继续使用已有的 Redis 限流。

- 正常请求：继续处理。
- 检测为机器人：返回 403。
- 检测异常：返回 503，不绕过检查调用模型。

按照 [Vercel BotID 接入文档](https://vercel.com/docs/botid/get-started)，生产检测需要部署到 Vercel。
当前官方配置无需在 Next.js 配置中添加 `withBotId`。本实现没有启用付费 Deep Analysis。

开发模式下 SDK 默认放行。部署后应从博客页面发起聊天测试；直接 curl 不携带浏览器验证信息，生产环境可能会被拒绝。
代码接入和单元测试不代表线上真人识别已验证，需在 Vercel 部署后检查浏览器请求和 Firewall 的 BotID 记录。

本地逻辑检查：`node --test tests/bot-protection.test.mjs`。
