import { EditableRequest } from "../../../models/workspace/editable-request";
import { observer } from "mobx-react-lite";
import { createRef, useEffect, useRef, useState } from "react";
import { useWorkspace } from "../../../contexts/workspace.context";
import { Box, Button, IconButton, Stack } from "@mui/material";
import { DroppedFile, useFileDragDrop } from "../../../contexts/file-dragdrop.context";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useFeedback } from "../../../contexts/feedback.context";
import MonacoEditor, { monaco } from 'react-monaco-editor';

import DEFS_RAW from '../../../test-editor.d.ts?raw'
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

    const initalialized = useRef(false)
    const [model, setModel] = useState<IRequestEditorTextModel | null>(null)
    const editor = useRef<editor.IStandaloneCodeEditor | null>(null)

    workspace.nextHelpTopic = 'requests/test'

    useEffect(() => {
        if (refContainer.current) {
            const id = refContainer.current.id
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
        if (editor.current) {
            try {
                const action = editor.current.getAction('editor.action.formatDocument')
                if (!action) throw new Error('Format action not found')
                action.run()
            } catch (e) {
                feedback.toastError(e)
            }
        }
    }

    if (!request.isBodyInitialized) {
        return null
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
                    onChange={(text: string) => {
                        request.setTest(text)
                    }}
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
                        editor.current = me

                        if (!initalialized.current) {
                            monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                                noLib: true,
                                target: monaco.languages.typescript.ScriptTarget.ESNext,
                                allowNonTsExtensions: true,
                                moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                                module: monaco.languages.typescript.ModuleKind.CommonJS,
                                typeRoots: ['node_modules/@types'],
                                noEmit: true,
                            });

                            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                                noSemanticValidation: !settings.editorCheckJsSyntax,
                                noSuggestionDiagnostics: true,
                                noSyntaxValidation: !settings.editorCheckJsSyntax,
                            });

                            // const es5Uri = monaco.Uri.parse('file://node_modules/typescript/lib/lib.es5.d.ts')
                            // if (!monaco.editor.getModel(es5Uri)) {
                            //     monaco.languages.typescript.javascriptDefaults.addExtraLib(ES5_RAW)
                            //     monaco.editor.createModel(ES5_RAW, 'typescript', es5Uri)
                            // }

                            // const esNextUri = monaco.Uri.parse('file://node_modules/typescript/lib/lib.esnext.d.ts')
                            // if (!monaco.editor.getModel(esNextUri)) {
                            //     monaco.languages.typescript.javascriptDefaults.addExtraLib(ESNEXT_RAW)
                            //     monaco.editor.createModel(ESNEXT_RAW, 'typescript', esNextUri)
                            // }


                            for (const [location, raw] of [
                                ['ts:filename/editor-defs.d.ts', DEFS_RAW],
                                ['file://node_modules/typescript/lib/lib.es5.d.ts', ES5_RAW],
                                ['file://node_modules/typescript/lib/lib.es2015.collection.d.ts', ES2015_COLLECTION_RAW],
                                ['file://node_modules/typescript/lib/lib.es2015.core.d.ts', ES2015_CORE],
                                ['file://node_modules/typescript/lib/lib.es2015.iterable.d.ts', ES2015_ITERATE_RAW],
                                ['file://node_modules/typescript/lib/lib.es2015.symbol.d.ts?raw', ES2015_SYMBOL_RAW],
                                ['file://node_modules/typescript/lib/lib.es2016.array.include.d.ts', ES2016_ARRAY_INCLUDE_RAW],
                                ['file://node_modules/typescript/lib/lib.es2017.arraybuffer.d.ts?raw', ES2017_ARRAYBUFFER_RAW],
                                ['file://node_modules/typescript/lib/lib.es2017.date.d.ts', ES2017_DATE_RAW],
                            ]) {
                                const uri = monaco.Uri.parse(location)
                                if (!monaco.editor.getModel(uri)) {
                                    monaco.languages.typescript.javascriptDefaults.addExtraLib(raw)
                                    monaco.editor.createModel(raw, 'typescript', uri)
                                }
                            }

                            initalialized.current = true
                        }
                    }
                    }
                />
            </Box>
        </Stack>
    </Box >
})