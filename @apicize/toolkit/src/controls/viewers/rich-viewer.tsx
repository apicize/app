import 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-markup'
import 'prismjs/themes/prism-tomorrow.css'

import { Box } from '@mui/material'
import { SxProps } from '@mui/system'
import ace, { Editor } from 'ace-code'
import { Mode as JavaScriptMode } from 'ace-code/src/mode/javascript'
import { Mode as JsonMode } from 'ace-code/src/mode/json'
import { Mode as XmlMode } from 'ace-code/src/mode/xml'
import { Mode as HtmlMode } from 'ace-code/src/mode/html'
import { Mode as CssMode } from 'ace-code/src/mode/css'
import { Mode as TextMode } from 'ace-code/src/mode/text'


import { useEffect, useRef } from 'react'
import theme from 'ace-code/src/theme/gruvbox'
// import { beautify } from 'ace-code/src/ext/beautify'
import { css_beautify, html_beautify, js_beautify } from 'js-beautify'
import { useApicizeSettings } from '../../contexts/apicize-settings.context'
import { EditorMode } from '../../models/editor-mode'

// We have to dynamically load search box because of webpack(?)
ace.config.dynamicModules = {
    'ace/ext/searchbox': () => import('ace-code/src/ext/searchbox')
}

const updateEditorMode = (editor: Editor, mode: EditorMode | undefined) => {
    switch (mode) {
        case EditorMode.js:
            editor.session.setMode(new JavaScriptMode());
            break
        case EditorMode.json:
            editor.session.setMode(new JsonMode());
            break
        case EditorMode.xml:
            editor.session.setMode(new XmlMode());
            break
        case EditorMode.html:
            editor.session.setMode(new HtmlMode());
            break
        case EditorMode.css:
            editor.session.setMode(new CssMode());
            break
        default:
            editor.session.setMode(new TextMode());
            break
    }
}

/**
 * A rich text editor / viewer
 * @param props
 * @returns 
 */
export const RichViewer = (props: {
    sx?: SxProps,
    mode?: EditorMode,
    text: string,
    beautify?: boolean,
    wrap?: boolean,
}) => {
    const viewer = useRef<Editor | null>(null)
    const apicizeSettings = useApicizeSettings()

    let text: string
    if (props.beautify === true) {
        switch (props.mode) {
            case EditorMode.js:
            case EditorMode.json:
                text = js_beautify(props.text, { indent_size: 4 })
                break
            case EditorMode.html:
                text = html_beautify(props.text, { indent_size: 4 })
                break
            case EditorMode.css:
                text = css_beautify(props.text, { indent_size: 4 })
                break
            default:
                text = props.text
        }
    } else {
        text = props.text
    }


    // On initial load, set up the editor
    useEffect(() => {
        viewer.current = ace.edit('viewer')
        viewer.current.setTheme(theme)
        viewer.current.setOptions({
            fontSize: `${apicizeSettings.fontSize}pt`,
            showGutter: true,
            showPrintMargin: false,
            tabSize: 4,
            foldStyle: 'markbegin',
            displayIndentGuides: true,
            enableAutoIndent: true,
            fixedWidthGutter: true,
            showLineNumbers: true,
            wrap: props.wrap === true,
            useWorker: false,
            readOnly: true,
        })
        updateEditorMode(viewer.current, props.mode)
        viewer.current.session.setValue(props.text)
    }, [text])

    return <Box id='viewer' sx={props.sx} />
}
