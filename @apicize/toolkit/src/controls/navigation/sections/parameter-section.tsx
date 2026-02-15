import { Persistence } from "@apicize/lib-typescript"
import { SvgIconPropsColorOverrides, SvgIcon, IconButton } from "@mui/material"
import { Box } from "@mui/system"
import { TreeItem } from "@mui/x-tree-view/TreeItem"
import AddIcon from '@mui/icons-material/Add'
import PrivateIcon from "../../../icons/private-icon"
import PublicIcon from "../../../icons/public-icon"
import VaultIcon from "../../../icons/vault-icon"
import { EntityType } from "../../../models/workspace/entity-type"
import { OverridableStringUnion } from "@mui/types";
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

const ParameterSubsection = observer(({
    type,
    entries,
    persistence,
    icon,
    label,
    onSelect,
    onAdd,
    onMove,
    onItemMenu,
    onSelectHeader
}: {
    type: EntityType,
    entries: NavigationEntry[],
    persistence: Persistence,
    icon: JSX.Element,
    label: string,
    onSelect: (id: string) => void,
    onAdd: () => void,
    onMove: (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => void,
    onItemMenu: (event: React.MouseEvent, id: string) => void,
    onSelectHeader: (headerId: string, helpTopic?: string) => void
}) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const dragDrop = useDragDrop()
    const [focused, setFocused] = useState(false)

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
                    onSelectHeader(headerId, 'parameter-storage')
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
                        onAdd()
                        workspace.updateExpanded(headerId, true)
                    }}>
                    <Box className='nav-icon-context'>
                        <AddIcon style={{ fontSize: settings.navigationFontSize * 1.5 }} />
                    </Box>
                </IconButton>
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
    onAdd,
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
    iconColor: OverridableStringUnion<
        | 'inherit'
        | 'action'
        | 'disabled'
        | 'primary'
        | 'secondary'
        | 'error'
        | 'info'
        | 'success'
        | 'warning',
        SvgIconPropsColorOverrides>,
    onAdd: (relativeToId: string, relativePosition: IndexedEntityPosition, cloneFromId: string | null) => void,
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
                label="Public"
                onSelect={onSelect}
                onAdd={() => onAdd(Persistence.Workbook, IndexedEntityPosition.Under, null)}
                onMove={onMove}
                onItemMenu={(e, id) => onItemMenu(e, Persistence.Workbook, id)}
                onSelectHeader={onSelectHeader} />
            <ParameterSubsection
                type={type}
                persistence={Persistence.Private}
                entries={parameters.private}
                icon={<Box className='nav-icon-box' typography='navigation'><SvgIcon className='nav-folder' color='private'><PrivateIcon /></SvgIcon></Box>}
                label="Private"
                onSelect={onSelect}
                onAdd={() => onAdd(Persistence.Private, IndexedEntityPosition.Under, null)}
                onMove={onMove}
                onItemMenu={(e, id) => onItemMenu(e, Persistence.Private, id)}
                onSelectHeader={onSelectHeader} />
            <ParameterSubsection
                type={type}
                persistence={Persistence.Vault}
                entries={parameters.vault}
                icon={<Box className='nav-icon-box' typography='navigation'><SvgIcon className='nav-folder' color='vault'><VaultIcon /></SvgIcon></Box>}
                label="Vault"
                onSelect={onSelect}
                onAdd={() => onAdd(Persistence.Vault, IndexedEntityPosition.Under, null)}
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