import { observer } from "mobx-react-lite";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import BiotechIcon from '@mui/icons-material/Biotech';
import BuildIcon from '@mui/icons-material/Build';
import { RequestScriptMode, useWorkspace } from "../../../contexts/workspace.context";

/**
 * Toggle between editing a request's test (after execution) and setup (before execution) scripts
 */
export const RequestScriptModeToggle = observer(() => {
    const workspace = useWorkspace()
    return <ToggleButtonGroup aria-label='test or setup' size='small' value={workspace.requestScriptMode} exclusive onChange={(_, v) => workspace.changeRequestScriptMode(v as RequestScriptMode)}>
        <ToggleButton title='Test (After Execution)' color='primary' aria-label='test' value={RequestScriptMode.test} sx={{ '&:not(.Mui-selected):not(.Mui-disabled)': { color: 'primary.main' } }}><BiotechIcon /></ToggleButton>
        <ToggleButton title='Setup (Before Execution)' color='primary' aria-label='setup' value={RequestScriptMode.setup} sx={{ '&:not(.Mui-selected):not(.Mui-disabled)': { color: 'primary.main' } }}><BuildIcon /></ToggleButton>
    </ToggleButtonGroup>
})
