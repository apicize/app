import { ToggleButton, Box, Grid, SvgIcon } from "@mui/material";
import { SxProps } from "@mui/material";
import { observer } from "mobx-react-lite";
import PlayCircleOutlined from '@mui/icons-material/PlayCircleOutlined'
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled'
import { EntityType } from "../models/workspace/entity-type";
import { useWorkspace } from "../contexts/workspace.context";
import { ToastSeverity, useFeedback } from "../contexts/feedback.context";
import BlockIcon from '@mui/icons-material/Block';
import { NO_SELECTION_ID } from "../models/store";
import SeedIcon from "../icons/seed-icon";
import { EditableRequestEntry } from "../models/workspace/editable-request-entry";
import { useApicizeSettings } from "../contexts/apicize-settings.context";
import { useState } from "react";

export const RunToolbar = observer(({ sx, requestEntry }: { sx?: SxProps, requestEntry: EditableRequestEntry }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const [seedingFrom, setSeedingFrom] = useState<string | null>(null)

    const requestId = requestEntry.id
    const running = requestEntry?.isRunning ?? false

    if (seedingFrom == null) {
        workspace.getRequestActiveData(requestEntry)
            .then(d => setSeedingFrom((d && d.id !== NO_SELECTION_ID) ? d.name : ''))
            .catch(e => feedback.toastError(e))
        return null
    }

    const handleRunClick = (singleRun: boolean = false) => () => {
        workspace.launchExecution(requestId, singleRun)
    }

    const handleCancel = () => {
        workspace.cancelRequest(requestId)
    }

    const label = requestEntry.entityType === EntityType.Group ? 'group' : 'request'

    let runDisplay: string
    let multiDisplay: string
    let cancelDisplay: string

    if (running) {
        runDisplay = 'none'
        multiDisplay = 'none'
        cancelDisplay = 'inline-flex'
    } else {
        runDisplay = 'inline-flex'
        multiDisplay = 'inline-flex'
        cancelDisplay = 'none'
    }

    let times = requestEntry.runs == 1 ? 'one time' : `${requestEntry.runs} times`

    return (
        <Grid container direction={'row'} display='flex' flexGrow={1} marginLeft='2em' alignItems='center' justifyContent='space-between' sx={sx}>
            <Box>
                <ToggleButton value='Run' sx={{ display: runDisplay }} title={`Run selected ${label} once with maximum timeout (${settings.ctrlKey}-Enter)`} size='small' disabled={running} onClick={handleRunClick(true)}>
                    <PlayCircleOutlined color={running ? 'disabled' : 'success'} />
                </ToggleButton>
                <ToggleButton value='Multi' sx={{ display: multiDisplay }} title={`Run selected ${label} ${times} with defined timeout (${settings.ctrlKey}-Shift-Enter)`} size='small' disabled={running} onClick={handleRunClick()}>
                    <PlayCircleFilledIcon color={(running) ? 'disabled' : 'success'} />
                </ToggleButton>
                <ToggleButton value='Cancel' sx={{ display: cancelDisplay }} title='Cancel' size='small' onClick={() => handleCancel()}>
                    <BlockIcon color='error' />
                </ToggleButton>
            </Box>
            <ToggleButton value='Seed' size='small' title={seedingFrom === '' ? 'Not Seeding Data' : `Seeding from ${seedingFrom}`} onClick={() =>
                requestEntry.entityType === EntityType.Group ? workspace.changeGroupPanel('Parameters') : workspace.changeRequestPanel('Parameters')
            }>
                <SvgIcon className='seed-icon' color={seedingFrom === '' ? 'primary' : 'success'}><SeedIcon /></SvgIcon>
            </ToggleButton>
        </Grid>
    )
})