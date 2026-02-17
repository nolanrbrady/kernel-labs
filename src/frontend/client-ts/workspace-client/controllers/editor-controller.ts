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
type AceHostNodeLike = {
  style?: {
    display?: string
  }
  contains?: (target: Node | null) => boolean
}

type AceEditorSessionLike = {
  setMode?: (mode: string) => void
  setUseSoftTabs?: (useSoftTabs: boolean) => void
  setTabSize?: (size: number) => void
  setValue?: (value: string, cursorPosition?: number) => void
  getValue?: () => string
  on?: (eventName: string, handler: () => void) => void
}

type AceEditorLike = {
  session?: AceEditorSessionLike
  setTheme?: (theme: string) => void
  setOptions?: (options: Record<string, unknown>) => void
  on?: (eventName: string, handler: () => void) => void
  focus?: () => void
  resize?: () => void
}

type AceGlobalLike = {
  edit: (element: unknown) => AceEditorLike
}

type MouseDownEventLike = {
  target?: unknown
  preventDefault?: () => void
}

type EditorControllerOptions = {
  codeEditor: CodeEditorNodeLike | null
  codeHighlight?: CodeHighlightNodeLike | null
  codeAceHost?: AceHostNodeLike | null
  codeEditorShell?: EditorShellNodeLike | null
  onTypingStart?: (sourceLabel: string) => void
}

export class EditorController {
  private readonly codeEditor: CodeEditorNodeLike | null
  private readonly codeHighlight: CodeHighlightNodeLike | null
  private readonly codeAceHost: AceHostNodeLike | null
  private readonly codeEditorShell: EditorShellNodeLike | null
  private readonly onTypingStart?: (sourceLabel: string) => void
  private aceEditor: AceEditorLike | null = null
  private typingStartNotified = false

  constructor(options: EditorControllerOptions) {
    this.codeEditor = options.codeEditor
    this.codeHighlight = options.codeHighlight ?? null
    this.codeAceHost = options.codeAceHost ?? null
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

    if (this.initializeAceEditor()) {
      if (
        this.codeEditorShell &&
        typeof this.codeEditorShell.addEventListener === "function"
      ) {
        this.codeEditorShell.addEventListener(
          "mousedown",
          this.focusAceFromShellClick.bind(this) as EventHandlerLike
        )
      }
      return
    }

    if (
      this.codeEditorShell &&
      typeof this.codeEditorShell.setAttribute === "function"
    ) {
      this.codeEditorShell.setAttribute("data-editor-mode", "textarea")
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

  syncThemeWithDocument(): void {
    if (!this.aceEditor || typeof this.aceEditor.setTheme !== "function") {
      return
    }

    const activeTheme = this.getActiveTheme()
    const aceTheme =
      activeTheme === "light" ? "ace/theme/github" : "ace/theme/tomorrow_night"

    this.aceEditor.setTheme(aceTheme)
    if (typeof this.aceEditor.resize === "function") {
      this.aceEditor.resize()
    }
  }

  handleEditorTabIndent(event?: KeyEventLike): void {
    if (!event || event.key !== "Tab" || !this.codeEditor || this.aceEditor) {
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

    this.notifyTypingStart()
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

    if (this.isEventWithinNode(event?.target, this.codeEditor)) {
      return
    }

    if (event && typeof event.preventDefault === "function") {
      event.preventDefault()
    }

    this.codeEditor.focus()
  }

  focusAceFromShellClick(event?: MouseDownEventLike): void {
    if (!this.aceEditor || typeof this.aceEditor.focus !== "function") {
      return
    }

    if (this.isEventWithinNode(event?.target, this.codeAceHost)) {
      return
    }

    if (event && typeof event.preventDefault === "function") {
      event.preventDefault()
    }

    this.aceEditor.focus()
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
    if (!this.codeEditor || !this.codeHighlight || this.aceEditor) {
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
    if (!this.codeHighlight || !this.codeEditor || this.aceEditor) {
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

  private initializeAceEditor(): boolean {
    if (!this.codeEditor || !this.codeAceHost) {
      return false
    }

    const ace = this.getAceGlobal()
    if (!ace) {
      return false
    }

    let aceEditor: AceEditorLike
    try {
      aceEditor = ace.edit(this.codeAceHost)
    } catch (_error) {
      return false
    }

    this.aceEditor = aceEditor

    if (
      this.codeEditorShell &&
      typeof this.codeEditorShell.setAttribute === "function"
    ) {
      this.codeEditorShell.setAttribute("data-editor-mode", "ace")
    }
    if (this.codeAceHost.style) {
      this.codeAceHost.style.display = "block"
    }

    const initialValue =
      typeof this.codeEditor.value === "string" ? this.codeEditor.value : ""
    aceEditor.session?.setValue?.(initialValue, 1)
    aceEditor.session?.setMode?.("ace/mode/python")
    aceEditor.session?.setUseSoftTabs?.(true)
    aceEditor.session?.setTabSize?.(2)
    aceEditor.setOptions?.({
      showPrintMargin: false,
      wrap: false,
      fontSize: "0.85rem",
      useSoftTabs: true,
      tabSize: 2
    })
    this.syncThemeWithDocument()
    this.syncTextareaFromAce()
    aceEditor.session?.on?.("change", () => {
      this.syncTextareaFromAce()
      this.notifyTypingStart()
    })
    aceEditor.on?.("focus", this.handleEditorFocus.bind(this))
    aceEditor.on?.("blur", this.handleEditorBlur.bind(this))
    return true
  }

  private getAceGlobal(): AceGlobalLike | null {
    const globalReference = globalThis as { ace?: unknown }
    const ace = globalReference.ace
    if (
      !ace ||
      typeof ace !== "object" ||
      typeof (ace as { edit?: unknown }).edit !== "function"
    ) {
      return null
    }

    return ace as AceGlobalLike
  }

  private syncTextareaFromAce(): void {
    if (!this.aceEditor?.session || !this.codeEditor) {
      return
    }

    const editorValue = this.aceEditor.session.getValue?.()
    if (typeof editorValue === "string") {
      this.codeEditor.value = editorValue
    }
  }

  private notifyTypingStart(): void {
    if (this.typingStartNotified) {
      return
    }

    this.typingStartNotified = true
    if (typeof this.onTypingStart === "function") {
      this.onTypingStart("first-character")
    }
  }

  private getActiveTheme(): string {
    const documentRef = (
      globalThis as {
        document?: {
          documentElement?: {
            getAttribute?: (name: string) => string | null
          }
        }
      }
    ).document

    if (
      !documentRef ||
      !documentRef.documentElement ||
      typeof documentRef.documentElement.getAttribute !== "function"
    ) {
      return "dark"
    }

    const activeTheme = documentRef.documentElement.getAttribute("data-theme")
    return activeTheme === "light" ? "light" : "dark"
  }

  private isEventWithinNode(target: unknown, node: unknown): boolean {
    if (!target || !node) {
      return false
    }
    if (target === node) {
      return true
    }

    const nodeWithContains = node as { contains?: (candidate: Node | null) => boolean }
    if (typeof nodeWithContains.contains === "function") {
      return nodeWithContains.contains(target as Node | null)
    }

    return false
  }
}
