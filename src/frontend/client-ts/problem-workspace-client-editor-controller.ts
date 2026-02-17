// @ts-nocheck
/* Editor controller for workspace client. */
import { setClassFlag, escapeHtml } from "./problem-workspace-client-controller-shared.js";

  class EditorController {
    constructor(options) {
      this.codeEditor = options.codeEditor;
      this.codeHighlight = options.codeHighlight;
      this.codeEditorShell = options.codeEditorShell;
      this.onTypingStart = options.onTypingStart;
    }

    bind() {
      if (!this.codeEditor) {
        return;
      }

      if (
        this.codeEditorShell &&
        typeof this.codeEditorShell.setAttribute === "function"
      ) {
        this.codeEditorShell.setAttribute("data-editor-enhanced", "true");
      }

      this.codeEditor.addEventListener("keydown", this.handleEditorTabIndent.bind(this));
      this.codeEditor.addEventListener("keydown", this.handleSessionStartFromTyping.bind(this));
      this.codeEditor.addEventListener("focus", this.handleEditorFocus.bind(this));
      this.codeEditor.addEventListener("blur", this.handleEditorBlur.bind(this));
      this.codeEditor.addEventListener("input", this.renderCodeHighlight.bind(this));
      this.codeEditor.addEventListener("scroll", this.syncHighlightScroll.bind(this));

      if (
        this.codeEditorShell &&
        typeof this.codeEditorShell.addEventListener === "function"
      ) {
        this.codeEditorShell.addEventListener(
          "mousedown",
          this.focusEditorFromShellClick.bind(this)
        );
      }

      this.renderCodeHighlight();
    }

    handleEditorTabIndent(event) {
      if (!event || event.key !== "Tab") {
        return;
      }

      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      var currentValue = this.codeEditor.value || "";
      var selectionStart =
        typeof this.codeEditor.selectionStart === "number"
          ? this.codeEditor.selectionStart
          : currentValue.length;
      var selectionEnd =
        typeof this.codeEditor.selectionEnd === "number"
          ? this.codeEditor.selectionEnd
          : selectionStart;
      var indent = "  ";

      this.codeEditor.value =
        currentValue.slice(0, selectionStart) +
        indent +
        currentValue.slice(selectionEnd);

      var nextCursor = selectionStart + indent.length;
      if (typeof this.codeEditor.setSelectionRange === "function") {
        this.codeEditor.setSelectionRange(nextCursor, nextCursor);
      } else {
        this.codeEditor.selectionStart = nextCursor;
        this.codeEditor.selectionEnd = nextCursor;
      }

      this.renderCodeHighlight();
    }

    isTypingKey(event) {
      if (!event || typeof event.key !== "string") {
        return false;
      }

      if (event.key.length !== 1) {
        return false;
      }

      return !event.ctrlKey && !event.metaKey && !event.altKey;
    }

    handleSessionStartFromTyping(event) {
      if (!this.isTypingKey(event)) {
        return;
      }

      if (typeof this.onTypingStart === "function") {
        this.onTypingStart("first-character");
      }
    }

    setEditorEditingState(isEditing) {
      if (!this.codeEditorShell) {
        return;
      }

      setClassFlag(this.codeEditorShell, "is-editing", isEditing);
    }

    handleEditorFocus() {
      this.setEditorEditingState(true);
    }

    handleEditorBlur() {
      this.setEditorEditingState(false);
    }

    focusEditorFromShellClick(event) {
      if (!this.codeEditor || typeof this.codeEditor.focus !== "function") {
        return;
      }

      if (event && event.target === this.codeEditor) {
        return;
      }

      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      this.codeEditor.focus();
    }

    buildSyntaxHighlightedHtml(sourceText) {
      var escapedSource = escapeHtml(sourceText);
      var tokenPattern =
        /(#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:def|return|if|elif|else|for|while|in|None|True|False|pass|class|import|from|as|and|or|not|with|try|except|finally|lambda|yield|break|continue)\b|\b(?:len|range|sum|min|max|print|enumerate|zip|float|int|list|dict|set|tuple)\b|\b\d+(?:\.\d+)?\b)/g;

      return escapedSource.replace(tokenPattern, function (token) {
        if (token[0] === "#") {
          return "<span class=\"token-comment\">" + token + "</span>";
        }
        if (token[0] === "'" || token[0] === '"') {
          return "<span class=\"token-string\">" + token + "</span>";
        }
        if (/^\d/.test(token)) {
          return "<span class=\"token-number\">" + token + "</span>";
        }
        if (/^(len|range|sum|min|max|print|enumerate|zip|float|int|list|dict|set|tuple)$/.test(token)) {
          return "<span class=\"token-builtin\">" + token + "</span>";
        }

        return "<span class=\"token-keyword\">" + token + "</span>";
      });
    }

    renderCodeHighlight() {
      if (!this.codeHighlight || !("innerHTML" in this.codeHighlight)) {
        return;
      }

      var editorValue = typeof this.codeEditor.value === "string" ? this.codeEditor.value : "";
      var highlightedHtml = this.buildSyntaxHighlightedHtml(editorValue);
      if (editorValue.endsWith("\n")) {
        highlightedHtml += "\n";
      }
      this.codeHighlight.innerHTML = "<code>" + highlightedHtml + "</code>";
      this.codeHighlight.scrollTop = this.codeEditor.scrollTop || 0;
      this.codeHighlight.scrollLeft = this.codeEditor.scrollLeft || 0;
    }

    syncHighlightScroll() {
      if (!this.codeHighlight) {
        return;
      }

      this.codeHighlight.scrollTop = this.codeEditor.scrollTop || 0;
      this.codeHighlight.scrollLeft = this.codeEditor.scrollLeft || 0;
    }
  }

export { EditorController };
