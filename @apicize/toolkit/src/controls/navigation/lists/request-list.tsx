import { RequestSection } from "../sections/request-section"
import { useWorkspace } from "../../../contexts/workspace.context"
import { Box, Stack, SxProps } from "@mui/system"
import { SvgIcon, IconButton } from "@mui/material"
import { EditorTitle } from "../../editor-title"
import RequestIcon from '../../../icons/request-icon';
import CloseIcon from '@mui/icons-material/Close';
import { observer } from "mobx-react-lite"
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView"

export const RequestList = observer((props: {
    sx?: SxProps
}) => {
    const workspace = useWorkspace()

    workspace.nextHelpTopic = 'workspace/requests'

    return <Box sx={props.sx} className='editor'>
        <Stack direction='row' className='editor-panel-header' flexGrow={0}>
            <EditorTitle icon={<SvgIcon color='request'><RequestIcon /></SvgIcon>} name='Requests'>
                <IconButton color='primary' size='medium' aria-label='Close' title='Close' sx={{ marginLeft: '1rem' }} onClick={() => workspace.returnToNormal()}><CloseIcon fontSize='inherit' /></IconButton>
            </EditorTitle>
        </Stack>
        <Box className='editor-list'>
            <Box sx={{ width: 'fit-content' }}>
                <SimpleTreeView
                    expandedItems={workspace.expandedItems}
                    multiSelect={false}
                    onItemExpansionToggle={(_, id, isExpanded) => {
                        workspace.updateExpanded(id, isExpanded)
                    }}
                >
                    <RequestSection includeHeader={false} />
                </SimpleTreeView>
            </Box>
        </Box>
    </Box>
})