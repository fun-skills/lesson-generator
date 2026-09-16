// Shared schema validation for lesson-generator class-viewer COURSE data.
// Used by test-unit.mjs and upgrade-class-viewer.mjs validate.

import { CURRENT_VERSION } from "./migrate.mjs";

export const STYLES = new Set(["default", "apple-blue"]);
export const PROFILES = new Set(["general", "codebase"]);
export const KNOWN_BLOCKS = new Set([
  "p", "ai-dialog", "code-example", "case-example", "insight", "list-block",
  "code-translation", "actor-chat", "flow", "architecture", "debug-case",
]);

// 散文字段里出现标签、闭合标签、注释都算违规。
// 不匹配 "a < b" 这种比较（`<` 后面是空格），但匹配 `<br/>`、`<!--x-->`、`</div>`、`<svg/onload=...>`。
const INLINE_HTML = /<[a-zA-Z!]|<\/[a-zA-Z]/;
// 这些字段放的是代码或路径，允许含尖括号。注意 url 不在其中：
// general 的 sources.url 是真实链接，codebase 的是文件路径，都不该出现尖括号。
const NON_PROSE_KEYS = new Set(["code", "file", "lang", "id", "type"]);

// 渲染时会被直接遍历或拼接的字段。缺了不是显示 undefined，而是整页抛异常。
const BLOCK_SHAPES = {
  p: { text: "string" },
  insight: { text: "string" },
  "ai-dialog": { messages: [{ role: "string", text: "string" }] },
  "code-example": { code: "string" },
  "case-example": { scenario: "string", analysis: "string" },
  "list-block": { items: [{ title: "string", desc: "string" }] },
  "code-translation": { code: "string", explanation: "string[]" },
  "actor-chat": { messages: [{ actor: "string", text: "string" }] },
  flow: { nodes: "string[]", steps: [{ from: "string", to: "string", text: "string" }] },
  architecture: { nodes: [{ id: "string", title: "string", desc: "string" }] },
  "debug-case": { symptom: "string", likelyCause: "string", fixHint: "string" },
};

// URL 解析器会先删掉所有 ASCII 制表符和换行，再裁掉首尾的控制符与空格。
// 不照做的话，`"  javascript:..."`、`"java\nscript:..."` 都能绕过协议判断。
export function normalizeUrl(url) {
  return String(url)
    .replace(/[\t\n\r]/g, "")
    .replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, "");
}

export const DANGEROUS_SCHEME = /^(javascript|data|vbscript):/i;

// 判定一个来源 URL 是否用了脚本式协议。
export function isDangerousUrl(url) {
  return DANGEROUS_SCHEME.test(normalizeUrl(url));
}

function shapeOk(value, spec) {
  if (spec === "string") return typeof value === "string" && value.length > 0;
  if (spec === "string?") return typeof value === "string";
  if (spec === "string[]") return Array.isArray(value) && value.length > 0 && value.every((s) => typeof s === "string");
  if (Array.isArray(spec)) return Array.isArray(value) && value.length > 0 && value.every((item) => shapeOk(item, spec[0]));
  return Boolean(value) && typeof value === "object" && Object.entries(spec).every(([k, s]) => shapeOk(value[k], s));
}

// 递归收集一个 block 里所有散文字段，跳过代码和路径类字段。
function contentStrings(node, out = []) {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => contentStrings(n, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (!NON_PROSE_KEYS.has(k)) contentStrings(v, out);
    }
  }
  return out;
}

