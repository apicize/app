import { Persistence } from "@apicize/lib-typescript"
import { SvgIcon, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material"
import { JSX } from 'react'
import { Box } from "@mui/system"
import { TreeItem } from "@mui/x-tree-view/TreeItem"
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import PrivateIcon from "../../../icons/private-icon"
import PublicIcon from "../../../icons/public-icon"
import VaultIcon from "../../../icons/vault-icon"
import { EntityType } from "../../../models/workspace/entity-type"
import { DroppableData } from "../../../models/drag-drop"
import { useWorkspace } from "../../../contexts/workspace.context"
import { NavTreeItem } from "../nav-tree-item"
import { useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import { useApicizeSettings } from "../../../contexts/apicize-settings.context"
import { NavigationEntry, ParamNavigationSection } from "../../../models/navigation"
import { IndexedEntityPosition } from "../../../models/workspace/indexed-entity-position"
import { useDragDrop } from "../../../contexts/dragdrop.context"
import { useState } from "react"
import { IconColors } from "../../../theme"

const ParameterSubsection = observer(({
    type,
    entries,
    persistence,
    icon,
    entityIcon,
    entityIconColor,
    label,
    singularName,
    pasteDisabled,
    onSelect,
    onAdd,
    onPaste,
    onMove,
    onItemMenu,
    onSelectHeader
}: {
    type: EntityType,
    entries: NavigationEntry[],
    persistence: Persistence,
    icon: JSX.Element,
    entityIcon: JSX.Element,
    entityIconColor: IconColors,
    label: string,
    singularName: string,
    pasteDisabled: boolean,
    onSelect: (id: string) => void,
    onAdd: () => void,
    onPaste: () => void,
    onMove: (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => void,
    onItemMenu: (event: React.MouseEvent, id: string) => void,
    onSelectHeader: (headerId: string, helpTopic?: string) => void
}) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const dragDrop = useDragDrop()
    const [focused, setFocused] = useState(false)
    const [menuAnchor, setMenuAnchor] = useState<{ mouseX: number, mouseY: number } | undefined>(undefined)

    const { isOver, setNodeRef: setDropRef } = useDroppable({
        id: `hdr-${type}-${persistence}`,
        data: {
            acceptAppend: true,
            acceptsTypes: [type],
            depth: 0,
            isHeader: true,
            persistence: persistence,
        } as DroppableData
    })

    const headerId = `hdr-${type}-${persistence}`
    return <TreeItem
        itemId={headerId}
        key={headerId}
        id={headerId}
        onFocusCapture={e => e.stopPropagation()}
        ref={setDropRef}
        sx={{ background: isOver ? dragDrop.toBackgroundColor() : 'default', margin: '0 0 0 1.0em', padding: 0 }}
        label={(
            <Box
                className='nav-item'
                typography='navigation'
                onClick={(e) => {
                    // Prevent label from expanding/collapsing
                    e.preventDefault()
                    e.stopPropagation()
                    if (!menuAnchor) {
                        onSelectHeader(headerId, 'parameter-storage')
                    }
                }}
                onMouseEnter={() => setFocused(true)}
                onMouseLeave={() => setFocused(false)}
            >
                {icon}
                <Box className='nav-node-text' typography='navigation' sx={{ flexGrow: 1, minHeight: '1em' }}>
                    {label}
                </Box>
                <IconButton sx={{ flexGrow: 0, minHeight: '1em', padding: 0, margin: 0, visibility: focused ? 'normal' : 'hidden' }}
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setMenuAnchor({ mouseX: e.clientX - 1, mouseY: e.clientY - 6 })
                    }}>
                    <Box className='nav-icon-context'>
                        <MoreVertIcon style={{ fontSize: settings.navigationFontSize * 1.5 }} />
                    </Box>
                </IconButton>
                <Menu
                    open={menuAnchor !== undefined}
                    onClose={() => setMenuAnchor(undefined)}
                    sx={{ fontSize: settings.navigationFontSize }}
                    anchorReference='anchorPosition'
                    anchorPosition={{
                        top: menuAnchor?.mouseY ?? 0,
                        left: menuAnchor?.mouseX ?? 0
                    }}
                >
                    <MenuItem
                        className='navigation-menu-item'
                        sx={{ fontSize: 'inherit' }}
                        onClick={() => {
                            setMenuAnchor(undefined)
                            onAdd()
                            workspace.updateExpanded(headerId, true)
                        }}>
                        <ListItemIcon>
                            <SvgIcon color={entityIconColor} fontSize='inherit'>{entityIcon}</SvgIcon>
                        </ListItemIcon>
                        <ListItemText disableTypography>Add {singularName}</ListItemText>
                    </MenuItem>
                    <MenuItem
                        className='navigation-menu-item'
                        sx={{ fontSize: 'inherit' }}
                        disabled={pasteDisabled}
                        onClick={() => {
                            setMenuAnchor(undefined)
                            onPaste()
                            workspace.updateExpanded(headerId, true)
                        }}>
                        <ListItemIcon>
                            <ContentPasteIcon fontSize='inherit' />
                        </ListItemIcon>
                        <ListItemText disableTypography>Paste from Clipboard</ListItemText>
                    </MenuItem>
                </Menu>
            </Box>
        )}
    >
        {
            entries.map((e) =>
                <NavTreeItem
                    type={type}
                    entry={e}
                    key={e.id}
                    depth={2}
                    onSelect={onSelect}
                    isDraggable={true}
                    acceptDropTypes={[type]}
                    onMenu={onItemMenu}
                    onMove={onMove}
                />
            )
        }
    </TreeItem >
})


