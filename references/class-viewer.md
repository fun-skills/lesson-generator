# class-viewer（仅开发时读）

> 何时阅读：只有开发 class-viewer 本身（改渲染、加 block 类型、调样式）时才读。生成课程不读本文件。

## 运行时结构

`script.js` 提供共享运行时，`page.js` 提供页面配置，`data.js` 提供内容。

### `script.js`

- 读取 `COURSE` 和 `COURSE_PAGE`
- 渲染首页、侧栏、课程页
- 渲染连续顶部版课程页
- 渲染通用内容块（`p` / `ai-dialog` / `code-example` / `case-example` / `insight` / `list-block`）
- 渲染闪卡、测验、来源
- 读取 `COURSE.backLink` 渲染侧栏顶部的返回链接（不配置则容器为空）
- normal 侧栏版：完成进度、重置、左右键、侧栏折叠
- continuous 顶部版：滚动进度条、active 圆点、visited 圆点
- 挂载 `ClassViewerDebug`

### `page.js`

- 根据 `COURSE.profile` 设置默认 `viewMode`（`general` -> paginated，`codebase` -> continuous）
- `COURSE.context` 展示
- 代码相关 block renderer（`code-translation` / `actor-chat` / `flow` / `architecture` / `debug-case`）

### block 渲染顺序

```text
if core renderer exists:      use core renderer
else if page renderer exists: use page renderer
else:                         show unsupported block warning
```

class-viewer 全量支持通用 block 和代码相关 block。普通课程默认不生成代码相关 block，但渲染器始终存在。

## ClassViewerDebug

`window.ClassViewerDebug` 挂在 `script.js` 初始化末尾，供 agent 通过 CDP eval 直接操作页面，不需要 click、查选择器、滚动页面。

### API

```text
ClassViewerDebug.course()        -> { title, lessonCount, viewMode }
ClassViewerDebug.state()         -> { currentLesson, scrollProgress }
ClassViewerDebug.getLessonScope(lessonId?) -> DOM element 或 null
ClassViewerDebug.goOverview()    -> state()
ClassViewerDebug.goLesson(id)    -> state()
ClassViewerDebug.flipFlashcard(index, lessonId?)  -> snapshot()
ClassViewerDebug.answerQuiz(questionIndex, optionIndex, lessonId?) -> snapshot()
ClassViewerDebug.snapshot()      -> { title, activeLesson, scroll, blocks, activeNav, unsupportedBlocks, quizAnsweredCount, flippedFlashcardsCount }
ClassViewerDebug.playActorChat(blockIndex)   -> { ok } | { error }
ClassViewerDebug.resetActorChat(blockIndex)  -> { ok } | { error }
ClassViewerDebug.playFlow(blockIndex)        -> { ok } | { error }
ClassViewerDebug.resetFlow(blockIndex)       -> { ok } | { error }
```

互动 block 的 debug 控制直接挂在 `ClassViewerDebug` 上，不按 profile 区分。页面没有对应 block 时返回错误对象，不抛异常。`flipFlashcard` / `answerQuiz` 在 paginated 和 continuous 模式都可用。

### 使用方式

```text
eval window.ClassViewerDebug.course()
eval window.ClassViewerDebug.goLesson(2)
eval window.ClassViewerDebug.flipFlashcard(0)
eval window.ClassViewerDebug.answerQuiz(0, 0)
eval window.ClassViewerDebug.playActorChat(0)
eval window.ClassViewerDebug.snapshot()
```

### 规则

- 只用于开发和 agent 自测。
- 不改变课程数据。
- 不依赖中文按钮文案。
- 找不到目标时返回错误对象，不抛异常。

## data-block-type

所有 block 外层元素都有 `data-block-type` 属性，agent 不需要猜选择器。

通用 block（`script.js` 渲染）：

```text
p  insight  ai-dialog  code-example  case-example  list-block
```

代码相关 block（`page.js` 渲染）：

```text
code-translation  actor-chat  flow  architecture  debug-case
```

## VI 页面

VI 页面不是独立文件，而是「一门覆盖全部 block 的临时课程」：把模板复制到临时目录，数据源换成 `vi-data.js`。所以没有第二份 `index.html` 需要同步。

```bash
bash scripts/dev-vi.sh
```

`assets/class-viewer-vi/` 只有一个数据文件（不在模板目录 `assets/class-viewer/` 内）：

```text
assets/class-viewer-vi/
  vi-data.js      只有一套 fixture，profile = "codebase"、continuous 模式，
                  同时覆盖所有通用 block 和代码相关 block、闪卡/测验交互、长文本和空状态
```

### 使用方式

```text
bash scripts/dev-vi.sh        把模板复制到临时目录并打开
用 ClassViewerDebug 操作页面中的交互组件
```

### 规则

- VI 页面仅供开发自测，不作为课程模板。
- `init-course.mjs` 只复制模板目录 `assets/class-viewer/`，不会复制 VI 目录，因此 VI 数据不会进入课程制品。
