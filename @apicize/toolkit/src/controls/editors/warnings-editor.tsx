import { Stack, SxProps, Box, Alert, SvgIcon, Grid2 } from '@mui/material'
import { observer } from 'mobx-react-lite';
import { useWorkspace } from '../../contexts/workspace.context';
import { EditorTitle } from '../editor-title';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { EditableEntityType } from '../../models/workspace/editable-entity-type';
import { useWorkspaceSession } from '../../contexts/workspace-session.context';

export const WarningsEditor = observer((props: { sx?: SxProps }) => {
    const workspace = useWorkspace()
    const session = useWorkspaceSession()

    return <Stack direction={'column'} className='editor' sx={props.sx}>
        <Box className='editor-panel-header'>
            <EditorTitle icon={<SvgIcon color='warning'><WarningAmberIcon /></SvgIcon>} name='Workbook Warnings' />
        </Box>
        <Grid2 container direction={'column'} spacing={3} className='editor'>
            <Box className='editor-panel'>
                <Grid2 className='editor-content' >
                    {
                        workspace.warnings.hasEntries
                            ?
                            [...workspace.warnings.entries].map(e =>
                                <Alert key={e[0]} variant='outlined' severity='warning' onClose={() => workspace.deleteWorkspaceWarning(session.id, e[0])}>
                                    {e[1]}
                                </Alert>
                            )
                            : <Box>No Workspace Warnings</Box>
                    }
                </Grid2>
            </Box>
        </Grid2>
    </Stack>
})

