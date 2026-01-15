import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { SxProps } from '@mui/material/styles'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import AirlineStopsIcon from '@mui/icons-material/AirlineStops';
import { EditorTitle } from '../editor-title';
import { observer } from 'mobx-react-lite';
import { useWorkspace } from '../../contexts/workspace.context';
import { useApicizeSettings } from '../../contexts/apicize-settings.context';
import { EditableProxy } from '../../models/workspace/editable-proxy'

export const ProxyEditor = observer(({ proxy, sx }: { proxy: EditableProxy, sx?: SxProps }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()

    workspace.nextHelpTopic = 'proxies'

    return (
        <Stack direction='column' className='editor proxy' sx={sx}>
            <Box className='editor-panel-header'>
                <EditorTitle
                    icon={<AirlineStopsIcon color='proxy' />}
                    name={proxy.name.length > 0 ? proxy.name : '(Unnamed)'}
                    diag={settings.showDiagnosticInfo ? proxy.id : undefined}
                />
            </Box>
            <Box className='editor-panel'>
                <Grid container className='editor-content' direction={'column'} spacing={3}>
                    <Grid>
                        <TextField
                            id='proxy-name'
                            label='Name'
                            aria-label='proxy name'
                            size='small'
                            value={proxy.name}
                            autoFocus={proxy.name === ''}
                            onChange={e => {
                                proxy.setName(e.target.value)
                            }}
                            error={proxy.nameInvalid}
                            helperText={proxy.nameInvalid ? 'Proxy name is required' : ''}
                            fullWidth
                        />
                    </Grid>
                    <Grid>
                        <TextField
                            id='proxy-url'
                            label='URL'
                            aria-label='proxy url'
                            size='small'
                            value={proxy.url}
                            onChange={e => {
                                proxy.setUrl(e.target.value)
                            }}
                            error={proxy.urlInvalid}
                            helperText={proxy.urlInvalid ? 'URL must include http/https/socks5 protocol prefix and address' : ''}
                            fullWidth
                        />
                    </Grid>
                </Grid>
            </Box>
        </Stack >
    )
})
