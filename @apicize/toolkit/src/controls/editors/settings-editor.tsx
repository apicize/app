import Stack from '@mui/material/Stack'
import { SxProps } from '@mui/material/styles'
import Box from '@mui/material/Box'
import SvgIcon from '@mui/material/SvgIcon'
import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { SettingsPanel, useWorkspace } from '../../contexts/workspace.context'
import { useFeedback } from '../../contexts/feedback.context'
import { EditorTitle } from '../editor-title'
import SettingsIcon from '@mui/icons-material/Settings'
import AltRouteIcon from '@mui/icons-material/AltRoute'
import CloseIcon from '@mui/icons-material/Close'
import KeyIcon from '@mui/icons-material/Key'
import TuneIcon from '@mui/icons-material/Tune'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { IconButton, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { DefaultsEditor } from './settings/defaults-editor'
import { AppSettingsEditor } from './settings/app-settings-editor'
import { WarningsEditor } from './warnings-editor'
import { SettingsLockEditor } from './settings/lock-editor'
import { ParameterLockStatus } from '@apicize/lib-typescript'

export const SettingsEditor = observer(({ sx }: { sx?: SxProps }) => {

    const workspace = useWorkspace()
    const feedback = useFeedback()

    const selectedPanel = workspace.settingsPanel

    const hasWarnings = workspace.defaults.validationWarnings.hasEntries
    useEffect(() => {
        if (!hasWarnings && selectedPanel === 'Warnings') {
            workspace.changeSettingsPanel('Workspace Defaults')
        }
    }, [hasWarnings, selectedPanel, workspace])

    const handlePanelChanged = (_: React.SyntheticEvent, newValue: SettingsPanel) => {
        if (newValue) {
            workspace.changeSettingsPanel(newValue)
        }
    }

    const lockStatusesError = [ParameterLockStatus.LockedInvalidEnvVar, ParameterLockStatus.LockedInvalidPassword]
    const lockColor = (lockStatusesError.includes(workspace.vaultLockStatus) || lockStatusesError.includes(workspace.privateLockStatus))
        ? 'error'
        : (ParameterLockStatus.Locked === workspace.vaultLockStatus || ParameterLockStatus.Locked === workspace.privateLockStatus)
            ? 'warning'
            : 'inherit'

    return <Box className='editor request single-panel' sx={sx}>
        <Stack direction='row' className='editor-panel-header'>
            <EditorTitle
                icon={<SvgIcon><SettingsIcon /></SvgIcon>}
                name={`Settings - ${selectedPanel}`}
            >
                <IconButton color='primary' size='medium' aria-label='Close' title='Close' onClick={() => workspace.returnToNormal()}><CloseIcon fontSize='inherit' color='error' /></IconButton>
            </EditorTitle>
        </Stack>
        <Box className='editor-panel'>
            <Stack direction='row' flexGrow={1} className='editor-content' overflow='hidden'>
                <ToggleButtonGroup
                    className='button-column'
                    orientation='vertical'
                    exclusive
                    onChange={handlePanelChanged}
                    value={selectedPanel}
                    sx={{ marginRight: '12px', zIndex: 100 }}
                    aria-label="text alignment">
                    <ToggleButton value="Workspace Defaults" title="Workspace Defaults" aria-label='workspace defaults' size='small'><AltRouteIcon /></ToggleButton>
                    <ToggleButton value="Application" title="Application Settings" aria-label='app settings' size='small'><TuneIcon /></ToggleButton>
                    <ToggleButton value="Locks" title="Lock Vault and Private Files" aria-label='lock' size='small'><KeyIcon color={lockColor} /></ToggleButton>
                    {
                        hasWarnings
                            ? <ToggleButton hidden={true} value="Warnings" title="Request Warnings" aria-label='show warnings' size='small'><WarningAmberIcon color='warning' /></ToggleButton>
                            : null
                    }
                </ToggleButtonGroup>


                <Box className='settings-panel'>
                    {selectedPanel === 'Workspace Defaults' ? <DefaultsEditor />
                        : selectedPanel === 'Application' ? <AppSettingsEditor />
                            : selectedPanel === 'Locks' ? <SettingsLockEditor />
                                : selectedPanel === 'Warnings' ? <WarningsEditor warnings={workspace.defaults.validationWarnings} onDelete={(id) => {
                                    workspace.defaults.deleteWarning(id).catch(err => feedback.toastError(err))
                                }} />
                                    : <></>}
                </Box>
            </Stack>
        </Box>
    </Box>
})
