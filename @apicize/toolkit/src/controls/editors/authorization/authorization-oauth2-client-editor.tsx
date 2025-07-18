import { Button, FormControl, FormControlLabel, FormLabel, Grid, InputLabel, MenuItem, Radio, RadioGroup, Select, TextField } from "@mui/material"
import { observer } from "mobx-react-lite"
import { useWorkspace } from "../../../contexts/workspace.context"
import { EditableAuthorization } from "../../../models/workspace/editable-authorization"
import { DEFAULT_SELECTION_ID, NO_SELECTION, NO_SELECTION_ID } from "../../../models/store"
import { ToastSeverity, useFeedback } from "../../../contexts/feedback.context"
import { Selection } from "@apicize/lib-typescript"
import { WorkspaceParameters } from "../../../models/workspace/workspace-parameters"

export const AuthorizationOAuth2ClientEditor = observer((props: { authorization: EditableAuthorization, parameters: WorkspaceParameters | null }) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()

    let credIndex = 0
    const itemsFromSelections = (selections: Selection[]) => {
        return selections.map(s => (
            <MenuItem key={`creds-${credIndex++}`} value={s.id}>{s.name}</MenuItem>
        ))
    }

    const clearTokens = async () => {
        try {
            await workspace.clearTokens()
            feedback.toast('OAuth tokens cleared', ToastSeverity.Info)
        } catch (e) {
            feedback.toast(`${e}`, ToastSeverity.Error)
        }
    }

    const parameters = props.parameters
    if (!parameters) {
        workspace.initializeParameterList()
        return null
    }

    return parameters ? <Grid container direction={'column'} spacing={3} className='authorization-editor-subpanel'>
        <Grid>
            <TextField
                id='auth-oauth2-access-token-url'
                label='Access Token URL'
                aria-label='oauth access token url'
                value={props.authorization.accessTokenUrl}
                error={props.authorization.accessTokenUrlInvalid}
                helperText={props.authorization.accessTokenUrlInvalid ? 'Access Token URL is required' : ''}
                onChange={e => props.authorization.setAccessTokenUrl(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <TextField
                id='auth-oauth2-client-id'
                label='Client ID'
                aria-label='oauth client id'
                value={props.authorization.clientId}
                error={props.authorization.clientIdInvalid}
                helperText={props.authorization.clientIdInvalid ? 'Client ID is required' : ''}
                onChange={e => props.authorization.setClientId(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <TextField
                id='auth-oauth2-client-secret'
                label='Client Secret'
                aria-label='oauth client secret'
                value={props.authorization.clientSecret}
                onChange={e => props.authorization.setClientSecret(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <FormControl>
                <FormLabel id='lbl-auth-send-creds'>Send Crendentials In</FormLabel>
                <RadioGroup defaultValue='false' name='auth-send-creds' aria-labelledby="auth-send-creds" row value={props.authorization.sendCredentialsInBody} onChange={
                    e => props.authorization.setCredentialsInBody(e.target.value === 'true')
                }>
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
                value={props.authorization.scope}
                onChange={e => props.authorization.setScope(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <TextField
                id='auth-oauth2-aud'
                label='Audience'
                aria-label='oauth audience'
                value={props.authorization.audience}
                onChange={e => props.authorization.setAudience(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid container direction='row' spacing='2em'>
            <FormControl>
                <InputLabel id='cred-cert-label'>Certificate</InputLabel>
                <Select
                    labelId='cred-cert-label'
                    aria-label='client certificate to use on oauth token requests'
                    id='cred-cert'
                    label='Certificate'
                    value={props.authorization.selectedCertificate?.id ?? NO_SELECTION_ID}
                    sx={{ minWidth: '8em' }}
                    onChange={(e) => {
                        const selectionId = e.target.value
                        props.authorization.setSelectedCertificate(
                            selectionId === DEFAULT_SELECTION_ID
                                ? undefined
                                : selectionId == NO_SELECTION_ID
                                    ? NO_SELECTION
                                    : parameters.certificates.find(a => a.id === selectionId)
                        )
                    }}
                    size='small'
                    fullWidth
                >
                    {itemsFromSelections(parameters.certificates)}
                </Select>
            </FormControl>
            <FormControl>
                <InputLabel id='cred-proxy-label'>Proxy</InputLabel>
                <Select
                    labelId='cred-proxy-label'
                    aria-label='proxy to use on oauth token requests'
                    id='cred-proxy'
                    label='Proxy'
                    value={props.authorization.selectedProxy?.id ?? NO_SELECTION_ID}
                    sx={{ minWidth: '8em' }}
                    onChange={(e) => {
                        const selectionId = e.target.value
                        props.authorization.setSelectedProxy(
                            selectionId === DEFAULT_SELECTION_ID
                                ? undefined
                                : selectionId === NO_SELECTION_ID
                                    ? NO_SELECTION
                                    : parameters.proxies.find(a => a.id === selectionId)
                        )
                    }}
                    size='small'
                    fullWidth
                >
                    {itemsFromSelections(parameters.proxies)}
                </Select>
            </FormControl>
        </Grid>
        <Grid>
            <Button
                color='warning'
                aria-label='Clear cached oauth tokens'
                variant='outlined'
                // startIcon={<ClearIcon />}
                onClick={clearTokens}>
                Clear Any Cached Token
            </Button>
        </Grid>
    </Grid>
        : null
})
