import { Grid, TextField } from "@mui/material"
import { observer } from "mobx-react-lite"
import { EditableAuthorization } from "../../../models/workspace/editable-authorization"
import { PasswordTextField } from "../../password-text-field"
import { useFeedback } from "../../../contexts/feedback.context"

export const AuthorizationApiKeyEditor = observer(({ authorization }: { authorization: EditableAuthorization }) => {
    const feedback = useFeedback()
    return <Grid container direction={'column'} spacing={3} className='authorization-editor-subpanel'>
        <Grid>
            <TextField
                id='auth-header'
                label="Header"
                aria-label='authorization header name'
                value={authorization.header}
                error={!!authorization.headerError}
                helperText={authorization.headerError ?? ''}
                onChange={e => {
                    authorization.setHeader(e.target.value).catch(err => feedback.toastError(err))
                }}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <PasswordTextField
                id='auth-value'
                label="Value"
                aria-label='authorization header value'
                value={authorization.value}
                // error={authorization.valueInvalid}
                // helperText={authorization.valueInvalid ? 'Value is required' : ''}
                onChange={e => {
                    authorization.setValue(e.target.value).catch(err => feedback.toastError(err))
                }}
                size='small'
                fullWidth
            />
        </Grid>
    </Grid>
})
