# Source Adapter: codebase

> 何时阅读：输入是代码库（repo、源码、当前代码库、GitHub 链接、"这个代码库"）时阅读。回答"来源材料怎么读"。

## 输入处理

- 用户给 GitHub 链接时，先克隆仓库再分析。
- 用户说"这个代码库"或"当前代码"时，使用当前工作目录。
- 不要要求用户解释产品。自己从 README、入口文件、UI 和主要模块判断项目做什么。

## 必须读取

- README
- 入口文件
- UI 或 CLI 入口
- 主要模块
- 数据层
- API 或外部服务
- 测试或示例
- 真实代码片段

## 必须提取

- 项目做什么
- 一条核心用户路径
- 主要角色：组件、服务、模块、脚本、数据层
- 关键 API、数据流和通信模式
- 技术栈以及每部分作用
- 真实代码片段（不改写、不清理、不伪造）
- 常见错误和调试入口
- sources 文件路径和行号

## sources 形态

代码库课程的 `sources.url` 是真实 repo 文件路径，最好带行号：

```text
src/example.ts:12-24
src/service/api.ts:8-30
README.md
```

来源必须可追溯：学习者打开文件能看到同样的片段。

## 复杂代码库

多节、需要并行或分段生成时，先写简报到 `briefs/0N-slug.md`（模板见 `pedagogy/codebase/brief-template.md`）。简报让每节独立生成，不必反复读整个代码库，且后续生成 `data.js` 时不重新读完整代码库。

## 输出约束

见 `references/profiles/codebase.md`。
