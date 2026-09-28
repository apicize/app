import { ImageViewer, KNOWN_IMAGE_EXTENSIONS } from "../image-viewer";
import { Box, IconButton, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import InputIcon from '@mui/icons-material/Input';
import OutputIcon from '@mui/icons-material/Output';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import beautify from "js-beautify";
import { EditorMode } from "../../../models/editor-mode";
import { formatViewerText, RichViewer } from "../rich-viewer";
import { useApicizeSettings } from "../../../contexts/apicize-settings.context";
import { ResultEditSessionType } from "../../editors/editor-types";
import { ResponseOrRequest, useWorkspace } from "../../../contexts/workspace.context";
import { ApicizeBody, ExecutionResultDetail } from "@apicize/lib-typescript";
import { useFeedback } from "../../../contexts/feedback.context";
import { observer } from "mobx-react-lite";
import { editor } from "monaco-editor";

export const ResultResponsePreview = observer(({ detail }: { detail: ExecutionResultDetail | null }) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const settings = useApicizeSettings()

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
    const headers = h ?? {}

    let extension = ''
    for (const [name, value] of Object.entries(headers)) {
        if (name.toLowerCase() === 'content-type') {
            const i = value.indexOf('/')
            if (i !== -1) {
                const j = value.indexOf(';')
                if (value.indexOf('json') !== -1) {
                    extension = 'json'
                } else if (value.indexOf('xml') !== -1) {
                    extension = 'xml'
                } else {
                    extension = value.substring(i + 1, j == -1 ? undefined : j)
                }
            }
        }
    }

    const isImage = body.type === 'Binary'
        && KNOWN_IMAGE_EXTENSIONS.indexOf(extension) !== -1 && body.data.length > 0

    // Only generated when the view model is (re)built, since beautifying large bodies is expensive
    const getText = (): string => {
        switch (body.type) {
            case 'Binary':
                return ''
            case 'JSON':
                return beautify.js_beautify(JSON.stringify(body.data), {})
            default:
                switch (extension) {
                    case 'html':
                    case 'xml':
                        return beautify.html_beautify(body.text, {})
                    case 'css':
                        return beautify.css_beautify(body.text, {})
                    case 'js':
                    case 'json':
                        return beautify.js_beautify(body.text, {})
                    default:
                        return body.text
                }
        }
    }

    const hasText = body.type === 'JSON' || (body.type !== 'Binary' && body.text.length > 0)

    let textModel: editor.ITextModel | undefined

    if (hasText) {
        let textMode: EditorMode
        switch (extension) {
            case 'json':
                textMode = EditorMode.json
                break
            case 'xml':
                textMode = EditorMode.xml
                break
            case 'html':
            case 'htm':
                textMode = EditorMode.html
                break
            case 'css':
                textMode = EditorMode.css
                break
            case 'txt':
            case 'text':
            default:
                textMode = EditorMode.txt
        }

        const mode = textMode
        const indentSize = settings.editorIndentSize
        textModel = workspace.getResultEditModel(
            detail,
            responseOrRequest === ResponseOrRequest.response
                ? ResultEditSessionType.Preview
                : ResultEditSessionType.PreviewRequest,
            mode,
            () => formatViewerText(getText(), mode, indentSize),
            `${indentSize}`)
    }

    return (
        <Stack sx={{ bottom: 0, overflow: 'hidden', position: 'relative', height: '100%', width: '100%', display: 'flex' }}>
            <Box display='flex' flexDirection='row' alignContent='top' sx={{ marginTop: 0, marginBottom: '2em', flexGrow: 0, height: '3rem' }}>
                <Typography variant='h2' sx={{ marginTop: 0, marginBottom: 0, flexGrow: 0, height: '3rem', display: 'flex', alignItems: 'center' }} component='div'>
                    {responseOrRequest === ResponseOrRequest.response ? 'Response' : 'Request'} Body (Preview)
                    <IconButton
                        aria-label="copy to clipboard"
                        title="Copy to Clipboard"
                        color='primary'
                        sx={{ marginLeft: '16px' }}
                        onClick={_ => {
                            workspace.copyToClipboard({
                                payloadType: responseOrRequest === ResponseOrRequest.response
                                    ? 'ResponseBodyPreview'
                                    : 'ResultRequestBodyPreview',
                                execCtr: detail.execCtr
                            }, isImage ? 'Image' : 'Data')
                                .catch(err => feedback.toastError(err))
                        }}
                    >
                        <ContentCopyIcon />
                    </IconButton>
                </Typography>
                <Box display='flex' flexDirection='row' flexGrow={1} justifyContent='end'>
                    <ToggleButtonGroup aria-label='response or request' size='small' value={responseOrRequest} exclusive onChange={(_, v) => workspace.changeResponseOrRequest(v as ResponseOrRequest)}>
                        <ToggleButton title='Review Request Body' color='primary' aria-label='request' value={ResponseOrRequest.request} disabled={!hasRequest} sx={{ '&:not(.Mui-selected):not(.Mui-disabled)': { color: 'primary.main' } }}><InputIcon /></ToggleButton>
                        <ToggleButton title='Review Response Body' color='primary' aria-label='response' value={ResponseOrRequest.response} disabled={!hasResponse} sx={{ '&:not(.Mui-selected):not(.Mui-disabled)': { color: 'primary.main' } }}><OutputIcon /></ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </Box>
            {
                (isImage && body?.type === 'Binary' && body.data.length > 0 && extension)
                    ? <ImageViewer base64Data={body.data} extensionToRender={extension} />
                    : textModel
                        ? <RichViewer model={textModel} wrap={true} />
                        : null
            }
        </Stack>
    )
})
