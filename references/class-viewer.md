# Runtime

> 何时阅读：需要判断"内容应该写在哪里、展示应该由谁负责"时阅读。

## `script.js` 

- 读取 `COURSE` 和 `COURSE_PAGE`
- 渲染首页、侧栏、课程页
- 渲染连续顶部版课程页
- 渲染通用内容块（`p` / `ai-dialog` / `code-example` / `case-example` / `insight` / `list-block`）
- 渲染闪卡、测验、来源
- normal 侧栏版：完成进度、重置、左右键、侧栏折叠
- continuous 顶部版：滚动进度条、active 圆点、visited 圆点
- `ClassViewerDebug`（含 actor-chat / flow 等互动 block 的 debug 控制）

## `page.js` 

- 根据 `COURSE.profile` 设置默认 `viewMode`（`general` -> paginated，`codebase` -> continuous）
- `COURSE.context` 展示
- 代码相关 block renderer（`code-translation` / `actor-chat` / `flow` / `architecture` / `debug-case`）

`data.js` 是唯一可编辑文件。

## block 渲染顺序

```text
if core renderer exists:    use core renderer
else if page renderer exists: use page renderer
else:                       show unsupported block warning
```

class-viewer 全量支持通用 block 和代码相关 block。普通课程默认不生成代码相关 block，但渲染器始终存在。

## viewMode

由 `COURSE.profile` 决定（`page.js` 读取 `COURSE.profile` 设置 `viewMode`）：

```text
general  -> paginated   侧栏分页，保留完成进度和重置
codebase -> continuous   顶部滚动，不显示完成进度，圆点跟随滚动
```

不要在 `page.js` 里硬编码 `viewMode`，也不要用 `context.type` 分流。

## 主题

`COURSE.style` 只允许 `"default"`（缺省）和 `"apple-blue"`。`script.js` 把 `theme-<style>` 挂到 `<body>`：

```text
body.theme-default
body.theme-apple-blue
```

## 冻结边界

课程生成时不要修改 `index.html`、`styles.css`、`script.js`、`page.js`。只有在开发技能本身时才修改这些文件。

开发自测工具（`ClassViewerDebug`、`vi.html`、`vi-data.js`）见 `references/class-viewer-debug-and-vi.md`。
