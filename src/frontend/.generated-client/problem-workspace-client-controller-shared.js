/* Shared controller utilities for workspace client scripts. */
export function setText(node, text) {
    if (!node) {
        return;
    }
    node.textContent = text;
}
export function setClassFlag(node, classToken, enabled) {
    if (!node || typeof node.className !== "string") {
        return;
    }
    const tokenRegex = new RegExp(`(^|\\s)${classToken}(?=\\s|$)`, "g");
    const normalizedClassName = node.className
        .replace(tokenRegex, " ")
        .replace(/\s+/g, " ")
        .trim();
    node.className = enabled
        ? `${normalizedClassName} ${classToken}`.trim()
        : normalizedClassName;
}
export function setTabActiveState(tabElement, isActive) {
    if (!tabElement || typeof tabElement.className !== "string") {
        return;
    }
    const normalizedClassName = tabElement.className
        .replace(/\bis-active\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
    tabElement.className = isActive
        ? `${normalizedClassName} is-active`.trim()
        : normalizedClassName;
}
export function setTabSelected(tabElement, isSelected) {
    if (!tabElement) {
        return;
    }
    if (typeof tabElement.setAttribute === "function") {
        tabElement.setAttribute("aria-selected", isSelected ? "true" : "false");
        return;
    }
    tabElement.ariaSelected = isSelected ? "true" : "false";
}
export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
