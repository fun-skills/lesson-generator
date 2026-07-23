#!/usr/bin/env node
// spaceclone — copy or fill-in a workspace from a template directory.
//
// Single-file, Node-builtins only. Copy this file into a skill's scripts/
// for distribution.
//
// Usage:
//   spaceclone --template-dir <dir> [--in <parent>] [--here | <name>] [--marker <path>]...
//
// Exit codes:
//   0  success
//   2  bad args / missing dirs / target exists but not a workspace

export const VERSION = '0.1'

import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { realpathSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export function validateName(name) {
  if (!name || name === '.' || name === '..') {
    throw new Error("工作区名称不能为空，且不能是 '.' 或 '..'")
  }
  if (name.includes('/') || name.includes('\\')) {
    throw new Error('工作区名称不能包含路径分隔符')
  }
}

export function resolvePath(value, base) {
  let p = value
  if (p.startsWith('~')) p = p.replace(/^~(?=$|\/)/, homedir())
  return isAbsolute(p) ? resolve(p) : resolve(base, p)
}

function isDir(p) {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

export function cloneFull(templateDir, targetDir) {
  if (!isDir(templateDir)) {
    throw new Error(`模板目录不存在或不是目录：${templateDir}`)
  }
  if (existsSync(targetDir)) {
    throw new Error(`目标已存在：${targetDir}`)
  }
  cpSync(templateDir, targetDir, { recursive: true })
}

function* walk(root) {
  const entries = readdirSync(root, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  for (const entry of entries) {
    const full = join(root, entry.name)
    if (entry.isDirectory()) {
      yield { full, isDir: true }
      yield* walk(full)
    } else {
      yield { full, isDir: false }
    }
  }
}

export function cloneMissing(templateDir, targetDir) {
  if (!isDir(templateDir)) {
    throw new Error(`模板目录不存在或不是目录：${templateDir}`)
  }
  mkdirSync(targetDir, { recursive: true })

  const created = []
  const skipped = []

  for (const { full, isDir: itemIsDir } of walk(templateDir)) {
    const rel = relative(templateDir, full)
    const target = join(targetDir, rel)
    if (itemIsDir) {
      if (existsSync(target)) {
        skipped.push(rel)
      } else {
        mkdirSync(target, { recursive: true })
        created.push(rel)
      }
      continue
    }
    if (existsSync(target)) {
      skipped.push(rel)
      continue
    }
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(full, target)
    created.push(rel)
  }

  return { created, skipped }
}

export function isWorkspace(directory, markers) {
  return markers.some((m) => existsSync(join(directory, m)))
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const out = {
    workspace: null,
    templateDir: null,
    parentDir: '.',
    here: false,
    markers: [],
    help: false,
    version: false,
  }
  const takeValue = (i, flag) => {
    const v = argv[i]
    if (v === undefined || v.startsWith('--') || v === '-h') {
      throw new Error(`${flag} 需要一个值`)
    }
    return v
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--template-dir') {
      out.templateDir = takeValue(++i, '--template-dir')
    } else if (a === '--in') {
      out.parentDir = takeValue(++i, '--in')
    } else if (a === '--here') {
      out.here = true
    } else if (a === '--marker') {
      out.markers.push(takeValue(++i, '--marker'))
    } else if (a === '-h' || a === '--help') {
      out.help = true
    } else if (a === '--version') {
      out.version = true
    } else if (a.startsWith('-')) {
      throw new Error(`未知参数：${a}`)
    } else {
      if (out.workspace !== null) throw new Error('只能给一个工作区名称')
      out.workspace = a
    }
  }
  if (!out.help && !out.version && !out.templateDir) throw new Error('--template-dir 必填')
  return out
}

function printSummary(created, skipped) {
  if (created.length) {
    console.log('已补齐：')
    for (const p of created) console.log(`- ${p}`)
  }
  if (skipped.length) {
    console.log('已存在并保留：')
    for (const p of skipped) console.log(`- ${p}`)
  }
}

const HELP_TEXT = `spaceclone — 把模板目录复制/补齐到工作区目录。

用法：
  spaceclone --template-dir <模板目录> [--in <父目录>] [--here | <名称>] [--marker <path>]...

选项：
  --template-dir <模板目录>  必填，模板根目录
  --in <父目录>              父目录，默认当前目录
  --here                     原地补齐 --in 指定目录，不创建子目录
  <名称>                     新建工作区名称（与 --here 互斥）
  --marker <path>            工作区标记文件/目录（可多次）；目标存在时用作复用判定
  -h, --help                 打印此帮助并退出
  --version                  打印版本号并退出

退出码：
  0  成功
  2  参数不合法 / 模板或父目录不存在 / 目标已存在但不像工作区且未给 --here
`

export function main(argv) {
  let args
  try {
    args = parseArgs(argv)
  } catch (e) {
    console.error(e.message)
    return 2
  }

  if (args.help) {
    console.log(HELP_TEXT)
    return 0
  }

  if (args.version) {
    console.log(`spaceclone ${VERSION}`)
    return 0
  }

  if (args.here && args.workspace) {
    console.error('--here 与工作区名称不能同时给。')
    return 2
  }
  if (!args.here && !args.workspace) {
    console.error('必须给 --here 或工作区名称。')
    return 2
  }

  const cwd = process.cwd()
  const templateDir = resolvePath(args.templateDir, cwd)
  if (!isDir(templateDir)) {
    console.error(`模板目录不存在：${templateDir}`)
    return 2
  }

  const parentDir = resolvePath(args.parentDir, cwd)
  if (!isDir(parentDir)) {
    console.error(`父目录不存在：${parentDir}`)
    return 2
  }

  if (args.here) {
    try {
      const { created, skipped } = cloneMissing(templateDir, parentDir)
      console.log(`工作区已原地初始化：${parentDir}`)
      printSummary(created, skipped)
      return 0
    } catch (e) {
      console.error(e.message)
      return 2
    }
  }

  try {
    validateName(args.workspace)
  } catch (e) {
    console.error(`工作区名称不合法：${e.message}`)
    return 2
  }

  const target = join(parentDir, args.workspace)

  if (existsSync(target)) {
    if (isDir(target) && isWorkspace(target, args.markers)) {
      try {
        const { created, skipped } = cloneMissing(templateDir, target)
        console.log(`工作区已存在，复用：${target}`)
        printSummary(created, skipped)
        return 0
      } catch (e) {
        console.error(e.message)
        return 2
      }
    }
    console.error(`目标已存在但不像工作区：${target}`)
    return 2
  }

  try {
    cloneFull(templateDir, target)
    console.log(`工作区已创建：${target}`)
    return 0
  } catch (e) {
    console.error(e.message)
    return 2
  }
}

function isMain() {
  if (!process.argv[1]) return false
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
  } catch {
    return false
  }
}

if (isMain()) {
  process.exit(main(process.argv.slice(2)))
}
