import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../../../contexts/workspace.context";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { DroppedFile, useFileDragDrop } from "../../../contexts/file-dragdrop.context";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useFeedback } from "../../../contexts/feedback.context";
import { monaco } from 'react-monaco-editor';
import { ApicizeMonacoEditor } from '../apicize-monaco-editor';
import { FileDropOverlay } from '../file-drop-overlay';

import COMMON_DEFS_RAW from '../../../typings/script-common.d.ts?raw'
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
import { EditableRequest } from "../../../models/workspace/editable-request";
import { EntityType } from "../../../models/workspace/entity-type";
import { useMonacoClipboard } from "../../../hooks/use-monaco-clipboard";
import { RequestScriptModeToggle } from "./request-script-mode-toggle";

const DISALLOWED_NAMES = [
    { pattern: /\bdescribe\b/g, message: 'describe() is not available in Setup scripts' },
    { pattern: /\bit\b/g, message: 'it() is not available in Setup scripts' },
    { pattern: /\btag\b/g, message: 'tag() is not available in Setup scripts' },
    { pattern: /\bresponse\b/g, message: 'response is not available in Setup scripts' },
]

const GROUP_DISALLOWED_NAMES = [
    ...DISALLOWED_NAMES,
    { pattern: /\brequest\b/g, message: 'request is not available in Group Setup scripts' },
]

export const RequestSetupEditor = observer(({ entry }: { entry: EditableRequest | EditableRequestGroup }) => {
    const isGroup = entry.entityType === EntityType.Group
    const workspace = useWorkspace()
    const settings = useApicizeSettings()
    const feedback = useFeedback()
    const fileDragDrop = useFileDragDrop()

    const refContainer = useRef<HTMLElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isDragingValid, setIsDraggingValid] = useState(false)

    const initialized = useRef(false)
    const [model, setModel] = useState<IRequestEditorTextModel | null>(null)
    const refEditor = useRef<editor.IStandaloneCodeEditor | null>(null)

    // Hook Monaco clipboard to Tauri clipboard
    useMonacoClipboard(refEditor, false)

    useEffect(() => { workspace.nextHelpTopic = isGroup ? 'groups/setup' : 'requests/test' }, [workspace, isGroup])

    useEffect(() => {
        if (refContainer.current) {
            const unregisterDragDrop = fileDragDrop.register(refContainer, {
                onEnter: (_x, _y, extensions) => {
                    setIsDragging(true)
                    setIsDraggingValid(extensions.includes('js'))
                },
                onOver: (_x, _y, extensions) => {
                    setIsDragging(true)
                    const isJs = extensions.includes('js')
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
                                entry.setSetup(file.data).catch(err => feedback.toastError(err))
                            })
                            break
                    }
                }
            })
            return (() => {
                unregisterDragDrop()
            })
        }
    }, [feedback, fileDragDrop, entry, isDragingValid, refContainer])

    function performBeautify() {
        if (refEditor.current) {
            try {
                const action = refEditor.current.getAction('editor.action.formatDocument')
                if (!action) throw new Error('Format action not found')
                action.run().catch(err => feedback.toastError(err))
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
            for (const { pattern, message } of (isGroup ? GROUP_DISALLOWED_NAMES : DISALLOWED_NAMES)) {
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
    if (!model || model.requestId !== entry.id || model.type !== RequestEditSessionType.Setup) {
        const model = workspace.getRequestEditModel(entry, RequestEditSessionType.Setup, EditorMode.js)
        setModel(model)
        return null
    }

    return <Box id='request-setup-container' position='relative' width='100%' height='100%'>
        <Stack direction='column' spacing={3} position='relative' width='100%' height='100%'>
            <Stack direction='row' justifyContent='center' display='flex'>
                <Typography variant='h2' sx={{ marginTop: 0, marginBottom: 0, flexGrow: 0, display: 'flex', alignItems: 'center' }} component='div'>
                    {isGroup ? 'Setup Script (Before Requests)' : 'Setup Script (Before Execution)'}
                </Typography>
                <IconButton
                    aria-label="copy setup to clipboard"
                    title="Copy Setup to Clipboard"
                    color='primary'
                    sx={{ marginLeft: '16px' }}
                    onClick={_ => {
                        workspace.copyToClipboard(isGroup
                            ? { payloadType: 'GroupSetup', groupId: entry.id }
                            : { payloadType: 'RequestSetup', requestId: entry.id },
                            'Setup')
                            .catch(err => feedback.toastError(err))
                    }}>
                    <ContentCopyIcon />
                </IconButton>
                <Box flexGrow={1} minWidth={0} />
                <IconButton
                    aria-label='beautify setup code'
                    color='primary'
                    id='beautify-setup-btn'
                    title='"Beautify" Setup Code'
                    onClick={performBeautify}>
                    <AutoAwesomeIcon />
                </IconButton>
                {isGroup ? null : <Box marginLeft='1em'>
                    <RequestScriptModeToggle />
                </Box>}
            </Stack>

            <FileDropOverlay
                visible={isDragging}
                valid={isDragingValid}
                title={isDragingValid ? 'Drop file to replace setup script' : 'Only JavaScript files can be dropped here'}
                subtitle='JavaScript (.js)' />

            <Box id='req-setup-editor' ref={refContainer} position='relative' width='100%' height='100%'>
                <ApicizeMonacoEditor
                    key={entry.id}
                    language='javascript'
                    theme={settings.colorScheme === "dark" ? 'vs-dark' : 'vs-light'}
                    value={entry.setup}
                    onChange={(value) => {
                        entry.setSetup(value).catch(err => feedback.toastError(err))
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
                        refEditor.current = me

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

                            // Dispose stale test type-definition models
                            for (const uri of ['ts:filename/editor-defs.d.ts', 'ts:filename/chai.d.ts']) {
                                monaco.editor.getModel(monaco.Uri.parse(uri))?.dispose()
                            }

                            monaco.languages.typescript.javascriptDefaults.setExtraLibs([
                                { content: COMMON_DEFS_RAW, filePath: 'ts:filename/script-common-defs.d.ts' },
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
