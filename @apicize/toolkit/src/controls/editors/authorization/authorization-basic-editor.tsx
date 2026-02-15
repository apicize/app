import { Grid, TextField } from "@mui/material"
import { observer } from "mobx-react-lite"
import { EditableAuthorization } from "../../../models/workspace/editable-authorization"
import { PasswordTextField } from "../../password-text-field"

export const AuthorizationBasicEditor = observer(({ authorization }: { authorization: EditableAuthorization }) => {
    return <Grid container direction={'column'} spacing={3} className='authorization-editor-subpanel'>
        <Grid>
            <TextField
                id='auth-username'
                label="Username"
                aria-label='authorization user name'
                value={authorization.username}
                error={!!authorization.usernameError}
                helperText={authorization.usernameError ?? ''}
                onChange={e => authorization.setUsername(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <PasswordTextField
                id='auth-password'
                label="Password"
                aria-label='authorization password'
                value={authorization.password}
                onChange={e => authorization.setPassword(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
    </Grid>
})
