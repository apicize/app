import { Persistence } from "@apicize/lib-typescript"
import { ListItemIcon, ListItemText, Menu, MenuItem, SvgIcon, useTheme } from "@mui/material"
import ScenarioIcon from "../../../icons/scenario-icon"
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import { EntityType } from "../../../models/workspace/entity-type"
import { useWorkspace, WorkspaceMode } from "../../../contexts/workspace.context"
import { useState } from "react"
import { ParameterSection } from "./parameter-section"
import { MenuPosition } from "../../../models/menu-position"
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { useFeedback } from "../../../contexts/feedback.context"
import { observer } from "mobx-react-lite"
import { IndexedEntityPosition } from "../../../models/workspace/indexed-entity-position"
import { useApicizeSettings } from "../../../contexts/apicize-settings.context"
import { runInAction } from "mobx"

export const ScenarioSection = observer(({ includeHeader }: { includeHeader: boolean }) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const theme = useTheme()
    const settings = useApicizeSettings()

    const [scenarioMenu, setScenarioMenu] = useState<MenuPosition | undefined>(undefined)

    const closeScenarioMenu = () => {
        setScenarioMenu(undefined)
    }

    const selectScenario = (id: string) => {
        workspace.changeActive(EntityType.Scenario, id)
    }

    const handleAddScenario = (relativeToId: string, relativePosition: IndexedEntityPosition, cloneFromId: string | null) => {
        closeScenarioMenu()
        workspace.addScenario(relativeToId, relativePosition, cloneFromId)
    }

    const handleSelectHeader = (headerId: string, helpTopic?: string) => {
        // closeAllMenus()
        if (helpTopic) {
            workspace.showHelp(helpTopic, headerId)
        }
    }

    const handleMoveScenario = (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => {
        selectScenario(id)
        workspace.moveScenario(id, relativeToId, relativePosition)
    }

    const handleDupeScenario = () => {
        closeScenarioMenu()
        const id = scenarioMenu?.id
        if (!id) return
        workspace.addScenario(id, IndexedEntityPosition.After, id)
    }

    const showScenarioMenu = (event: React.MouseEvent, persistence: Persistence, id: string) => {
        setScenarioMenu(
            {
                id,
                type: EntityType.Scenario,
                mouseX: event.clientX - 1,
                mouseY: event.clientY - 6,
                persistence,
            }
        )
    }

    const handleDeleteScenario = () => {
        closeScenarioMenu()
        const id = scenarioMenu?.id
        if (!id) return
        feedback.confirm({
            title: 'Delete Scenario',
            message: `Are you are you sure you want to delete ${workspace.getNavigationName(id)}?`,
            okButton: 'Yes',
            cancelButton: 'No',
            defaultToCancel: true
        }).then((result) => {
            if (result) {
                workspace.deleteScenario(id)
            }
        })
    }

    function ScenarioMenu() {
        return scenarioMenu
            ? <Menu
                id='scenario-menu'
                open={scenarioMenu !== undefined}
                onClose={closeScenarioMenu}
                sx={{ fontSize: settings.navigationFontSize }}
                anchorReference='anchorPosition'
                anchorPosition={{
                    top: scenarioMenu?.mouseY ?? 0,
                    left: scenarioMenu?.mouseX ?? 0
                }}
            >
                <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(_) => handleAddScenario(scenarioMenu.id, IndexedEntityPosition.After, null)}>
                    <ListItemIcon>
                        <SvgIcon fontSize='small' color='scenario'><ScenarioIcon /></SvgIcon>
                    </ListItemIcon>
                    <ListItemText disableTypography>Add Scenario</ListItemText>
                </MenuItem>
                <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(e) => handleDupeScenario()}>
                    <ListItemIcon>
                        <SvgIcon fontSize='small' sx={{ color: theme.palette.scenario.light }}><ContentCopyOutlinedIcon /></SvgIcon>
                    </ListItemIcon>
                    <ListItemText disableTypography>Duplicate Scenario</ListItemText>
                </MenuItem>
                <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(e) => handleDeleteScenario()}>
                    <ListItemIcon>
                        <SvgIcon color='error'><DeleteIcon /></SvgIcon>
                    </ListItemIcon>
                    <ListItemText disableTypography>Delete Scenario</ListItemText>
                </MenuItem>
            </Menu>
            : <></>
    }

    return <ParameterSection
        title='Scenarios'
        includeHeader={includeHeader}
        icon={<ScenarioIcon />}
        contextMenu={<ScenarioMenu />}
        iconColor='scenario'
        helpTopic='workspace/scenarios'
        type={EntityType.Scenario}
        parameters={workspace.navigation.scenarios}
        onSelect={selectScenario}
        onSelectHeader={handleSelectHeader}
        onAdd={handleAddScenario}
        onMove={handleMoveScenario}
        onItemMenu={showScenarioMenu}
    />
})