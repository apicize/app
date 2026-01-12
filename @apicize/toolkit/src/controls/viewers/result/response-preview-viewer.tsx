import { ImageViewer, KNOWN_IMAGE_EXTENSIONS } from "../image-viewer";
import { IconButton, Stack, Typography } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import beautify from "js-beautify";
import { EditorMode } from "../../../models/editor-mode";
import { RichViewer } from "../rich-viewer";
import { ResultEditSessionType } from "../../editors/editor-types";
import { useWorkspace } from "../../../contexts/workspace.context";
import { ExecutionResultDetail } from "@apicize/lib-typescript";

export function ResultResponsePreview({ detail }: { detail: ExecutionResultDetail | null }) {

    const workspace = useWorkspace()

    if (detail?.entityType !== 'request') {
        return
    }

    const body = detail.testContext.response?.body ?? { type: 'Text', text: '' }
    const headers = detail.testContext.response?.headers
        ? new Map(Object.entries(detail.testContext.response.headers))
        : new Map()

    let extension = ''
    for (const [name, value] of headers.entries()) {
        if (name.toLowerCase() === 'content-type') {
            let i = value.indexOf('/')
            if (i !== -1) {
                let j = value.indexOf(';')
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

    let isImage = false
    let text: string = ''

    switch (body.type) {
        case 'Binary':
            isImage = KNOWN_IMAGE_EXTENSIONS.indexOf(extension) !== -1 && body.data.length > 0
            break
        case 'JSON':
            text = beautify.js_beautify(JSON.stringify(body.data), {})
            break
        default:
            switch (extension) {
                case 'html':
                case 'xml':
                    text = beautify.html_beautify(body.text, {})
                    break
                case 'css':
                    text = beautify.css_beautify(body.text, {})
                    break
                case 'js':
                    text = beautify.js_beautify(body.text, {})
                    break
                case 'json':
                    text = beautify.js_beautify(body.text, {})
                    break
                default:
                    text = body.text
            }
    }

    let hasText = text.length > 0

    let viewer
    if (isImage && detail.testContext?.response?.body?.type === 'Binary' && detail.testContext.response.body.data.length > 0 && extension) {
        viewer = (<ImageViewer base64Data={detail.testContext.response.body.data} extensionToRender={extension} />)
    } else if (hasText) {
        let mode: EditorMode | undefined
        switch (extension) {
            case 'json':
                mode = EditorMode.json
                break
            case 'xml':
                mode = EditorMode.xml
                break
                break
            case 'html':
            case 'htm':
                mode = EditorMode.html
                break
            case 'css':
                mode = EditorMode.css
                break
            case 'txt':
            case 'text':
            default:
                mode = EditorMode.txt
        }

        const model = workspace.getResultEditModel(detail, ResultEditSessionType.Preview, mode)

        viewer = <RichViewer
            text={text}
            model={model}
            mode={mode}
            beautify={true}
            wrap={true}
        />
    } else {
        <></>
    }

    return (
        <Stack sx={{ bottom: 0, overflow: 'hidden', position: 'relative', height: '100%', width: '100%', display: 'flex' }}>
            <Typography variant='h2' sx={{ marginTop: 0, flexGrow: 0 }} component='div' aria-label="response body preview">
                Response Body (Preview)
                <IconButton
                    aria-label="copy to clipboard"
                    title="Copy to Clipboard"
                    color='primary'
                    sx={{ marginLeft: '16px' }}
                    onClick={_ => workspace.copyToClipboard({
                        payloadType: 'ResponseBodyPreview',
                        execCtr: detail.execCtr
                    }, isImage ? 'Image' : 'Data')}
                >
                    <ContentCopyIcon />
                </IconButton>
            </Typography>
            {viewer}
        </Stack>
    )
}
