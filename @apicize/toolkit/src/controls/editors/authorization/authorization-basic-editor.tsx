import { Grid, TextField } from "@mui/material"
import { observer } from "mobx-react-lite"
import { EditableAuthorization } from "../../../models/workspace/editable-authorization"

export const AuthorizationBasicEditor = observer(({ authorization }: { authorization: EditableAuthorization }) => {
    return <Grid container direction={'column'} spacing={3} className='authorization-editor-subpanel'>
        <Grid>
            <TextField
                id='auth-username'
                label="Username"
                aria-label='authorization user name'
                value={authorization.username}
                error={authorization.usernameInvalid}
                helperText={authorization.usernameInvalid ? 'Username is required' : ''}
                onChange={e => authorization.setUsername(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <TextField
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
