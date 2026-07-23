/* VI DATA - visual inspection sample. NOT a course template. DO NOT copy for course generation. */

var COURSE = {
  schemaVersion: "1.2.0",
  profile: "codebase",
  style: "default",
  showIcons: true,
  showQuiz: true,
  showFinalQuiz: true,
  title: "VI - 全组件检查",
  badge: "视觉检查",
  description: "覆盖所有通用 block 和代码库扩展 block 的视觉检查页面。",
  duration: "5",
  context: {
    title: "class-viewer",
    path: "assets/class-viewer/",
    summary: "class-viewer 阅读器组件库，包含通用课程组件和代码库专属组件。",
    tags: ["VI", "视觉检查", "组件"]
  },
  lessons: [
    {
      id: 1,
      title: "通用基础组件",
      goal: "检查文本段落、洞察卡片、AI对话、代码示例、案例示例的渲染效果。",
      concepts: ["p", "insight", "ai-dialog", "code-example", "case-example"],
      objectives: ["确认各通用 block 正确渲染", "确认 data-block-type 属性存在", "确认图标和标签显示正确"],
      body: [
        { type: "p", text: "这是一个普通文本段落，用于检查基础排版和行高。" },
        { type: "p", text: "这是第二个段落。段落之间应该有合适的间距，文字颜色和字号应该与设计一致。这是一个比较长的段落，用来测试段落内文字换行的效果。当文字足够长的时候，它应该自动换行到下一行，并且行与行之间保持舒适的阅读间距。" },
        { type: "insight", icon: "💡", title: "关键洞察", text: "这是 insight 组件，左侧有彩色边框，标题加粗显示，正文跟随其后。" },
        { type: "insight", icon: "⚠️", title: "注意事项", text: "insight 可以没有标题，只展示文本内容。这种情况下样式应该保持一致。" },
        { type: "ai-dialog", label: "对话示例", messages: [
          { role: "user", text: "这段代码是做什么的？" },
          { role: "ai", text: "这段代码实现了一个简单的缓存层，通过 Map 存储已计算的结果来避免重复计算。" },
          { role: "user", text: "那如果数据量很大怎么办？" },
          { role: "ai", text: "可以考虑添加 LRU 淘汰策略，限制 Map 的最大容量，当超过限制时移除最久未使用的条目。" }
        ]},
        { type: "code-example", label: "代码示例", lang: "JavaScript", code: "function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}" },
        { type: "case-example", label: "案例：缓存穿透", scenario: "用户请求一个不存在的数据，缓存和数据库都没有，导致每次请求都打到数据库。", analysis: "使用布隆过滤器在缓存前做一层拦截，或者将不存在的 key 也缓存一个空值，设置较短的过期时间。" }
      ],
      flashcards: [
        { front: "什么是 idempotent key？", back: "幂等键，用于保证操作的幂等性，相同 key 的重复请求只会执行一次。" },
        { front: "什么是 LRU？", back: "Least Recently Used，最近最少使用，一种缓存淘汰策略。" }
      ],
      quiz: [
        {
          question: "insight 组件的视觉特征是什么？",
          options: [
            { text: "左侧有彩色边框", correct: true, feedback: "正确。insight 组件左侧有 3px 的彩色边框。" },
            { text: "背景是全黑的", correct: false, feedback: "不对，insight 的背景是 surface 色。" },
            { text: "没有边框", correct: false, feedback: "insight 有边框。" },
            { text: "文字居中对齐", correct: false, feedback: "insight 的文字是左对齐的。" }
          ]
        }
      ],
      sources: [
        { label: "设计文档", url: "https://example.com/design" }
      ]
    },
    {
      id: 2,
      title: "列表与闪卡",
      goal: "检查 pattern-cards 列表和闪卡组件的渲染。",
      concepts: ["list-block", "flashcards"],
      objectives: ["确认 list-block 网格布局", "确认闪卡翻转动画"],
      body: [
        { type: "list-block", items: [
          { icon: "📦", title: "模块化", desc: "将代码拆分为独立、可复用的模块" },
          { icon: "🔒", title: "封装", desc: "隐藏内部实现细节" },
          { icon: "🔗", title: "组合", desc: "通过组合小模块构建复杂系统" }
        ]},
        { type: "p", text: "下面是闪卡部分，点击卡片可以翻转查看答案。" }
      ],
      flashcards: [
        { icon: "🧠", front: "SOLID 原则中的 S 代表什么？", back: "单一职责原则 (Single Responsibility Principle)" },
        { icon: "📐", front: "SOLID 原则中的 O 代表什么？", back: "开闭原则 (Open/Closed Principle)" },
        { icon: "🔄", front: "SOLID 原则中的 L 代表什么？", back: "里氏替换原则 (Liskov Substitution Principle)" }
      ],
      quiz: [],
      sources: []
    },
    {
      id: 3,
      title: "代码翻译组件",
      goal: "检查 code-translation 的双栏布局。",
      concepts: ["code-translation"],
      objectives: ["确认代码面板和解释面板并排显示", "确认移动端自动切换为上下布局"],
      body: [
        { type: "code-translation", label: "代码翻译示例", file: "src/utils/cache.ts", lang: "TypeScript",
          code: "class LRUCache<K, V> {\n  private capacity: number;\n  private map: Map<K, V>;\n\n  constructor(capacity: number) {\n    this.capacity = capacity;\n    this.map = new Map();\n  }\n}",
          explanation: [
            "定义一个 LRU 缓存类，使用泛型 K 和 V 表示键和值的类型。",
            "capacity 属性限制缓存的最大条目数。",
            "内部使用 JavaScript 的 Map 来存储数据，Map 会记住插入顺序。",
            "构造函数接收最大容量参数，初始化一个空的 Map。"
          ]
        }
      ],
      flashcards: [],
      quiz: [],
      sources: []
    },
    {
      id: 4,
      title: "对话与流程图",
      goal: "检查 actor-chat 和 flow 组件的交互。",
      concepts: ["actor-chat", "flow"],
      objectives: ["确认 actor-chat 逐条播放", "确认 flow 步骤动画", "确认 debug API 可操作"],
      body: [
        { type: "p", text: "下面是一个角色对话组件，点击按钮可以逐条播放或一键播放全部。" },
        { type: "actor-chat", label: "代码评审对话", messages: [
          { actor: "开发者 A", text: "我觉得这个函数太长了，应该拆成几个小的。" },
          { actor: "开发者 B", text: "同意，不过拆太细也会增加理解成本，我们按职责拆成三个吧。" },
          { actor: "开发者 A", text: "好，那我把验证逻辑、业务逻辑和持久化逻辑分别提取出来。" },
          { actor: "开发者 B", text: "这样好多了，每个函数都只做一件事。" }
        ]},
        { type: "p", text: "下面是一个数据流步骤图，点击「下一步」逐步展示流程。" },
        { type: "flow", label: "用户注册流程", nodes: ["客户端", "API 网关", "用户服务", "数据库", "消息队列"],
          steps: [
            { from: "客户端", to: "API 网关", text: "发送注册请求" },
            { from: "API 网关", to: "用户服务", text: "路由到用户服务" },
            { from: "用户服务", to: "数据库", text: "写入用户记录" },
            { from: "用户服务", to: "消息队列", text: "发布注册事件" }
          ]
        }
      ],
      flashcards: [],
      quiz: [],
      sources: []
    },
    {
      id: 5,
      title: "架构图与调试案例",
      goal: "检查 architecture 和 debug-case 组件。",
      concepts: ["architecture", "debug-case"],
      objectives: ["确认架构卡片网格布局", "确认调试案例信息展示"],
      body: [
        { type: "architecture", nodes: [
          { id: "web", title: "Web 前端", desc: "React SPA，处理用户交互和状态管理" },
          { id: "api", title: "API 层", desc: "Express 服务，处理业务逻辑和权限验证" },
          { id: "db", title: "数据库", desc: "PostgreSQL 主库 + Redis 缓存" },
          { id: "worker", title: "后台任务", desc: "Bull 队列处理异步任务和定时作业" }
        ], edges: [
          { from: "web", to: "api", label: "REST API" },
          { from: "api", to: "db", label: "读写" },
          { from: "api", to: "worker", label: "投递任务" }
        ]},
        { type: "debug-case", label: "调试案例：内存泄漏", symptom: "服务运行 24 小时后内存使用量持续增长，最终 OOM。",
          likelyCause: "事件监听器未在组件卸载时移除，导致闭包持有大对象引用无法被 GC 回收。",
          firstFiles: ["src/components/DataTable.tsx", "src/hooks/useEventListener.ts"],
          fixHint: "在 useEffect 的清理函数中调用 removeEventListener，确保组件卸载时释放引用。"
        }
      ],
      flashcards: [],
      quiz: [],
      sources: []
    },
    {
      id: 6,
      title: "长文本与空状态",
      goal: "检查长文本截断和空状态显示。",
      concepts: ["edge-cases"],
      objectives: ["确认长文本不撑破布局", "确认空闪卡区正确隐藏", "确认空测验区正确隐藏"],
      body: [
        { type: "p", text: "这是一个非常长的段落，用于测试文本在极限情况下的渲染表现。".repeat(20) },
        { type: "insight", icon: "📝", title: "超长标题测试--".repeat(10), text: "超长正文测试--".repeat(30) },
        { type: "code-example", label: "超长代码", lang: "Text", code: "// " + "A".repeat(200) }
      ],
      flashcards: [],
      quiz: [],
      sources: []
    },
    {
      id: 7,
      title: "期末测验",
      goal: "检查最终测验的评分功能。",
      concepts: ["final-quiz"],
      objectives: ["确认最终测验全部答对显示满分", "确认答错显示正确答案"],
      body: [
        { type: "p", text: "这是最后一节，包含最终测验。答对所有题看看满分提示。" }
      ],
      flashcards: [],
      quiz: [
        {
          question: "VI 页面的用途是什么？",
          options: [
            { text: "视觉检查组件的渲染效果", correct: true, feedback: "正确！VI 页面用于集中检查所有组件的视觉呈现。" },
            { text: "作为课程模板使用", correct: false, feedback: "不对，VI 数据不是课程模板。" },
            { text: "替换 index.html", correct: false, feedback: "VI 是补充页面，不替换 index.html。" }
          ]
        },
        {
          question: "ClassViewerDebug 的作用是什么？",
          options: [
            { text: "让 agent 通过 JS API 操作页面进行自测", correct: true, feedback: "正确！agent 可以用 eval 直接操作页面组件。" },
            { text: "给最终用户使用的调试工具", correct: false, feedback: "不对，这是开发自测用的。" },
            { text: "替代浏览器 DevTools", correct: false, feedback: "这是辅助工具，不是 DevTools 的替代品。" }
          ]
        }
      ],
      sources: []
    }
  ]
};
