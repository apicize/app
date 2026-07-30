import { Box, Checkbox, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material"
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { observer } from "mobx-react-lite"
import { useEffect } from "react"
import { ExecutionResultDetail } from "@apicize/lib-typescript"
import { RichViewer } from "../rich-viewer"
import { EditorMode } from "../../../models/editor-mode"
import { CodeGenLanguage } from "../../../models/code-generation"
import { EditableRequestEntry } from "../../../models/workspace/editable-request-entry"
import { useWorkspace } from "../../../contexts/workspace.context"
import { useFeedback } from "../../../contexts/feedback.context"

interface CodeGenOption {
    value: CodeGenLanguage
    label: string
    mode: EditorMode
}

/**
 * Available code-generation languages/runtimes. None is the default and
 * generates no code. Order controls the dropdown presentation.
 */
const CODE_GEN_OPTIONS: CodeGenOption[] = [
    { value: CodeGenLanguage.None, label: 'None', mode: EditorMode.txt },
    { value: CodeGenLanguage.NodeJs, label: 'NodeJS', mode: EditorMode.js },
    { value: CodeGenLanguage.Python, label: 'Python', mode: EditorMode.python },
    { value: CodeGenLanguage.Go, label: 'Go', mode: EditorMode.go },
    { value: CodeGenLanguage.CSharp, label: 'C#', mode: EditorMode.csharp },
    { value: CodeGenLanguage.Java, label: 'Java', mode: EditorMode.java },
]

/**
 * Displays generated code that reproduces the dispatched request for the
 * selected language/runtime. Generation is delegated to the Tauri backend via
 * the WorkspaceStore callbacks; results are cached on the request entry.
 */
export const ResponseCodeViewer = observer((
    { request, detail }: { request: EditableRequestEntry, detail: ExecutionResultDetail | null }
) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()

    const language = workspace.codeGenLanguage
    const includeSecrets = workspace.codeGenIncludeSecrets
    const execCtr = detail?.entityType === 'request' ? detail.execCtr : undefined

    useEffect(() => {
        if (execCtr !== undefined && language !== CodeGenLanguage.None) {
            request.loadGeneratedCode(execCtr, language, includeSecrets)
        }
    }, [request, execCtr, language, includeSecrets])

    const option = CODE_GEN_OPTIONS.find(o => o.value === language) ?? CODE_GEN_OPTIONS[0]
    const code = (execCtr !== undefined && language !== CodeGenLanguage.None)
        ? request.getGeneratedCode(execCtr, language, includeSecrets)
        : undefined

    let content: React.ReactNode
    if (detail && language !== CodeGenLanguage.None) {
        if (request.codeGenError) {
            content = <Typography color='error' sx={{ marginTop: '1em' }}>{request.codeGenError}</Typography>
        } else if (code === undefined) {
            content = <Typography sx={{ marginTop: '1em' }}>Generating code...</Typography>
        } else if (detail) {
            const model = workspace.getGeneratedCodeModel(detail, option.mode, code)
            content = <RichViewer text={code} model={model} wrap={false} mode={option.mode} />
        } else {
            content = ''
        }
    } else {
        content = ''
    }

    return (
        <Stack sx={{ bottom: 0, overflow: 'hidden', position: 'relative', height: '100%', display: 'flex' }}>
            <Typography variant='h2' sx={{ marginTop: 0, marginBottom: '0.5em', flexGrow: 0, display: 'flex', alignItems: 'center' }} component='div'>
                Generate Code
                <IconButton
                    aria-label="copy generated code to clipboard"
                    title="Copy Generated Code to Clipboard"
                    color='primary'
                    disabled={code === undefined}
                    sx={{ marginLeft: '16px' }}
                    onClick={_ => {
                        if (code !== undefined) {
                            workspace.copyTextToClipboard(code, 'Generated code')
                                .catch(err => feedback.toastError(err))
                        }
                    }}
                >
                    <ContentCopyIcon />
                </IconButton>
            </Typography>
            <Box display='flex' flexDirection='row' alignItems='center' gap='1em' sx={{ flexGrow: 0, paddingTop: '6px', paddingBottom: '6px', marginBottom: '1.5em' }}>
                <FormControl size='small'>
                    <InputLabel id='code-gen-language-label-id'>Language / Runtime</InputLabel>
                    <Select
                        labelId='code-gen-language-label-id'
                        aria-labelledby='code-gen-language-label-id'
                        id='code-gen-language'
                        value={language}
                        title='Code generation language / runtime'
                        size='small'
                        sx={{ minWidth: '14em' }}
                        label='Language / Runtime'
                        onChange={e => workspace.setCodeGenLanguage(e.target.value as CodeGenLanguage)}
                    >
                        {CODE_GEN_OPTIONS.map(o => (
                            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={includeSecrets}
                            disabled={language === CodeGenLanguage.None}
                            onChange={e => workspace.setCodeGenIncludeSecrets(e.target.checked)}
                        />
                    }
                    label='Include Secrets'
                    title='Include resolved authorization values (tokens, credentials) in the generated code'
                />
            </Box>
            <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
                {content}
            </Box>
        </Stack>
    )
})
