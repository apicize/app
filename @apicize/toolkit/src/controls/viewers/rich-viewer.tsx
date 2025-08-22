import { SxProps } from '@mui/system'

import { css_beautify, html_beautify, js_beautify } from 'js-beautify'
import { EditorMode } from '../../models/editor-mode'
import { useApicizeSettings } from '../../contexts/apicize-settings.context'
import { observer } from 'mobx-react-lite'
import { ResultEditSessionType } from '../editors/editor-types'
import { useWorkspace } from '../../contexts/workspace.context'
import MonacoEditor, { monaco } from 'react-monaco-editor'
import { editor } from 'monaco-editor'
import React, { useState } from 'react'
import { useFeedback } from '../../contexts/feedback.context'

/**
 * A rich text viewer for viewing results
 * @param props
 * @returns 
 */
export const RichViewer = React.memo(observer((props: {
    sx?: SxProps,
    id: string,
    index: number,
    type: ResultEditSessionType,
    mode?: EditorMode,
    text: string,
    beautify?: boolean,
    wrap?: boolean,
}) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const settings = useApicizeSettings()
    const [model, setModel] = useState<editor.ITextModel | null>(null)

    if (!model) {
        workspace.getResultEditModel(props.id, props.index, props.type, props.mode ?? EditorMode.txt)
            .then(m => setModel(m))
            .catch(e => feedback.toastError(e))
        return null
    }

    let text: string
    let editorLanguage = props.mode
    if (props.beautify === true) {
        switch (props.mode) {
            case EditorMode.js:
            case EditorMode.json:
                text = js_beautify(props.text, {
                    indent_size: settings.editorIndentSize,
                    indent_empty_lines: false,
                    keep_array_indentation: true,
                    max_preserve_newlines: 2,
                    brace_style: 'expand'
                })
                break
            case EditorMode.html:
                text = html_beautify(props.text, {
                    indent_size: settings.editorIndentSize,
                    indent_empty_lines: false,
                    max_preserve_newlines: 2,
                })
                break
            case EditorMode.css:
                text = css_beautify(props.text, { indent_size: settings.editorIndentSize })
                break
            default:
                text = props.text
        }
    } else {
        text = props.text
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
            wordWrap: props.wrap === true ? 'on' : 'off',
        }} />
}))
