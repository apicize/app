import { Button, FormControl, FormControlLabel, FormLabel, Grid, InputLabel, MenuItem, Radio, RadioGroup, Select, TextField } from "@mui/material"
import { observer } from "mobx-react-lite"
import { useWorkspace } from "../../../contexts/workspace.context"
import { EditableAuthorization } from "../../../models/workspace/editable-authorization"
import { DEFAULT_SELECTION_ID, NO_SELECTION, NO_SELECTION_ID } from "../../../models/store"
import { ToastSeverity, useFeedback } from "../../../contexts/feedback.context"
import { Selection } from "@apicize/lib-typescript"
import { WorkspaceParameters } from "../../../models/workspace/workspace-parameters"
import { useState, useEffect } from "react"

export const AuthorizationOAuth2ClientEditor = observer(({ authorization, parameters: parametersProps }: { authorization: EditableAuthorization, parameters: WorkspaceParameters | null }) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()

    // Register dropdowns so they can be hidden on modal dialogs
    const [showCertificateMenu, setShowCertificateMenu] = useState(false)
    const [showProxyMenu, setShowProxyMenu] = useState(false)
    useEffect(() => {
        const disposer1 = feedback.registerModalBlocker(() => setShowCertificateMenu(false))
        const disposer2 = feedback.registerModalBlocker(() => setShowProxyMenu(false))
        return (() => {
            disposer1()
            disposer2()
        })
    })

    let credIndex = 0
    const itemsFromSelections = (selections: Selection[]) => {
        return selections.map(s => (
            <MenuItem key={`creds-${credIndex++}`} value={s.id}>{s.name}</MenuItem>
        ))
    }

    const retrieveClientToken = async () => {
        try {
            await workspace.getOAuth2ClientToken(authorization.id)
            feedback.toast('OAuth2 client token retrieved successfully', ToastSeverity.Success)
        } catch (e) {
            feedback.toastError(e)
        }
    }

    const clearToken = async () => {
        try {
            await workspace.clearToken(authorization.id)
            feedback.toast('OAuth token cleared from cache', ToastSeverity.Info)
        } catch (e) {
            feedback.toast(`${e}`, ToastSeverity.Error)
        }
    }

    const parameters = parametersProps
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
                value={authorization.accessTokenUrl}
                error={authorization.accessTokenUrlInvalid}
                helperText={authorization.accessTokenUrlInvalid ? 'Access Token URL is required' : ''}
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
                error={authorization.clientIdInvalid}
                helperText={authorization.clientIdInvalid ? 'Client ID is required' : ''}
                onChange={e => authorization.setClientId(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <TextField
                id='auth-oauth2-client-secret'
                label='Client Secret'
                aria-label='oauth client secret'
                value={authorization.clientSecret}
                onChange={e => authorization.setClientSecret(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <FormControl>
                <FormLabel id='lbl-auth-send-creds'>Send Crendentials In</FormLabel>
                <RadioGroup defaultValue='false' name='auth-send-creds' aria-labelledby="auth-send-creds" row value={authorization.sendCredentialsInBody} onChange={
                    e => authorization.setCredentialsInBody(e.target.value === 'true')
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
        <Grid container direction='row' spacing='2em'>
            <FormControl>
                <InputLabel id='cred-cert-label'>Certificate</InputLabel>
                <Select
                    labelId='cred-cert-label'
                    aria-label='client certificate to use on oauth token requests'
                    id='cred-cert'
                    label='Certificate'
                    value={authorization.selectedCertificate?.id ?? NO_SELECTION_ID}
                    sx={{ minWidth: '8em' }}
                    open={showCertificateMenu}
                    onClose={() => setShowCertificateMenu(false)}
                    onOpen={() => setShowCertificateMenu(true)}
                    onChange={(e) => {
                        const selectionId = e.target.value
                        authorization.setSelectedCertificate(
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
                    value={authorization.selectedProxy?.id ?? NO_SELECTION_ID}
                    sx={{ minWidth: '8em' }}
                    open={showProxyMenu}
                    onClose={() => setShowProxyMenu(false)}
                    onOpen={() => setShowProxyMenu(true)}
                    onChange={(e) => {
                        const selectionId = e.target.value
                        authorization.setSelectedProxy(
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
                color='info'
                aria-label='Retrieve client token'
                variant='outlined'
                // startIcon={<ClearIcon />}
                onClick={retrieveClientToken}>
                Retrieve Client Token
            </Button>
            <Button
                color='warning'
                aria-label='Clear cached oauth tokens'
                variant='outlined'
                sx={{ marginLeft: '1rem' }}
                // startIcon={<ClearIcon />}
                onClick={clearToken}>
                Clear Any Cached Token
            </Button>
        </Grid>
    </Grid>
        : null
})
