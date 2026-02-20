import { EditableRequest } from "../../../models/workspace/editable-request";
import { observer } from "mobx-react-lite";
import { createRef, useEffect, useRef, useState } from "react";
import { useWorkspace } from "../../../contexts/workspace.context";
import { Box, Button, IconButton, Stack } from "@mui/material";
import { DroppedFile, useFileDragDrop } from "../../../contexts/file-dragdrop.context";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useFeedback } from "../../../contexts/feedback.context";
import MonacoEditor, { monaco } from 'react-monaco-editor';

import EDITOR_DEFS_RAW from '../../../typings/test-editor.d.ts?raw'
import CHAI_RAW from '../../../typings/chai.d.ts?raw'
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

export const RequestTestEditor = observer(({ request }: { request: EditableRequest }) => {
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

    workspace.nextHelpTopic = 'requests/test'

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
                                request.setTest(file.data.toString())
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

    // Make sure we have the editor test model
    if (!model || model.requestId !== request.id || model.type !== RequestEditSessionType.Test) {
        workspace.getRequestEditModel(request, RequestEditSessionType.Test, EditorMode.js)
            .then(setModel)
            .catch(e => feedback.toastError(e))
        return null
    }

    return <Box id='request-test-container' position='relative' width='100%' height='100%'>
        <Stack direction='column' spacing={3} position='relative' width='100%' height='100%'>
            <Stack direction='row' justifyContent='center' display='flex'>
                <IconButton
                    aria-label="copy tests to clipboard"
                    title="Copy Tests to Clipboard"
                    color='primary'
                    sx={{ marginLeft: '16px' }}
                    onClick={_ => workspace.copyToClipboard({
                        payloadType: 'RequestTest',
                        requestId: request.id,
                    }, 'Body')}>
                    <ContentCopyIcon />
                </IconButton>
                <Box flexGrow={1} minWidth={0} />
                <Button variant='outlined' size='small' onClick={performBeautify}>Beautify Test Code</Button>
            </Stack>

            <Box top={0}
                left={0}
                width='100%'
                height='100%'
                position='absolute'
                display={isDragging ? 'block' : 'none'}
                className="MuiBackdrop-root MuiModal-backdrop"
                sx={{ zIndex: 99999, opacity: 0.5, transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms", backgroundColor: isDragingValid ? "#008000" : "#800000" }} />

            <Box id='req-test-editor' ref={refContainer} position='relative' width='100%' height='100%'>
                <MonacoEditor
                    language='javascript'
                    theme={settings.colorScheme === "dark" ? 'vs-dark' : 'vs-light'}
                    value={request.test}
                    onChange={(value) => request.setTest(value)}
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

                            // Dispose stale setup type-definition models
                            monaco.editor.getModel(monaco.Uri.parse('ts:filename/setup-defs.d.ts'))?.dispose()

                            monaco.languages.typescript.javascriptDefaults.setExtraLibs([
                                { content: EDITOR_DEFS_RAW, filePath: 'ts:filename/editor-defs.d.ts' },
                                { content: CHAI_RAW, filePath: 'ts:filename/chai.d.ts' },
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
