# Workflow

普通课程和代码库课程共用这一套流程。两者的差异（来源怎么读、怎么教）全部收在对应的 track 文件里。

## 0. 判断输入类型

- 代码库（repo、源码、当前代码库、GitHub 链接、"这个代码库"）-> `profile = "codebase"`，读 `track-codebase.md`
- 其他（主题、资料、网页、笔记）-> `profile = "general"`，读 `track-general.md`

## 1. 初始化课程目录

在目标课程目录运行：

```bash
node {SKILL_DIR}/scripts/init-course.mjs
```

它会补齐 `index.html`、`styles.css`、`script.js`、`page.js`、`data.js`，已存在的文件不动，所以重复运行安全、也不会覆盖你写好的 `data.js`。五个文件里只有 `data.js` 可修改。

## 2. 收集来源并提取教学素材

按上一步选中的 track 文件读取来源、提取素材。

## 3. 必要时写 briefs/

复杂代码库（多节、需并行或分段生成）先写简报到 `briefs/0N-slug.md`，让每节可独立生成，不必反复读整个代码库。模板见 `brief-template.md`。普通课程通常不需要。

## 4. 设计课程结构

- 节数：默认 6-8，可按素材密度调整。
- 最后一节做总复习或综合应用，不引入全新主题。
- 明确前置要求，安排递进的顺序。
- 保持紧凑，不要给一般性请求交付一个长页面，也不要嵌入巨量文章或数据。

推荐的节级路线见对应 track 文件。不要把大纲拿给用户审批，内部设计后直接生成。

## 5. 写 data.js

只写全局 `COURSE` 对象。每门课都必须写 `COURSE.schemaVersion`、`COURSE.profile` 和 `COURSE.style`。

字段清单和内容块结构以 `schema.md` 为准，不要凭记忆写。

## 6. 验证

```bash
node {SKILL_DIR}/scripts/upgrade-class-viewer.mjs validate <课程目录> --render
```

先跑校验，失败项改 `data.js` 后重跑。校验通过后再用浏览器打开 `index.html` 看版式；如果浏览器限制本地文件加载，启动静态服务后再打开。
