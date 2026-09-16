---
name: lesson-generator
version: "2.0.0"
description: 把主题或代码库转成中文互动课程。复用一套 HTML/CSS/JS 模板，每次生成只改 data.js。
---

当用户请求互动课程、迷你课程、学习指南、课程模块、闪卡、测验、知识检查、代码库讲解时使用。它构建一个独立的、可直接在浏览器中使用的多课时课程。

支持两种课程，通过 `COURSE.profile` 分流：

- `general`：普通主题
- `codebase`：代码库、源码

两种课程共用同一套 class-viewer、同一份 schema、同一套流程，差异全部收在各自的 track 文件里（来源怎么读、输出约束、怎么教）。

除非用户要求其他语言，否则使用中文编写课程内容。

## 架构

课程拆为两层：class-viewer（课程阅读器） 与可变的课程数据（`data.js`）。

- `init-course.mjs` 负责把 `assets/class-viewer/` 下的五个文件复制到工作目录。其中 `index.html`、`styles.css`、`script.js`、`page.js` 是冻结的——一旦写入就不再修改。
- `data.js` 只包含一个占位 `COURSE` 对象，每次生成课程时由你全新编写覆盖它。`data.js` 必须声明 `schemaVersion`（当前 `2.0.0`，详见 `references/schema.md`）、`COURSE.profile`、`COURSE.style`。
- 配色通过 `COURSE.style` 切换，只支持 `"default"`（暖橙，默认）和 `"apple-blue"`（苹果蓝）。
- 不要假设存在任何后端、数据库或外部服务。

## 参考

始终阅读：
- `references/workflow.md`（课程制作主流程）
- `references/schema.md`（COURSE schema 与内容块规则）
- `references/content-style.md`（共同教学法）

按 profile 再读一个：
- 输入是代码库 -> `references/track-codebase.md`
- 输入是普通主题、资料、网页、笔记 -> `references/track-general.md`

按需阅读：
- `references/emoji.md`（挑 emoji 时）
- `references/brief-template.md`（复杂代码库分段生成时）

仅在开发 class-viewer 本身时读 `references/class-viewer.md`。

## 验证课程

生成完 `data.js` 后用 `validate` 校验（schema 结构 + 逐节渲染）：

```bash
node {SKILL_DIR}/scripts/upgrade-class-viewer.mjs validate <课程目录> --render
```

`{SKILL_DIR}` 是本技能所在目录。课程目录是独立参数，不要假设当前目录是技能仓库。

## 辅助功能：升级已有课程

class-viewer 升级后，已生成的课程制品（旧 class-viewer 快照 + 旧 `data.js`）用 `all` 一步升级（copy + upgrade + validate）：

```bash
node {SKILL_DIR}/scripts/upgrade-class-viewer.mjs all <课程目录>
```

## 测试（仅开发本技能时）

```bash
bash {SKILL_DIR}/scripts/tests/test.sh        # 全部测试（单元 + e2e）
node {SKILL_DIR}/scripts/tests/test-unit.mjs  # 仅单元测试
bash {SKILL_DIR}/scripts/tests/test-e2e.sh    # 仅 e2e（需要 agent-browser）
```
