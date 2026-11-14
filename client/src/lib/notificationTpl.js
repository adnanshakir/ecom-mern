export const extractVars = (...tpls) =>
  [...new Set(tpls.flatMap((t) => [...(t || "").matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1])))];

export const fillTpl = (tpl, vars) =>
  (tpl || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined && vars[k] !== "" ? vars[k] : `{{${k}}}`));

export const hasPlaceholders = (...texts) => texts.some((t) => /\{\{/.test(t || ""));

