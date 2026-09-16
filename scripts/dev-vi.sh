#!/usr/bin/env bash
# 打开 VI 页面：把 class-viewer 模板复制到临时目录，数据源换成 vi-data.js。
# 只有开发 class-viewer 时才用。
set -eu
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"

node "$SKILL_DIR/scripts/init-course.mjs" "$TMP" >/dev/null
cp "$SKILL_DIR/assets/class-viewer-vi/vi-data.js" "$TMP/data.js"

echo "VI 页面：file://$TMP/index.html"
agent-browser open "file://$TMP/index.html"
