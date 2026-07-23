---
name: lesson-generator
version: "2.0.0"
description: 把主题或代码库转成中文互动课程。复用一套 HTML/CSS/JS 模板，每次生成只改 data.js。
---

当用户请求互动课程、迷你课程、学习指南、课程模块、闪卡、测验、知识检查、代码库讲解时使用。它构建一个独立的、可直接在浏览器中使用的多课时课程。

同时支持两种课程，通过 `COURSE.profile` 分流：

- `general`：普通主题
- `codebase`：代码库、源码

两种课程共用同一套 class-viewer 和同一份 schema。差异只体现在三处：
- source adapter （来源怎么读）
- pedagogy（怎么教）
- profile（输出和展示设定）

除非用户要求其他语言，否则使用中文编写课程内容。

## 架构

课程拆为两层：class-viewer（课程阅读器） 与可变的课程数据（`data.js`）。

- `spaceclone` 负责把 `assets/class-viewer/` 下的五个文件复制到工作目录。其中 `index.html`、`styles.css`、`script.js`、`page.js` 是冻结的——一旦写入就不再修改。
- `data.js` 只包含一个占位 `COURSE` 对象，每次生成课程时由你全新编写覆盖它。`data.js` 必须声明 `schemaVersion`（当前 `1.2.0`，详见 `references/schema.md`）、`COURSE.profile`、`COURSE.style`。
- 配色通过 `COURSE.style` 切换，只支持 `"default"`（暖橙，默认）和 `"apple-blue"`（苹果蓝）。
- 不要假设存在任何后端、数据库或外部服务。

## 参考

始终阅读：
- `references/workflow.md`（课程制作主流程）
- `references/schema.md`（COURSE schema 与内容块规则）
- `references/pedagogy/*.md`（共同教学法）

如果输入是代码库：
- `references/source-adapters/codebase.md`
- `references/profiles/codebase.md`
- `references/pedagogy/codebase/*.md`

如果输入是一般性内容：
- `references/source-adapters/general.md`
- `references/profiles/general.md`
- `references/pedagogy/general/*.md`

按需阅读：
- `references/emoji.md`
- `references/debug-and-vi.md`
- `references/class-viewer.md`。

## 辅助功能：升级已有课程

class-viewer 升级后，已生成的课程制品（旧 class-viewer 快照 + 旧 `data.js`）用 `scripts/upgrade-class-viewer.mjs` 升级：

```bash
node scripts/upgrade-class-viewer.mjs all ./courses/my-course   # copy + upgrade + validate
```

## 测试

```bash
bash scripts/tests/test.sh            # 运行全部测试（单元 + e2e）
node scripts/tests/test-unit.mjs      # 仅运行单元测试
bash scripts/tests/test-e2e.sh        # 仅运行 e2e 测试（需要 agent-browser）
```