// validateCourse(name, course, opts) -> { passed, failed, failures[] }
// opts.allowEmptyLessons: skip the non-empty lessons check (for placeholder data.js).
export function validateCourse(name, course, opts = {}) {
  const failures = [];
  let passed = 0;
  const check = (cond, label, detail) => {
    if (cond) passed++;
    else failures.push({ label: `${name}: ${label}`, detail });
  };

  // 校验器本身不能因为畸形输入抛异常 —— 它的职责就是把问题报出来。
  if (!course || typeof course !== "object" || Array.isArray(course)) {
    failures.push({ label: `${name}: COURSE is object`, detail: `got ${JSON.stringify(course)}` });
    return { passed, failed: failures.length, failures };
  }
  passed++;

  check(course.schemaVersion === CURRENT_VERSION, "schemaVersion = " + CURRENT_VERSION, `got ${course.schemaVersion}`);

  const profile = (course && course.profile) || "general";
  check(PROFILES.has(profile), `profile valid (${profile})`, `got ${profile}`);

  const style = (course && course.style) || "default";
  check(STYLES.has(style), `style valid (${style})`, `got ${style}`);

  check(typeof course.title === "string" && course.title.length > 0, "title");
  check(typeof course.badge === "string", "badge");
  check(typeof course.description === "string" && course.description.length > 0, "description");
  check(typeof course.duration === "string", "duration");

  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  check(Array.isArray(course.lessons), "lessons array");
  if (!opts.allowEmptyLessons) {
    check(lessons.length > 0, "lessons non-empty", `got ${lessons.length}`);
  }

  if (course.backLink !== undefined && course.backLink !== null) {
    check(shapeOk(course.backLink, { href: "string", label: "string" }), "backLink shape", `got ${JSON.stringify(course.backLink)}`);
    if (course.backLink && typeof course.backLink.href === "string") {
      check(!isDangerousUrl(course.backLink.href), "backLink href scheme", `got ${JSON.stringify(course.backLink.href)}`);
    }
  }

  if (course.context !== undefined && course.context !== null) {
    if (typeof course.context !== "object" || Array.isArray(course.context)) {
      check(false, "context is object", `got ${JSON.stringify(course.context)}`);
    } else {
      check(!("type" in course.context), "context has no type", "context.type present");
      check(typeof course.context.title === "string", "context.title");
    }
  }

  lessons.forEach((l, i) => {
    const ln = `${name} L${i + 1}`;
    if (!l || typeof l !== "object" || Array.isArray(l)) {
      check(false, `${ln}: lesson is object`, `got ${JSON.stringify(l)}`);
      return;
    }
    check(l.id === i + 1, `${ln}: id sequential`, `got ${l.id}`);
    check(typeof l.title === "string", `${ln}: title`);
    check(typeof l.goal === "string", `${ln}: goal`);
    // lesson 级字段也走 innerHTML（侧栏标题、概览卡片、闪卡、来源、题干），一并检查。
    const lessonHtml = contentStrings({ ...l, body: [] }).find((s) => INLINE_HTML.test(s));
    check(!lessonHtml, `${ln}: no inline html`, lessonHtml && `got "${lessonHtml}"`);

    check(Array.isArray(l.concepts), `${ln}: concepts array`);
    check(Array.isArray(l.objectives), `${ln}: objectives array`);
    check(Array.isArray(l.body), `${ln}: body array`);
    check(Array.isArray(l.flashcards), `${ln}: flashcards array`);
    check(Array.isArray(l.quiz), `${ln}: quiz array`);
    check(Array.isArray(l.sources), `${ln}: sources array`);

    (Array.isArray(l.flashcards) ? l.flashcards : []).forEach((c, i) => {
      check(shapeOk(c, { front: "string", back: "string" }), `${ln} flashcards[${i}]`, `got ${JSON.stringify(c)}`);
    });
    (Array.isArray(l.sources) ? l.sources : []).forEach((s, i) => {
      // url 允许空字符串：general 的 sources 可以是「来源说明」，本来就没有链接。
      check(shapeOk(s, { label: "string", url: "string?" }), `${ln} sources[${i}]`, `got ${JSON.stringify(s)}`);
      if (s && typeof s.url === "string") {
        check(!isDangerousUrl(s.url), `${ln} sources[${i}]: url scheme`, `got ${JSON.stringify(s.url)}`);
      }
    });

    (Array.isArray(l.body) ? l.body : []).forEach((b, bi) => {
      if (!b || typeof b !== "object" || Array.isArray(b)) {
        check(false, `${ln} body[${bi}]: block is object`, `got ${JSON.stringify(b)}`);
        return;
      }
      check(KNOWN_BLOCKS.has(b.type), `${ln} body[${bi}]: known type ${b.type}`, `got ${b.type}`);
      const spec = BLOCK_SHAPES[b.type];
      if (spec) {
        for (const [key, s] of Object.entries(spec)) {
          check(shapeOk(b[key], s), `${ln} body[${bi}] ${b.type}.${key}`, `got ${JSON.stringify(b[key])}`);
        }
      }
      if (b.type === "flow") {
        const nodes = new Set(b.nodes || []);
        (Array.isArray(b.steps) ? b.steps : []).forEach((s, si) => {
          if (!s || typeof s !== "object") {
            check(false, `${ln} flow[${bi}] step[${si}]: step is object`, `got ${JSON.stringify(s)}`);
            return;
          }
          check(nodes.has(s.from), `${ln} flow[${bi}] step[${si}].from in nodes`, `got ${s.from}`);
          check(nodes.has(s.to), `${ln} flow[${bi}] step[${si}].to in nodes`, `got ${s.to}`);
        });
      }
      const html = contentStrings(b).find((s) => INLINE_HTML.test(s));
      check(!html, `${ln} body[${bi}]: no inline html`, html && `got "${html}"`);
    });

    (Array.isArray(l.quiz) ? l.quiz : []).forEach((q, qi) => {
      if (!q || typeof q !== "object" || Array.isArray(q)) {
        check(false, `${ln} quiz[${qi}]: question is object`, `got ${JSON.stringify(q)}`);
        return;
      }
      check(typeof q.question === "string" && q.question.length > 0, `${ln} quiz[${qi}]: question`);
      const options = Array.isArray(q.options) ? q.options : [];
      const correct = options.filter((o) => o && o.correct);
      check(correct.length === 1, `${ln} quiz[${qi}]: one correct`, `got ${correct.length}`);
      check(options.every((o) => o && typeof o.feedback === "string" && o.feedback.length > 0), `${ln} quiz[${qi}]: all options have feedback`);
      check(options.every((o) => o && typeof o.text === "string"), `${ln} quiz[${qi}]: options are objects`);
    });
  });

  return { passed, failed: failures.length, failures };
}
