// Shared schema validation for lesson-generator class-viewer COURSE data.
// Used by test-unit.mjs and upgrade-class-viewer.mjs validate.

import { CURRENT_VERSION } from "./migrate.mjs";

export const STYLES = new Set(["default", "apple-blue"]);
export const PROFILES = new Set(["general", "codebase"]);
export const KNOWN_BLOCKS = new Set([
  "p", "ai-dialog", "code-example", "case-example", "insight", "list-block",
  "code-translation", "actor-chat", "flow", "architecture", "debug-case",
]);

// validateCourse(name, course, opts) -> { passed, failed, failures[] }
// opts.allowEmptyLessons: skip the non-empty lessons check (for placeholder data.js).
export function validateCourse(name, course, opts = {}) {
  const failures = [];
  let passed = 0;
  const check = (cond, label, detail) => {
    if (cond) passed++;
    else failures.push({ label: `${name}: ${label}`, detail });
  };

  check(course && typeof course === "object", "COURSE is object");
  check(course && course.schemaVersion === CURRENT_VERSION, "schemaVersion = " + CURRENT_VERSION, `got ${course && course.schemaVersion}`);

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

  if (course && course.context) {
    check(!("type" in course.context), "context has no type", "context.type present");
    check(typeof course.context.title === "string", "context.title");
  }

  lessons.forEach((l, i) => {
    const ln = `${name} L${i + 1}`;
    check(l.id === i + 1, `${ln}: id sequential`, `got ${l.id}`);
    check(typeof l.title === "string", `${ln}: title`);
    check(typeof l.goal === "string", `${ln}: goal`);
    check(Array.isArray(l.objectives), `${ln}: objectives array`);
    check(Array.isArray(l.body), `${ln}: body array`);
    check(Array.isArray(l.flashcards), `${ln}: flashcards array`);
    check(Array.isArray(l.quiz), `${ln}: quiz array`);
    check(Array.isArray(l.sources), `${ln}: sources array`);

    (Array.isArray(l.body) ? l.body : []).forEach((b, bi) => {
      check(KNOWN_BLOCKS.has(b.type), `${ln} body[${bi}]: known type ${b.type}`, `got ${b.type}`);
      if (b.type === "flow") {
        const nodes = new Set(b.nodes || []);
        (b.steps || []).forEach((s, si) => {
          check(nodes.has(s.from), `${ln} flow[${bi}] step[${si}].from in nodes`, `got ${s.from}`);
          check(nodes.has(s.to), `${ln} flow[${bi}] step[${si}].to in nodes`, `got ${s.to}`);
        });
      }
      const htmlField = (b.text || b.analysis || b.code || "");
      check(!/<[a-zA-Z][a-zA-Z0-9]*[\s>]/.test(htmlField), `${ln} body[${bi}]: no inline html in text`);
    });

    (Array.isArray(l.quiz) ? l.quiz : []).forEach((q, qi) => {
      const options = Array.isArray(q.options) ? q.options : [];
      const correct = options.filter((o) => o && o.correct);
      check(correct.length === 1, `${ln} quiz[${qi}]: one correct`, `got ${correct.length}`);
      check(options.every((o) => o && typeof o.feedback === "string" && o.feedback.length > 0), `${ln} quiz[${qi}]: all options have feedback`);
      check(options.every((o) => o && typeof o.text === "string"), `${ln} quiz[${qi}]: options are objects`);
    });
  });

  return { passed, failed: failures.length, failures };
}
