export { RequestEditor } from './controls/editors/request-editor'
export { AuthorizationEditor } from './controls/editors/authorization-editor'
export { ScenarioEditor } from './controls/editors/scenario-editor'
export { CertificateEditor } from './controls/editors/certificate-editor'
export { ProxyEditor } from './controls/editors/proxy-editor'
export { SettingsEditor } from './controls/editors/settings-editor'
export { WarningsEditor } from './controls/editors/warnings-editor'
export { EditableAuthorization } from './models/workspace/editable-authorization'
export { CertificateFileType } from './models/workspace/editable-certificate'
export { NavigationControl } from './controls/navigation/navigation'
export { HelpPanel } from './controls/help'
export { MainPanel } from './controls/main-panel'
export { PasswordTextField } from './controls/password-text-field'

export * from './theme'
export * from './services/base64'
export * from './models/updates/entity-update'
export * from './models/updates/defaults-update'
export * from './models/updates/request-update'
export * from './models/updates/request-group-update'
export * from './models/updates/scenario-update'
export * from './models/updates/authorization-update'
export * from './models/updates/certificate-update'
export * from './models/updates/proxy-update'
export * from './models/updates/data-set-update'
export * from './models/workspace/indexed-entity-position'
export * from './models/workspace/cached-token-info'
export * from './models/workspace/entity-type'
export * from './models/workspace/execution'
export * from './models/workspace/request-body-info'
export * from './models/workspace/ssh-file-type'
export * from './models/navigation'
export * from './contexts/workspace.context'
export * from './contexts/feedback.context'
export * from './contexts/clipboard.context'
export * from './contexts/file-operations.context'
export * from './contexts/oauth2.context'
export * from './contexts/workspace.context'
export * from './contexts/apicize-settings.context'
export * from './contexts/log.context'
export * from './models/trace';
export * from './contexts/dragdrop.context'
export * from './contexts/file-dragdrop.context'
export * from './models/editable'
export * from './models/editable-settings'
export * from './models/clipboard_payload_request'
export * from './models/palette-colors'
export * from './models/icon-color-map'
export * from './hooks/use-monaco-clipboard'

import { monaco } from 'react-monaco-editor'
import "./toolkit.css"

monaco.editor.addKeybindingRules([
    {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        command: null
    },
    {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
        command: null
    },
    {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN,
        command: null
    },
    {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO,
        command: null
    },
    {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        command: null
    },
    {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
        command: null
    },
])

// This needs to be here because Monaco is prone to throwing cancellation errors when it goes out of context
window.addEventListener('unhandledrejection', (evt) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (evt?.reason?.stack?.includes?.('CancellationError@')) {
        evt.stopImmediatePropagation()
        evt.stopPropagation()
        evt.preventDefault()
    }
})

// ─── json-handlebars language ────────────────────────────────────────────────
// A variant of 'json' that treats {{...}} expressions as valid string content,
// suppressing false-positive syntax errors in request bodies that use variable
// substitution while still reporting real JSON structural errors.

// Placeholder replaces bare (outside-string) {{...}} — must be a valid JSON value
const HB_PLACEHOLDER = '"__APICIZE_HB_PH__"'
const HB_PLACEHOLDER_ESC = HB_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const HB_PLACEHOLDER_RE = new RegExp(HB_PLACEHOLDER_ESC, 'g')

interface HbSubstitution {
    origOffset: number
    origLen: number
    subLen: number
}

// Walks the text tracking JSON string context. Only bare {{...}} (outside strings)
// are substituted — those inside strings are already valid JSON and need no change.
function substituteHandlebars(text: string): { substituted: string; offsetMap: HbSubstitution[] } {
    const offsetMap: HbSubstitution[] = []
    let result = ''
    let i = 0
    let inString = false

    while (i < text.length) {
        if (inString) {
            if (text[i] === '\\') {
                result += text[i] + (text[i + 1] ?? '')
                i += 2
            } else if (text[i] === '"') {
                result += '"'
                inString = false
                i++
            } else {
                result += text[i++]
            }
        } else {
            if (text[i] === '"') {
                result += '"'
                inString = true
                i++
            } else if (text[i] === '{' && text[i + 1] === '{') {
                const end = text.indexOf('}}', i + 2)
                if (end !== -1) {
                    const origLen = end + 2 - i
                    offsetMap.push({ origOffset: i, origLen, subLen: HB_PLACEHOLDER.length })
                    result += HB_PLACEHOLDER
                    i = end + 2
                } else {
                    result += text[i++]
                }
            } else {
                result += text[i++]
            }
        }
    }
    return { substituted: result, offsetMap }
}

