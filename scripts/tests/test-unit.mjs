// Unit tests for lesson-generator class-viewer data + page adapter + migrations.
// Run: node scripts/tests/test-unit.mjs
// No DOM required.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { validateCourse } from "../lib/validate.mjs";
import { migrateCourse, CURRENT_VERSION } from "../lib/migrate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "..", "..", "assets", "class-viewer");
let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${name}${extra ? " -> " + extra : ""}`); }
}

function runValidate(name, file, opts) {
  const r = validateCourse(name, loadCourse(file), opts);
  passed += r.passed;
  failed += r.failed;
  r.failures.forEach((f) => console.error(`  FAIL: ${f.label}${f.detail ? " -> " + f.detail : ""}`));
}

function loadCourse(file) {
  const src = readFileSync(file, "utf8");
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: file });
  return ctx.COURSE;
}

function base() { return { title: "T", badge: "b", description: "d.", duration: "5", lessons: [] }; }
function testMigrate() {
  const old = { ...base(), schemaVersion: "1.1.0", style: "default-style", context: { type: "codebase", title: "X", path: "p", summary: "s", tags: [] } };
  const r = migrateCourse(old);
  ok("migrate: 1.1.0 codebase → current", r.changed && r.from === "1.1.0" && r.to === CURRENT_VERSION);
  ok("migrate: style default-style → default", old.style === "default");
  ok("migrate: profile auto codebase", old.profile === "codebase");
  ok("migrate: context.type removed", !("type" in old.context));
  ok("migrate: schemaVersion bumped", old.schemaVersion === CURRENT_VERSION);

  const apple = { ...base(), schemaVersion: "1.1.0", style: "apple-style" };
  migrateCourse(apple);
  ok("migrate: apple-style → apple-blue + profile general", apple.style === "apple-blue" && apple.profile === "general");

  const blue = { ...base(), schemaVersion: "1.1.0", style: "bluetech-style" };
  const rb = migrateCourse(blue);
  ok("migrate: bluetech → default + warns", blue.style === "default" && rb.warnings.some((w) => w.includes("bluetech")));

  const cur = { ...base(), schemaVersion: CURRENT_VERSION, style: "default", profile: "general" };
  ok("migrate: idempotent", migrateCourse(cur).changed === false && migrateCourse(old).changed === false);

  const unk = { ...base(), schemaVersion: "9.9.9", style: "default" };
  const ru = migrateCourse(unk);
  ok("migrate: unknown version unchanged + warns", ru.changed === false && ru.warnings.some((w) => w.includes("未知")));
}

function testPageViewMode() {
  const pageSrc = readFileSync(join(ASSETS, "page.js"), "utf8");

  // Structural checks — profile-independent, test once.
  const ctx0 = { window: {}, COURSE: { profile: "general" } };
  vm.createContext(ctx0);
  vm.runInContext(pageSrc, ctx0, { filename: "page.js" });
  const cp = ctx0.window.COURSE_PAGE;
  ok("page.js: COURSE_PAGE exists", cp && typeof cp === "object");
  ok("page.js: 5 renderers", cp && cp.renderers && Object.keys(cp.renderers).length === 5);
  ok("page.js: no debug field", cp && !cp.debug);

  // viewMode per profile.
  for (const prof of ["general", "codebase", undefined]) {
    const ctx = { window: {}, COURSE: prof === undefined ? {} : { profile: prof } };
    vm.createContext(ctx);
    vm.runInContext(pageSrc, ctx, { filename: "page.js" });
    const expected = prof === "codebase" ? "continuous" : "paginated";
    ok(`page.js: viewMode=${expected} for profile=${prof}`, ctx.window.COURSE_PAGE && ctx.window.COURSE_PAGE.viewMode === expected);
  }
}

function testScriptSyntax() {
  for (const f of ["script.js", "page.js"]) {
    try {
      new vm.Script(readFileSync(join(ASSETS, f), "utf8"), { filename: f });
      ok(`${f}: parses`, true);
    } catch (e) {
      ok(`${f}: parses`, false, e.message);
    }
  }
}

function testSchemaBoundary() {
  const b = { schemaVersion: CURRENT_VERSION, profile: "general", style: "default", title: "T", badge: "b", description: "d.", duration: "5", lessons: [{ id: 1, title: "L", goal: "g", concepts: [], objectives: [], body: [], flashcards: [], quiz: [], sources: [] }] };
  const L = (over) => ({ id: 1, title: "L", goal: "g", concepts: [], objectives: [], body: [], flashcards: [], quiz: [], sources: [], ...over });

  ok("schema: valid course", validateCourse("v", b).failed === 0);
  ok("schema: rejects bad profile", validateCourse("v", { ...b, profile: "x" }).failed > 0);
  ok("schema: rejects bad style", validateCourse("v", { ...b, style: "x" }).failed > 0);
  ok("schema: rejects wrong schemaVersion", validateCourse("v", { ...b, schemaVersion: "0" }).failed > 0);
  ok("schema: rejects context.type", validateCourse("v", { ...b, context: { type: "x", title: "X" } }).failures.some(f => f.label.includes("context")));

  const fb = { ...b, lessons: [L({ body: [{ type: "flow", label: "f", nodes: ["A"], steps: [{ from: "A", to: "B", text: "x" }] }] })] };
  ok("schema: rejects flow step not in nodes", validateCourse("v", fb).failed > 0);

  const q0 = [L({ quiz: [{ question: "Q", options: [{ text: "A", correct: false, feedback: "f" }, { text: "B", correct: false, feedback: "f" }] }] })];
  ok("schema: rejects quiz 0 correct", validateCourse("v", { ...b, lessons: q0 }).failed > 0);

  const q2 = [L({ quiz: [{ question: "Q", options: [{ text: "A", correct: true, feedback: "f" }, { text: "B", correct: true, feedback: "f" }] }] })];
  ok("schema: rejects quiz 2 correct", validateCourse("v", { ...b, lessons: q2 }).failed > 0);

  const qnf = [L({ quiz: [{ question: "Q", options: [{ text: "A", correct: true, feedback: "f" }, { text: "B", correct: false, feedback: "" }] }] })];
  ok("schema: rejects quiz empty feedback", validateCourse("v", { ...b, lessons: qnf }).failed > 0);

  const html = [L({ body: [{ type: "p", text: "a <b>b</b>" }] })];
  ok("schema: rejects inline HTML", validateCourse("v", { ...b, lessons: html }).failed > 0);

  const ukb = [L({ body: [{ type: "custom", text: "x" }] })];
  ok("schema: rejects unknown block", validateCourse("v", { ...b, lessons: ukb }).failed > 0);

  const noConcepts = [L({ concepts: undefined })];
  ok("schema: rejects missing concepts", validateCourse("v", { ...b, lessons: noConcepts }).failed > 0);

  const codeHtml = [L({ body: [{ type: "code-example", label: "x", lang: "html", code: '<div class="a">hi</div>' }] })];
  ok("schema: allows html inside code", validateCourse("v", { ...b, lessons: codeHtml }).failed === 0);

  const nestedHtml = [L({ body: [{ type: "ai-dialog", label: "d", messages: [{ role: "user", text: "看 <b>x</b>" }] }] })];
  ok("schema: rejects inline html in nested block fields", validateCourse("v", { ...b, lessons: nestedHtml }).failed > 0);

  const titleHtml = [L({ title: "L <b>x</b>" })];
  ok("schema: rejects inline html in lesson title", validateCourse("v", { ...b, lessons: titleHtml }).failed > 0);

  // 渲染时会抛异常的 block 形状
  const noMessages = [L({ body: [{ type: "ai-dialog", label: "broken" }] })];
  ok("schema: rejects ai-dialog without messages", validateCourse("v", { ...b, lessons: noMessages }).failed > 0);

  const badItems = [L({ body: [{ type: "list-block", items: [{ title: "t" }] }] })];
  ok("schema: rejects list-block item without desc", validateCourse("v", { ...b, lessons: badItems }).failed > 0);

  const noExplanation = [L({ body: [{ type: "code-translation", file: "a.ts:1", code: "x" }] })];
  ok("schema: rejects code-translation without explanation", validateCourse("v", { ...b, lessons: noExplanation }).failed > 0);

  const noQuestion = [L({ quiz: [{ options: [{ text: "a", correct: true, feedback: "f" }] }] })];
  ok("schema: rejects quiz without question", validateCourse("v", { ...b, lessons: noQuestion }).failed > 0);

  const badCard = [L({ flashcards: [{ front: "f" }] })];
  ok("schema: rejects flashcard without back", validateCourse("v", { ...b, lessons: badCard }).failed > 0);

  // HTML 正则的绕过与误报
  for (const [name, text] of [["<br/>", "a <br/> b"], ["注释", "<!--x-->"], ["自闭合斜杠", "<svg/onload=alert(1)>"], ["闭合标签", "x </div>"]]) {
    const t = [L({ body: [{ type: "p", text }] })];
    ok(`schema: rejects html (${name})`, validateCourse("v", { ...b, lessons: t }).failed > 0);
  }

  const ltProse = [L({ body: [{ type: "p", text: "预算 < 100 元" }] })];
  ok("schema: allows bare < in prose", validateCourse("v", { ...b, lessons: ltProse }).failed === 0);

  // 内容在讲 XML 标签本身：`</邮件>` 的 `</` 后面不是 ASCII 字母，不算 HTML
  const xmlTag = [L({ title: "框材料", body: [{ type: "p", text: "用 <邮件>...</邮件> 包裹原文" }] })];
  ok("schema: allows non-ascii tag in prose", validateCourse("v", { ...b, lessons: xmlTag }).failed === 0);

  const urlHtml = [L({ sources: [{ label: "s", url: "<img src=x onerror=alert(1)>" }] })];
  ok("schema: rejects html in sources url", validateCourse("v", { ...b, lessons: urlHtml }).failed > 0);

  // 脚本式 URL：空白和换行不能绕过协议判断
  for (const [name, url] of [
    ["裸 javascript", "javascript:alert(1)"],
    ["前置空格", " javascript:alert(1)"],
    ["中间换行", "java\nscript:alert(1)"],
    ["制表符", "java\tscript:alert(1)"],
    ["前后控制符", "javascript:alert(1)"],
    ["vbscript", "vbscript:msgbox(1)"],
  ]) {
    const t = [L({ sources: [{ label: "s", url }] })];
    ok(`schema: rejects dangerous url (${name})`, validateCourse("v", { ...b, lessons: t }).failed > 0);
  }

  for (const [name, url] of [["https", "https://example.com/a"], ["mailto", "mailto:a@b.c"], ["仓库路径", "src/a.ts:12-24"], ["短路径", "a.ts:1"]]) {
    const t = [L({ sources: [{ label: "s", url }] })];
    ok(`schema: allows normal source (${name})`, validateCourse("v", { ...b, lessons: t }).failed === 0);
  }

  // 来源说明可以没有链接（schema 契约里 general 允许「URL 或来源说明」）
  const noUrl = [L({ sources: [{ label: "宝玉《图解 Skill》第一章", url: "" }] })];
  ok("schema: allows empty source url", validateCourse("v", { ...b, lessons: noUrl }).failed === 0);
}

function testBackLink() {
  const L = () => ({ id: 1, title: "L", goal: "g", concepts: [], objectives: [], body: [], flashcards: [], quiz: [], sources: [] });
  const base = { schemaVersion: CURRENT_VERSION, profile: "general", style: "default", title: "T", badge: "b", description: "d.", duration: "5", lessons: [L()] };

  ok("backLink: 不写合法", validateCourse("v", base).failed === 0);
  ok("backLink: 正常写法合法", validateCourse("v", { ...base, backLink: { href: "/courses", label: "← 课程首页" } }).failed === 0);
  ok("backLink: href 为空判失败", validateCourse("v", { ...base, backLink: { href: "", label: "← 首页" } }).failed > 0);
  ok("backLink: label 为空判失败", validateCourse("v", { ...base, backLink: { href: "/x", label: "" } }).failed > 0);
  ok("backLink: javascript: 判失败", validateCourse("v", { ...base, backLink: { href: "javascript:alert(1)", label: "x" } }).failed > 0);
  ok("backLink: 空白绕过判失败", validateCourse("v", { ...base, backLink: { href: " java\nscript:alert(1)", label: "x" } }).failed > 0);
  ok("backLink: 缺字段判失败", validateCourse("v", { ...base, backLink: { href: "/x" } }).failed > 0);
  ok("backLink: 不是对象判失败", validateCourse("v", { ...base, backLink: "/x" }).failed > 0);
}

// 校验器的职责是报问题，遇到畸形节点不能自己抛异常。
function testMalformedInput() {
  const base = { schemaVersion: CURRENT_VERSION, profile: "general", style: "default", title: "T", badge: "b", description: "d.", duration: "5" };
  const L = (o) => ({ id: 1, title: "L", goal: "g", concepts: [], objectives: [], body: [], flashcards: [], quiz: [], sources: [], ...o });
  const cases = [
    ["COURSE 是 null", null],
    ["COURSE 是字符串", "nope"],
    ["lessons 是 null", { ...base, lessons: [null] }],
    ["lesson 是字符串", { ...base, lessons: ["x"] }],
    ["block 是 null", { ...base, lessons: [L({ body: [null] })] }],
    ["quiz 是 null", { ...base, lessons: [L({ quiz: [null] })] }],
    ["flashcard 是 null", { ...base, lessons: [L({ flashcards: [null] })] }],
    ["source 是 null", { ...base, lessons: [L({ sources: [null] })] }],
    ["flow step 是 null", { ...base, lessons: [L({ body: [{ type: "flow", label: "f", nodes: ["A"], steps: [null] }] })] }],
    ["context 是字符串", { ...base, context: "x", lessons: [L({})] }],
    ["concepts 是 null", { ...base, lessons: [L({ concepts: null })] }],
  ];
  for (const [name, course] of cases) {
    let thrown = null;
    let failed = null;
    try { failed = validateCourse("v", course).failed; } catch (e) { thrown = e.message; }
    ok(`malformed: ${name} 返回失败而非抛异常`, thrown === null && failed > 0, thrown || `failed=${failed}`);
  }
}

console.log("== unit tests ==");
testScriptSyntax();
runValidate("data.js", join(ASSETS, "data.js"), { allowEmptyLessons: true });
testSchemaBoundary();
testBackLink();
testMalformedInput();
testMigrate();
testPageViewMode();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
