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
import { observer } from 'mobx-react-lite';
import { useWorkspace } from '../../contexts/workspace.context';
import { Selection } from '@apicize/lib-typescript';
import CloseIcon from '@mui/icons-material/Close';
import { EditorTitle } from '../editor-title';
import DefaultsIcon from '../../icons/defaults-icon';
import AltRouteIcon from '@mui/icons-material/AltRoute'
import DatasetIcon from '@mui/icons-material/Dataset';
import { useEffect, useState } from 'react';
import { useFeedback } from '../../contexts/feedback.context';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { WarningsEditor } from './warnings-editor';
import { EditableDefaults } from '../../models/workspace/editable-defaults';
import { WorkspaceParameters } from '../../models/workspace/workspace-parameters';

type DefaultsPanels = 'Parameters' | 'Warnings'

interface ParameterEditorProps {
    className?: string
    defaults: EditableDefaults
    parameters: WorkspaceParameters
    showDefaultScenarioMenu: boolean
    setShowDefaultScenarioMenu: (show: boolean) => void
    showDefaultAuthorizationMenu: boolean
    setShowDefaultAuthorizationMenu: (show: boolean) => void
    showDefaultCertificateMenu: boolean
    setShowDefaultCertificateMenu: (show: boolean) => void
    showDefaultProxyMenu: boolean
    setShowDefaultProxyMenu: (show: boolean) => void
    showDefaultDataMenu: boolean
    setShowDefaultDataMenu: (show: boolean) => void
}

const ParameterEditor = observer(({
    className,
    defaults,
    parameters,
    showDefaultScenarioMenu,
    setShowDefaultScenarioMenu,
    showDefaultAuthorizationMenu,
    setShowDefaultAuthorizationMenu,
    showDefaultCertificateMenu,
    setShowDefaultCertificateMenu,
    showDefaultProxyMenu,
    setShowDefaultProxyMenu,
    showDefaultDataMenu,
    setShowDefaultDataMenu,
}: ParameterEditorProps) => {
    let credIndex = 0
    const itemsFromSelections = (selections: Selection[]) => {
        return selections.map(s => (
            <MenuItem key={`creds-${credIndex++}`} value={s.id}>{s.name}</MenuItem>
        ))
    }

    return <Stack spacing={3} className={className}>
        <FormControl>
            <InputLabel id='scenario-label-id'>Scenarios</InputLabel>
            <Select
                labelId='scenario-label'
                aria-labelledby='scenario-label-id'
                id='cred-scenario'
                label='Scenario'
                value={defaults.selectedScenario.id}
                open={showDefaultScenarioMenu}
                onClose={() => setShowDefaultScenarioMenu(false)}
                onOpen={() => setShowDefaultScenarioMenu(true)}
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
                open={showDefaultAuthorizationMenu}
                onClose={() => setShowDefaultAuthorizationMenu(false)}
                onOpen={() => setShowDefaultAuthorizationMenu(true)}
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
                open={showDefaultCertificateMenu}
                onClose={() => setShowDefaultCertificateMenu(false)}
                onOpen={() => setShowDefaultCertificateMenu(true)}
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
                open={showDefaultProxyMenu}
                onClose={() => setShowDefaultProxyMenu(false)}
                onOpen={() => setShowDefaultProxyMenu(true)}
                onChange={(e) => defaults.setProxyId(e.target.value)}
                size='small'
                fullWidth
            >
                {itemsFromSelections(parameters.proxies)}
            </Select>
        </FormControl>
        <FormControl>
            <InputLabel id='data-label-id'>Data Set</InputLabel>
            <Select
                labelId='data-label'
                aria-labelledby='data-label-id'
                id='cred-data'
                label='Data Set'
                value={defaults.selectedData.id}
                open={showDefaultDataMenu}
                onClose={() => setShowDefaultDataMenu(false)}
                onOpen={() => setShowDefaultDataMenu(true)}
                onChange={(e) => defaults.setDataId(e.target.value)}
                fullWidth
                size='small'
            >
                {itemsFromSelections(parameters.data)}
            </Select>
        </FormControl>
    </Stack>
})

