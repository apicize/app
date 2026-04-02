import { FormControl, InputLabel, Select, MenuItem, Box, IconButton, SvgIcon } from "@mui/material";
import { Stack, SxProps } from "@mui/material";
import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
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
import { useFeedback } from "../contexts/feedback.context";

// Memoized component to display execution state icon
const ExecutionStateIcon = React.memo(({ executionState }: { executionState: ExecutionState }) => {
    const masked = executionState & (ExecutionState.success | ExecutionState.failure | ExecutionState.error)
    switch (masked) {
        case ExecutionState.success | ExecutionState.failure | ExecutionState.error:
            return <SvgIcon fontSize='small'><ResultSuccessFailureErrorIcon /></SvgIcon>
        case ExecutionState.success | ExecutionState.failure:
            return <SvgIcon fontSize='small'><ResultSuccessFailureIcon /></SvgIcon>
        case ExecutionState.success | ExecutionState.error:
            return <SvgIcon fontSize='small'><ResultSuccessErrorIcon /></SvgIcon>
        case ExecutionState.failure | ExecutionState.error:
            return <SvgIcon fontSize='small'><ResultFailureErrorIcon /></SvgIcon>
        case ExecutionState.success as number:
            return <SvgIcon fontSize='small'><ResultSuccessIcon /></SvgIcon>
        case ExecutionState.failure as number:
            return <SvgIcon fontSize='small'><ResultFailureIcon /></SvgIcon>
        case ExecutionState.error as number:
            return <SvgIcon fontSize='small'><ResultErrorIcon /></SvgIcon>
        default:
            return null
    }
}, (prev, next) => prev.executionState === next.executionState)

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
    const feedback = useFeedback()

    // Register dropdowns so they can be hidden on modal dialogs
    const [showResultsMenu, setShowResultsMenu] = useState(false)
    useEffect(() => {
        const disposer = feedback.registerModalBlocker(() => setShowResultsMenu(false))
        return (() => {
            disposer()
        })
    }, [feedback])

    // CRITICAL: Extract observable values ONCE at the top for consistent render snapshot
    // MobX observables can change mid-render, causing Select value/children mismatch
    // Convert to plain array to break MobX reactivity during render
    const menuItems = request.resultMenuItems.slice()
    const selectedResultMenuItem = request.selectedResultMenuItem
    const isRunning = request.isRunning

    useEffect(() => {
        if (selectedResultMenuItem && workspace.currentExecutionDetail?.execCtr !== selectedResultMenuItem.execCtr) {
            workspace.updateExecutionDetail(selectedResultMenuItem.execCtr)
        }
    }, [selectedResultMenuItem, selectedResultMenuItem?.execCtr, workspace.currentExecutionDetail?.execCtr, workspace])

    const updateSelectedResult = React.useCallback((execCtr: number | undefined) => {
        if (!(execCtr && execCtr >= 0)) return
        request.changeExecCtr(execCtr)
    }, [request])

    if (menuItems.length < 1 || !selectedResultMenuItem) {
        return null
    }

    const disableUp = selectedResultMenuItem.prevExecCtr === undefined
    const disableDown = selectedResultMenuItem.nextExecCtr === undefined
    const disableParent = selectedResultMenuItem.parentExecCtr === undefined

    // Double-check the selected value actually exists in the items array before rendering
    const canRenderSelect = menuItems.findIndex(m => m.execCtr === selectedResultMenuItem.execCtr) !== -1

    return <Stack direction='row' className={className} sx={sx} maxWidth='None' paddingTop='0.25em' paddingBottom='1.5em' display='flex' justifyContent='center'>
        {
            canRenderSelect
                ? <FormControl>
                    <InputLabel id='run-id'>Results</InputLabel>
                    <Select
                        labelId='run-id'
                        id='run'
                        className='run-toolbar'
                        disabled={isRunning}
                        label='Results'
                        sx={{ minWidth: '10em' }}
                        size='small'
                        value={selectedResultMenuItem.execCtr}
                        open={showResultsMenu}
                        onClose={() => setShowResultsMenu(false)}
                        onOpen={() => setShowResultsMenu(true)}
                        onChange={e => {
                            const value = typeof e.target.value === 'string'
                                ? parseInt(e.target.value, 10)
                                : e.target.value
                            updateSelectedResult(value)
                        }}
                    >
                        {
                            menuItems.map(result => {
                                let label = result.executingName && result.level === 0
                                    ? `${result.name} [${result.executingName}]`
                                    : result.name

                                if (settings.showDiagnosticInfo) {
                                    label += ` (${result.execCtr}, prev: ${result.prevExecCtr ?? 'N/A'}, next: ${result.nextExecCtr ?? 'N/A'}, parent: ${result.parentExecCtr ?? 'N/A'})`
                                }

                                return (
                                    <MenuItem
                                        key={`${result.executingRequestOrGroupId}-${result.execCtr}`}
                                        className="run-toolbar-menuitem"
                                        sx={{
                                            borderTop: result.executingOffset === 0 ? '0.2em solid #404040' : 'none',
                                            paddingTop: '0.5em',
                                            paddingBottom: '0.5em',
                                            paddingLeft: `${1 + result.level * 1.5}em`,
                                            paddingRight: '1.5em'
                                        }}
                                        value={result.execCtr}
                                    >
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
            <IconButton color='primary' title='View Previous Result' onClick={() => updateSelectedResult(selectedResultMenuItem.prevExecCtr)} disabled={disableUp}><ArrowUpwardIcon /></IconButton>
            <IconButton color='primary' title='View Next Result' onClick={() => updateSelectedResult(selectedResultMenuItem.nextExecCtr)} disabled={disableDown}><ArrowDownwardIcon /></IconButton>
            <IconButton color='primary' title='View Parent Result' onClick={() => updateSelectedResult(selectedResultMenuItem.parentExecCtr)} disabled={disableParent}><KeyboardReturnIcon /></IconButton>
        </Box>
    </Stack >
})