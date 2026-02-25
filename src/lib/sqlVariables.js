/**
 * Parse variable placeholders from SQL. Variables use double-brace syntax: {{variable_name}}
 * @param {string} sql
 * @returns {string[]} unique variable names in order of first appearance
 */
export function parseSqlVariables(sql) {
  if (typeof sql !== 'string') return [];
  const re = /\{\{(\w+)\}\}/g;
  const names = new Set();
  let m;
  while ((m = re.exec(sql)) !== null) names.add(m[1]);
  return Array.from(names);
}

/**
 * Substitute variables in SQL. Replaces {{name}} with values[name]; missing names are replaced with empty string.
 * @param {string} sql
 * @param {Record<string, string>} values
 * @returns {string}
 */
export function substituteSqlVariables(sql, values = {}) {
  if (typeof sql !== 'string') return sql;
  return sql.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const v = values[name];
    return v !== undefined && v !== null ? String(v) : '';
  });
}