export const ParameterSection = observer(({
    type,
    parameters,
    title,
    helpTopic,
    icon,
    includeHeader,
    contextMenu,
    iconColor,
    singularName,
    pasteDisabled,
    onAdd,
    onPaste,
    onSelect,
    onMove,
    onItemMenu,
    onSelectHeader
}: {
    type: EntityType,
    parameters: ParamNavigationSection,
    title: string,
    helpTopic: string,
    icon: JSX.Element,
    includeHeader: boolean,
    contextMenu?: JSX.Element,
    iconColor: IconColors,
    singularName: string,
    pasteDisabled: boolean,
    onAdd: (relativeToId: string, relativePosition: IndexedEntityPosition, cloneFromId: string | null) => void,
    onPaste: (relativeToId: string, relativePosition: IndexedEntityPosition) => void,
    onSelect: (id: string) => void,
    onMove: (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => void,
    onItemMenu: (e: React.MouseEvent, persistence: Persistence, id: string) => void,
    onSelectHeader: (headerId: string, helpTopic?: string) => void
}) => {
    const Contents = () => {
        return <>
            {contextMenu}
            <ParameterSubsection
                type={type}
                persistence={Persistence.Workbook}
                entries={parameters.public}
                icon={<Box className='nav-icon-box' typography='navigation'><SvgIcon className='nav-folder' color='public'><PublicIcon /></SvgIcon></Box>}
                entityIcon={icon}
                entityIconColor={iconColor}
                label="Public"
                singularName={singularName}
                pasteDisabled={pasteDisabled}
                onSelect={onSelect}
                onAdd={() => onAdd(Persistence.Workbook, IndexedEntityPosition.Under, null)}
                onPaste={() => onPaste(Persistence.Workbook, IndexedEntityPosition.Under)}
                onMove={onMove}
                onItemMenu={(e, id) => onItemMenu(e, Persistence.Workbook, id)}
                onSelectHeader={onSelectHeader} />
            <ParameterSubsection
                type={type}
                persistence={Persistence.Private}
                entries={parameters.private}
                icon={<Box className='nav-icon-box' typography='navigation'><SvgIcon className='nav-folder' color='private'><PrivateIcon /></SvgIcon></Box>}
                entityIcon={icon}
                entityIconColor={iconColor}
                label="Private"
                singularName={singularName}
                pasteDisabled={pasteDisabled}
                onSelect={onSelect}
                onAdd={() => onAdd(Persistence.Private, IndexedEntityPosition.Under, null)}
                onPaste={() => onPaste(Persistence.Private, IndexedEntityPosition.Under)}
                onMove={onMove}
                onItemMenu={(e, id) => onItemMenu(e, Persistence.Private, id)}
                onSelectHeader={onSelectHeader} />
            <ParameterSubsection
                type={type}
                persistence={Persistence.Vault}
                entries={parameters.vault}
                icon={<Box className='nav-icon-box' typography='navigation'><SvgIcon className='nav-folder' color='vault'><VaultIcon /></SvgIcon></Box>}
                entityIcon={icon}
                entityIconColor={iconColor}
                label="Vault"
                singularName={singularName}
                pasteDisabled={pasteDisabled}
                onSelect={onSelect}
                onAdd={() => onAdd(Persistence.Vault, IndexedEntityPosition.Under, null)}
                onPaste={() => onPaste(Persistence.Vault, IndexedEntityPosition.Under)}
                onMove={onMove}
                onItemMenu={(e, id) => onItemMenu(e, Persistence.Vault, id)}
                onSelectHeader={onSelectHeader} />
        </>
    }

    return includeHeader
        ? <TreeItem
            itemId={`hdr-${type}`}
            key={`hdr-${type}`}
            id={`hdr-${type}`}
            onClick={e => {
                e.stopPropagation()
                e.preventDefault()
                // onSelectHeader(`hdr-${type}`, helpTopic)
            }}
            onFocusCapture={e => {
                e.stopPropagation()
                e.preventDefault()
            }}
            sx={{ margin: '1.0em 0 0 0', padding: 0 }}
            label={(
                <Box
                    className='nav-item'
                    typography='navigation'
                    onClick={(e) => {
                        // Prevent label from expanding/collapsing
                        e.preventDefault()
                        e.stopPropagation()
                        onSelectHeader(`hdr-${type}`, helpTopic)
                    }}
                >
                    <Box className='nav-icon-box' typography='navigation'><SvgIcon color={iconColor} fontSize='inherit'>{icon}</SvgIcon></Box>
                    <Box className='nav-node-text' typography='navigation' sx={{ flexGrow: 1 }}>
                        {title}
                    </Box>
                </Box>
            )}>
            <Contents />
        </TreeItem>
        : <Contents />
})