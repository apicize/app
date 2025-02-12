import { Stack, FormControl, InputLabel, MenuItem, Select, SxProps, Box, SvgIcon, IconButton } from '@mui/material'
import { observer } from 'mobx-react-lite';
import { useWorkspace, WorkspaceMode } from '../../contexts/workspace.context';
import { EntitySelection } from '../../models/workspace/entity-selection';
import CloseIcon from '@mui/icons-material/Close';
import { EditorTitle } from '../editor-title';
import DefaultsIcon from '../../icons/defaults-icon';

export const DefaultsEditor = observer((props: {
    sx: SxProps
}) => {
    const workspace = useWorkspace()
    const defaults = workspace.defaults

    workspace.nextHelpTopic = 'workspace/defaults'

    let credIndex = 0
    const itemsFromSelections = (selections: EntitySelection[]) => {
        return selections.map(s => (
            <MenuItem key={`creds-${credIndex++}`} value={s.id}>{s.name}</MenuItem>
        ))
    }

    const lists = workspace.getDefaultParameterLists()

    return <Stack direction={'column'} className='editor' sx={props.sx}>
        <Box className='editor-panel-header'>
            <EditorTitle icon={<SvgIcon color='defaults'><DefaultsIcon /></SvgIcon>} name='Workbook Defaults' />
            <IconButton color='primary' size='medium' aria-label='Close' title='Close' sx={{ marginLeft: '1rem' }} onClick={() => workspace.returnToNormal()}><CloseIcon fontSize='inherit' /></IconButton>
        </Box>
        <Stack spacing={3}>
            <FormControl>
                <InputLabel id='scenario-label-id'>Scenarios</InputLabel>
                <Select
                    labelId='scenario-label'
                    aria-labelledby='scenario-label-id'
                    id='cred-scenario'
                    label='Scenario'
                    value={defaults.selectedScenario.id}
                    onChange={(e) => workspace.setDefaultScenarioId(e.target.value)}
                    size='small'
                    fullWidth
                >
                    {itemsFromSelections(lists.scenarios)}
                </Select>
            </FormControl>
            <FormControl>
                <InputLabel id='auth-label-id'>Authorization</InputLabel>
                <Select
                    labelId='auth-label'
                    aria-labelledby='auth-label-id'
                    id='cred-auth'
                    label='Authorization'
                    value={defaults.selectedAuthorization.id}
                    onChange={(e) => workspace.setDefaultAuthorizationId(e.target.value)}
                    size='small'
                    fullWidth
                >
                    {itemsFromSelections(lists.authorizations)}
                </Select>
            </FormControl>
            <FormControl>
                <InputLabel id='cert-label-id'>Certificate</InputLabel>
                <Select
                    labelId='cert-label'
                    aria-labelledby='cert-label-id'
                    id='cred-cert'
                    label='Certificate'
                    value={defaults.selectedCertificate.id}
                    onChange={(e) => workspace.setDefaultCertificateId(e.target.value)}
                    size='small'
                    fullWidth
                >
                    {itemsFromSelections(lists.certificates)}
                </Select>
            </FormControl>
            <FormControl>
                <InputLabel id='proxy-label-id'>Proxy</InputLabel>
                <Select
                    labelId='proxy-label'
                    aria-labelledby='proxy-label-id'
                    id='cred-proxy'
                    label='Proxy'
                    value={defaults.selectedProxy.id}
                    onChange={(e) => workspace.setDefaultProxyId(e.target.value)}
                    size='small'
                    fullWidth
                >
                    {itemsFromSelections(lists.proxies)}
                </Select>
            </FormControl>
        </Stack>
    </Stack>
})
