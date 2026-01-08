
import { css_beautify, html_beautify, js_beautify } from 'js-beautify'
import { EditorMode } from '../../models/editor-mode'
import { useApicizeSettings } from '../../contexts/apicize-settings.context'
import { observer } from 'mobx-react-lite'
import MonacoEditor from 'react-monaco-editor'
import { editor } from 'monaco-editor'
import React from 'react'

/**
 * A rich text viewer for viewing results
 * @param props
 * @returns 
 */
export const RichViewer = React.memo(observer(
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

        let editorLanguage = mode
        if (beautify === true) {
            switch (mode) {
                case EditorMode.js:
                case EditorMode.json:
                    text = js_beautify(text, {
                        indent_size: settings.editorIndentSize,
                        indent_empty_lines: false,
                        keep_array_indentation: true,
                        max_preserve_newlines: 2,
                        brace_style: 'expand'
                    })
                    break
                case EditorMode.html:
                    text = html_beautify(text, {
                        indent_size: settings.editorIndentSize,
                        indent_empty_lines: false,
                        max_preserve_newlines: 2,
                    })
                    break
                case EditorMode.css:
                    text = css_beautify(text, { indent_size: settings.editorIndentSize })
                    break
                default:
                    text = text
            }
        } else {
            text = text
        }

        return <MonacoEditor
            language={editorLanguage}
            theme={settings.colorScheme === "dark" ? 'vs-dark' : 'vs-light'}
            value={text}
            width='100%'
            height='100%'
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
    }))
