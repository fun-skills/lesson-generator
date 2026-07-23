# Profile: general

> 何时阅读：写 general 课程的 `data.js` 时阅读。回答"`data.js` 内容约束和默认展示模式"。

## profile

```text
COURSE.profile = "general"
```

缺省 fallback 也是 `"general"`。

## 默认展示

general -> paginated 侧栏分页。侧栏显示完成进度和重置，顶部圆点不滚动。

## style

```text
COURSE.style = "default"   // 缺省
COURSE.style = "apple-blue"
```

## 内容偏好

- 通用 block 为主（`p` / `insight` / `ai-dialog` / `code-example` / `case-example` / `list-block`）。
- 不默认使用代码相关 block。
- `context` 一般不写；不写时不渲染 context 区域。

## sources 形态

URL 或来源说明，真实可点击。

## 节数

默认 6-8 节，最后一节总复习或综合应用。可按素材密度调整。
