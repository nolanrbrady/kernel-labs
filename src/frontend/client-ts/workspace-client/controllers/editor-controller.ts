/* Editor controller for workspace client. */
import { setClassFlag, escapeHtml } from "../shared/dom-utils.js"
import type {
  AttributeNodeLike,
  ClassNameNodeLike,
  CodeEditorNodeLike,
  EventHandlerLike,
  EventNodeLike,
  InnerHtmlNodeLike,
  KeyEventLike,
  ScrollNodeLike
} from "../shared/types.js"

type EditorShellNodeLike =
  & ClassNameNodeLike
  & Partial<AttributeNodeLike>
  & Partial<EventNodeLike>

type CodeHighlightNodeLike = InnerHtmlNodeLike & Partial<ScrollNodeLike>

type MouseDownEventLike = {
  target?: unknown
  preventDefault?: () => void
}

type EditorControllerOptions = {
  codeEditor: CodeEditorNodeLike | null
  codeHighlight?: CodeHighlightNodeLike | null
  codeEditorShell?: EditorShellNodeLike | null
  onTypingStart?: (sourceLabel: string) => void
}

export class EditorController {
  private readonly codeEditor: CodeEditorNodeLike | null
  private readonly codeHighlight: CodeHighlightNodeLike | null
  private readonly codeEditorShell: EditorShellNodeLike | null
  private readonly onTypingStart?: (sourceLabel: string) => void

  constructor(options: EditorControllerOptions) {
    this.codeEditor = options.codeEditor
    this.codeHighlight = options.codeHighlight ?? null
    this.codeEditorShell = options.codeEditorShell ?? null
    this.onTypingStart = options.onTypingStart
  }

  bind(): void {
    if (!this.codeEditor) {
      return
    }

    if (
      this.codeEditorShell &&
      typeof this.codeEditorShell.setAttribute === "function"
    ) {
      this.codeEditorShell.setAttribute("data-editor-enhanced", "true")
    }

    this.codeEditor.addEventListener(
      "keydown",
      this.handleEditorTabIndent.bind(this) as EventHandlerLike
    )
    this.codeEditor.addEventListener(
      "keydown",
      this.handleSessionStartFromTyping.bind(this) as EventHandlerLike
    )
    this.codeEditor.addEventListener("focus", this.handleEditorFocus.bind(this))
    this.codeEditor.addEventListener("blur", this.handleEditorBlur.bind(this))
    this.codeEditor.addEventListener("input", this.renderCodeHighlight.bind(this))
    this.codeEditor.addEventListener("scroll", this.syncHighlightScroll.bind(this))

    if (
      this.codeEditorShell &&
      typeof this.codeEditorShell.addEventListener === "function"
    ) {
      this.codeEditorShell.addEventListener(
        "mousedown",
        this.focusEditorFromShellClick.bind(this) as EventHandlerLike
      )
    }

    this.renderCodeHighlight()
  }

  handleEditorTabIndent(event?: KeyEventLike): void {
    if (!event || event.key !== "Tab" || !this.codeEditor) {
      return
    }

    if (typeof event.preventDefault === "function") {
      event.preventDefault()
    }

    const currentValue = this.codeEditor.value || ""
    const selectionStart =
      typeof this.codeEditor.selectionStart === "number"
        ? this.codeEditor.selectionStart
        : currentValue.length
    const selectionEnd =
      typeof this.codeEditor.selectionEnd === "number"
        ? this.codeEditor.selectionEnd
        : selectionStart
    const indent = "  "

    this.codeEditor.value =
      currentValue.slice(0, selectionStart) +
      indent +
      currentValue.slice(selectionEnd)

    const nextCursor = selectionStart + indent.length
    if (typeof this.codeEditor.setSelectionRange === "function") {
      this.codeEditor.setSelectionRange(nextCursor, nextCursor)
    } else {
      this.codeEditor.selectionStart = nextCursor
      this.codeEditor.selectionEnd = nextCursor
    }

    this.renderCodeHighlight()
  }

