#!/usr/bin/env bash
# E2E tests for lesson-generator class-viewer, driven via agent-browser.
# Run: bash scripts/tests/test-e2e.sh
# Covers: codebase VI (continuous + 5 code blocks + debug API), general profile
# (paginated + no context + general blocks + flip/quiz), and both themes.

set -u
SKILL_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
PORT=8799
BASE="http://localhost:${PORT}"
PASS=0
FAIL=0
SERVER_PID=""

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  rm -rf "$TMP"
}
trap cleanup EXIT

ok() { PASS=$((PASS + 1)); }
bad() { FAIL=$((FAIL + 1)); echo "  FAIL: $1"; }
ev() { agent-browser eval "$1" 2>/dev/null | tail -1; }

# assert the JS boolean expression evaluates to true.
assert_true() {
  local name="$1" expr="$2" r
  r="$(ev "JSON.stringify(!!($expr))")"
  if [ "$r" = '"true"' ]; then ok "$name"; else bad "$name (got $r)"; fi
}

# assert a JS number expression equals expected (unquoted comparison).
assert_num() {
  local name="$1" expr="$2" want="$3" r
  r="$(ev "JSON.stringify($expr)")"
  if [ "$r" = "\"$want\"" ]; then ok "$name"; else bad "$name (got $r, want $want)"; fi
}

# Clone class-viewer into tmp and write a small general course.
node "$SKILL_DIR/scripts/spaceclone.mjs" \
  --template-dir "$SKILL_DIR/assets/class-viewer" --here --in "$TMP" >/dev/null || { echo "spaceclone failed"; exit 2; }

cat > "$TMP/data.js" <<'EOF'
var COURSE = {
  schemaVersion: "1.2.0", profile: "general", style: "default",
  showIcons: true, showQuiz: true, showFinalQuiz: true,
  title: "通用课程", badge: "通用", description: "一门普通主题课程。", duration: "10",
  lessons: [
    { id: 1, title: "概念入门", goal: "理解基础概念。", concepts: ["概念"],
      objectives: ["掌握基础"], body: [
        { type: "p", text: "这是一段普通正文。" },
        { type: "insight", icon: "💡", title: "洞察", text: "一个关键点。" },
        { type: "list-block", items: [{ icon: "🎯", title: "要点", desc: "描述" }] }
      ],
      flashcards: [{ front: "什么是 X？", back: "X 是 ..." }],
      quiz: [{ question: "哪个正确？", options: [
        { text: "A", correct: true, feedback: "对" },
        { text: "B", correct: false, feedback: "错" }
      ] }],
      sources: [{ label: "来源", url: "https://example.com" }] },
    { id: 2, title: "总复习", goal: "巩固。", concepts: [],
      objectives: ["复习"], body: [{ type: "p", text: "复习内容。" }],
      flashcards: [], quiz: [{ question: "复选题？", options: [
        { text: "对", correct: true, feedback: "对" },
        { text: "错", correct: false, feedback: "错" }
      ] }], sources: [] }
  ]
};
EOF

