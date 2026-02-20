import { SvgIcon, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material"
import { Box } from "@mui/system"
import { TreeItem } from "@mui/x-tree-view/TreeItem"
import FolderIcon from "../../../icons/folder-icon"
import RequestIcon from "../../../icons/request-icon"
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { EntityType } from "../../../models/workspace/entity-type"
import { NavTreeItem } from "../nav-tree-item"
import { Persistence } from "@apicize/lib-typescript"
import { MenuPosition } from "../../../models/menu-position"
import { useState } from "react"
import { useWorkspace, WorkspaceMode } from "../../../contexts/workspace.context"
import { useFeedback } from "../../../contexts/feedback.context"
import { observer } from "mobx-react-lite"
import { useApicizeSettings } from "../../../contexts/apicize-settings.context"
import { NavigationRequestEntry } from "../../../models/navigation"
import { IndexedEntityPosition } from "../../../models/workspace/indexed-entity-position"

interface RequestTreeItemProps {
    entry: NavigationRequestEntry
    depth: number
    parentDisabled?: boolean,
    onSelectRequest: (id: string) => void
    onSelectGroup: (id: string) => void
    onShowMenu: (event: React.MouseEvent, id: string, type: EntityType) => void
    onMoveRequest: (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => void
    onMoveGroup: (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => void
}

const RequestTreeItem = observer(({
    entry,
    depth,
    parentDisabled,
    onSelectRequest,
    onSelectGroup,
    onShowMenu,
    onMoveRequest,
    onMoveGroup
}: RequestTreeItemProps) => {
    const isDisabled = parentDisabled || entry.disabled
    return entry.children
        ? <NavTreeItem
            entry={entry}
            depth={depth}
            isDisabled={isDisabled}
            type={EntityType.Group}
            acceptDropTypes={[EntityType.Request, EntityType.Group]}
            acceptDropAppends={true}
            onSelect={() => onSelectGroup(entry.id)}
            onMenu={onShowMenu}
            onMove={onMoveGroup}
            isDraggable={true}
            icon={<FolderIcon />}
            iconColor="folder"
        >
            {
                entry.children.map((child) =>
                    <RequestTreeItem
                        entry={child}
                        depth={depth + 1}
                        parentDisabled={isDisabled}
                        key={child.id}
                        onSelectRequest={onSelectRequest}
                        onSelectGroup={onSelectGroup}
                        onShowMenu={onShowMenu}
                        onMoveRequest={onMoveRequest}
                        onMoveGroup={onMoveGroup}
                    />
                )
            }
        </NavTreeItem>
        : <NavTreeItem
            entry={entry}
            depth={depth}
            isDisabled={isDisabled}
            type={EntityType.Request}
            acceptDropTypes={[EntityType.Request, EntityType.Group]}
            onSelect={() => onSelectRequest(entry.id)}
            onMenu={onShowMenu}
            onMove={onMoveRequest}
            isDraggable={true}
        />
})

export const RequestSection = observer(({ includeHeader }: { includeHeader?: boolean }) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const settings = useApicizeSettings()

    const [requestsMenu, setRequestsMenu] = useState<MenuPosition | undefined>()
    const [requestMenu, setRequestMenu] = useState<MenuPosition | undefined>(undefined)
    const [focused, setFocused] = useState<boolean>(false)

    const closeRequestsMenu = () => {
        setRequestsMenu(undefined)
    }

    const closeRequestMenu = () => {
        setRequestMenu(undefined)
    }

    const handleShowRequestsMenu = (event: React.MouseEvent, id: string, type: EntityType) => {
        setRequestsMenu(
            {
                id,
                type,
                mouseX: event.clientX - 1,
                mouseY: event.clientY - 6,
                persistence: Persistence.Workbook,
            }
        )
    }

    const showRequestMenu = (event: React.MouseEvent, id: string, type: EntityType) => {
        setRequestMenu(
            {
                id,
                type,
                mouseX: event.clientX - 1,
                mouseY: event.clientY - 6,
                persistence: Persistence.Workbook,
            }
        )
    }

    const handleSelectHeader = (headerId: string, helpTopic?: string) => {
        // closeAllMenus()
        if (helpTopic) {
            workspace.showHelp(helpTopic, headerId)
        }
    }
    const handleAddRequest = (targetRequestId: string | null, targetPosition: IndexedEntityPosition) => {
        closeRequestsMenu()
        closeRequestMenu()
        workspace.addRequest(targetRequestId, targetPosition, null)
    }

    const handleAddRequestGroup = (targetRequestId: string | null, targetPosition: IndexedEntityPosition) => {
        closeRequestsMenu()
        closeRequestMenu()
        workspace.addGroup(targetRequestId, targetPosition, null)
    }

    const handleDeleteRequest = (id: string, type: EntityType) => {
        closeRequestMenu()
        closeRequestsMenu()

        if (id) {
            let tname: string
            switch (type) {
                case EntityType.Request:
                    tname = 'Request'
                    break
                case EntityType.Group:
                    tname = 'Group'
                    break
                default:
                    return
            }
            feedback.confirm({
                title: 'Delete ' + tname,
                message: `Are you are you sure you want to delete ${workspace.getNavigationName(id)}?`,
                okButton: 'Yes',
                cancelButton: 'No',
                defaultToCancel: true
            }).then((result) => {
                if (result) {
                    switch (type) {
                        case EntityType.Request:
                            workspace.deleteRequest(id)
                            break
                        case EntityType.Group:
                            workspace.deleteGroup(id)
                            break
                    }
                }
            })
        }
    }

    const handleMoveRequest = (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => {
        workspace.changeActive(EntityType.Request, id)
        workspace.moveRequest(id, relativeToId, relativePosition)
    }

    const handleMoveRequestGroup = (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => {
        workspace.changeActive(EntityType.Group, id)
        workspace.moveGroup(id, relativeToId, relativePosition)
    }

    const handleDupeRequest = (id: string, type: EntityType) => {
        closeRequestMenu()
        closeRequestsMenu()
        if (id) {
            switch (type) {
                case EntityType.Request:
                    workspace.addRequest(id, IndexedEntityPosition.After, id)
                    break
                case EntityType.Group:
                    workspace.addGroup(id, IndexedEntityPosition.After, id)
                    break
            }
        }
    }

    function RequestsMenu() {
        return (
            <Menu
                id='requests-menu'
                open={requestsMenu !== undefined}
                onClose={closeRequestsMenu}
                anchorReference='anchorPosition'
                sx={{ fontSize: settings.navigationFontSize }}
                anchorPosition={{
                    top: requestsMenu?.mouseY ?? 0,
                    left: requestsMenu?.mouseX ?? 0
                }}
            >
                <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(_) => handleAddRequest(null, IndexedEntityPosition.Under)} >
                    <ListItemIcon>
                        <SvgIcon fontSize='inherit' color='request'><RequestIcon /></SvgIcon>
                    </ListItemIcon>
                    <ListItemText disableTypography>Append Request</ListItemText>
                </MenuItem>
                <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(_) => handleAddRequestGroup(null, IndexedEntityPosition.Under)}>
                    <ListItemIcon>
                        <SvgIcon fontSize='inherit' color='folder'><FolderIcon /></SvgIcon>
                    </ListItemIcon>
                    <ListItemText disableTypography>Append Group</ListItemText>
                </MenuItem>
            </Menu>
        )
    }

    function RequestMenu() {
        if (!requestMenu) {
            return null
        }

        let positionType: IndexedEntityPosition
        let action: string

        if (requestMenu.type === EntityType.Group) {
            positionType = IndexedEntityPosition.Under
            action = 'Add'
        } else {
            positionType = IndexedEntityPosition.Before
            action = 'Insert'
        }


        return <Menu
            id='req-menu'
            open={requestMenu !== undefined}
            onClose={closeRequestMenu}
            anchorReference='anchorPosition'
            sx={{ fontSize: settings.navigationFontSize }}
            anchorPosition={{
                top: requestMenu?.mouseY ?? 0,
                left: requestMenu?.mouseX ?? 0
            }}
        >
            <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(e) => handleAddRequest(
                requestMenu.id,
                positionType
            )}>
                <ListItemIcon>
                    <SvgIcon fontSize='inherit' color='request'><RequestIcon /></SvgIcon>
                </ListItemIcon>
                <ListItemText disableTypography>{action} Request</ListItemText>
            </MenuItem>
            <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(e) =>
                handleAddRequestGroup(
                    requestMenu.id,
                    positionType
                )}>
                <ListItemIcon>
                    <SvgIcon fontSize='inherit' color='folder'><FolderIcon /></SvgIcon>
                </ListItemIcon>
                <ListItemText disableTypography>{action} Request Group</ListItemText>
            </MenuItem>
            <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(e) => handleDupeRequest(requestMenu.id, requestMenu.type)}>
                <ListItemIcon>
                    <ContentCopyOutlinedIcon fontSize='inherit' sx={{ color: 'request' }} />
                </ListItemIcon>
                <ListItemText disableTypography>Add Duplicate</ListItemText>
            </MenuItem>
            <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(e) => handleDeleteRequest(requestMenu.id, requestMenu.type)}>
                <ListItemIcon>
                    <DeleteIcon fontSize='inherit' color='error' />
                </ListItemIcon>
                <ListItemText disableTypography>Delete</ListItemText>
            </MenuItem>
        </Menu>
    }

    const requestTreeItemProps = {
        onSelectRequest: (id: string) => workspace.changeActive(EntityType.Request, id),
        onSelectGroup: (id: string) => workspace.changeActive(EntityType.Group, id),
        onShowMenu: showRequestMenu,
        onMoveRequest: handleMoveRequest,
        onMoveGroup: handleMoveRequestGroup
    }

    const renderRequestTreeItems = () => workspace.navigation.requests.map(r =>
        <RequestTreeItem entry={r} depth={1} key={r.id} {...requestTreeItemProps} />
    )

    return includeHeader
        ? <TreeItem
            itemId='hdr-r'
            key='hdr-r'
            onClick={e => {
                e.preventDefault()
                e.stopPropagation()
            }}
            onKeyDown={(e) => {
                e.defaultMuiPrevented = true
                e.preventDefault()
                // e.stopPropagation()
            }}
            onFocusCapture={e => e.stopPropagation()}
            sx={{ margin: '0.5em 0 0 0', padding: 0, fontSize: settings.navigationFontSize }}
            label={(
                <Box
                    className='nav-item'
                    typography='navigation'
                    // ref={setDropRef}
                    onClick={(e) => {
                        // Prevent label from expanding/collapsing
                        e.preventDefault()
                        e.stopPropagation()
                        handleSelectHeader('hdr-r', 'workspace/requests')
                    }}

                    onMouseEnter={() => {
                        setFocused(true)
                    }}

                    onMouseLeave={() => {
                        setFocused(false)
                    }}
                // sx={{ background: isOver ? dragPositionToColor(dragDrop.dragPosition) : 'default' }}
                >
                    <Box className='nav-icon-box'><SvgIcon className='nav-folder' color='request'><RequestIcon /></SvgIcon></Box>
                    <Box className='nav-node-text' sx={{ flexGrow: 1 }}>
                        <Typography variant="navigation">Requests</Typography>
                    </Box>
                    <IconButton sx={{ flexGrow: 0, margin: 0, padding: 0, visibility: focused ? 'normal' : 'hidden' }} onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleShowRequestsMenu(e, 'menu-requests', EntityType.Group)
                    }}>
                        <Box className='nav-icon-context'><MoreVertIcon style={{ fontSize: settings.navigationFontSize * 1.5 }} /></Box>
                    </IconButton>
                </Box >
            )}>
            {renderRequestTreeItems()}
            <RequestsMenu />
            <RequestMenu />
        </TreeItem >
        : <>
            {renderRequestTreeItems()}
            <RequestsMenu />
            <RequestMenu />
        </>
})
