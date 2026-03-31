---
name: commit-message-formatter
description: 帮助用户按照 taskId + feature flag + message 格式格式化 Git 提交消息。当用户需要提交代码、请求生成提交消息、讨论代码提交规范，或者任何涉及 Git 提交的场景时，都应该使用此技能。即使用户没有明确提及"提交消息"，只要涉及代码提交相关的任务，也应该使用此技能来确保提交消息的规范性。
compatibility:
  - tools: [RunCommand]
---

# Commit Message Formatter

## 功能

此技能用于帮助用户按照标准格式生成 Git 提交消息。提交消息格式为：

```
taskId+feature flag+message
```

## 支持的 Feature Flag

- `feat`：新功能
- `fix`：修复 bug
- `chore`：构建过程或辅助工具的变动
- `docs`：文档更新
- `style`：代码风格调整（不影响功能）
- `refactor`：代码重构（不添加功能或修复 bug）
- `test`：添加或修改测试

## 使用方法

1. 用户可以提供完整的 taskId、feature flag 和 message
2. 如果用户输入 "default" 作为 taskId，系统会生成一个以 2 开头的六位数字 taskId
3. 技能会验证输入并生成符合格式的提交消息

## 输入示例

### 示例 1：完整输入

```
taskId: 202401
feature flag: feat
message: 添加用户认证功能
```

### 示例 2：使用默认 taskId

```
taskId: default
feature flag: fix
message: 修复登录页面的表单验证
```

## 输出格式

生成的提交消息将按照以下格式输出：

```
<taskId>+<feature flag>: <message>
```

## 实现逻辑

1. 接收用户输入的 taskId、feature flag 和 message
2. 调用 `scripts/format-commit-message.js` 脚本处理输入
3. 如果 taskId 为 "default"，生成一个以 2 开头的六位数字
4. 验证 feature flag 是否为支持的类型
5. 生成并返回格式化的提交消息

## 脚本使用

```bash
node scripts/format-commit-message.js <taskId> <featureFlag> <message>
```

### 示例

```bash
# 使用指定的 taskId
node scripts/format-commit-message.js 202401 feat "添加用户认证功能"

# 使用默认 taskId
node scripts/format-commit-message.js default fix "修复登录页面的表单验证"
```

## 示例输出

### 示例 1 输出

```
202401+feat: 添加用户认证功能
```

### 示例 2 输出

```
212345+fix: 修复登录页面的表单验证
```