# apple-blue theme fixture in a subdir
mkdir -p "$TMP/apple"
cp "$TMP"/*.{html,css,js} "$TMP/apple/" 2>/dev/null
sed 's/style: "default"/style: "apple-blue"/' "$TMP/data.js" > "$TMP/apple/data.js"

python3 -m http.server "$PORT" --directory "$TMP" >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1

echo "== e2e: codebase VI (continuous) =="
agent-browser open "file://$SKILL_DIR/assets/class-viewer-vi/vi.html" >/dev/null 2>&1
assert_true "continuous-mode body class" "document.body.classList.contains('continuous-mode')"
assert_true "theme-default body class" "document.body.classList.contains('theme-default')"
assert_true "context box rendered" "!!document.querySelector('.context-box')"
assert_num "all 5 code block types render" "document.querySelectorAll('[data-block-type=\"code-translation\"],[data-block-type=\"actor-chat\"],[data-block-type=\"flow\"],[data-block-type=\"architecture\"],[data-block-type=\"debug-case\"]').length" 5
assert_true "playActorChat works" "ClassViewerDebug.playActorChat(0).ok===true"
assert_true "resetActorChat works" "ClassViewerDebug.resetActorChat(0).ok===true"
assert_true "playFlow works" "ClassViewerDebug.playFlow(0).ok===true"
assert_true "resetFlow works" "ClassViewerDebug.resetFlow(0).ok===true"
assert_true "no unsupported blocks" "ClassViewerDebug.snapshot().unsupportedBlocks.length===0"
assert_true "debug error on missing block" "ClassViewerDebug.playActorChat(99).error==='actor-chat not found'"
assert_num "course viewMode continuous" "ClassViewerDebug.course().viewMode==='continuous'?1:0" 1

echo "== e2e: general profile (paginated) =="
agent-browser open "$BASE/index.html" >/dev/null 2>&1
assert_true "no continuous-mode (paginated)" "!document.body.classList.contains('continuous-mode')"
assert_true "theme-default body class" "document.body.classList.contains('theme-default')"
assert_true "no context box (general)" "!document.querySelector('.context-box')"
assert_true "start button present" "!!document.getElementById('start-btn')"
agent-browser eval "ClassViewerDebug.goLesson(1)" >/dev/null 2>&1
assert_true "next-btn visible after goLesson" "getComputedStyle(document.getElementById('next-btn')).display!=='none'"
assert_true "insight block renders after goLesson" "document.querySelectorAll('[data-block-type=\"insight\"]').length>0"
assert_true "list-block renders after goLesson" "document.querySelectorAll('[data-block-type=\"list-block\"]').length>0"
assert_true "flipFlashcard works (paginated)" "ClassViewerDebug.flipFlashcard(0).flippedFlashcardsCount>=1"
assert_true "answerQuiz works (paginated)" "ClassViewerDebug.answerQuiz(0,0).quizAnsweredCount>=1"
assert_num "course viewMode paginated" "ClassViewerDebug.course().viewMode==='paginated'?1:0" 1

echo "== e2e: apple-blue theme =="
agent-browser open "$BASE/apple/index.html" >/dev/null 2>&1
assert_true "theme-apple-blue body class" "document.body.classList.contains('theme-apple-blue')"
assert_true "no theme-default when apple-blue" "!document.body.classList.contains('theme-default')"

echo "== e2e: upgrade tool (copy + upgrade + validate) =="
OLD="$TMP/old"
mkdir -p "$OLD"
node "$SKILL_DIR/scripts/spaceclone.mjs" --template-dir "$SKILL_DIR/assets/class-viewer" --here --in "$OLD" >/dev/null 2>&1
cat > "$OLD/data.js" <<'OLDEOF'
var COURSE = { schemaVersion:"1.1.0", style:"default-style", showIcons:true, showQuiz:true, showFinalQuiz:true,
  title:"旧课", badge:"旧", description:"一个旧 schema 课程。", duration:"10",
  context:{ type:"codebase", title:"Repo", path:"/x", summary:"s", tags:["t"] },
  lessons:[{id:1,title:"L1",goal:"g.",concepts:["c"],objectives:["o"],
    body:[{type:"code-translation",label:"t",file:"a.ts:1",lang:"TS",code:"const x=1;",explanation:["one"]}],
    flashcards:[{front:"f",back:"b"}],quiz:[{question:"q",options:[{text:"a",correct:true,feedback:"ok"}]}],sources:[{label:"s",url:"a.ts:1"}]},
    {id:2,title:"复习",goal:"g.",concepts:[],objectives:["o"],body:[{type:"p",text:"x"}],flashcards:[],
      quiz:[{question:"q",options:[{text:"a",correct:true,feedback:"ok"}]}],sources:[]}] };
OLDEOF
if node "$SKILL_DIR/scripts/upgrade-class-viewer.mjs" all "$OLD" >/dev/null 2>&1; then ok "upgrade all (copy+upgrade+validate) succeeds"; else bad "upgrade all fails"; fi
if node "$SKILL_DIR/scripts/upgrade-class-viewer.mjs" validate "$OLD" --render >/dev/null 2>&1; then ok "upgraded course renders clean"; else bad "upgraded course render"; fi
if node "$SKILL_DIR/scripts/upgrade-class-viewer.mjs" upgrade "$OLD" >/dev/null 2>&1 && ! grep -q '"schemaVersion": "1.1.0"' "$OLD/data.js"; then ok "upgrade idempotent (no re-migration)"; else bad "upgrade idempotent"; fi

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
