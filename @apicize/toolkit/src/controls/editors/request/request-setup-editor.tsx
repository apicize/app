import { observer } from "mobx-react-lite";
import { createRef, useEffect, useRef, useState } from "react";
import { useWorkspace } from "../../../contexts/workspace.context";
import { Box, Button, IconButton, Stack } from "@mui/material";
import { DroppedFile, useFileDragDrop } from "../../../contexts/file-dragdrop.context";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useFeedback } from "../../../contexts/feedback.context";
import MonacoEditor, { monaco } from 'react-monaco-editor';

import SETUP_DEFS_RAW from '../../../typings/setup-editor.d.ts?raw'
import ES5_RAW from '../../../../../../node_modules/typescript/lib/lib.es5.d.ts?raw'
import ES2015_CORE from '../../../../../../node_modules/typescript/lib/lib.es2015.core.d.ts?raw'
import ES2015_COLLECTION_RAW from '../../../../../../node_modules/typescript/lib/lib.es2015.collection.d.ts?raw'
import ES2015_ITERATE_RAW from '../../../../../../node_modules/typescript/lib/lib.es2015.iterable.d.ts?raw'
import ES2015_SYMBOL_RAW from '../../../../../../node_modules/typescript/lib/lib.es2015.symbol.d.ts?raw'
import ES2016_ARRAY_INCLUDE_RAW from '../../../../../../node_modules/typescript/lib/lib.es2016.array.include.d.ts?raw'
import ES2017_ARRAYBUFFER_RAW from '../../../../../../node_modules/typescript/lib/lib.es2017.arraybuffer.d.ts?raw'
import ES2017_DATE_RAW from '../../../../../../node_modules/typescript/lib/lib.es2017.date.d.ts?raw'

import { editor } from "monaco-editor";
import { useApicizeSettings } from "../../../contexts/apicize-settings.context";
import { runInAction } from "mobx";
import { RequestEditSessionType } from "../editor-types";
import { EditorMode } from "../../../models/editor-mode";
import { IRequestEditorTextModel } from "../../../models/editor-text-model";
import { EditableRequestGroup } from "../../../models/workspace/editable-request-group";

const DISALLOWED_NAMES = [
    { pattern: /\bdescribe\b/g, message: 'describe() is not available in Group Setup scripts' },
    { pattern: /\bit\b/g, message: 'it() is not available in Group Setup scripts' },
    { pattern: /\btag\b/g, message: 'tag() is not available in Group Setup scripts' },
    { pattern: /\brequest\b/g, message: 'request is not available in Group Setup scripts' },
    { pattern: /\bresponse\b/g, message: 'response is not available in Group Setup scripts' },
]

