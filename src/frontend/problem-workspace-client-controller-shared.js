// @ts-nocheck
/* Shared controller utilities for workspace client scripts. */
(function (globalScope) {
    function setText(node, text) {
        if (!node) {
            return;
        }
        node.textContent = text;
    }
    function setClassFlag(node, classToken, enabled) {
        if (!node || typeof node.className !== "string") {
            return;
        }
        var tokenRegex = new RegExp("(^|\\s)" + classToken + "(?=\\s|$)", "g");
        var normalizedClassName = node.className
            .replace(tokenRegex, " ")
            .replace(/\s+/g, " ")
            .trim();
        node.className = enabled
            ? (normalizedClassName + " " + classToken).trim()
            : normalizedClassName;
    }
    function setTabActiveState(tabElement, isActive) {
        if (!tabElement || typeof tabElement.className !== "string") {
            return;
        }
        var normalizedClassName = tabElement.className
            .replace(/\bis-active\b/g, "")
            .replace(/\s+/g, " ")
            .trim();
        tabElement.className = isActive
            ? (normalizedClassName + " is-active").trim()
            : normalizedClassName;
    }
    function setTabSelected(tabElement, isSelected) {
        if (!tabElement) {
            return;
        }
        if (typeof tabElement.setAttribute === "function") {
            tabElement.setAttribute("aria-selected", isSelected ? "true" : "false");
            return;
        }
        tabElement.ariaSelected = isSelected ? "true" : "false";
    }
    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
    globalScope.DeepMLSRWorkspaceClientControllerShared = {
        setText: setText,
        setClassFlag: setClassFlag,
        setTabActiveState: setTabActiveState,
        setTabSelected: setTabSelected,
        escapeHtml: escapeHtml
    };
})(typeof globalThis !== "undefined" ? globalThis : this);
