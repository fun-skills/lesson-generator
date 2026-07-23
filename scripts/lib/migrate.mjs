// Version-keyed migrations for lesson-generator data.js COURSE objects.
// Apply migrateCourse(course) to bring a course up to CURRENT_VERSION.

export const CURRENT_VERSION = "1.2.0";

// 1.1.0 -> 1.2.0: profile field, style rename, context.type removal.
function apply_1_1_0_to_1_2_0(course, warnings) {
  const styleMap = {
    "default-style": "default",
    "apple-style": "apple-blue",
    "bluetech-style": "default",
  };
  if (course.style && styleMap[course.style]) {
    if (course.style === "bluetech-style") {
      warnings.push("style bluetech-style 已弃用，改为 default");
    }
    course.style = styleMap[course.style];
  }

  if (!course.profile) {
    course.profile =
      course.context && course.context.type === "codebase" ? "codebase" : "general";
  }

  if (course.context && "type" in course.context) {
    delete course.context.type;
  }
}

// Ordered list of migrations. Each migrates from `from` to `to`.
export const MIGRATIONS = [
  { from: "1.1.0", to: "1.2.0", apply: apply_1_1_0_to_1_2_0 },
];

// Mutates course in place, applying migrations in version order until current.
// Returns { changed, from, to, warnings }.
export function migrateCourse(course) {
  const warnings = [];
  const original = course.schemaVersion;
  let changed = false;
  let version = course.schemaVersion || (MIGRATIONS[0] && MIGRATIONS[0].from);

  for (const m of MIGRATIONS) {
    if (version === m.from) {
      m.apply(course, warnings);
      course.schemaVersion = m.to;
      version = m.to;
      changed = true;
    }
  }

  if (!changed && course.schemaVersion !== CURRENT_VERSION) {
    warnings.push(`未知 schemaVersion ${course.schemaVersion || original}，无法迁移`);
  }

  return { changed, from: original, to: course.schemaVersion, warnings };
}
