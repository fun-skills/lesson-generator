# Workflow

普通课程和代码库课程共用，只在来源、profile、教学法上分流。

## 0. 判断输入类型

- 代码库（repo、源码、当前代码库、GitHub 链接、"这个代码库"）-> `profile = "codebase"`
- 其他（主题、资料、网页、笔记）-> `profile = "general"`

按结果选择对应 source adapter、profile、pedagogy。

## 1. 初始化课程目录

在目标课程目录运行：

```bash
node {SKILL_DIR}/scripts/spaceclone.mjs \
  --template-dir {SKILL_DIR}/assets/class-viewer \
  --here --in .
```

这会补齐 `index.html`、`styles.css`、`script.js`、`page.js`、`data.js`。只有 `data.js` 可修改。

## 2. 收集来源材料

按选择的 source adapter 读取来源：

- general：主题资料、网页、笔记，提取关键概念和可引用 URL。
- codebase：README、入口文件、UI/CLI 入口、主要模块、数据层、API、测试，提取真实代码片段和带行号的文件路径。

GitHub 链接先克隆仓库再分析。用户说"这个代码库"时使用当前工作目录。
不要要求用户解释产品，自己从 README 和入口文件判断。

## 3. 提取教学素材

- general：把资料拆成可理解的结构，提炼能让学习者继续追问 AI 的关键词。
- codebase：提取项目做什么、一条核心用户路径、主要角色、数据流、真实代码片段、常见错误。

## 4. 必要时写 briefs/

复杂代码库（多节、需并行或分段生成）先写简报到 `briefs/0N-slug.md`，让每节可独立生成，不必反复读整个代码库。模板见 `pedagogy/codebase/brief-template.md`。普通课程通常不需要。

## 5. 设计课程结构

- 节数：默认 6-8，可按素材密度调整。最后一节做总复习或综合应用。
- general：聚焦主题，递进顺序，先示例后抽象。
- codebase 推荐路线：1 项目做什么 + 一次真实操作 / 2 主要角色 / 3 数据怎么流动 / 4 外部世界、依赖、失败点 / 5 关键模式与更精确的 AI 指令 / 6 出错时怎么查 / 总复习。

不要把大纲拿给用户审批，内部设计后直接生成。

## 6. 写 data.js

只写全局 `COURSE` 对象。每门课都必须写 `COURSE.profile` 和 `COURSE.style`。

```text
COURSE.profile            // "general" | "codebase"
COURSE.style              // "default" | "apple-blue"
COURSE.title / badge / description / duration
COURSE.context            // 可选展示信息
COURSE.lessons[].objectives
COURSE.lessons[].body      // 通用 block +（codebase 时）代码相关 block
COURSE.lessons[].flashcards
COURSE.lessons[].quiz
COURSE.lessons[].sources
```

代码库课程推荐写完整 `COURSE.context`（`title` / `path` / `summary` / `tags`）。

## 7. 验证

用浏览器直接打开文件 `index.html`。如果浏览器限制本地文件加载，启动静态服务后再打开。
