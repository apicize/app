import { TextField, Select, MenuItem, FormControl, InputLabel, Grid, ToggleButton } from '@mui/material'
import { GroupExecution, Method, Methods } from '@apicize/lib-typescript'
import { EditableRequest } from '../../../models/workspace/editable-request'
import { observer } from 'mobx-react-lite'
import { useWorkspace } from '../../../contexts/workspace.context'
import { ToastSeverity, useFeedback } from '../../../contexts/feedback.context'
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled'

export const RequestInfoEditor = observer((props: { request: EditableRequest }) => {
    const request = props.request
    const workspace = useWorkspace()
    const feedback = useFeedback()

    workspace.nextHelpTopic = 'requests/info'
    const execution = workspace.executions.get(request.id)
    const running = execution?.isRunning ?? false

    const methodMenuItems = () => {
        return Methods.map(method => (
            <MenuItem key={method} value={method}>{method}</MenuItem>
        ))
    }

    const handleRunClick = () => async () => {
        try {
            await workspace.executeRequest(request.id)
        } catch (e) {
            let msg1 = `${e}`
            feedback.toast(msg1, msg1 == 'Cancelled' ? ToastSeverity.Warning : ToastSeverity.Error)
        }
    }

    let times = request.runs == 1 ? 'one time' : `${request.runs} times`

    return (
        <Grid container direction='column' spacing={3}>
            <Grid>
                <TextField
                    id='request-name'
                    label="Name"
                    aria-label='request name'
                    // autoFocus={request.name === ''}
                    required
                    size="small"
                    value={request.name}
                    onChange={e => request.setName(e.target.value)}
                    error={request.nameInvalid}
                    helperText={request.nameInvalid ? 'Request name is required' : ''}
                    fullWidth
                />
            </Grid>
            <Grid>
                <TextField
                    id='request-url'
                    label="URL"
                    aria-label='request url'
                    // autoFocus={request.url !== ''}
                    required
                    size="small"
                    value={request.url}
                    onChange={e => request.setUrl(e.target.value)}
                    error={request.urlInvalid}
                    helperText={request.urlInvalid ? 'URL is required' : ''}
                    fullWidth
                />
            </Grid>
            <Grid container direction='row' spacing={2}>
                <Grid>
                    <FormControl>
                        <InputLabel id='request-method-label-id'>Method</InputLabel>
                        <Select
                            labelId='request-method-label-id'
                            aria-labelledby='request-method-label-id'
                            id="request-method"
                            value={request.method}
                            onChange={e => request.setMethod(e.target.value as Method)}
                            size='small'
                            label="Method"
                        >
                            {methodMenuItems()}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid>
                    <FormControl>
                        <TextField
                            aria-label='request timeout in milliseconds'
                            placeholder='Timeout in Milliseconds'
                            label='Timeout (ms)'
                            size='small'
                            sx={{ width: '8em' }}
                            type='number'
                            value={request.timeout}
                            onChange={e => request.setTimeout(parseInt(e.target.value))}
                        />
                    </FormControl>
                </Grid>
            </Grid>
            <Grid container direction='row' spacing={2}>
                <Grid container direction='row' spacing={0}>
                    <TextField
                        aria-label='Nubmer of Run Attempts'
                        placeholder='Attempts'
                        label='# of Runs'
                        disabled={running}
                        size='small'
                        sx={{ width: '8em', flexGrow: 0 }}
                        type='number'
                        slotProps={{
                            htmlInput: {
                                min: 1,
                                max: 1000
                            }
                        }}
                        value={request.runs}
                        onChange={e => request.setRuns(parseInt(e.target.value))}
                    />
                    <ToggleButton value='Run' title={`Run selected request ${times}`} disabled={running} size='small' onClick={handleRunClick()}>
                        <PlayCircleFilledIcon color={running ? 'disabled' : 'success'} />
                    </ToggleButton>
                </Grid>
                <Grid>
                    <FormControl>
                        <InputLabel id='multirun-execution-label-id'>Multi-Run Execution</InputLabel>
                        <Select
                            labelId='execution-label-id'
                            id='multi-run-execution'
                            aria-labelledby='multirun-execution-label-id'
                            value={request.multiRunExecution}
                            disabled={request.runs < 2}
                            size='small'
                            sx={{ minWidth: '10em' }}
                            label='Multi-Run Execution'
                            onChange={e => request.setMultiRunExecution(e.target.value as GroupExecution)}
                        >
                            <MenuItem value={GroupExecution.Sequential}>Sequential</MenuItem>
                            <MenuItem value={GroupExecution.Concurrent}>Concurrent</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Grid>
    )
})
