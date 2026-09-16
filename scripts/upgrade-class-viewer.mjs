#!/usr/bin/env node
// upgrade-class-viewer - upgrade class-viewer in existing course artifacts.
//
// Subcommands:
//   copy <dir>...                overwrite the 4 frozen class-viewer files (keep data.js)
//   upgrade <dir>...             migrate data.js to current schema
//   validate <dir>... [--render] validate data.js (optionally render-check)
//   all <dir>...                 copy + upgrade + validate (static)
//   find <root>                  list dirs under root that contain data.js
//
// Run: node scripts/upgrade-class-viewer.mjs <subcommand> [args]

import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { validateCourse } from "./lib/validate.mjs";
import { migrateCourse, CURRENT_VERSION } from "./lib/migrate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(__dirname, "..");
const TEMPLATE_DIR = join(SKILL_DIR, "assets", "class-viewer");
const FROZEN = ["index.html", "styles.css", "script.js", "page.js"];

// agent-browser 一律走 argv，不过 shell。
// 课程目录名会进到参数里，拼 shell 字符串等于把目录名当命令执行。
// 输出是 JSON：布尔返回 true，字符串返回 "..."。
function ab(args) {
  const raw = execFileSync("agent-browser", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  try { return JSON.parse(raw); } catch { return raw; }
}

function loadCourse(file) {
  const src = readFileSync(file, "utf8");
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: file });
  return ctx.COURSE;
}

// --- copy ---
function copyOne(dir) {
  const abs = resolve(dir);
  if (!existsSync(abs)) { console.error(`${dir}: 目录不存在`); return false; }
  for (const f of FROZEN) copyFileSync(join(TEMPLATE_DIR, f), join(abs, f));
  console.log(`${dir}: 已覆盖 ${FROZEN.length} 个冻结文件（保留 data.js）`);
  return true;
}

// --- upgrade ---
function upgradeOne(dir) {
  const dataPath = join(resolve(dir), "data.js");
  if (!existsSync(dataPath)) { console.error(`${dir}: 无 data.js`); return false; }
  let course;
  try { course = loadCourse(dataPath); }
  catch (e) { console.error(`${dir}: data.js 求值失败: ${e.message}`); return false; }
  if (!course) { console.error(`${dir}: data.js 无 COURSE 对象`); return false; }

  const r = migrateCourse(course);
  r.warnings.forEach((w) => console.warn(`${dir}: ${w}`));
  if (!r.changed) { console.log(`${dir}: 已是 ${CURRENT_VERSION}，跳过`); return true; }

  copyFileSync(dataPath, dataPath + ".bak");
  writeFileSync(dataPath, "var COURSE = " + JSON.stringify(course, null, 2) + ";\n");
  console.log(`${dir}: ${r.from} -> ${r.to}（备份 data.js.bak）`);
  return true;
}

// --- validate ---
function validateStatic(dir) {
  const dataPath = join(resolve(dir), "data.js");
  if (!existsSync(dataPath)) { console.error(`${dir}: 无 data.js`); return false; }
  let course;
  try { course = loadCourse(dataPath); }
  catch (e) { console.error(`${dir}: data.js 求值失败: ${e.message}`); return false; }
  const r = validateCourse(dir, course, {});
  r.failures.forEach((f) => console.error(`  FAIL: ${f.label}${f.detail ? " -> " + f.detail : ""}`));
  console.log(`${dir}: ${r.passed} pass, ${r.failed} fail`);
  return r.failed === 0;
}

function waitForReady() {
  for (let i = 0; i < 20; i++) {
    try {
      if (ab(["eval", "ClassViewerDebug != null"]) === true) return true;
    } catch { /* page not ready */ }
    try { ab(["wait", "100"]); } catch { /* ignore */ }
  }
  return false;
}

