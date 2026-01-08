import { observer } from "mobx-react-lite";
import { useApicizeSettings } from "../../contexts/apicize-settings.context";
import { useWorkspace, WorkspaceMode } from "../../contexts/workspace.context";
import { ToggleButtonGroup, ToggleButton, SvgIcon } from "@mui/material";
import { SxProps } from "@mui/system";
import HelpIcon from '@mui/icons-material/Help'
import SettingsIcon from '@mui/icons-material/Settings'
import LogIcon from "../../icons/log-icon";

export const NavOpsMenu = observer(({ sx, orientation }: { sx?: SxProps, orientation: 'horizontal' | 'vertical' }) => {
    const workspace = useWorkspace()

    return <ToggleButtonGroup orientation={orientation} value={workspace.mode} sx={sx}>
        <ToggleButton size='large' title='Settings' value={WorkspaceMode.Settings} sx={{ border: 'none', padding: '8px' }} onClick={() => workspace.setMode(WorkspaceMode.Settings)}>
            <SettingsIcon />
        </ToggleButton>
        <ToggleButton size='large' title='Communication Logs' value={WorkspaceMode.Console} sx={{ border: 'none', padding: '8px' }} onClick={() => { workspace.setMode(WorkspaceMode.Console) }}>
            <SvgIcon><LogIcon /></SvgIcon>
        </ToggleButton>
        <ToggleButton size='large' title='Help' value={WorkspaceMode.Help} sx={{ border: 'none', padding: '8px' }} onClick={() => { workspace.showNextHelpTopic() }}>
            <SvgIcon><HelpIcon /></SvgIcon>
        </ToggleButton>
    </ToggleButtonGroup>
})