  isTypingKey(event?: KeyEventLike): boolean {
    if (!event || typeof event.key !== "string") {
      return false
    }

    if (event.key.length !== 1) {
      return false
    }

    return !event.ctrlKey && !event.metaKey && !event.altKey
  }

  handleSessionStartFromTyping(event?: KeyEventLike): void {
    if (!this.isTypingKey(event)) {
      return
    }

    if (typeof this.onTypingStart === "function") {
      this.onTypingStart("first-character")
    }
  }

  setEditorEditingState(isEditing: boolean): void {
    if (!this.codeEditorShell) {
      return
    }

    setClassFlag(this.codeEditorShell, "is-editing", isEditing)
  }

  handleEditorFocus(): void {
    this.setEditorEditingState(true)
  }

  handleEditorBlur(): void {
    this.setEditorEditingState(false)
  }

  focusEditorFromShellClick(event?: MouseDownEventLike): void {
    if (!this.codeEditor || typeof this.codeEditor.focus !== "function") {
      return
    }

    if (event && event.target === this.codeEditor) {
      return
    }

    if (event && typeof event.preventDefault === "function") {
      event.preventDefault()
    }

    this.codeEditor.focus()
  }

  buildSyntaxHighlightedHtml(sourceText: string): string {
    const escapedSource = escapeHtml(sourceText)
    const tokenPattern =
      /(#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:def|return|if|elif|else|for|while|in|None|True|False|pass|class|import|from|as|and|or|not|with|try|except|finally|lambda|yield|break|continue)\b|\b(?:len|range|sum|min|max|print|enumerate|zip|float|int|list|dict|set|tuple)\b|\b\d+(?:\.\d+)?\b)/g

    return escapedSource.replace(tokenPattern, (token: string) => {
      if (token[0] === "#") {
        return `<span class="token-comment">${token}</span>`
      }
      if (token[0] === "'" || token[0] === '"') {
        return `<span class="token-string">${token}</span>`
      }
      if (/^\d/.test(token)) {
        return `<span class="token-number">${token}</span>`
      }
      if (
        /^(len|range|sum|min|max|print|enumerate|zip|float|int|list|dict|set|tuple)$/.test(
          token
        )
      ) {
        return `<span class="token-builtin">${token}</span>`
      }

      return `<span class="token-keyword">${token}</span>`
    })
  }

  renderCodeHighlight(): void {
    if (!this.codeEditor || !this.codeHighlight) {
      return
    }

    const editorValue =
      typeof this.codeEditor.value === "string" ? this.codeEditor.value : ""
    let highlightedHtml = this.buildSyntaxHighlightedHtml(editorValue)
    if (editorValue.endsWith("\n")) {
      highlightedHtml += "\n"
    }

    this.codeHighlight.innerHTML = `<code>${highlightedHtml}</code>`
    if (
      typeof this.codeHighlight.scrollTop === "number" &&
      typeof this.codeEditor.scrollTop === "number"
    ) {
      this.codeHighlight.scrollTop = this.codeEditor.scrollTop
    }
    if (
      typeof this.codeHighlight.scrollLeft === "number" &&
      typeof this.codeEditor.scrollLeft === "number"
    ) {
      this.codeHighlight.scrollLeft = this.codeEditor.scrollLeft
    }
  }

  syncHighlightScroll(): void {
    if (!this.codeHighlight || !this.codeEditor) {
      return
    }

    if (
      typeof this.codeHighlight.scrollTop === "number" &&
      typeof this.codeEditor.scrollTop === "number"
    ) {
      this.codeHighlight.scrollTop = this.codeEditor.scrollTop
    }
    if (
      typeof this.codeHighlight.scrollLeft === "number" &&
      typeof this.codeEditor.scrollLeft === "number"
    ) {
      this.codeHighlight.scrollLeft = this.codeEditor.scrollLeft
    }
  }
}
