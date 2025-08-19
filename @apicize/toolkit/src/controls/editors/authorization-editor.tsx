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

export const AuthorizationEditor = observer((props: { sx: SxProps }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    workspace.nextHelpTopic = 'workspace/authorizations'
    const activeSelection = workspace.activeSelection

    if (!activeSelection?.authorization) {
        return null
    }
    const authorization = activeSelection.authorization

    return (
        <Stack className='editor authorization' direction={'column'} sx={props.sx}>
            <Box className='editor-panel-header'>
                <EditorTitle
                    icon={<SvgIcon color='authorization'><AuthIcon /></SvgIcon>}
                    name={authorization.name}
                    diag={settings.showDiagnosticInfo ? authorization.id : undefined}
                />
            </Box>
            <Box className='editor-panel'>
                <Grid container className='editor-content' direction={'column'} spacing={3}>
                    <Grid>
                        <TextField
                            id='auth-name'
                            label='Name'
                            aria-label='authorization name'
                            size='small'
                            autoFocus={authorization.name === ''}
                            value={authorization.name}
                            error={authorization.nameInvalid}
                            helperText={authorization.nameInvalid ? 'Name is required' : ''}
                            onChange={e => authorization.setName(e.target.value)}
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
                                    onChange={e => authorization.setType(e.target.value as AuthorizationType)}
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
                                        ? <AuthorizationOAuth2ClientEditor authorization={authorization} parameters={workspace.activeParameters} />
                                        : authorization.type === AuthorizationType.OAuth2Pkce
                                            ? <AuthorizationOAuth2PkceEditor authorization={authorization} />
                                            : null
                        }
                    </Grid>
                </Grid>
            </Box>
        </Stack>
    )
})