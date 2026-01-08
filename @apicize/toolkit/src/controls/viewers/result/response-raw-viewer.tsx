import { IconButton, Stack, Typography } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { RichViewer } from "../rich-viewer";
import { EditorMode } from "../../../models/editor-mode";
import { ResultEditSessionType } from "../../editors/editor-types";
import { useWorkspace } from "../../../contexts/workspace.context";
import { editor } from 'monaco-editor'
import { ExecutionResultDetailWithBase64 } from "../../../models/workspace/execution";

export function ResultRawPreview({ detail }: { detail: ExecutionResultDetailWithBase64 | null }) {

    const workspace = useWorkspace()

    if (detail?.entityType !== 'request') {
        return
    }

    const body = detail.testContext.response?.body ?? { type: 'Text', text: '' }


    const contentType = detail.testContext.response?.headers
        ? Object.entries(detail.testContext.response.headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1]?.toLowerCase() ?? ''
        : ''


    let isBinary: boolean
    let text: string
    let model: editor.ITextModel
    let mode: EditorMode

    switch (body?.type) {
        case 'Binary':
            isBinary = true
            text = detail.resultBodyBase64 ?? ''
            mode = EditorMode.txt
            model = workspace.getResultEditModel(detail, ResultEditSessionType.Base64, mode)
            break
        default:
            isBinary = false
            text = body.text
            if (contentType.includes('json')) {
                mode = EditorMode.json
            } else if (contentType.includes('xml')) {
                mode = EditorMode.xml
            } else if (contentType.includes('javascript')) {
                mode = EditorMode.js
            } else if (contentType.includes('html')) {
                mode = EditorMode.html
            } else if (contentType.includes('css')) {
                mode = EditorMode.css
            } else {
                mode = EditorMode.txt
            }
            model = workspace.getResultEditModel(detail, ResultEditSessionType.Raw, mode)
            break
    }

    return (
        <Stack sx={{ bottom: 0, overflow: 'hidden', position: 'relative', height: '100%', display: 'flex' }}>
            <Typography variant='h2' sx={{ marginTop: 0, flexGrow: 0 }} component='div'>Response Body (Raw)
                {body.type
                    ? (<IconButton
                        aria-label="copy data to clipboard"
                        title="Copy Data to Clipboard"
                        color='primary'
                        sx={{ marginLeft: '16px' }}
                        onClick={_ => workspace.copyToClipboard({
                            payloadType: 'ResponseBodyRaw',
                            execCtr: detail.execCtr,
                        }, 'Data')}
                    >
                        <ContentCopyIcon />
                    </IconButton>)
                    : (<></>)
                }
            </Typography>
            {
                isBinary
                    ? (
                        <>
                            <Typography aria-label="base64 response data" variant='h3' sx={{ marginTop: 0 }} component='div'>Base 64</Typography>
                            <RichViewer text={text} model={model} wrap={true} mode={mode} />
                        </>
                    )
                    : (
                        <RichViewer text={text} model={model} wrap={true} mode={mode} />
                    )
            }
        </Stack>
    )
}
