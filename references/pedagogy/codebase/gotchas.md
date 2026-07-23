# 常见陷阱（代码库课程差异教学法）

> 何时阅读：写完 codebase 课程的 `data.js` 后、交付前阅读。

## 改了 class-viewer

课程生成时只写 `data.js`。不要改 `index.html`、`styles.css`、`script.js`、`page.js`、`vi.html`、`vi-data.js`。如果展示不支持某个内容，记录为后续扩展，而不是在课程里写自由 HTML。

## 在 data.js 里塞 HTML

不要把 HTML 字符串塞进 `text`、`analysis`、`explanation`。课程内容是结构化数据，渲染由 class-viewer 负责。

## 文字墙

连续写 4 句以上通常是失败信号。处理：拆成多个 `p`、`list-block`、`flow`、`actor-chat`、`code-translation`。

## 代码不真实

不要为了教学改写代码。学习者应该能打开目标文件看到同样的片段。

## 代码翻译脱节

`code-translation.explanation` 不能变成泛泛解释。每条解释应贴近代码中的一小段。

## flow 节点不匹配

`flow.steps[].from` 和 `flow.steps[].to` 必须存在于 `flow.nodes`，否则运行时无法正确高亮。

## quiz 格式不对

`quiz.options` 是对象数组 `[{ text, correct, feedback }]`，不是字符串数组。有且仅有一个 option 的 `correct` 为 `true`，每个 option 都要有 `feedback`。

## 测验考记忆

不要问定义题。测验应该考调试、架构判断、数据追踪、AI 指挥。

## 术语解释不足

非技术学习者可能不知道：JSON、API、CLI、模块、入口点、状态、缓存、中间件、环境变量。如果不确定，就解释。

## 缺少互动骨架

整门课至少要有 `code-translation`、`actor-chat`、`flow`、`quiz`、术语解释。没有这些，就不像代码库课程。

## 来源不清楚

每节课都要有 `sources`，指向真实文件，最好包含行号。

## 内容退化

如果生成结果太像普通讲义而不是代码库课程，通常说明：内容太像讲义、缺少连续追踪、缺少真实代码、缺少角色对话、缺少数据流。
