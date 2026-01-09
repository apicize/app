import { FormControl, InputLabel, Select, MenuItem, Box, IconButton, SvgIcon } from "@mui/material";
import { Stack, SxProps } from "@mui/material";
import { observer } from "mobx-react-lite";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import {
    ResultSuccessIcon, ResultFailureIcon, ResultErrorIcon,
    ResultSuccessFailureIcon, ResultSuccessErrorIcon, ResultFailureErrorIcon, ResultSuccessFailureErrorIcon,
} from "../icons"
import { ExecutionState } from "@apicize/lib-typescript";
import { useApicizeSettings } from "../contexts/apicize-settings.context";
import { EditableRequestEntry } from "../models/workspace/editable-request-entry";
import { useWorkspace } from "../contexts/workspace.context";

export const RunResultsToolbar = observer((
    {
        className,
        sx,
        request,
    }: {
        className: string | undefined,
        sx?: SxProps,
        request: EditableRequestEntry,
    }
) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()

    if (request.resultMenuItems.length < 1 || !request.selectedResultMenuItem) {
        return null
    }

    if (workspace.currentExecutionDetail?.execCtr !== request.selectedResultMenuItem.execCtr) {
        workspace.updateExecutionDetail(request.selectedResultMenuItem.execCtr)
    }

    const disableUp = request.selectedResultMenuItem.prevExecCtr === undefined
    const disableDown = request.selectedResultMenuItem.nextExecCtr === undefined
    const disableParent = request.selectedResultMenuItem.parentExecCtr === undefined

    const updateSelectedResult = (execCtr: number | undefined) => {
        if (!(execCtr && execCtr >= 0)) return
        request.changeExecCtr(execCtr)
    }

    const ExecutionStateIcon = ({ executionState }: { executionState: ExecutionState }) => {
        if ((executionState & (ExecutionState.success | ExecutionState.failure | ExecutionState.error)) ===
            (ExecutionState.success | ExecutionState.failure | ExecutionState.error)) {
            return <SvgIcon fontSize='small'><ResultSuccessFailureErrorIcon /></SvgIcon>
        }
        if ((executionState & (ExecutionState.success | ExecutionState.failure)) ===
            (ExecutionState.success | ExecutionState.failure)) {
            return <SvgIcon fontSize='small'><ResultSuccessFailureIcon /></SvgIcon>
        }
        if ((executionState & (ExecutionState.success | ExecutionState.error)) ===
            (ExecutionState.success | ExecutionState.error)) {
            return <SvgIcon fontSize='small'><ResultSuccessErrorIcon /></SvgIcon>
        }
        if ((executionState & (ExecutionState.failure | ExecutionState.error)) ===
            (ExecutionState.failure | ExecutionState.error)) {
            return <SvgIcon fontSize='small'><ResultFailureErrorIcon /></SvgIcon>
        }
        if ((executionState & ExecutionState.success) === ExecutionState.success) {
            return <SvgIcon fontSize='small'><ResultSuccessIcon /></SvgIcon>
        }
        if ((executionState & ExecutionState.failure) === ExecutionState.failure) {
            return <SvgIcon fontSize='small'><ResultFailureIcon /></SvgIcon>
        }
        if ((executionState & ExecutionState.error) === ExecutionState.error) {
            return <SvgIcon fontSize='small'><ResultErrorIcon /></SvgIcon>
        }
        return null
    }

    return <Stack direction='row' className={className} sx={sx} maxWidth='None' paddingTop='0.25em' paddingBottom='1.5em' display='flex' justifyContent='center'>
        {
            request.resultMenuItems.length > 0
                ? <FormControl>
                    <InputLabel id='run-id'>Results</InputLabel>
                    <Select
                        labelId='run-id'
                        id='run'
                        className='run-toolbar'
                        disabled={request.isRunning}
                        label='Results'
                        sx={{ minWidth: '10em' }}
                        size='small'
                        value={request.selectedResultMenuItem.execCtr.toString()}
                        onChange={e => updateSelectedResult(parseInt(e.target.value))}
                    >
                        {
                            request.resultMenuItems.map((result) => {
                                let label = result.executingName && result.level === 0
                                    ? `${result.name} [${result.executingName}]`
                                    : result.name

                                if (settings.showDiagnosticInfo) {
                                    label += ` (${result.execCtr}, prev: ${result.prevExecCtr}, next: ${result.nextExecCtr}, parent: ${result.parentExecCtr})`
                                }

                                return (
                                    <MenuItem key={`exresult-${result.executingRequestOrGroupId}-${result.execCtr}`}
                                        className="run-toolbar-menuitem"
                                        sx={{
                                            borderTop: result.executingOffset === 0 ? '0.2em solid #404040' : 'none',
                                            paddingTop: '0.5em',
                                            paddingBottom: '0.5em',
                                            paddingLeft: `${1 + result.level * 1.5}em`,
                                            paddingRight: '1.5em'
                                        }} value={result.execCtr}>
                                        {label}
                                        <ExecutionStateIcon executionState={result.executionState} />
                                    </MenuItem>
                                )
                            })
                        }
                    </Select>
                </FormControl>
                : null
        }
        <Box display='flex' flexDirection='row' flexGrow={1} justifyContent='end'>
            <IconButton color='primary' title='View Previous Result' onClick={() => updateSelectedResult(request.selectedResultMenuItem?.prevExecCtr)} disabled={disableUp}><ArrowUpwardIcon /></IconButton>
            <IconButton color='primary' title='View Next Result' onClick={() => updateSelectedResult(request.selectedResultMenuItem?.nextExecCtr)} disabled={disableDown}><ArrowDownwardIcon /></IconButton>
            <IconButton color='primary' title='View Parent Result' onClick={() => updateSelectedResult(request.selectedResultMenuItem?.parentExecCtr)} disabled={disableParent}><KeyboardReturnIcon /></IconButton>
        </Box>
    </Stack >
})