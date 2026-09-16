/* ═══════════════════════════════════════════════════════════════
   COURSE DATA — 每门课只有这个文件要改。
   字段清单和 block 结构见 references/schema.md，不要凭记忆写。
   最后一节（id === lessons.length）是总复习，flashcards 写 []。
   ═══════════════════════════════════════════════════════════════ */

var COURSE = {
  schemaVersion: "2.0.0",   // 必填
  profile: "general",        // 必填："general"（侧栏分页）| "codebase"（顶部滚动）
  style: "default",          // 必填："default"（暖橙）| "apple-blue"（苹果蓝）
  showIcons: true,           // false 则全局隐藏 emoji 图标
  showQuiz: true,            // false 则关闭普通节测验
  showFinalQuiz: true,       // false 则关闭总复习测验
  title: "COURSE_TITLE",
  badge: "BADGE_TEXT",
  description: "COURSE_DESCRIPTION",
  duration: "25",
  lessons: []
};
