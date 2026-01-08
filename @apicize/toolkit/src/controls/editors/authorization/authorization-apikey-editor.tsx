import { Grid, TextField } from "@mui/material"
import { observer } from "mobx-react-lite"
import { EditableAuthorization } from "../../../models/workspace/editable-authorization"

export const AuthorizationApiKeyEditor = observer(({ authorization }: { authorization: EditableAuthorization }) => {
    return <Grid container direction={'column'} spacing={3} className='authorization-editor-subpanel'>
        <Grid>
            <TextField
                id='auth-header'
                label="Header"
                aria-label='authorization header name'
                value={authorization.header}
                error={authorization.headerInvalid}
                helperText={authorization.headerInvalid ? 'Header is required' : ''}
                onChange={e => authorization.setHeader(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
        <Grid>
            <TextField
                id='auth-value'
                label="Value"
                aria-label='authorization header value'
                value={authorization.value}
                // error={authorization.valueInvalid}
                // helperText={authorization.valueInvalid ? 'Value is required' : ''}
                onChange={e => authorization.setValue(e.target.value)}
                size='small'
                fullWidth
            />
        </Grid>
    </Grid>
})