export const DefaultsEditor = observer(({ sx }: { sx: SxProps }) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    workspace.nextHelpTopic = 'workspace/defaults'

    const defaults = workspace.defaults
    const parameters = workspace.activeParameters

    const [panel, setPanel] = useState<DefaultsPanels>('Parameters')

    // Register dropdowns so they can be hidden on modal dialogs
    const [showDefaultScenarioMenu, setShowDefaultScenarioMenu] = useState(false)
    const [showDefaultAuthorizationMenu, setShowDefaultAuthorizationMenu] = useState(false)
    const [showDefaultCertificateMenu, setShowDefaultCertificateMenu] = useState(false)
    const [showDefaultProxyMenu, setShowDefaultProxyMenu] = useState(false)
    const [showDefaultDataMenu, setShowDefaultDataMenu] = useState(false)
    useEffect(() => {
        const disposers = [
            feedback.registerModalBlocker(() => setShowDefaultScenarioMenu(false)),
            feedback.registerModalBlocker(() => setShowDefaultAuthorizationMenu(false)),
            feedback.registerModalBlocker(() => setShowDefaultCertificateMenu(false)),
            feedback.registerModalBlocker(() => setShowDefaultProxyMenu(false)),
            feedback.registerModalBlocker(() => setShowDefaultDataMenu(false)),
        ]
        return (() => {
            for (const disposer of disposers) {
                disposer()
            }
        })
    })

    if (!parameters) {
        workspace.initializeParameterList()
        return null
    }

    const handlePanelChanged = (_: React.SyntheticEvent, newValue: DefaultsPanels) => {
        if (newValue) setPanel(newValue)
    }

    const hasWarnings = workspace.defaults.validationWarnings.hasEntries
    if (!hasWarnings && panel === 'Warnings') {
        setPanel('Parameters')
    }

    const parameterEditorProps = {
        defaults,
        parameters,
        showDefaultScenarioMenu,
        setShowDefaultScenarioMenu,
        showDefaultAuthorizationMenu,
        setShowDefaultAuthorizationMenu,
        showDefaultCertificateMenu,
        setShowDefaultCertificateMenu,
        showDefaultProxyMenu,
        setShowDefaultProxyMenu,
        showDefaultDataMenu,
        setShowDefaultDataMenu,
    }

    return <Box marginBottom='1.5em' sx={sx} className='editor'>
        <Stack direction='row' className='editor-panel-header'>
            <EditorTitle icon={<SvgIcon color='defaults'><DefaultsIcon /></SvgIcon>} name={`Workbook Defaults - ${panel}`}>
                <IconButton color='primary' size='medium' aria-label='Close' title='Close' sx={{ marginLeft: '1rem' }} onClick={() => workspace.returnToNormal()}><CloseIcon fontSize='inherit' color='error' /></IconButton>
            </EditorTitle>
        </Stack>

        {
            hasWarnings
                ? (
                    <Box className='editor-panel single-panel'>
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
                                        ? <ToggleButton hidden={true} value="Warnings" title="Request Warnings" aria-label='show warnings' size='small'><WarningAmberIcon color='warning' /></ToggleButton>
                                        : null
                                }

                            </ToggleButtonGroup>
                            <Box flexGrow={1} flexDirection='row' className='panels'>
                                {
                                    panel == 'Parameters'
                                        ? <ParameterEditor {...parameterEditorProps} />
                                        : panel == 'Warnings'
                                            ? <WarningsEditor warnings={workspace.defaults.validationWarnings} onDelete={(id) => defaults.deleteWarning(id)} />
                                            : <></>
                                }
                            </Box>
                        </Stack>
                    </Box>
                )
                : <Box className='editor-panel'>
                    <ParameterEditor className='editor-content editor single-panel' {...parameterEditorProps} />
                </Box>
        }
    </Box>
})
