#!/usr/bin/env node
// init-course — 把 class-viewer 模板补进一个课程目录。
// 已存在的文件一律不动，所以重复运行是安全的，也不会覆盖你写好的 data.js。
//
// 用法：node scripts/init-course.mjs [目标目录]    默认当前目录

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "assets", "class-viewer");
const USAGE = "用法：node scripts/init-course.mjs [目标目录]";

const arg = process.argv[2];
if (arg && arg.startsWith("-")) {
  console.error(`不认这个参数：${arg}\n${USAGE}`);
  process.exit(2);
}
if (!existsSync(TEMPLATE) || !statSync(TEMPLATE).isDirectory()) {
  console.error(`模板目录不存在：${TEMPLATE}`);
  process.exit(2);
}

const target = resolve(arg || ".");
if (existsSync(target) && !statSync(target).isDirectory()) {
  console.error(`目标不是目录：${target}`);
  process.exit(2);
}
mkdirSync(target, { recursive: true });

const created = [];
const kept = [];

function copyMissing(srcDir, dstDir, prefix) {
  for (const name of readdirSync(srcDir).sort()) {
    const src = join(srcDir, name);
    const dst = join(dstDir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(src).isDirectory()) {
      mkdirSync(dst, { recursive: true });
      copyMissing(src, dst, rel);
    } else if (existsSync(dst)) {
      kept.push(rel);
    } else {
      copyFileSync(src, dst);
      created.push(rel);
    }
  }
}

copyMissing(TEMPLATE, target, "");

console.log(`课程目录：${target}`);
if (created.length) console.log(`已补齐：${created.join("、")}`);
if (kept.length) console.log(`已存在并保留：${kept.join("、")}`);
