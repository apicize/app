import { Box, Stack, SxProps } from "@mui/system"
import { SvgIcon, IconButton } from "@mui/material"
import { EditorTitle } from "../../editor-title"
import CloseIcon from '@mui/icons-material/Close';
import AirlineStopsIcon from '@mui/icons-material/AirlineStops';
import { ProxySection } from "../sections/proxy-section";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { observer } from "mobx-react-lite";
import { useWorkspace } from "../../../contexts/workspace.context";

export const ProxyList = observer(({
    sx
}: {
    sx?: SxProps
}) => {
    const workspace = useWorkspace()
    workspace.nextHelpTopic = 'workspace/proxies'

    return <Box sx={sx} className='editor'>
        <Stack direction='row' className='editor-panel-header' flexGrow={0}>
            <EditorTitle icon={<SvgIcon color='proxy'><AirlineStopsIcon /></SvgIcon>} name='Proxies'>
                <IconButton color='primary' size='medium' aria-label='Close' title='Close' sx={{ marginLeft: '1rem' }} onClick={() => workspace.returnToNormal()}><CloseIcon fontSize='inherit' /></IconButton>
            </EditorTitle>
        </Stack>
        <Box className='editor-list'>
            <Box sx={{ width: 'fit-content' }}>
                <SimpleTreeView
                    expandedItems={workspace.expandedItems}
                    sx={sx}
                    multiSelect={false}
                    onItemExpansionToggle={(_, id, isExpanded) => {
                        workspace.updateExpanded(id, isExpanded)
                    }}
                >
                    <ProxySection includeHeader={false} />
                </SimpleTreeView>
            </Box>
        </Box>
    </Box>
})