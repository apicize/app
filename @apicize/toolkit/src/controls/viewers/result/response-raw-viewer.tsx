import { Box, IconButton, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InputIcon from '@mui/icons-material/Input';
import OutputIcon from '@mui/icons-material/Output';
import { RichViewer } from "../rich-viewer";
import { EditorMode } from "../../../models/editor-mode";
import { ResultEditSessionType } from "../../editors/editor-types";
import { ResponseOrRequest, useWorkspace } from "../../../contexts/workspace.context";
import { editor } from 'monaco-editor'
import { ApicizeBody, ExecutionResultDetail } from "@apicize/lib-typescript";
import { useFeedback } from "../../../contexts/feedback.context";
import { observer } from "mobx-react-lite";

export const ResultRawPreview = observer(({ detail }: { detail: ExecutionResultDetail | null }) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()

    if (detail?.entityType !== 'request') {
        return
    }

    const b1 = detail.testContext.response?.body
    const b2 = detail.testContext.request?.body
    const hasResponse = !!b1
    const hasRequest = !!b2

    let responseOrRequest = workspace.responseOrRequest
    if (responseOrRequest === ResponseOrRequest.response) {
        if (!hasResponse && hasRequest) {
            responseOrRequest = ResponseOrRequest.request
        }
    } else {
        if (!hasRequest && hasResponse) {
            responseOrRequest = ResponseOrRequest.response
        }
    }

    let h: { [header: string]: string } | undefined
    let b: ApicizeBody | undefined

    if (responseOrRequest === ResponseOrRequest.response) {
        h = detail.testContext.response?.headers
        b = b1
    } else {
        h = detail.testContext.request?.headers
        b = b2
    }

    const body = b ?? { type: 'Text', text: '' }
    const contentType = h
        ? Object.entries(h).find(([k]) => k.toLowerCase() === 'content-type')?.[1]?.toLowerCase() ?? ''
        : ''

    let isBinary: boolean
    let text: string
    let model: editor.ITextModel
    let mode: EditorMode

    switch (body?.type) {
        case 'Binary':
            isBinary = true
            text = body.data ?? ''
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
            <Box display='flex' flexDirection='row' alignContent='top' sx={{ marginTop: 0, marginBottom: '2em', flexGrow: 0, height: '3rem' }}>
                <Typography variant='h2' sx={{ marginTop: 0, marginBottom: 0, flexGrow: 0, height: '3rem', display: 'flex', alignItems: 'center' }} component='div'>
                    {responseOrRequest === ResponseOrRequest.response ? 'Response' : 'Request'} Body (Raw)
                    {body.type
                        ? (<IconButton
                            aria-label="copy data to clipboard"
                            title="Copy Data to Clipboard"
                            color='primary'
                            sx={{ marginLeft: '16px' }}
                            onClick={_ => {
                                workspace.copyToClipboard({
                                    payloadType: 'ResponseBodyRaw',
                                    execCtr: detail.execCtr,
                                }, 'Data')
                                    .catch(err => feedback.toastError(err))
                            }}
                        >
                            <ContentCopyIcon />
                        </IconButton>)
                        : (<></>)
                    }
                </Typography>
                <Box display='flex' flexDirection='row' flexGrow={1} justifyContent='end'>
                    <ToggleButtonGroup aria-label='response or request' size='small' value={responseOrRequest} exclusive onChange={(_, v) => workspace.changeResponseOrRequest(v as ResponseOrRequest)}>
                        <ToggleButton title='Review Request Body' color='primary' aria-label='request' value={ResponseOrRequest.request} disabled={!hasRequest} sx={{ '&:not(.Mui-selected):not(.Mui-disabled)': { color: 'primary.main' } }}><InputIcon /></ToggleButton>
                        <ToggleButton title='Review Response Body' color='primary' aria-label='response' value={ResponseOrRequest.response} disabled={!hasResponse} sx={{ '&:not(.Mui-selected):not(.Mui-disabled)': { color: 'primary.main' } }}><OutputIcon /></ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </Box>
            {
                isBinary
                    ? (
                        <>
                            <Typography aria-label="base64 response data" variant='h3' sx={{ marginTop: '2em' }} component='div'>Base 64</Typography>
                            <RichViewer text={text} model={model} wrap={true} mode={mode} />
                        </>
                    )
                    : (
                        <RichViewer text={text} model={model} wrap={true} mode={mode} />
                    )
            }
        </Stack>
    )
})
