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
  ok("migrate: 1.1.0 codebase → 1.2.0", r.changed && r.from === "1.1.0" && r.to === CURRENT_VERSION);
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
}

console.log("== unit tests ==");
testScriptSyntax();
runValidate("data.js", join(ASSETS, "data.js"), { allowEmptyLessons: true });
testSchemaBoundary();
testMigrate();
testPageViewMode();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
