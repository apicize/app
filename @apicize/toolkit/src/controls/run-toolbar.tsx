import { ToggleButton, Box, Grid, SvgIcon } from "@mui/material";
import { SxProps } from "@mui/material";
import { observer } from "mobx-react-lite";
import PlayCircleOutlined from '@mui/icons-material/PlayCircleOutlined'
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled'
import { EntityType } from "../models/workspace/entity-type";
import { useWorkspace } from "../contexts/workspace.context";
import BlockIcon from '@mui/icons-material/Block';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import SeedIcon from "../icons/seed-icon";
import { EditableRequestEntry } from "../models/workspace/editable-request-entry";
import { useApicizeSettings } from "../contexts/apicize-settings.context";
import { NO_SELECTION_ID } from "@apicize/lib-typescript";
import { useFeedback } from "../contexts/feedback.context";

export const RunToolbar = observer(({ sx, requestEntry }: { sx?: SxProps, requestEntry: EditableRequestEntry }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const feedback = useFeedback()

    const requestId = requestEntry.id
    const running = requestEntry.isRunning
    const hasExecutions = requestEntry.hasExecutions

    const seedingFromData = requestEntry.selectedDataSet.id === NO_SELECTION_ID ? null : requestEntry.selectedDataSet.name

    const handleRunClick = (singleRun: boolean = false) => () => {
        workspace.startExecution(requestId, singleRun).catch(err => feedback.toastError(err))
    }

    const handleCancel = () => {
        workspace.cancelExecution(requestId).catch(err => feedback.toastError(err))
    }

    const label = requestEntry.entityType === EntityType.Group ? 'group' : 'request'

    let runDisplay: string
    let multiDisplay: string
    let cancelDisplay: string
    let clearDisplay: string

    if (running) {
        runDisplay = 'none'
        multiDisplay = 'none'
        cancelDisplay = 'inline-flex'
        clearDisplay = 'none'
    } else {
        runDisplay = 'inline-flex'
        multiDisplay = 'inline-flex'
        cancelDisplay = 'none'
        clearDisplay = hasExecutions ? 'inline-flex' : 'none'
    }

    const times = requestEntry.runs == 1 ? 'one time' : `${requestEntry.runs} times`

    return (
        <Grid container direction={'row'} display='flex' flexGrow={1} marginLeft='1em' alignItems='center' justifyContent='space-between' sx={sx}>
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
                <ToggleButton value='Clear' sx={{ display: clearDisplay }} title='Clear Execution Results' size='small' onClick={() => {
                    workspace.clearExecution(requestEntry.id).catch(err => feedback.toastError(err))
                }}>
                    <ClearAllIcon color='warning' />
                </ToggleButton>
            </Box>
            <ToggleButton value='Seed' size='small' title={seedingFromData ? `Seeding from ${seedingFromData}` : 'Not Seeding Data'} onClick={() =>
                requestEntry.entityType === EntityType.Group ? workspace.changeGroupPanel('Execution Parameters') : workspace.changeRequestPanel('Execution Parameters')
            }>
                <SvgIcon className='seed-icon' color={seedingFromData ? 'success' : 'primary'}><SeedIcon /></SvgIcon>
            </ToggleButton>
        </Grid>
    )
})