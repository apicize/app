import { Stack, SxProps, FormControl, InputLabel, MenuItem, Select, Box, ToggleButton, ToggleButtonGroup, IconButton, SupportedColorScheme } from '@mui/material'
import { observer } from 'mobx-react-lite';
import { useWorkspace } from '../../contexts/workspace.context';
import { useFileOperations } from '../../contexts/file-operations.context';
import { useFeedback, ToastSeverity } from '../../contexts/feedback.context';
import { DEFAULT_SELECTION_ID } from '../../models/store';
import { EntitySelection } from '../../models/workbook/entity-selection';
import { EditorTitle } from '../editor-title';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import AltRouteIcon from '@mui/icons-material/AltRoute'
import SettingsIcon from '@mui/icons-material/Settings';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import React, { useRef, useState } from 'react';
import { useApicizeSettings } from '../../contexts/apicize-settings.context';
import { EditableEntityType } from '../../models/workbook/editable-entity-type';
import { EditableWorkbookDefaults } from '../../models/workbook/editable-workbook-defaults';

const ParametersEditor = observer(() => {
    const workspace = useWorkspace()
    if (workspace.active?.entityType !== EditableEntityType.Defaults || workspace.helpVisible) return null
    const defaults = workspace.active as EditableWorkbookDefaults

    let credIndex = 0
    const itemsFromSelections = (selections: EntitySelection[]) => {
        return selections.map(s => (
            <MenuItem key={`creds-${credIndex++}`} value={s.id}>{s.name}</MenuItem>
        ))
    }

    const lists = workspace.getDefaultParameterLists()

    return <Box>
        <EditorTitle icon={<SettingsIcon />} name='Settings - Default Workbook Parameters' />
        <Stack spacing={3} marginTop='3em'>
            <FormControl>
                <InputLabel id='scenario-label-id'>Scenarios</InputLabel>
                <Select
                    labelId='scenario-label'
                    aria-labelledby='scenario-label-id'
                    id='cred-scenario'
                    label='Scenario'
                    value={defaults.selectedScenario.id}
                    onChange={(e) => workspace.setDefaultScenarioId(e.target.value)}
                    fullWidth
                >
                    {itemsFromSelections(lists.scenarios)}
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
                    onChange={(e) => workspace.setDefaultAuthorizationId(e.target.value)}
                    fullWidth
                >
                    {itemsFromSelections(lists.authorizations)}
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
                    onChange={(e) => workspace.setDefaultCertificateId(e.target.value)}
                    fullWidth
                >
                    {itemsFromSelections(lists.certificates)}
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
                    onChange={(e) => workspace.setDefaultProxyId(e.target.value)}
                    fullWidth
                >
                    {itemsFromSelections(lists.proxies)}
                </Select>
            </FormControl>
        </Stack>
    </Box>
})

const DisplaySettingsEditor = observer(() => {
    const feedback = useFeedback()
    const settings = useApicizeSettings()
    const fileOps = useFileOperations()
    const [canIncrease, setCanIncrease] = useState(settings.fontSize > 6)
    const [canDecrease, setCanDecrease] = useState(settings.fontSize < 48)

    let saveCtr = 0
    const checkSave = (ctr: number) => {
        // Only save if the save ctr hasn't changed in the specified interval
        setTimeout(async () => {
            if (saveCtr === ctr) {
                try {
                    saveCtr = 0
                    console.log('saving settings...')
                    await fileOps.saveSettings()
                } catch (e) {
                    feedback.toast(`Unable to save Settings - ${e}`, ToastSeverity.Error)
                }
            }
        }, 2000)
    }

    const increase = () => {
        if (settings.fontSize < 48) settings.fontSize = settings.fontSize + 1
        setCanIncrease(settings.fontSize < 48)
        checkSave(++saveCtr)
    }

    const decrease = () => {
        if (settings.fontSize > 6) settings.fontSize = settings.fontSize - 1
        setCanDecrease(settings.fontSize > 6)
        checkSave(++saveCtr)
    }

    const setScheme = (scheme: SupportedColorScheme) => {
        settings.colorScheme = scheme
        checkSave(++saveCtr)
    }

    return <Box>
        <EditorTitle icon={<SettingsIcon />} name='Settings - Display' />
        <Stack direction={'column'} spacing={3} marginTop='3em'>
            <Stack direction={'row'} spacing={'1em'}>
                <InputLabel id='text-size-label-id'>Text Size:</InputLabel>
                <IconButton onClick={() => increase()} aria-label="increase font size" disabled={!canIncrease}><AddIcon /></IconButton>
                <IconButton onClick={() => decrease()} aria-label="decrease font size" disabled={!canDecrease}><RemoveIcon /></IconButton>
                <Box>{settings.fontSize}</Box>
            </Stack>
            <Stack direction={'row'} spacing={'1em'} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'left' }}>
                <InputLabel id='color-mode-label-id'>Color Mode:</InputLabel>
                <Select
                    value={settings.colorScheme}
                    onChange={(event) => setScheme(event.target.value as SupportedColorScheme)}
                >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                </Select>
            </Stack>
        </Stack>
    </Box >
})

export const SettingsEditor = observer((props: { sx: SxProps }) => {
    const workspace = useWorkspace()

    const lastPanel = useRef('Parameters')
    const [panel, setPanel] = useState(lastPanel.current)

    if (workspace.active?.entityType !== EditableEntityType.Defaults || workspace.helpVisible) return null

    const handlePanelChanged = (_: React.SyntheticEvent, newValue: string) => {
        if (newValue) {
            lastPanel.current = newValue
            setPanel(newValue)
        }
    }

    return (
        <Stack direction='column' className='editor-panel' sx={{ ...props.sx, display: 'flex' }}>
            <Stack sx={{ height: '50vh', paddingBottom: '48px', flexBasis: 2 }}>
                <Box sx={{ display: "flex", bottom: 0 }}>
                    <ToggleButtonGroup
                        className='button-column'
                        orientation='vertical'
                        exclusive
                        onChange={handlePanelChanged}
                        value={panel}
                        sx={{ marginRight: '24px' }}
                        aria-label="text alignment">
                        <ToggleButton value="Parameters" title="Show Default Request Parameters" aria-label='show default parameters'><AltRouteIcon /></ToggleButton>
                        <ToggleButton value="Display" title="Show Display Setttings" aria-label='show display settings'><DisplaySettingsIcon /></ToggleButton>
                    </ToggleButtonGroup>
                    <Box className='panels' sx={{ flexGrow: 1 }}>
                        {panel === 'Parameters' ? <ParametersEditor />
                            : panel === 'Display' ? <DisplaySettingsEditor />
                                : null}
                    </Box>
                </Box>
            </Stack>
        </Stack>
    )
})
