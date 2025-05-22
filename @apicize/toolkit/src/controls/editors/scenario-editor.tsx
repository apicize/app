import { Stack, TextField, SxProps, Grid2, Box, SvgIcon, IconButton, Button, FormControl, MenuItem, Select, InputLabel } from '@mui/material'
import { EditorTitle } from '../editor-title';
import { observer } from 'mobx-react-lite';
import { EditableVariable } from '../../models/workspace/editable-scenario';
import ScenarioIcon from '../../icons/scenario-icon';
import { GenerateIdentifier } from '../../services/random-identifier-generator';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { VariableSourceType } from '@apicize/lib-typescript';
import { useWorkspace } from '../../contexts/workspace.context';
import { useApicize } from '../../contexts/apicize.context';

export const ScenarioEditor = observer((props: { sx?: SxProps }) => {

    const apicize = useApicize()
    const workspace = useWorkspace()
    const activeSelection = workspace.activeSelection

    if (!activeSelection?.scenario) {
        return null
    }

    workspace.nextHelpTopic = 'workspace/scenarios'
    const scenario = activeSelection.scenario

    const onAddVariable = () => {
        scenario.variables.push(new EditableVariable(
            GenerateIdentifier(),
            '',
            VariableSourceType.Text,
            ''
        ))
        scenario.notifyVariableUpdates()
    }

    const onDeleteVariable = (id: string) => {
        scenario.variables = scenario.variables.filter(v => v.id !== id)
        scenario.notifyVariableUpdates()
    }

    return (
        <Stack direction='column' className='editor scenario' sx={props.sx}>
            <Box className='editor-panel-header'>
                <EditorTitle
                    icon={<SvgIcon color='scenario'><ScenarioIcon /></SvgIcon>}
                    name={scenario.name.length > 0 ? scenario.name : '(Unnamed)'}
                    diag={apicize.showDiagnosticInfo ? scenario.id : undefined}
                />
            </Box>
            <Box className='editor-panel'>
                <Stack className='editor-content' direction='column' spacing={3}>
                    <TextField
                        id='scenario-name'
                        label='Name'
                        aria-label='scenario name'
                        size='small'
                        value={scenario.name}
                        autoFocus={scenario.name === ''}
                        onChange={e => scenario.setName(e.target.value)}
                        error={scenario.nameInvalid}
                        helperText={scenario.nameInvalid ? 'Scenario name is required' : ''}
                        fullWidth
                    />
                    <Stack direction='column' paddingTop='2em'>
                        <Grid2 container spacing={3}>
                            {
                                (scenario.variables ?? []).map(variable => [
                                    <Grid2 container rowSpacing={2} spacing={1} size={12} columns={12}>
                                        <Grid2 size={{ md: 3 }}>
                                            <TextField
                                                id={`${variable.id}-name`}
                                                label='Variable Name'
                                                aria-label='variable-name'
                                                size="small"
                                                value={variable.name}
                                                error={variable.nameInvalid}
                                                helperText={variable.nameInvalid ? 'Variable name is required' : ''}
                                                onChange={(e) => {
                                                    variable.updateName(e.target.value)
                                                    scenario.notifyVariableUpdates()
                                                }}
                                                fullWidth
                                            />
                                        </Grid2>
                                        <Grid2 size={{ md: 2 }}>
                                            <FormControl sx={{ width: '100%' }}>
                                                <InputLabel id={`${variable.id}-type-lbl`}>Type</InputLabel>
                                                <Select
                                                    id={`${variable.id}-type`}
                                                    labelId={`${variable.id}-type-lbl`}
                                                    label='Type'
                                                    arial-label='variable-type'
                                                    size='small'
                                                    value={variable.type}
                                                    onChange={e => {
                                                        variable.updateSourceType(e.target.value as VariableSourceType)
                                                        scenario.notifyVariableUpdates()
                                                    }}
                                                >
                                                    <MenuItem key={`${variable.id}-type-text`} value={VariableSourceType.Text}>Text Value</MenuItem>
                                                    <MenuItem key={`${variable.id}-type-json`} value={VariableSourceType.JSON}>JSON Value</MenuItem>
                                                    <MenuItem key={`${variable.id}-type-file-json`} value={VariableSourceType.FileJSON}>JSON File</MenuItem>
                                                    <MenuItem key={`${variable.id}-type-file-csv`} value={VariableSourceType.FileCSV}>CSV File</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid2>
                                        <Grid2 size={{ md: 6 }}>
                                            <TextField
                                                id={`${variable.id}-value`}
                                                label='Value'
                                                className='code'
                                                aria-label='variable-value'
                                                sx={{ width: '100%' }}
                                                rows={10}
                                                multiline={variable.type == VariableSourceType.JSON}
                                                size="small"
                                                value={variable.value}
                                                error={variable.valueError !== null}
                                                helperText={variable.valueError ?? ''}
                                                onChange={(e) => {
                                                    variable.updateValue(e.target.value)
                                                    scenario.notifyVariableUpdates()
                                                }}
                                                fullWidth
                                            />
                                        </Grid2>
                                        <Grid2 className='namevalue-col-btn' size={{ md: 1 }}>
                                            <IconButton aria-label="delete" onClick={() => onDeleteVariable(variable.id)}>
                                                <DeleteIcon color='primary' />
                                            </IconButton>
                                        </Grid2>
                                    </Grid2>
                                ])
                            }
                            <Box>
                                <Button variant="outlined" aria-label="add" startIcon={<AddIcon />} size='small' onClick={() => onAddVariable()}>Add Scenario Variable</Button>
                            </Box>
                        </Grid2>
                    </Stack>
                </Stack>
            </Box>
        </Stack >
    )
})