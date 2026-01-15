import { Stack, TextField, SxProps, Grid, Box, SvgIcon, IconButton, Button, FormControl, MenuItem, Select, InputLabel } from '@mui/material'
import { EditorTitle } from '../editor-title';
import { observer } from 'mobx-react-lite';
import { EditableScenario, EditableVariable } from '../../models/workspace/editable-scenario';
import ScenarioIcon from '../../icons/scenario-icon';
import { GenerateIdentifier } from '../../services/random-identifier-generator';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { VariableSourceType } from '@apicize/lib-typescript';
import { useWorkspace } from '../../contexts/workspace.context';
import { useApicizeSettings } from '../../contexts/apicize-settings.context';
import { useFeedback } from '../../contexts/feedback.context';
import { useState, useEffect } from 'react';

export const ScenarioEditor = observer(({ scenario, sx } : { scenario: EditableScenario, sx?: SxProps }) => {

    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const feedback = useFeedback()

    workspace.nextHelpTopic = 'workspace/scenarios'

    // Register dropdowns so they can be hidden on modal dialogs
    const [showVariableTypeMenu, setShowVariableTypeMenu] = useState(false)
    useEffect(() => {
        const disposer = feedback.registerModalBlocker(() => setShowVariableTypeMenu(false))
        return (() => {
            disposer()
        })
    })

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
        <Stack direction='column' className='editor scenario' sx={sx}>
            <Box className='editor-panel-header'>
                <EditorTitle
                    icon={<SvgIcon color='scenario'><ScenarioIcon /></SvgIcon>}
                    name={scenario.name.length > 0 ? scenario.name : '(Unnamed)'}
                    diag={settings.showDiagnosticInfo ? scenario.id : undefined}
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
                        <Grid container spacing={3}>
                            {
                                (scenario.variables ?? []).map(variable => [
                                    <Grid container rowSpacing={2} spacing={1} size={12} columns={12}>
                                        <Grid size={{ md: 3 }}>
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
                                        </Grid>
                                        <Grid size={{ md: 2 }}>
                                            <FormControl sx={{ width: '100%' }}>
                                                <InputLabel id={`${variable.id}-type-lbl`}>Type</InputLabel>
                                                <Select
                                                    id={`${variable.id}-type`}
                                                    labelId={`${variable.id}-type-lbl`}
                                                    label='Type'
                                                    arial-label='variable-type'
                                                    size='small'
                                                    value={variable.type}
                                                    open={showVariableTypeMenu}
                                                    onClose={() => setShowVariableTypeMenu(false)}
                                                    onOpen={() => setShowVariableTypeMenu(true)}
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
                                        </Grid>
                                        <Grid size={{ md: 6 }}>
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
                                        </Grid>
                                        <Grid className='namevalue-col-btn' size={{ md: 1 }}>
                                            <IconButton aria-label="delete" onClick={() => onDeleteVariable(variable.id)}>
                                                <DeleteIcon color='primary' />
                                            </IconButton>
                                        </Grid>
                                    </Grid>
                                ])
                            }
                            <Box>
                                <Button variant="outlined" aria-label="add" startIcon={<AddIcon />} size='small' onClick={() => onAddVariable()}>Add Scenario Variable</Button>
                            </Box>
                        </Grid>
                    </Stack>
                </Stack>
            </Box>
        </Stack >
    )
})