// 逐节渲染，检查：渲染过程没抛异常、block 数对得上、没有 unsupported block。
// 只渲染第 1 节会漏掉后续课时里的运行时错误。
function validateRender(dir) {
  const index = resolve(join(dir, "index.html"));
  if (!existsSync(index)) { console.error(`${dir}: 无 index.html，先 copy`); return false; }
  const course = loadCourse(join(resolve(dir), "data.js"));
  if (!course || !Array.isArray(course.lessons)) { console.error(`${dir}: 读不到课程数据`); return false; }
  try {
    ab(["open", pathToFileURL(index).href]);
  } catch (e) { console.error(`${dir}: agent-browser 打开失败: ${e.message}`); return false; }
  if (!waitForReady()) { console.error(`${dir}: ClassViewerDebug 未就绪（页面初始化就抛异常）`); return false; }

  let ok = true;
  for (const l of course.lessons) {
    const expr = `(() => {
  try { window.ClassViewerDebug.goLesson(${l.id}) } catch (e) { return "渲染抛异常: " + e.message }
  var scope = window.ClassViewerDebug.getLessonScope(${l.id})
  if (!scope) return "拿不到该节 DOM"
  var n = scope.querySelectorAll("[data-block-type]").length
  if (n !== ${l.body.length}) return "block 数 " + n + " != " + ${l.body.length}
  var u = window.ClassViewerDebug.snapshot().unsupportedBlocks.length
  return u === 0 ? "ok" : "unsupported block " + u
})()`;
    let out;
    try { out = ab(["eval", expr]); }
    catch (e) { out = "eval 失败: " + e.message; }
    if (out !== "ok") { console.error(`  ${dir} L${l.id}: ${out}`); ok = false; }
  }
  console.log(`${dir}: render ${course.lessons.length} 节 ${ok ? "pass" : "fail"}`);
  return ok;
}

function validateOne(dir, { render }) {
  const st = validateStatic(dir);
  if (!st) return false;
  return render ? validateRender(dir) : true;
}

// --- all ---
function allOne(dir) {
  const c = copyOne(dir);
  const u = upgradeOne(dir);
  const v = validateStatic(dir);
  return c && u && v;
}

// --- find ---
function findCourses(root) {
  const results = [];
  const skillAssets = resolve(TEMPLATE_DIR);
  function walk(d) {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const full = join(d, e.name);
      if (!e.isDirectory()) continue;
      if (existsSync(join(full, "data.js")) && !existsSync(join(full, "vi-data.js")) && resolve(full) !== skillAssets) {
        results.push(full);
      }
      walk(full);
    }
  }
  walk(resolve(root));
  return results;
}

// --- CLI ---
function usage() {
  console.log(`upgrade-class-viewer - 升级已有课程制品的 class-viewer。

用法：
  upgrade-class-viewer copy <dir>...                覆盖 4 个冻结文件（保留 data.js）
  upgrade-class-viewer upgrade <dir>...             迁移 data.js 到 schema ${CURRENT_VERSION}
  upgrade-class-viewer validate <dir>... [--render] 校验 data.js
  upgrade-class-viewer all <dir>...                 copy + upgrade + validate
  upgrade-class-viewer find <root>                  列出含 data.js 的课程目录

当前 schema 版本：${CURRENT_VERSION}`);
}

function main(argv) {
  const cmd = argv[0];
  const rest = argv.slice(1);
  if (!cmd || cmd === "-h" || cmd === "--help") { usage(); return 0; }

  if (cmd === "find") {
    if (!rest[0]) { console.error("find 需要一个 root"); return 2; }
    findCourses(rest[0]).forEach((d) => console.log(d));
    return 0;
  }

  const render = rest.includes("--render");
  const dirs = rest.filter((a) => !a.startsWith("--"));
  if (dirs.length === 0) { console.error(`${cmd} 需要至少一个目录`); return 2; }

  const run = {
    copy: (d) => copyOne(d),
    upgrade: (d) => upgradeOne(d),
    validate: (d) => validateOne(d, { render }),
    all: (d) => allOne(d),
  }[cmd];
  if (!run) { console.error(`未知子命令：${cmd}`); usage(); return 2; }

  let allOk = true;
  for (const dir of dirs) {
    // 单个目录出意外不能中断其余目录的校验。
    let ok = false;
    try { ok = run(dir); }
    catch (e) { console.error(`${dir}: 意外异常: ${e.message}`); }
    if (!ok) allOk = false;
  }
  return allOk ? 0 : 1;
}

process.exit(main(process.argv.slice(2)));
