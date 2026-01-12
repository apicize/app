import { IconButton, Typography } from "@mui/material"
import { Stack } from "@mui/material"
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import beautify from "js-beautify"
import { observer } from "mobx-react-lite"
import { RichViewer } from "../rich-viewer"
import { EditorMode } from "../../../models/editor-mode"
import { ResultEditSessionType } from "../../editors/editor-types"
import { useWorkspace } from "../../../contexts/workspace.context"
import { toJS } from "mobx"
import { ExecutionResultDetail } from "@apicize/lib-typescript"

export const ResultDetailsViewer = observer(({ detail }: { detail: ExecutionResultDetail | null }) => {

    const workspace = useWorkspace()

    if (!detail) {
        return
    }

    const detailToRender = structuredClone(toJS(detail))

    // Remove tracking elements from displayed result details
    if (detailToRender.entityType === 'request') {
        const temp = detailToRender as any
        delete temp['entityType']
        delete temp['execCtr']
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
