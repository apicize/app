import { IconButton, Typography } from "@mui/material"
import { Stack } from "@mui/material"
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import beautify from "js-beautify"
import { observer } from "mobx-react-lite"
import { RichViewer } from "../rich-viewer"
import { EditorMode } from "../../../models/editor-mode"
import { ResultEditSessionType } from "../../editors/editor-types"
import { useWorkspace } from "../../../contexts/workspace.context"
import { ExecutionResultDetailWithBase64 } from "../../../models/workspace/execution"
import { toJS } from "mobx"

export const ResultDetailsViewer = observer(({ detail }: { detail: ExecutionResultDetailWithBase64 | null }) => {

    const workspace = useWorkspace()

    if (!detail) {
        return
    }

    const detailToRender = structuredClone(toJS(detail))

    // Render binary request or responses as Base64 because large byte arrays are painful to render
    if (detailToRender.entityType === 'request') {
        if (detailToRender.testContext.request?.body?.type === 'Binary') {
            (detailToRender as any).testContext.request.body.data = detailToRender.requestBodyBase64
            detailToRender.requestBodyBase64 = undefined
        }
        if (detailToRender.testContext.response?.body?.type === 'Binary') {
            (detailToRender as any).testContext.response.body.data = detailToRender.resultBodyBase64
            detailToRender.resultBodyBase64 = undefined
        }
    }

    const text = beautify.js_beautify(JSON.stringify(detailToRender), {})
    const model = workspace.getResultEditModel(detail, ResultEditSessionType.Details, EditorMode.json)

    return (
        <Stack sx={{ bottom: 0, overflow: 'hidden', position: 'relative', height: '100%', display: 'flex' }}>
            <Typography variant='h2' sx={{ marginTop: 0, flexGrow: 0 }} component='div'>Details
                <IconButton
                    aria-label="copy deatils to clipboard"
                    title="Copy Details to Clipboard"
                    color='primary'
                    sx={{ marginLeft: '16px' }}
                    onClick={_ => workspace.copyToClipboard({
                        payloadType: 'ResponseDetail',
                        execCtr: detail.execCtr,
                    }, 'Response details')}>
                    <ContentCopyIcon />
                </IconButton>
            </Typography>
            <RichViewer text={text} model={model} mode={EditorMode.json} beautify={true} wrap={true} />
        </Stack>
    )
})
