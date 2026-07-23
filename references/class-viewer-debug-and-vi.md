# Debug & VI

> 何时阅读：开发 class-viewer 或需要用 agent 自测组件时阅读。生成课程时不需要阅读。

class-viewer 提供两套开发自测工具：JS 调试 API（`ClassViewerDebug`）和 VI 视觉检查页面（`vi.html`）。

## ClassViewerDebug

`window.ClassViewerDebug` 挂载在 `script.js` 初始化末尾，供 agent 通过 CDP eval 直接操作页面，不需要 click、查选择器、滚动页面。

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

VI 文件放在独立的 `assets/class-viewer-vi/` 目录下（不在模板目录 `assets/class-viewer/` 内）：

```text
assets/class-viewer-vi/
  vi.html
  vi-data.js
  vi-desktop.png
```

只有一套 VI fixture，`profile = "codebase"`、continuous 模式，同时覆盖所有通用 block 和代码相关 block、闪卡/测验交互、长文本和空状态。

`vi.html` 复用同一套阅读器（`styles.css`、`page.js`、`script.js`），只换数据源为 `vi-data.js`。

### 使用方式

```text
打开 vi.html 直接查看
用 ClassViewerDebug 操作 vi 页面中的交互组件
```

### 规则

- VI 页面仅供开发自测，不作为课程模板。
- 生成课程时不要复制或修改 `vi.html` 和 `vi-data.js`。
- `spaceclone` 只复制模板目录 `assets/class-viewer/`，不会复制 VI 目录，因此 VI 文件不会进入课程制品。