// Collects bare (outside-string) {{...}} tokens in order — mirrors substituteHandlebars.
function collectBareHandlebars(text: string): string[] {
    const tokens: string[] = []
    let i = 0
    let inString = false

    while (i < text.length) {
        if (inString) {
            if (text[i] === '\\') { i += 2 }
            else if (text[i] === '"') { inString = false; i++ }
            else { i++ }
        } else {
            if (text[i] === '"') { inString = true; i++ }
            else if (text[i] === '{' && text[i + 1] === '{') {
                const end = text.indexOf('}}', i + 2)
                if (end !== -1) { tokens.push(text.slice(i, end + 2)); i = end + 2 }
                else { i++ }
            } else { i++ }
        }
    }
    return tokens
}

function mapSubOffset(subOffset: number, offsetMap: HbSubstitution[]): number {
    let accDelta = 0
    for (const entry of offsetMap) {
        const subStart = entry.origOffset + accDelta
        if (subOffset <= subStart) break
        if (subOffset >= subStart + entry.subLen) {
            accDelta += entry.subLen - entry.origLen
        } else {
            // Offset lands inside a placeholder — point to the original handlebars start
            return entry.origOffset
        }
    }
    return subOffset - accDelta
}

monaco.languages.register({ id: 'json-handlebars', aliases: ['JSON (Handlebars)'], extensions: [], mimetypes: [] })

