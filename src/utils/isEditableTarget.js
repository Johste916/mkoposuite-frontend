// utils/isEditableTarget.js (reusable)
export function isEditableTarget(t) {
  if (!t) return false;
  if (t.isContentEditable) return true;
  const tag = (t.tagName || "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (t.closest && t.closest('[role="combobox"], [contenteditable="true"]')) return true;
  return false;
}
