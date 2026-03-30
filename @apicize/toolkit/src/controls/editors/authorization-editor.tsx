import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Stack from '@mui/material/Stack'
import { SxProps } from '@mui/material/styles'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import SvgIcon from '@mui/material/SvgIcon'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import { AuthorizationType } from '@apicize/lib-typescript';
import { EditorTitle } from '../editor-title';
import { observer } from 'mobx-react-lite';
import { AuthorizationApiKeyEditor } from './authorization/authorization-apikey-editor';
import { AuthorizationBasicEditor } from './authorization/authorization-basic-editor';
import { AuthorizationOAuth2ClientEditor } from './authorization/authorization-oauth2-client-editor';
import { AuthorizationOAuth2PkceEditor } from './authorization/authorization-oauth2-pkce-editor';
import AuthIcon from '../../icons/auth-icon';
import { useWorkspace } from '../../contexts/workspace.context';
import { useApicizeSettings } from '../../contexts/apicize-settings.context';
import { EditableAuthorization } from '../../models/workspace/editable-authorization'
import { useFeedback } from '../../contexts/feedback.context'
import { useState, useEffect } from 'react'
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SettingsIcon from '@mui/icons-material/Settings';
import { WarningsEditor } from './warnings-editor';
import { EncyrptedViewer } from '../viewers/encrypted-viewer'

type AuthorizationPanels = 'Settings' | 'Warnings'

export const AuthorizationEditor = observer(({ authorization, sx }: { authorization: EditableAuthorization, sx: SxProps }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const feedback = useFeedback()

    workspace.nextHelpTopic = 'workspace/authorizations'

    const [panel, setPanel] = useState<AuthorizationPanels>('Settings')

    // Register dropdowns so they can be hidden on modal dialogs
    const [showAuthorizationTypeMenu, setShowAuthorizationTypeMenu] = useState(false)
    useEffect(() => {
        const disposer = feedback.registerModalBlocker(() => setShowAuthorizationTypeMenu(false))
        return (() => {
            disposer()
        })
    })

    const hasWarnings = authorization.validationWarnings.hasEntries
    if (!hasWarnings && panel === 'Warnings') {
        setPanel('Settings')
    }

    const handlePanelChanged = (_: React.SyntheticEvent, newValue: AuthorizationPanels) => {
        if (newValue) setPanel(newValue)
    }

    const settingsContent = (className?: string) => (
        <Grid container className={className} direction={'column'} spacing={3}>
            <Grid>
                <TextField
                    id='auth-name'
                    label='Name'
                    aria-label='authorization name'
                    size='small'
                    autoFocus={authorization.name === ''}
                    value={authorization.name}
                    error={!!authorization.nameError}
                    helperText={authorization.nameError ?? ''}
                    onChange={e => {
                        authorization.setName(e.target.value).catch(err => feedback.toastError(err))
                    }}
                    fullWidth
                />
            </Grid>
            <Grid>
                <Grid container direction={'row'} spacing={'2em'}>
                    <FormControl>
                        <InputLabel id='auth-type-label-id'>Type</InputLabel>
                        <Select
                            labelId='auth-type-label-id'
                            aria-label='authorization type'
                            id='auth-type'
                            value={authorization.type}
                            label='Type'
                            size='small'
                            open={showAuthorizationTypeMenu}
                            onClose={() => setShowAuthorizationTypeMenu(false)}
                            onOpen={() => setShowAuthorizationTypeMenu(true)}
                            onChange={e => {
                                if (e.target.value) {
                                    authorization.setType(e.target.value as AuthorizationType).catch(err => feedback.toastError(err))
                                }
                            }}
                        >
                            <MenuItem value={AuthorizationType.Basic}>Basic Authentication</MenuItem>
                            <MenuItem value={AuthorizationType.ApiKey}>API Key Authentication</MenuItem>
                            <MenuItem value={AuthorizationType.OAuth2Client}>OAuth2 Client Flow</MenuItem>
                            <MenuItem value={AuthorizationType.OAuth2Pkce}>OAuth2 PKCE Flow</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
            <Grid marginTop='24px'>
                {
                    authorization.type === AuthorizationType.ApiKey ?
                        <AuthorizationApiKeyEditor authorization={authorization} />
                        : authorization.type === AuthorizationType.Basic
                            ? <AuthorizationBasicEditor authorization={authorization} />
                            : authorization.type === AuthorizationType.OAuth2Client
                                ? <AuthorizationOAuth2ClientEditor authorization={authorization} />
                                : authorization.type === AuthorizationType.OAuth2Pkce
                                    ? <AuthorizationOAuth2PkceEditor authorization={authorization} />
                                    : null
                }
            </Grid>
        </Grid>
    )

    return (
        <Stack className='editor authorization' direction={'column'} sx={sx}>
            <Box className='editor-panel-header'>
                <EditorTitle
                    icon={<SvgIcon color='authorization'><AuthIcon /></SvgIcon>}
                    name={authorization.name}
                    diag={settings.showDiagnosticInfo ? authorization.id : undefined}
                />
            </Box>
            {
                authorization.encrypted
                    ? <Box className='panels single-panel'><EncyrptedViewer id={authorization.id} entityType={authorization.entityType} /></Box>
                    : hasWarnings
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
                                        <ToggleButton value="Settings" title="Show Authorization Settings" aria-label='show settings' size='small'><SettingsIcon /></ToggleButton>
                                        <ToggleButton value="Warnings" title="Authorization Warnings" aria-label='show warnings' size='small'><WarningAmberIcon color='warning' /></ToggleButton>
                                    </ToggleButtonGroup>
                                    <Box flexGrow={1} flexDirection='row' className='panels'>
                                        {
                                            panel == 'Settings'
                                                ? settingsContent()
                                                : panel == 'Warnings'
                                                    ? <WarningsEditor warnings={authorization.validationWarnings} onDelete={(id) => {
                                                        authorization.deleteWarning(id).catch(err => feedback.toastError(err))
                                                    }} />
                                                    : <></>
                                        }
                                    </Box>
                                </Stack>
                            </Box>
                        )
                        : <Box className='editor-panel'>
                            {settingsContent('editor-content')}
                        </Box>
            }
        </Stack>
    )
})