monaco.languages.setMonarchTokensProvider('json-handlebars', {
    defaultToken: '',
    tokenPostfix: '.json',
    tokenizer: {
        root: [
            [/[ \t\r\n]+/, ''],
            [/[{}[\]]/, '@brackets'],
            [/[,:]/, 'delimiter'],
            [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
            [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],
            [/\b(?:true|false|null)\b/, 'keyword'],
        ],
        string: [
            [/\{\{[^}]*\}\}/, 'variable.name'],
            [/\\(?:["\\/bfnrt])/, 'string.escape'],
            [/\\u[0-9A-Fa-f]{4}/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
            [/[^"\\{]+/, 'string'],
            [/\{/, 'string'],
        ],
    },
} as monaco.languages.IMonarchLanguage)

monaco.languages.setLanguageConfiguration('json-handlebars', {
    wordPattern: /(-?\d*\.\d\w*)|([^[\]{},:"'\s]+)/g,
    brackets: [
        ['{', '}'],
        ['[', ']'],
    ],
    autoClosingPairs: [
        { open: '{', close: '}', notIn: ['string'] },
        { open: '[', close: ']', notIn: ['string'] },
        { open: '"', close: '"', notIn: ['string'] },
    ],
    surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '"', close: '"' },
    ],
})

monaco.languages.registerDocumentFormattingEditProvider('json-handlebars', {
    provideDocumentFormattingEdits(model, options) {
        const original = model.getValue()
        const { substituted } = substituteHandlebars(original)
        let formatted: string
        try {
            formatted = JSON.stringify(JSON.parse(substituted), null, options.tabSize ?? 2)
        } catch {
            return []
        }
        // Restore original bare {{...}} expressions in order of appearance
        const origTokens = collectBareHandlebars(original)
        let idx = 0
        const restored = formatted.replace(HB_PLACEHOLDER_RE, () => origTokens[idx++] ?? HB_PLACEHOLDER)
        return [{ range: model.getFullModelRange(), text: restored }]
    },
})

;(function registerHandlebarsJsonDiagnostics() {
    const OWNER = 'json-handlebars'
    const LANG_ID = 'json-handlebars'
    const pending = new Map<string, ReturnType<typeof setTimeout>>()

    function schedule(model: monaco.editor.ITextModel) {
        const key = model.uri.toString()
        const h = pending.get(key)
        if (h !== undefined) clearTimeout(h)
        pending.set(key, setTimeout(() => { pending.delete(key); void doValidate(model) }, 500))
    }

    async function doValidate(model: monaco.editor.ITextModel) {
        if (model.isDisposed() || model.getLanguageId() !== LANG_ID) return
        const originalText = model.getValue()
        const { substituted, offsetMap } = substituteHandlebars(originalText)
        const tempUri = monaco.Uri.parse('inmemory://hb-validate/' + encodeURIComponent(model.uri.path))
        let tempModel = monaco.editor.getModel(tempUri)
        if (!tempModel) {
            tempModel = monaco.editor.createModel(substituted, 'json', tempUri)
        } else if (tempModel.getValue() !== substituted) {
            tempModel.setValue(substituted)
        }
        try {
            interface LspDiagnostic {
                range: { start: { line: number; character: number }; end: { line: number; character: number } }
                message: string
                severity?: number
                source?: string
            }
            interface JsonWorkerWithValidation extends monaco.languages.json.IJSONWorker {
                doValidation(uri: string): Promise<LspDiagnostic[]>
            }
            const getWorkerFn = await monaco.languages.json.getWorker()
            const worker = await getWorkerFn(tempUri) as JsonWorkerWithValidation
            const diagnostics = await worker.doValidation(tempUri.toString())
            if (model.isDisposed()) return
            const markers: monaco.editor.IMarkerData[] = diagnostics.map((d: LspDiagnostic) => {
                const sLine = d.range.start.line + 1
                const sCol = d.range.start.character + 1
                const eLine = d.range.end.line + 1
                const eCol = d.range.end.character + 1
                const subStart = tempModel.getOffsetAt({ lineNumber: sLine, column: sCol })
                const subEnd = tempModel.getOffsetAt({ lineNumber: eLine, column: eCol })
                const origStart = model.getPositionAt(mapSubOffset(subStart, offsetMap))
                const origEnd = model.getPositionAt(mapSubOffset(subEnd, offsetMap))
                const severity =
                    d.severity === 1 ? monaco.MarkerSeverity.Error :
                    d.severity === 2 ? monaco.MarkerSeverity.Warning :
                    d.severity === 3 ? monaco.MarkerSeverity.Info :
                    monaco.MarkerSeverity.Hint
                return {
                    severity,
                    message: d.message,
                    source: d.source,
                    startLineNumber: origStart.lineNumber,
                    startColumn: origStart.column,
                    endLineNumber: origEnd.lineNumber,
                    endColumn: origEnd.column,
                }
            })
            monaco.editor.setModelMarkers(model, OWNER, markers)
        } catch {
            // worker errors are non-fatal
        }
    }

    monaco.editor.onDidCreateModel(model => {
        if (model.getLanguageId() !== LANG_ID) return
        schedule(model)
        model.onDidChangeContent(() => schedule(model))
    })

    monaco.editor.onWillDisposeModel(model => {
        if (model.getLanguageId() !== LANG_ID) return
        const key = model.uri.toString()
        const h = pending.get(key)
        if (h !== undefined) { clearTimeout(h); pending.delete(key) }
        monaco.editor.setModelMarkers(model, OWNER, [])
        const tempUri = monaco.Uri.parse('inmemory://hb-validate/' + encodeURIComponent(model.uri.path))
        monaco.editor.getModel(tempUri)?.dispose()
    })

    monaco.editor.onDidChangeModelLanguage(({ model, oldLanguage }) => {
        if (model.getLanguageId() === LANG_ID) {
            schedule(model)
        } else if (oldLanguage === LANG_ID) {
            const key = model.uri.toString()
            const h = pending.get(key)
            if (h !== undefined) { clearTimeout(h); pending.delete(key) }
            monaco.editor.setModelMarkers(model, OWNER, [])
        }
    })
})()
