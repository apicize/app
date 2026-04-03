
import { css_beautify, html_beautify, js_beautify } from 'js-beautify'
import { EditorMode } from '../../models/editor-mode'
import { useApicizeSettings } from '../../contexts/apicize-settings.context'
import { observer } from 'mobx-react-lite'
import MonacoEditor from 'react-monaco-editor'
import { editor } from 'monaco-editor'
import React, { useMemo, useRef } from 'react'
import { useMonacoClipboard } from '../../hooks/use-monaco-clipboard'

/**
 * A rich text viewer for viewing results
 * @param props
 * @returns 
 */
export const RichViewer = observer(
    (
        { text, model, mode, beautify, wrap }:
            {
                text: string,
                model: editor.ITextModel,
                mode: EditorMode,
                beautify?: boolean,
                wrap?: boolean,
            }
    ) => {
        const settings = useApicizeSettings()
        const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

        // Hook Monaco clipboard to Tauri clipboard (read-only)
        useMonacoClipboard(editorRef, true)

        const beautifiedText = useMemo(() => {
            if (beautify === true) {
                switch (mode) {
                    case EditorMode.js:
                    case EditorMode.json:
                        return js_beautify(text, {
                            indent_size: settings.editorIndentSize,
                            indent_empty_lines: false,
                            keep_array_indentation: true,
                            max_preserve_newlines: 2,
                            brace_style: 'expand'
                        })
                    case EditorMode.html:
                        return html_beautify(text, {
                            indent_size: settings.editorIndentSize,
                            indent_empty_lines: false,
                            max_preserve_newlines: 2,
                        })
                    case EditorMode.css:
                        return css_beautify(text, { indent_size: settings.editorIndentSize })
                }
            }
            return text
        }, [text, mode, beautify, settings.editorIndentSize])

        return <MonacoEditor
            language={mode}
            theme={settings.colorScheme === "dark" ? 'vs-dark' : 'vs-light'}
            value={beautifiedText}
            width='100%'
            height='100%'
            editorDidMount={(me) => {
                editorRef.current = me
            }}
            options={{
                automaticLayout: true,
                minimap: { enabled: false },
                model,
                detectIndentation: settings.editorDetectExistingIndent,
                tabSize: settings.editorIndentSize,
                autoIndent: 'full',
                formatOnType: true,
                formatOnPaste: true,
                fontSize: settings.fontSize,
                readOnly: true,
                wordWrap: wrap === true ? 'on' : 'off',
            }} />
    })
