import { TextField, SxProps, Grid, FormControl, InputLabel, MenuItem, Select, ToggleButton, Checkbox, FormControlLabel } from '@mui/material'
import { ExecutionConcurrency } from '@apicize/lib-typescript';
import { EditableRequestGroup } from '../../../models/workspace/editable-request-group';
import { observer } from 'mobx-react-lite';
import { useWorkspace } from '../../../contexts/workspace.context';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled'
import { NO_SELECTION_ID } from '../../../models/store';
import { useFeedback } from '../../../contexts/feedback.context';
import { useState, useEffect } from 'react';

export const RequestGroupInfoEditor = observer(({ sx, group }: {
    sx?: SxProps,
    group: EditableRequestGroup | null
}) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()

    // Register dropdowns so they can be hidden on modal dialogs
    const [showGroupExecutionMenu, setShowGroupExecutionMenu] = useState(false)
    const [showGroupItemExecutionMenu, setShowGroupItemExecutionMenu] = useState(false)
    useEffect(() => {
        const disposer1 = feedback.registerModalBlocker(() => setShowGroupExecutionMenu(false))
        const disposer2 = feedback.registerModalBlocker(() => setShowGroupItemExecutionMenu(false))
        return (() => {
            disposer1()
            disposer2()
        })
    })

    if (!group) {
        return null
    }

    const running = group.isRunning ?? false
    const zeroRuns = group.runs < 1

    workspace.nextHelpTopic = 'workspace/groups'

    const isUsingSeedData = workspace.defaults.selectedData.id !== NO_SELECTION_ID

    const handleRunClick = () => () => {
        workspace.startExecution(group.id)
    }

    let times = group.runs == 1 ? 'one time' : `${group.runs} times`

    return (
        <Grid container direction='column' spacing={3} sx={sx}>
            <Grid container direction='row' spacing={3}>
                <Grid flexGrow={1}>
                    <TextField
                        id='group-name'
                        label='Name'
                        aria-label='group name'
                        // autoFocus={group.name === ''}
                        size='small'
                        fullWidth
                        title="Name of group"
                        // size='small'
                        value={group.name}
                        onChange={e => group.setName(e.target.value)}
                        error={!!group.nameError}
                        helperText={group.nameError}
                    />
                </Grid>
                <Grid flexGrow={0} width={'12em'}>
                    <TextField
                        id='group-key'
                        label="Key"
                        aria-label='group key'
                        // autoFocus={request.name === ''}
                        size="small"
                        title="Referential key of group"
                        value={group.key}
                        onChange={e => group.setKey(e.target.value)}
                    />
                </Grid>
            </Grid>
            <Grid container direction='row' spacing={2}>
                <Grid container direction='row' spacing={0}>
                    <TextField
                        aria-label='Nubmer of Run Attempts'
                        placeholder='Attempts'
                        label='# of Runs'
                        title='Number of times to run the group'
                        disabled={running}
                        sx={{ width: '8em', flexGrow: 0 }}
                        size='small'
                        type='number'
                        slotProps={{
                            htmlInput: {
                                min: 0,
                                max: 1000
                            }
                        }}
                        value={group.runs}
                        onChange={e => group.setRuns(parseInt(e.target.value))}
                    />
                    <ToggleButton value='Run' title={`Run selected group ${times} with defined timeout`} disabled={running || zeroRuns} onClick={handleRunClick()} size='small'>
                        <PlayCircleFilledIcon color={running || zeroRuns ? 'disabled' : 'success'} />
                    </ToggleButton>
                </Grid>
                <Grid>
                    <FormControl>
                        <InputLabel id='multirun-execution-label-id'>Group Execution</InputLabel>
                        <Select
                            labelId='execution-label-id'
                            id='group-run-execution'
                            aria-labelledby='multirun-execution-label-id'
                            value={group.multiRunExecution}
                            disabled={group.runs < 2}
                            sx={{ minWidth: '10em' }}
                            label='Group Execution'
                            size='small'
                            open={showGroupExecutionMenu}
                            onClose={() => setShowGroupExecutionMenu(false)}
                            onOpen={() => setShowGroupExecutionMenu(true)}
                            onChange={e => group.setMultiRunExecution(e.target.value as ExecutionConcurrency)}
                            title='Whether to execute mutiple group runs sequentially (one at a time) or concurrently'
                        >
                            <MenuItem value={ExecutionConcurrency.Sequential}>Sequential</MenuItem>
                            <MenuItem value={ExecutionConcurrency.Concurrent}>Concurrent</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid>
                    <FormControl>
                        <InputLabel id='execution-label-id'>Group Item Execution</InputLabel>
                        <Select
                            labelId='execution-label-id'
                            id='execution'
                            aria-labelledby='execution-label-id'
                            value={group.execution}
                            disabled={isUsingSeedData}
                            sx={{ minWidth: '10em' }}
                            size='small'
                            label='Group Item Execution'
                            title='Whether to execute each request in the group sequentially (one at a time) or concurrently'
                            open={showGroupItemExecutionMenu}
                            onClose={() => setShowGroupItemExecutionMenu(false)}
                            onOpen={() => setShowGroupItemExecutionMenu(true)}
                            onChange={e => group.setGroupConcurrency(e.target.value as ExecutionConcurrency)}
                        >
                            <MenuItem value={ExecutionConcurrency.Sequential}>Sequential</MenuItem>
                            <MenuItem value={ExecutionConcurrency.Concurrent}>Concurrent</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid>
                    <FormControlLabel control={<Checkbox checked={group.disabled}
                        onChange={(e) => group.setDisabled(e.target.checked)} />}
                        title="Disable group when run as a child"
                        label="Disable" />
                </Grid>

            </Grid>
        </Grid >
    )
})