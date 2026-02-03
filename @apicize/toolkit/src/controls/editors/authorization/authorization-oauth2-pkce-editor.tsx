import { Alert, Button, FormControl, FormControlLabel, FormLabel, Grid, Radio, RadioGroup, TextField } from "@mui/material"
import { observer } from "mobx-react-lite"
import { useWorkspace } from "../../../contexts/workspace.context"
import { EditableAuthorization } from "../../../models/workspace/editable-authorization"
import { ToastSeverity, useFeedback } from "../../../contexts/feedback.context"

export const AuthorizationOAuth2PkceEditor = observer(({ authorization }: { authorization: EditableAuthorization }) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()

    const clearToken = async () => {
        try {
            await workspace.clearToken(authorization.id)
            feedback.toast('OAuth token cleared from cache', ToastSeverity.Info)
        } catch (e) {
            feedback.toast(`${e}`, ToastSeverity.Error)
        }
    }
    return <Grid container direction={'column'} spacing={3} className='authorization-editor-subpanel'>
        <Grid>
            <Alert severity="warning">PKCE authorization requires user interaction and will not available from the Apicize CLI test runner.</Alert>
        </Grid>
        <Grid>
            <TextField
                id='auth-oauth2-auth-url'
                label='Authorization URL'
                aria-label='oauth auth url'
                value={authorization.authorizeUrl}
                error={!!authorization.authorizationUrlError}
                helperText={authorization.accessTokenUrlError ?? ''}
                onChange={e => authorization.setUrl(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <TextField
                id='auth-oauth2-access-token-url'
                label='Access Token URL'
                aria-label='oauth access token url'
                value={authorization.accessTokenUrl}
                error={!!authorization.accessTokenUrlError}
                helperText={authorization.accessTokenUrlError ?? ''}
                onChange={e => authorization.setAccessTokenUrl(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <TextField
                id='auth-oauth2-client-id'
                label='Client ID'
                aria-label='oauth client id'
                value={authorization.clientId}
                error={!!authorization.clientIdError}
                helperText={authorization.clientIdError ?? ''}
                onChange={e => authorization.setClientId(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <FormControl>
                <FormLabel id='lbl-auth-send-creds'>Send Crendentials In</FormLabel>
                <RadioGroup defaultValue='false' name='auth-send-creds' aria-labelledby="auth-send-creds" value={authorization.sendCredentialsInBody} row onChange={e => authorization.setSendCredentialsInBody(e.target.value === 'true')}>
                    <FormControlLabel value={false} control={<Radio />} label='Basic Authorization' />
                    <FormControlLabel value={true} control={<Radio />} label='Body' />
                </RadioGroup>
            </FormControl>
        </Grid>
        <Grid>
            <TextField
                id='auth-oauth2-scope'
                label='Scope'
                aria-label='oauth scope'
                value={authorization.scope}
                onChange={e => authorization.setScope(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <TextField
                id='auth-oauth2-aud'
                label='Audience'
                aria-label='oauth audience'
                value={authorization.audience}
                onChange={e => authorization.setAudience(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid container spacing={2}>
            <Button variant='outlined'
                aria-label='Retrieve  access token'
                onClick={() => {
                    workspace.initializePkce(authorization.id)
                }}>Retrieve PKCE Token</Button>
            <Button
                color='warning'
                aria-label='Clear cached oauth tokens'
                variant='outlined'
                // startIcon={<ClearIcon />}
                onClick={clearToken}>
                Clear Any Cached Token
            </Button>
        </Grid>
    </Grid >
})
