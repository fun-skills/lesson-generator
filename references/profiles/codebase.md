# Profile: codebase

> 何时阅读：写 codebase 课程的 `data.js` 时阅读。回答"`data.js` 内容约束和默认展示模式"。

## profile

```text
COURSE.profile = "codebase"
```

## 默认展示

codebase -> continuous 顶部滚动。不显示完成进度，顶部细进度条跟随滚动，圆点根据滚动位置 active/visited。

## style

```text
COURSE.style = "default"   // 缺省
COURSE.style = "apple-blue"
```

## 内容偏好

- 优先使用代码相关 block（`code-translation` / `actor-chat` / `flow` / `architecture` / `debug-case`）。
- 推荐写完整 `COURSE.context`（`title` / `path` / `summary` / `tags`），不含 `type`。
- 每节尽量包含真实代码片段、互动元素、应用型测验和代码来源。
- 复杂代码库先写 briefs（见 `source-adapters/codebase.md` 和 `pedagogy/codebase/brief-template.md`）。

## sources 形态

真实 repo 文件路径，最好带行号。

## 节数

默认 6-8 节（可按代码库规模调整），最后一节总复习。不再固定 4-6 节。

## 短示例（仅做格式参考）

下面是一个 codebase 课程的格式参考，**不是完整课程**，也**不要放进默认 `data.js`**。它只展示 `profile` / `style` / `context` / `sources` / `code-translation` 的写法。

```js
var COURSE = {
  schemaVersion: "1.2.0",
  profile: "codebase",
  style: "default",
  showIcons: true, showQuiz: true, showFinalQuiz: true,
  title: "读懂 X 项目",
  badge: "代码库课程",
  description: "带你从一次真实操作追踪到底层代码。",
  duration: "35",
  context: {
    title: "X",
    path: "https://github.com/your/x",
    summary: "X 是一个做某事的项目。",
    tags: ["TypeScript", "Node"]
  },
  lessons: [
    {
      id: 1,
      title: "一次操作背后发生了什么",
      goal: "从一个真实用户操作追踪到代码。",
      concepts: ["入口", "数据流"],
      objectives: ["知道入口文件在哪", "看懂一次请求的路径"],
      body: [
        { type: "p", text: "想象你点击了分析按钮，下面是底层发生的事。" },
        { type: "code-translation",
          label: "入口处理",
          file: "src/handler.ts:12-20",
          lang: "TypeScript",
          code: "export function handle(req: Req) {\n  const parsed = parse(req.url);\n  return run(parsed);\n}",
          explanation: [
            "handle 是请求入口，接收一个 Req。",
            "先把 url 解析成结构化对象，方便后续处理。",
            "再把解析结果交给 run 执行，职责清晰。"
          ]
        }
      ],
      flashcards: [
        { front: "handle 函数做什么？", back: "请求入口，解析 url 后交给 run 执行。" }
      ],
      quiz: [
        { question: "要新增一个前置校验，应该加在哪？",
          options: [
            { text: "parse 之前", correct: true, feedback: "在解析前校验原始输入，避免无效请求进入后续流程。" },
            { text: "run 之后", correct: false, feedback: "run 之后已经执行完，校验太晚了。" }
          ]
        }
      ],
      sources: [
        { label: "入口处理", url: "src/handler.ts:12-20" },
        { label: "README", url: "README.md" }
      ]
    }
    // ... 其余课程节省略
  ]
};
```

短示例不能展示：`context.type`、自由 HTML、长篇课程正文。
