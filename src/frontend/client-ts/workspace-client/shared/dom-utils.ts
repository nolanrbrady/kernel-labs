/* Shared controller utilities for workspace client scripts. */

import type {
  ClassNameNodeLike,
  TabNodeLike,
  TextNodeLike
} from "./types.js"

export function setText(
  node: TextNodeLike | null | undefined,
  text: string
): void {
  if (!node) {
    return
  }

  node.textContent = text
}

export function setClassFlag(
  node: ClassNameNodeLike | null | undefined,
  classToken: string,
  enabled: boolean
): void {
  if (!node || typeof node.className !== "string") {
    return
  }

  const tokenRegex = new RegExp(`(^|\\s)${classToken}(?=\\s|$)`, "g")
  const normalizedClassName = node.className
    .replace(tokenRegex, " ")
    .replace(/\s+/g, " ")
    .trim()

  node.className = enabled
    ? `${normalizedClassName} ${classToken}`.trim()
    : normalizedClassName
}

export function setTabActiveState(
  tabElement: TabNodeLike | null | undefined,
  isActive: boolean
): void {
  if (!tabElement || typeof tabElement.className !== "string") {
    return
  }

  const normalizedClassName = tabElement.className
    .replace(/\bis-active\b/g, "")
    .replace(/\s+/g, " ")
    .trim()

  tabElement.className = isActive
    ? `${normalizedClassName} is-active`.trim()
    : normalizedClassName
}

export function setTabSelected(
  tabElement: TabNodeLike | null | undefined,
  isSelected: boolean
): void {
  if (!tabElement) {
    return
  }

  if (typeof tabElement.setAttribute === "function") {
    tabElement.setAttribute("aria-selected", isSelected ? "true" : "false")
    return
  }

  tabElement.ariaSelected = isSelected ? "true" : "false"
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
