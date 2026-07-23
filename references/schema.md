# COURSE Schema

> 何时阅读：写 `data.js` 前阅读。当前 schema 版本：`1.2.0`。

一个 schema 同时服务 general 和 codebase 课程。`profile` 决定分流，`style` 决定配色。

## COURSE

```ts
{
  schemaVersion: string,   // "1.2.0"
  profile: string,          // "general"（默认）| "codebase"
  style: string,            // "default"（默认）| "apple-blue"
  showIcons?: boolean,      // false 则全局隐藏 emoji 图标（默认 true）
  showQuiz?: boolean,       // false 则关闭普通节测验
  showFinalQuiz?: boolean,  // false 则关闭总复习测验
  title: string,
  badge: string,            // 侧栏上下文标签
  description: string,      // 2-3 句课程描述
  duration: string,         // 预估学习时长（分钟，如 "25"）
  context?: Context,        // 可选展示信息；如写不能含 type
  lessons: Lesson[]
}
```

### profile

- `"general"`：普通主题、资料、网页、笔记。默认 paginated 侧栏分页。
- `"codebase"`：代码库、源码、当前代码库。默认 continuous 顶部滚动。
- 缺省或运行时 fallback：`"general"`。
- 不要使用 `context.type` 分流，分流只看 `COURSE.profile`。

### style

- `"default"`（暖橙，缺省）
- `"apple-blue"`（苹果蓝）
- 不支持第三套配色。

### context

可选。展示课程来源信息，不参与分流：

```ts
{
  title: string,     // 项目名或主题名
  path: string,      // 本地路径或 repo URL
  summary: string,   // 1-2 句说明
  tags: string[]     // 技术栈或关键主题
}
```

- `context` 不能包含 `type` 字段。
- codebase 课程推荐写完整 `context`（`title` / `path` / `summary` / `tags`）。
- general 课程一般不写 `context`；运行时不存在 `context` 时不渲染 context 区域。
- context 显示只看 `COURSE.context` 是否存在。

顶层字段（`title` / `badge` / `description` / `duration`）由 `script.js` 自动填充到 `index.html`，无需手动编辑 HTML。

## Lesson

```ts
interface Lesson {
  id: number,              // 从 1 开始，顺序递增
  title: string,
  goal: string,            // 一句话
  concepts: string[],      // 2-3 项；总复习为 []
  objectives: string[],    // 2-4 项
  body: ContentBlock[],
  flashcards: {            // 每节 2-3 张；总复习为 []
    front: string,
    back: string,
    icon?: string          // 可选 emoji
  }[],
  quiz: {                  // 每节 1-2 题；总复习 4 题以上
    question: string,
    options: {
      text: string,
      correct: boolean,
      feedback: string
    }[]
  }[],
  sources: {               // 无来源则为 []
    label: string,
    url: string
  }[]
}
```

最后一节（最大 id）自动识别为总复习，使用累积评分。

## 内容块类型

严格使用以下格式。class-viewer 全量支持所有 block；general 课程默认只生成通用 block，codebase 课程优先使用代码相关 block。

### 通用 block

| 类型 | 结构 | 用途 |
|------|------|------|
| 段落 | `{ type: "p", text: "..." }` | 正文，最多 2-3 句 |
| AI 对话 | `{ type: "ai-dialog", label, messages: [{role:"user"|"ai", text}] }` | AI 对话示例框 |
| 代码示例 | `{ type: "code-example", label, lang, code }` | 带语言标签的代码块；不需逐行解释时用 |
| 案例分析 | `{ type: "case-example", label, scenario, analysis }` | 场景+分析；调试内容优先用 `debug-case` |
| 洞察 | `{ type: "insight", icon?, title?, text }` | 带 emoji 与标题的关键洞察 |
| 列表卡片 | `{ type: "list-block", items: [{ icon?, title, desc }] }` | 3 个以上项目的卡片网格 |

### 代码相关 block（codebase 优先使用）

| 类型 | 结构 | 硬规则 |
|------|------|--------|
| 代码翻译 | `{ type: "code-translation", label, file, lang, code, explanation: string[] }` | `code` 必须真实；`file` 写真实路径推荐带行号；不改写、清理、伪造代码；`explanation` 是数组，每项解释 1-2 行并说明为什么这么写 |
| 角色对话 | `{ type: "actor-chat", label, messages: [{actor, text}] }` | 角色名来自真实代码角色；对话推动理解；不伪造模块职责 |
| 数据流 | `{ type: "flow", label, nodes: string[], steps: [{from, to, text}] }` | `from`/`to` 必须来自 `nodes`；每步只讲一个动作；对应真实用户或数据路径 |
| 架构 | `{ type: "architecture", nodes: [{id, title, desc}], edges: [{from, to, label}] }` | 角色来自真实文件/模块/组件/服务；边含义具体；不画与源码不一致的架构 |
| 调试案例 | `{ type: "debug-case", label, symptom, likelyCause, firstFiles, fixHint }` | 症状像真实反馈；`firstFiles` 必须是真实文件；`fixHint` 指导排查方向，不编造修复 |

## 测验规则

- 每题有且仅有一个正确选项（`options` 是对象数组，不是字符串数组）。
- 每个选项必须包含 `feedback`（选中后显示的反馈）。
- 选项自动带 A. B. C. D. 前缀（运行时内置）。
- 内容节每节 1-2 题，总复习 4 题以上。
- general：测关键概念理解。
- codebase：优先考调试、架构、追踪和 AI 指挥，不考记忆。

## sources 规则

- 每节课都写 `sources`，无来源写 `[]`。
- general：URL 或来源说明，真实可点击。
- codebase：真实 repo 文件路径，最好带行号。
