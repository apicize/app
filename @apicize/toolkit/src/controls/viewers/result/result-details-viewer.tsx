import { IconButton, Typography } from "@mui/material"
import { Stack } from "@mui/material"
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { observer } from "mobx-react-lite"
import { formatViewerText, RichViewer } from "../rich-viewer"
import { useApicizeSettings } from "../../../contexts/apicize-settings.context"
import { EditorMode } from "../../../models/editor-mode"
import { ResultEditSessionType } from "../../editors/editor-types"
import { useWorkspace } from "../../../contexts/workspace.context"
import { toJS } from "mobx"
import { ExecutionResultDetail } from "@apicize/lib-typescript"
import { useFeedback } from "../../../contexts/feedback.context"

export const ResultDetailsViewer = observer(({ detail }: { detail: ExecutionResultDetail | null }) => {

    const workspace = useWorkspace()
    const feedback = useFeedback()
    const settings = useApicizeSettings()

    if (!detail) {
        return
    }

    const indentSize = settings.editorIndentSize
    const model = workspace.getResultEditModel(
        detail,
        ResultEditSessionType.Details,
        EditorMode.json,
        () => {
            // Remove tracking elements from displayed result details
            const detailToRender = {
                ...structuredClone(toJS(detail)),
                entityType: undefined,
                execCtr: undefined,
            }
            return formatViewerText(JSON.stringify(detailToRender), EditorMode.json, indentSize)
        },
        `${indentSize}`)

    return (
        <Stack sx={{ bottom: 0, overflow: 'hidden', position: 'relative', height: '100%', display: 'flex' }}>
            <Typography variant='h2' sx={{ marginTop: 0, flexGrow: 0, display: 'flex', alignItems: 'center' }} component='div'>Details
                <IconButton
                    aria-label="copy deatils to clipboard"
                    title="Copy Details to Clipboard"
                    color='primary'
                    sx={{ marginLeft: '16px' }}
                    onClick={_ => {
                        workspace.copyToClipboard({
                            payloadType: 'ResponseDetail',
                            execCtr: detail.execCtr,
                        }, 'Response details')
                            .catch(err => feedback.toastError(err))
                    }}>
                    <ContentCopyIcon />
                </IconButton>
            </Typography>
            <RichViewer model={model} wrap={true} />
        </Stack>
    )
})
