
import { css_beautify, html_beautify, js_beautify } from 'js-beautify'
import { EditorMode } from '../../models/editor-mode'
import { useApicizeSettings } from '../../contexts/apicize-settings.context'
import { observer } from 'mobx-react-lite'
import { editor } from 'monaco-editor'
import { useEffect, useRef } from 'react'
import { useMonacoClipboard } from '../../hooks/use-monaco-clipboard'

// Scroll position, cursor and selection for each result model, so they survive tab switches
const viewStates = new WeakMap<editor.ITextModel, editor.ICodeEditorViewState>()

const saveViewState = (me: editor.IStandaloneCodeEditor) => {
    const model = me.getModel()
    const state = me.saveViewState()
    if (model && state && !model.isDisposed()) {
        viewStates.set(model, state)
    }
}

const restoreViewState = (me: editor.IStandaloneCodeEditor, model: editor.ITextModel) => {
    const state = viewStates.get(model)
    if (state) {
        me.restoreViewState(state)
    }
}

/**
 * Format text for display in a rich viewer
 * @param text
 * @param mode
 * @param indentSize
 * @returns formatted text
 */
export function formatViewerText(text: string, mode: EditorMode, indentSize: number): string {
    switch (mode) {
        case EditorMode.js:
        case EditorMode.json:
            return js_beautify(text, {
                indent_size: indentSize,
                indent_empty_lines: false,
                keep_array_indentation: true,
                max_preserve_newlines: 2,
                brace_style: 'expand'
            })
        case EditorMode.html:
            return html_beautify(text, {
                indent_size: indentSize,
                indent_empty_lines: false,
                max_preserve_newlines: 2,
            })
        case EditorMode.css:
            return css_beautify(text, { indent_size: indentSize })
        default:
            return text
    }
}

/**
 * A rich text viewer for viewing results; the model supplies both content and language,
 * and should be cached by the caller so tokenization and view state are retained
 * @param props
 * @returns
 */
export const RichViewer = observer(
    (
        { model, wrap }:
            {
                model: editor.ITextModel,
                wrap?: boolean,
            }
    ) => {
        const settings = useApicizeSettings()
        const containerRef = useRef<HTMLDivElement | null>(null)
        const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
        const initialModel = useRef(model)

        // Create the editor (declared before the clipboard hook so the editor exists when it runs)
        useEffect(() => {
            if (!containerRef.current) return
            const me = editor.create(containerRef.current, {
                model: initialModel.current,
                automaticLayout: true,
                minimap: { enabled: false },
                readOnly: true,
                theme: settings.colorScheme === 'dark' ? 'vs-dark' : 'vs-light',
                detectIndentation: settings.editorDetectExistingIndent,
                tabSize: settings.editorIndentSize,
                fontSize: settings.fontSize,
                wordWrap: wrap === true ? 'on' : 'off',
            })
            editorRef.current = me
            restoreViewState(me, initialModel.current)
            return () => {
                saveViewState(me)
                editorRef.current = null
                try { me.dispose() } catch (e: unknown) {
                    if ((e as { name?: string })?.name !== 'Canceled' && (e as { message?: string })?.message !== 'Canceled') throw e
                }
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [])

        // Hook Monaco clipboard to Tauri clipboard (read-only)
        useMonacoClipboard(editorRef, true)

        // Swap models in place (e.g. request/response toggle) rather than recreating the editor
        useEffect(() => {
            const me = editorRef.current
            if (!me || me.getModel() === model) return
            saveViewState(me)
            me.setModel(model)
            restoreViewState(me, model)
        }, [model])

        useEffect(() => {
            editorRef.current?.updateOptions({
                detectIndentation: settings.editorDetectExistingIndent,
                tabSize: settings.editorIndentSize,
                fontSize: settings.fontSize,
                wordWrap: wrap === true ? 'on' : 'off',
            })
        }, [settings.editorDetectExistingIndent, settings.editorIndentSize, settings.fontSize, wrap])

        useEffect(() => {
            editor.setTheme(settings.colorScheme === 'dark' ? 'vs-dark' : 'vs-light')
        }, [settings.colorScheme])

        return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    })
