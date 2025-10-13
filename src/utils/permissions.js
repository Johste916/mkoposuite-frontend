/**
 * Frontend permission helpers with wildcard + array support.
 * Stored in localStorage as a list of action keys (strings).
 * Supports:
 *  - Exact keys: "repayments.create"
 *  - Wildcards from backend rows: "reports.*", "loans.status.*"
 *  - Arrays: can(['a','b']) -> true if any
 */

function read() {
  try {
    const raw = localStorage.getItem("permissions");
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export function getPermissions() {
  return read();
}

export function setPermissions(perms) {
  if (!Array.isArray(perms)) return;
  const uniq = Array.from(new Set(perms.map(String)));
  localStorage.setItem("permissions", JSON.stringify(uniq));
}

export function clearPermissions() {
  localStorage.removeItem("permissions");
}

function matches(action, candidate) {
  if (!action || !candidate) return false;
  if (action === candidate) return true;
  // wildcard at end: "module.sub.*"
  if (candidate.endsWith(".*")) {
    const prefix = candidate.slice(0, -2);
    return action.startsWith(prefix + ".");
  }
  return false;
}

/**
 * can(actionOrList)
 * - string -> boolean
 * - string[] -> true if ANY is granted
 */
export function can(actionOrList) {
  const list = read();
  if (!list.length) return false;

  if (Array.isArray(actionOrList)) {
    return actionOrList.some((a) => can(a));
  }

  const action = String(actionOrList);
  // global wildcards
  if (list.includes("*")) return true;

  // exact or wildcard in stored list
  return list.some((cand) => matches(action, cand));
}
