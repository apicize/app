import Stack from '@mui/material/Stack'
import { SxProps } from '@mui/material/styles'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Box from '@mui/material/Box'
import { SupportedColorScheme } from '@mui/material/styles'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import SvgIcon from '@mui/material/SvgIcon'
import IconButton from '@mui/material/IconButton'
import FormControlLabel from '@mui/material/FormControlLabel'
import RadioGroup from '@mui/material/RadioGroup'
import Radio from '@mui/material/Radio'
import { observer } from 'mobx-react-lite';
import { useWorkspace } from '../../contexts/workspace.context';
import { useFileOperations } from '../../contexts/file-operations.context';
import { useFeedback, ToastSeverity } from '../../contexts/feedback.context';
import { EditorTitle } from '../editor-title';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useApicizeSettings } from '../../contexts/apicize-settings.context';
import { BorderedSection } from '../bordered-section';
import { toJS } from 'mobx';
import { useState, useEffect } from 'react'

export const SettingsEditor = observer(({ sx }: { sx?: SxProps }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const fileOps = useFileOperations()

    workspace.nextHelpTopic = 'settings'

    // Register dropdowns so they can be hidden on modal dialogs
    const [showColorSchemeMenu, setShowColorSchemeMenu] = useState(false)
    useEffect(() => {
        const disposer = feedback.registerModalBlocker(() => setShowColorSchemeMenu(false))
        return (() => {
            disposer()
        })
    })

    const resetToDefaults = async () => {
        if (await feedback.confirm({
            okButton: 'Yes',
            cancelButton: 'No',
            defaultToCancel: true,
            message: 'Are you sure you want to reset to default settings?'
        })) {
            fileOps.generateDefaultSettings()
                .then(newSettings => {
                    settings.update(newSettings)
                })
                .catch(e => feedback.toastError(e))
        }
    }

    const changeWorkbookDirectory = () => {
        fileOps.selectWorkbookDirectory()
            .then(d => {
                if (d && d !== settings.workbookDirectory) {
                    settings.setWorkbookDirectory(d)
                    feedback.toast(`Workbook directory changed to ${d}`, ToastSeverity.Info)
                }
            })
            .catch(e => feedback.toastError(e))
    }

    return <Stack direction={'column'} className='editor' sx={sx}>
        <Box className='editor-panel-header'>
            <EditorTitle icon={<SvgIcon><SettingsIcon /></SvgIcon>} name='Settings'>
                <IconButton color='primary' size='medium' aria-label='Close' title='Close' sx={{ marginLeft: '1rem' }} onClick={() => workspace.returnToNormal()}><CloseIcon fontSize='inherit' color='error' /></IconButton>
            </EditorTitle>
        </Box>
        <Box className='editor-panel' sx={{ paddingTop: '2em' }}>
            <Stack className='editor-content' spacing={4}>
                <BorderedSection sx={{ marginTop: '2em' }} title='Display Settings'>
                    <Stack direction='column' spacing={1}>
                        <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                            <InputLabel id='text-size-label-id' sx={{ width: '12em' }} >Main Text Size:</InputLabel>
                            <TextField type='number' slotProps={{ htmlInput: { min: 6, max: 72 } }}
                                size='small'
                                value={settings.fontSize}
                                title='Base font size of non-navigation content'
                                onChange={(e) => {
                                    settings.setFontSize(parseInt(e.target.value))
                                }} />
                        </Stack>
                        <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                            <InputLabel id='text-size-label-id' sx={{ width: '12em' }} >Navigation Text Size:</InputLabel>
                            <TextField type='number' slotProps={{ htmlInput: { min: 6, max: 72 } }}
                                size='small'
                                value={settings.navigationFontSize}
                                title='Base font size of navigation content'
                                onChange={(e) => {
                                    settings.setNavigationFontSize(parseInt(e.target.value))
                                }} />
                        </Stack>
                        <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                            <InputLabel id='color-mode-label-id' sx={{ width: '12em' }}>Color Mode:</InputLabel>
                            <Select
                                value={settings.colorScheme}
                                open={showColorSchemeMenu}
                                onClose={() => setShowColorSchemeMenu(false)}
                                onOpen={() => setShowColorSchemeMenu(true)}
                                onChange={(e) => settings.setColorScheme(e.target.value as SupportedColorScheme)}
                                size='small'
                            >
                                <MenuItem value="light">Light</MenuItem>
                                <MenuItem value="dark">Dark</MenuItem>
                            </Select>
                        </Stack>
                        <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                            <InputLabel id='hide-nav-menu-label-id' sx={{ width: '12em' }}>Alwaays Hide Nav Menu:</InputLabel>
                            <RadioGroup row value={settings.alwaysHideNavTree} onChange={(e) => settings.setAlwaysHideNavTree(e.target.value === 'true')}>
                                <FormControlLabel value={true} control={<Radio />} label='Yes' title='Always show minimized navigation toolbar' />
                                <FormControlLabel value={false} control={<Radio />} label='No' title='Show minimized navigation toolbar only when width threshold is reached' />
                            </RadioGroup>
                        </Stack>
                    </Stack>
                </BorderedSection>
                <BorderedSection title='Editor Settings'>
                    <Stack direction='column' spacing={1}>
                        <Stack direction={'column'}>
                            <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                                <InputLabel id='diag-indent-label-id' sx={{ width: '12em' }}>Indent Size:</InputLabel>
                                <TextField type='number' slotProps={{ htmlInput: { min: 6, max: 120 } }}
                                    size='small'
                                    value={settings.editorIndentSize}
                                    title='Set indent level for JSON, JavaScript and XML'
                                    onChange={(e) => settings.setEditorIndentSize(parseInt(e.target.value))} />
                            </Stack>
                            <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                                <InputLabel id='detect-indent-label-id' sx={{ width: '12em' }}>Detect Existing Indent:</InputLabel>
                                <RadioGroup row value={settings.editorDetectExistingIndent} onChange={(e) => settings.setEditorDetectExistingIndent(e.target.value === 'true')}>
                                    <FormControlLabel value={true} control={<Radio />} label='Yes' title='Use existing detection indent level' />
                                    <FormControlLabel value={false} control={<Radio />} label='No' title='Always use indent level configured in Settings' />
                                </RadioGroup>
                            </Stack>
                            <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                                <InputLabel id='check-js-label-id' sx={{ width: '12em' }}>Check JavaScript Syntax:</InputLabel>
                                <RadioGroup row value={settings.editorCheckJsSyntax} onChange={(e) => settings.setEditorCheckJsSyntax(e.target.value === 'true')}>
                                    <FormControlLabel value={true} control={<Radio />} label='Yes' title='Check JavaScript syntax when editing tests' />
                                    <FormControlLabel value={false} control={<Radio />} label='No' title='Ignore JavaScript syntax errors when editing tests' />
                                </RadioGroup>
                            </Stack>
                        </Stack>
                    </Stack>
                </BorderedSection>
                <BorderedSection title='OtherSettings'>
                    <Stack direction='column' spacing={1}>
                        <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                            <InputLabel id='directory-label-id' sx={{ width: '12em' }}>Workbook Directory:</InputLabel>
                            <InputLabel>{settings.workbookDirectory}</InputLabel>
                            <Button variant="outlined" onClick={changeWorkbookDirectory}>Set</Button>
                        </Stack>
                        <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                            <InputLabel id='pkce-port-label-id' sx={{ width: '12em' }}>PKCE Listener Port:</InputLabel>
                            <TextField type='number' slotProps={{ htmlInput: { min: 1, max: 65535 } }}
                                value={settings.pkceListenerPort}
                                size='small'
                                onChange={(e) => settings.setPkceListenerPort(parseInt(e.target.value))} />
                            <InputLabel>("0" to disable)</InputLabel>
                        </Stack>
                        <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                            <InputLabel id='show_diag-info-label-id' sx={{ width: '12em' }}>Show Diagnostic Info:</InputLabel>
                            <RadioGroup row value={settings.showDiagnosticInfo} onChange={(e) => settings.setShowDiagnosticInfo(e.target.value === 'true')}>
                                <FormControlLabel value={true} control={<Radio />} label='Yes' title='Show IDs and other diagnostic info' />
                                <FormControlLabel value={false} control={<Radio />} label='No' title='Do not display digagnostic info' />
                            </RadioGroup>
                        </Stack>
                        {(
                            settings.showDiagnosticInfo && settings.storage
                                ? <>
                                    <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                                        <InputLabel id='settings-filename-id' sx={{ width: '12em' }}>Settings File Name:</InputLabel>
                                        <InputLabel>{settings.storage.settingsFileName}</InputLabel>
                                    </Stack>
                                    <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                                        <InputLabel id='globals-filename-id' sx={{ width: '12em' }}>Globals File Name:</InputLabel>
                                        <InputLabel>{settings.storage.globalsFileName}</InputLabel>
                                    </Stack>
                                    <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                                        <InputLabel id='settings-directory-id' sx={{ width: '12em' }}>Settings Directory:</InputLabel>
                                        <InputLabel>{settings.storage.settingsDirectory}</InputLabel>
                                    </Stack>
                                    <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                                        <InputLabel id='home-directory-id' sx={{ width: '12em' }}>Home Directory:</InputLabel>
                                        <InputLabel>{settings.storage.homeDirectory}</InputLabel>
                                    </Stack>
                                    <Stack direction={'row'} spacing={'1em'} display='flex' alignItems='center' justifyContent='left'>
                                        <InputLabel id='home-envvar-id' sx={{ width: '12em' }}>HOME Env Variable:</InputLabel>
                                        <InputLabel>{settings.storage.homeEnvironmentVariable}</InputLabel>
                                    </Stack>
                                </>
                                : null

                        )}
                    </Stack>
                </BorderedSection>
                <Box>
                    <Button variant="outlined" aria-label="defaults" startIcon={<RestartAltIcon />} onClick={() => resetToDefaults()}>Reset to Defaults</Button>
                </Box>
            </Stack>
        </Box>
    </Stack >
})
