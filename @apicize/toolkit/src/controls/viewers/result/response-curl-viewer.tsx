import { IconButton, Stack, Typography } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { RichViewer } from "../rich-viewer";
import { EditorMode } from "../../../models/editor-mode";
import { ResultEditSessionType } from "../../editors/editor-types";
import { useWorkspace } from "../../../contexts/workspace.context";
import { ExecutionResultDetail } from "@apicize/lib-typescript";
import { useFeedback } from "../../../contexts/feedback.context";

export function ResponseCurlViewer({ detail }: { detail: ExecutionResultDetail | null }) {
    const workspace = useWorkspace()
    const feedback = useFeedback()

    if (!(detail && detail.entityType === 'request' && detail.curl)) {
        return
    }

    const curl = detail.curl
    const model = workspace.getResultEditModel(detail, ResultEditSessionType.Curl, EditorMode.shell)

    return (
        <Stack sx={{ bottom: 0, overflow: 'hidden', position: 'relative', height: '100%', display: 'flex' }}>
            <Typography variant='h2' sx={{ marginTop: 0, flexGrow: 0 }} component='div'>CURL Command
                <IconButton
                    aria-label="copy curl command to clipboard"
                    title="Copy CURL to Clipboard"
                    color='primary'
                    sx={{ marginLeft: '16px' }}
                    onClick={_ => {
                        workspace.copyToClipboard({
                            payloadType: 'ResponseCurl',
                            execCtr: detail.execCtr,
                        }, 'CURL')
                            .catch(err => feedback.toastError(err))
                    }}
                >
                    <ContentCopyIcon />
                </IconButton>
            </Typography>
            <RichViewer text={curl} model={model} wrap={true} mode={EditorMode.shell} />
        </Stack>
    )
}
