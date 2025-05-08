import { Persistence } from "@apicize/lib-typescript"
import { ListItemIcon, ListItemText, Menu, MenuItem, SvgIcon, useTheme } from "@mui/material"
import AuthorizationIcon from "../../../icons/auth-icon";
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import { EntityType } from "../../../models/workspace/entity-type"
import { useWorkspace } from "../../../contexts/workspace.context"
import { useState } from "react"
import { ParameterSection } from "./parameter-section"
import { MenuPosition } from "../../../models/menu-position"
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { useFeedback } from "../../../contexts/feedback.context"
import { observer } from "mobx-react-lite";
import { IndexedEntityPosition } from "../../../models/workspace/indexed-entity-position";

export const AuthorizationSection = observer((props: { includeHeader: boolean }) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const theme = useTheme()

    const [authorizationMenu, setAuthorizationMenu] = useState<MenuPosition | undefined>(undefined)

    const closeAuthorizationMenu = () => {
        setAuthorizationMenu(undefined)
    }

    const selectAuthorization = (id: string) => {
        workspace.changeActive(EntityType.Authorization, id)
    }

    const handleAddAuthorization = (targetAuthorizationId: string, targetPosition: IndexedEntityPosition) => {
        closeAuthorizationMenu()
        workspace.addAuthorization(targetAuthorizationId, targetPosition, null)
    }

    const handleSelectHeader = (headerId: string, helpTopic?: string) => {
        // closeAllMenus()
        if (helpTopic) {
            workspace.updateExpanded(headerId, true)
            workspace.showHelp(helpTopic)
        }
    }

    const handleMoveAuthorization = (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => {
        selectAuthorization(id)
        workspace.moveAuthorization(id, relativeToId, relativePosition)
    }

    const handleDupeAuthorization = () => {
        closeAuthorizationMenu()
        const id = authorizationMenu?.id
        if (!id) return
        workspace.addAuthorization(id, IndexedEntityPosition.After, id)
    }

    const showAuthorizationMenu = (event: React.MouseEvent, persistence: Persistence, id: string) => {
        setAuthorizationMenu(
            {
                id,
                type: EntityType.Authorization,
                mouseX: event.clientX - 1,
                mouseY: event.clientY - 6,
                persistence,
            }
        )
    }

    const handleDeleteAuthorization = () => {
        closeAuthorizationMenu()
        const id = authorizationMenu?.id
        if (!id) return
        feedback.confirm({
            title: 'Delete Authorization',
            message: `Are you are you sure you want to delete ${workspace.getNavigationName(id)}?`,
            okButton: 'Yes',
            cancelButton: 'No',
            defaultToCancel: true
        }).then((result) => {
            if (result) {
                workspace.deleteAuthorization(id)
            }
        })
    }

    function AuthorizationMenu() {
        return authorizationMenu
            ? <Menu
                id='authorization-menu'
                open={authorizationMenu !== undefined}
                onClose={closeAuthorizationMenu}
                anchorReference='anchorPosition'
                anchorPosition={{
                    top: authorizationMenu?.mouseY ?? 0,
                    left: authorizationMenu?.mouseX ?? 0
                }}
            >
                <MenuItem onClick={(_) => handleAddAuthorization(authorizationMenu.id, IndexedEntityPosition.After)}>
                    <ListItemIcon>
                        <SvgIcon fontSize='small' color='authorization'><AuthorizationIcon /></SvgIcon>
                    </ListItemIcon>
                    <ListItemText>Add Authorization</ListItemText>
                </MenuItem>
                <MenuItem onClick={(e) => handleDupeAuthorization()}>
                    <ListItemIcon>
                        <ContentCopyOutlinedIcon fontSize='small' sx={{ color: theme.palette.authorization.light }} />
                    </ListItemIcon>
                    <ListItemText>Duplicate Authorization</ListItemText>
                </MenuItem>
                <MenuItem onClick={(e) => handleDeleteAuthorization()}>
                    <ListItemIcon>
                        <DeleteIcon fontSize='small' color='error' />
                    </ListItemIcon>
                    <ListItemText>Delete Authorization</ListItemText>
                </MenuItem>
            </Menu>
            : <></>
    }

    return <ParameterSection
        title='Authorizations'
        includeHeader={props.includeHeader}
        icon={<AuthorizationIcon />}
        contextMenu={<AuthorizationMenu />}
        iconColor='authorization'
        helpTopic='workspace/authorizations'
        type={EntityType.Authorization}
        parameters={workspace.navigation.authorizations}
        onSelect={selectAuthorization}
        onSelectHeader={handleSelectHeader}
        onAdd={handleAddAuthorization}
        onMove={handleMoveAuthorization}
        onItemMenu={showAuthorizationMenu}
    />
})