import Stack from '@mui/material/Stack'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import { SxProps } from '@mui/material/styles'
import Box from '@mui/material/Box'
import SvgIcon from '@mui/material/SvgIcon'
import IconButton from '@mui/material/IconButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import { observer } from 'mobx-react-lite';
import { useWorkspace, WorkspaceMode } from '../../contexts/workspace.context';
import { Selection } from '@apicize/lib-typescript';
import CloseIcon from '@mui/icons-material/Close';
import { EditorTitle } from '../editor-title';
import DefaultsIcon from '../../icons/defaults-icon';
import AltRouteIcon from '@mui/icons-material/AltRoute'
import DatasetIcon from '@mui/icons-material/Dataset';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';
import { ExternalDataSourceType } from '@apicize/lib-typescript';
import { useFeedback } from '../../contexts/feedback.context';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { WarningsEditor } from './warnings-editor';

type DefaultsPanels = 'Parameters' | 'External Data' | 'Warnings'

export const DefaultsEditor = observer(({ sx }: { sx: SxProps }) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    workspace.nextHelpTopic = 'workspace/defaults'

    const defaults = workspace.defaults
    const parameters = workspace.activeParameters
    const data = workspace.data

    const [panel, setPanel] = useState<DefaultsPanels>('Parameters')

    if (!parameters) {
        workspace.initializeParameterList()
        return null
    }

    if (!data) {
        workspace.initializeDataList()
        return null
    }

    const handlePanelChanged = (_: React.SyntheticEvent, newValue: DefaultsPanels) => {
        if (newValue) setPanel(newValue)
    }

    let credIndex = 0
    const itemsFromSelections = (selections: Selection[]) => {
        return selections.map(s => (
            <MenuItem key={`creds-${credIndex++}`} value={s.id}>{s.name}</MenuItem>
        ))
    }

    const hasWarnings = workspace.defaults.warnings.hasEntries
    if (!hasWarnings && panel === 'Warnings') {
        setPanel('Parameters')
    }

    const ParameterEditor = <Stack spacing={3}>
        <FormControl>
            <InputLabel id='scenario-label-id'>Scenarios</InputLabel>
            <Select
                labelId='scenario-label'
                aria-labelledby='scenario-label-id'
                id='cred-scenario'
                label='Scenario'
                value={defaults.selectedScenario.id}
                onChange={(e) => defaults.setScenarioId(e.target.value)}
                size='small'
                fullWidth
            >
                {itemsFromSelections(parameters.scenarios)}
            </Select>
        </FormControl>
        <FormControl>
            <InputLabel id='auth-label-id'>Authorization</InputLabel>
            <Select
                labelId='auth-label'
                aria-labelledby='auth-label-id'
                id='cred-auth'
                label='Authorization'
                value={defaults.selectedAuthorization.id}
                onChange={(e) => defaults.setAuthorizationId(e.target.value)}
                size='small'
                fullWidth
            >
                {itemsFromSelections(parameters.authorizations)}
            </Select>
        </FormControl>
        <FormControl>
            <InputLabel id='cert-label-id'>Certificate</InputLabel>
            <Select
                labelId='cert-label'
                aria-labelledby='cert-label-id'
                id='cred-cert'
                label='Certificate'
                value={defaults.selectedCertificate.id}
                onChange={(e) => defaults.setCertificateId(e.target.value)}
                size='small'
                fullWidth
            >
                {itemsFromSelections(parameters.certificates)}
            </Select>
        </FormControl>
        <FormControl>
            <InputLabel id='proxy-label-id'>Proxy</InputLabel>
            <Select
                labelId='proxy-label'
                aria-labelledby='proxy-label-id'
                id='cred-proxy'
                label='Proxy'
                value={defaults.selectedProxy.id}
                onChange={(e) => defaults.setProxyId(e.target.value)}
                size='small'
                fullWidth
            >
                {itemsFromSelections(parameters.proxies)}
            </Select>
        </FormControl>
        <FormControl>
            <InputLabel id='data-label-id'>Seed Data</InputLabel>
            <Select
                labelId='data-label'
                aria-labelledby='data-label-id'
                id='cred-data'
                label='Seed Data'
                value={defaults.selectedData.id}
                onChange={(e) => defaults.setDataId(e.target.value)}
                fullWidth
                size='small'
            >
                {itemsFromSelections(parameters.data)}
            </Select>
        </FormControl>
    </Stack>

    const DataEditor = <Stack spacing={3}>
        {
            data.map((d, idx) => (
                <Grid key={`def-data-${idx}`} container rowSpacing={2} spacing={1} size={12} columns={12}>
                    <Grid size={4}>
                        <TextField
                            id={`${d.id}-name`}
                            label='Variable Name'
                            aria-label='variable-name'
                            size="small"
                            value={d.name ? d.name : ''}
                            error={d.nameInvalid}
                            autoFocus={(d.name?.length ?? 0) === 0}
                            helperText={d.nameInvalid ? 'Variable name is required' : ''}
                            onChange={(e) => d.setName(e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={3}>
                        <FormControl fullWidth>
                            <InputLabel id={`${d.id}-type-lbl`}>Type</InputLabel>
                            <Select
                                id={`${d.id}-type`}
                                labelId={`${d.id}-type-lbl`}
                                label='Type'
                                arial-label='variable-type'
                                size='small'
                                value={d.type}
                                sx={{ minWidth: '8rem' }}
                                onChange={e => d.setSourceType(e.target.value as ExternalDataSourceType)}
                            >
                                <MenuItem key={`${d.id}-type-file-json`} value={ExternalDataSourceType.FileJSON}>JSON File</MenuItem>
                                <MenuItem key={`${d.id}-type-file-csv`} value={ExternalDataSourceType.FileCSV}>CSV File</MenuItem>
                                <MenuItem key={`${d.id}-type-json`} value={ExternalDataSourceType.JSON}>JSON Value</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={4}>
                        <TextField
                            id={`${d.id}-value`}
                            label='Value'
                            className='code'
                            aria-label='variable-value'
                            rows={10}
                            multiline={d.type == ExternalDataSourceType.JSON}
                            size="small"
                            value={d.source ? d.source : ''}
                            error={d.sourceError !== null}
                            helperText={d.sourceError ?? ''}
                            onChange={(e) => d.setSource(e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <Grid className='namevalue-col-btn' size={1}>
                        <IconButton aria-label="delete" onClick={() => workspace.deleteData(d.id)}>
                            <DeleteIcon color='primary' />
                        </IconButton>
                    </Grid>
                </Grid>
            ))
        }
        <Box>
            <Button variant="outlined" aria-label="add" startIcon={<AddIcon />} size='small' onClick={() => workspace.addData(null)}>Add External Data Source</Button>
        </Box>
    </Stack>

    return <Box marginBottom='1.5em' sx={sx} className='editor'>
        <Stack direction='row' className='editor-panel-header'>
            <EditorTitle icon={<SvgIcon color='defaults'><DefaultsIcon /></SvgIcon>} name={`Workbook Defaults - ${panel}`}>
                <IconButton color='primary' size='medium' aria-label='Close' title='Close' sx={{ marginLeft: '1rem' }} onClick={() => workspace.returnToNormal()}><CloseIcon fontSize='inherit' /></IconButton>
            </EditorTitle>
        </Stack>

        <Box className='editor-panel'>
            <Stack className='editor-content' direction='row' flexGrow={1}>
                <ToggleButtonGroup
                    orientation='vertical'
                    exclusive
                    onChange={handlePanelChanged}
                    value={panel}
                    sx={{ marginRight: '24px' }}
                    aria-label="text alignment">
                    <ToggleButton value="Parameters" title="Show Default Parameters" aria-label='show test' size='small'><AltRouteIcon /></ToggleButton>
                    <ToggleButton value="External Data" title="Show External Data" aria-label='show test' size='small'><DatasetIcon /></ToggleButton>
                    {
                        hasWarnings
                            ? <ToggleButton hidden={true} value="Warnings" title="Request Warnings" aria-label='show warnings' size='small'><WarningAmberIcon sx={{ color: '#FFFF00' }} /></ToggleButton>
                            : null
                    }

                </ToggleButtonGroup>
                <Box flexGrow={1} flexDirection='row' className='panels'>
                    {
                        panel == 'Parameters'
                            ? ParameterEditor
                            : panel == 'External Data'
                                ? DataEditor
                                : panel == 'Warnings'
                                    ? <WarningsEditor warnings={workspace.defaults.warnings} onDelete={(id) => defaults.deleteWarning(id)} />
                                    : <></>
                    }
                </Box>
            </Stack>
        </Box>
    </Box>
})