export const RequestSetupEditor = observer(({ group }: { group: EditableRequestGroup }) => {
    const workspace = useWorkspace()
    const settings = useApicizeSettings()
    const feedback = useFeedback()
    const fileDragDrop = useFileDragDrop()

    const refContainer = createRef<HTMLElement>()
    const [isDragging, setIsDragging] = useState(false)
    const [isDragingValid, setIsDraggingValid] = useState(false)

    const initialized = useRef(false)
    const [model, setModel] = useState<IRequestEditorTextModel | null>(null)
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

    workspace.nextHelpTopic = 'requests/setup'

    useEffect(() => {
        if (refContainer.current) {
            const unregisterDragDrop = fileDragDrop.register(refContainer, {
                onEnter: (_x, _y, extensions) => {
                    setIsDraggingValid(extensions.includes('js'))
                },
                onOver: (_x, _y, extensions) => {
                    setIsDragging(true)
                    let isJs = extensions.includes('js')
                    setIsDraggingValid(isJs)
                },
                onLeave: () => {
                    setIsDragging(false)
                },
                onDrop: (file: DroppedFile) => {
                    setIsDragging(false)
                    if (!isDragingValid) return
                    switch (file.type) {
                        case 'text':
                            runInAction(() => {
                                group.setSetup(file.data.toString())
                            })
                            break
                    }
                }
            })
            return (() => {
                unregisterDragDrop()
            })
        }
    }, [refContainer])

    function performBeautify() {
        if (editorRef.current) {
            try {
                const action = editorRef.current.getAction('editor.action.formatDocument')
                if (!action) throw new Error('Format action not found')
                action.run()
            } catch (e) {
                feedback.toastError(e)
            }
        }
    }

    function updateDisallowedMarkers(me: editor.IStandaloneCodeEditor) {
        const editorModel = me.getModel()
        if (!editorModel) return
        const markers: editor.IMarkerData[] = []
        for (let lineNumber = 1; lineNumber <= editorModel.getLineCount(); lineNumber++) {
            const lineContent = editorModel.getLineContent(lineNumber)
            for (const { pattern, message } of DISALLOWED_NAMES) {
                const regex = new RegExp(pattern.source, 'g')
                let match: RegExpExecArray | null
                while ((match = regex.exec(lineContent)) !== null) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message,
                        startLineNumber: lineNumber,
                        startColumn: match.index + 1,
                        endLineNumber: lineNumber,
                        endColumn: match.index + match[0].length + 1,
                    })
                }
            }
        }
        monaco.editor.setModelMarkers(editorModel, 'apicize-disallowed', markers)
    }

    // Make sure we have the editor setup model
    if (!model || model.requestId !== group.id || model.type !== RequestEditSessionType.Setup) {
        workspace.getRequestEditModel(group, RequestEditSessionType.Setup, EditorMode.js)
            .then(setModel)
            .catch(e => feedback.toastError(e))
        return null
    }

    return <Box id='request-setup-container' position='relative' width='100%' height='100%'>
        <Stack direction='column' spacing={3} position='relative' width='100%' height='100%'>
            <Stack direction='row' justifyContent='center' display='flex'>
                <IconButton
                    aria-label="copy setup to clipboard"
                    title="Copy Setup to Clipboard"
                    color='primary'
                    sx={{ marginLeft: '16px' }}
                    onClick={_ => workspace.copyToClipboard({
                        payloadType: 'RequestTest',
                        requestId: group.id,
                    }, 'Body')}>
                    <ContentCopyIcon />
                </IconButton>
                <Box flexGrow={1} minWidth={0} />
                <Button variant='outlined' size='small' onClick={performBeautify}>Beautify Setup Code</Button>
            </Stack>

            <Box top={0}
                left={0}
                width='100%'
                height='100%'
                position='absolute'
                display={isDragging ? 'block' : 'none'}
                className="MuiBackdrop-root MuiModal-backdrop"
                sx={{ zIndex: 99999, opacity: 0.5, transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms", backgroundColor: isDragingValid ? "#008000" : "#800000" }} />

            <Box id='req-setup-editor' ref={refContainer} position='relative' width='100%' height='100%'>
                <MonacoEditor
                    language='javascript'
                    theme={settings.colorScheme === "dark" ? 'vs-dark' : 'vs-light'}
                    value={group.setup}
                    onChange={(value) => group.setSetup(value)}
                    options={{
                        automaticLayout: true,
                        minimap: { enabled: false },
                        model,
                        detectIndentation: settings.editorDetectExistingIndent,
                        tabSize: settings.editorIndentSize,
                        folding: true,
                        formatOnType: true,
                        formatOnPaste: true,
                        fontSize: settings.fontSize
                    }}
                    editorDidMount={(me) => {
                        editorRef.current = me

                        updateDisallowedMarkers(me)
                        me.onDidChangeModelContent(() => updateDisallowedMarkers(me))

                        if (!initialized.current) {
                            monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                                noLib: true,
                                target: monaco.languages.typescript.ScriptTarget.ESNext,
                                allowNonTsExtensions: true,
                                moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                                module: monaco.languages.typescript.ModuleKind.CommonJS,
                                moduleDetection: 3, // Force - treat all files as modules to isolate scopes
                                typeRoots: ['node_modules/@types'],
                                noEmit: true,
                            });

                            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                                noSemanticValidation: !settings.editorCheckJsSyntax,
                                noSuggestionDiagnostics: true,
                                noSyntaxValidation: !settings.editorCheckJsSyntax,
                            });

                            // Dispose stale request type-definition models
                            for (const uri of ['ts:filename/editor-defs.d.ts', 'ts:filename/chai.d.ts']) {
                                monaco.editor.getModel(monaco.Uri.parse(uri))?.dispose()
                            }

                            monaco.languages.typescript.javascriptDefaults.setExtraLibs([
                                { content: SETUP_DEFS_RAW, filePath: 'ts:filename/setup-defs.d.ts' },
                                { content: ES5_RAW, filePath: 'file://node_modules/typescript/lib/lib.es5.d.ts' },
                                { content: ES2015_COLLECTION_RAW, filePath: 'file://node_modules/typescript/lib/lib.es2015.collection.d.ts' },
                                { content: ES2015_CORE, filePath: 'file://node_modules/typescript/lib/lib.es2015.core.d.ts' },
                                { content: ES2015_ITERATE_RAW, filePath: 'file://node_modules/typescript/lib/lib.es2015.iterable.d.ts' },
                                { content: ES2015_SYMBOL_RAW, filePath: 'file://node_modules/typescript/lib/lib.es2015.symbol.d.ts' },
                                { content: ES2016_ARRAY_INCLUDE_RAW, filePath: 'file://node_modules/typescript/lib/lib.es2016.array.include.d.ts' },
                                { content: ES2017_ARRAYBUFFER_RAW, filePath: 'file://node_modules/typescript/lib/lib.es2017.arraybuffer.d.ts' },
                                { content: ES2017_DATE_RAW, filePath: 'file://node_modules/typescript/lib/lib.es2017.date.d.ts' },
                            ])

                            initialized.current = true
                        }
                    }
                    }
                />
            </Box>
        </Stack>
    </Box >
})
