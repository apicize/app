import { Box, Stack, SxProps } from "@mui/system"
import { SvgIcon, IconButton } from "@mui/material"
import { EditorTitle } from "../../editor-title"
import CloseIcon from '@mui/icons-material/Close';
import CertificateIcon from "../../../icons/certificate-icon";
import { CertificateSection } from "../sections/certificate-section";
import { observer } from "mobx-react-lite";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { useWorkspace } from "../../../contexts/workspace.context";

export const CertificateList = observer(({
    sx
}: {
    sx?: SxProps
}) => {
    const workspace = useWorkspace()
    workspace.nextHelpTopic = 'workspace/certificates'

    return <Box sx={sx} className='editor'>
        <Stack direction='row' className='editor-panel-header' flexGrow={0}>
            <EditorTitle icon={<SvgIcon color='certificate'><CertificateIcon /></SvgIcon>} name='Certificates'>
                <IconButton color='primary' size='medium' aria-label='Close' title='Close' sx={{ marginLeft: '1rem' }} onClick={() => workspace.returnToNormal()}><CloseIcon fontSize='inherit' color='error' /></IconButton>
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
                    <CertificateSection includeHeader={false} />
                </SimpleTreeView>
            </Box>
        </Box>
    </Box>
})