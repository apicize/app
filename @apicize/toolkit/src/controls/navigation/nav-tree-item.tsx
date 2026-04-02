import { useDraggable, useDroppable } from "@dnd-kit/core"
import { SvgIcon, IconButton } from "@mui/material"
import { Box } from "@mui/system"
import { TreeItem } from "@mui/x-tree-view/TreeItem"
import { observer } from "mobx-react-lite"
import { DraggableData, DroppableData } from "../../models/drag-drop"
import { EntityType } from "../../models/workspace/entity-type"
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
// import KeyIcon from '@mui/icons-material/Key';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import { CSS, useCombinedRefs } from '@dnd-kit/utilities';
import React, { useMemo, useState, JSX } from "react"
import { useDragDrop } from "../../contexts/dragdrop.context"
import { useApicizeSettings } from "../../contexts/apicize-settings.context"
import { useWorkspace } from "../../contexts/workspace.context"
import { IndexedEntityPosition } from "../../models/workspace/indexed-entity-position"
import { NavigationEntry } from "../../models/navigation"
import {
    ResultSuccessIcon, ResultFailureIcon, ResultErrorIcon,
    ResultSuccessFailureIcon, ResultSuccessErrorIcon, ResultFailureErrorIcon, ResultSuccessFailureErrorIcon,
} from "../../icons"
import { ExecutionState, ValidationState } from "@apicize/lib-typescript"
import { IconColors } from "../../theme"

const stateIconSxFirst = { fontSize: '1.1rem', marginLeft: 'none' } as const
const stateIconSxSubsequent = { fontSize: '1.1rem', marginLeft: '0.5em' } as const
const menuBtnSxVisible = { visibility: 'normal' as const, margin: 0, padding: 0 }
const menuBtnSxHidden = { visibility: 'hidden' as const, margin: 0, padding: 0 }

// Helper function to generate icons from entry state
// Used inside observer components, so it will react to MobX changes
export const iconsFromState = (entry: NavigationEntry) => {
    const icons: JSX.Element[] = []

    if (entry.executionState) {
        if ((entry.executionState & ExecutionState.running) === ExecutionState.running as number) {
            icons.push(<PlayArrowIcon color="success" fontSize='medium' key={`play-${entry.id}`} />)
        } else {
            const masked = entry.executionState & (ExecutionState.success | ExecutionState.failure | ExecutionState.error)
            switch (masked) {
                case ExecutionState.success | ExecutionState.failure | ExecutionState.error:
                    icons.push(<SvgIcon fontSize='small' key={`sok-${entry.id}`}><ResultSuccessFailureErrorIcon /></SvgIcon>)
                    break
                case ExecutionState.success | ExecutionState.failure:
                    icons.push(<SvgIcon fontSize='small' key={`sok-${entry.id}`}><ResultSuccessFailureIcon /></SvgIcon>)
                    break
                case ExecutionState.success | ExecutionState.error:
                    icons.push(<SvgIcon fontSize='small' key={`sok-${entry.id}`}><ResultSuccessErrorIcon /></SvgIcon>)
                    break
                case ExecutionState.failure | ExecutionState.error:
                    icons.push(<SvgIcon fontSize='small' key={`sok-${entry.id}`}><ResultFailureErrorIcon /></SvgIcon>)
                    break
                case ExecutionState.success as number:
                    icons.push(<SvgIcon fontSize='small' key={`sok-${entry.id}`}><ResultSuccessIcon /></SvgIcon>)
                    break
                case ExecutionState.failure as number:
                    icons.push(<SvgIcon fontSize='small' key={`sok-${entry.id}`}><ResultFailureIcon /></SvgIcon>)
                    break
                case ExecutionState.error as number:
                    icons.push(<SvgIcon fontSize='small' key={`sok-${entry.id}`}><ResultErrorIcon /></SvgIcon>)
                    break
            }
        }
    }

    if (entry.validationState) {
        if ((entry.validationState & ValidationState.warning) === ValidationState.warning as number) {
            icons.push(<WarningAmberIcon color="warning" fontSize='medium' sx={icons.length === 0 ? stateIconSxFirst : stateIconSxSubsequent} key={`warn-${entry.id}`} />)
        }
        if ((entry.validationState & ValidationState.error) === ValidationState.error as number) {
            icons.push(<ErrorIcon color="error" fontSize='medium' sx={icons.length === 0 ? stateIconSxFirst : stateIconSxSubsequent} key={`err-${entry.id}`} />)
        }
    }

    // if (entry.encrypted) {
    //     icons.push(<KeyIcon color="error" fontSize='medium' sx={{ fontSize: '1.1rem', marginLeft: icons.length === 0 ? 'none' : '0.5em' }} key={`encrpyted-${entry.id}`} />)
    // }

    return icons.length > 0
        ? <Box className='nav-state-icon-container' typography='navigation'>{icons}</Box>
        : null
}

export const NavTreeItem = observer(({
    entry,
    type,
    depth,
    isDisabled,
    isDraggable,
    acceptDropTypes,
    acceptDropAppends,
    icon,
    iconColor,
    children,
    onMenu,
    onMove
}: {
    entry: NavigationEntry,
    type: EntityType,
    depth: number,
    isDisabled?: boolean,
    isDraggable: boolean,
    acceptDropTypes?: EntityType[],
    acceptDropAppends?: boolean,
    icon?: JSX.Element,
    iconColor?: IconColors,
    children?: JSX.Element[],
    onSelect?: (id: string) => void,
    onMenu?: (event: React.MouseEvent, id: string, type: EntityType) => void,
    onMove?: (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => void
}) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const dragDrop = useDragDrop()
    const itemId = `${type}-${entry.id}`

    const [focused, setFocused] = useState<boolean>(false)

    const draggable = useDraggable({
        id: entry.id,
        disabled: !isDraggable,
        data: {
            type: type,
            move: (relativeToId: string, relativePosition: IndexedEntityPosition) => {
                if (onMove) {
                    onMove(entry.id, relativeToId, relativePosition)
                }
            }
        } as DraggableData
    })

    const droppable = useDroppable({
        id: entry.id,
        disabled: !acceptDropTypes,
        data: {
            acceptAppend: acceptDropAppends === true,
            acceptReposition: true,
            acceptsTypes: acceptDropTypes ?? [],
            depth: depth,
            isHeader: false,
        } as DroppableData
    })

    const attributes = isDraggable ? draggable.attributes : undefined
    const listeners = isDraggable ? draggable.listeners : undefined
    const setDragRef = isDraggable ? draggable.setNodeRef : () => null
    const transform = isDraggable ? draggable.transform : null
    const isOver = acceptDropTypes ? droppable.isOver : false
    const setDropRef = acceptDropTypes ? droppable.setNodeRef : () => null

    const dragStyle = useMemo(() => ({
        transform: CSS.Translate.toString(transform)
    }), [transform])

    const treeSx = useMemo(() => (
        { background: isOver ? dragDrop.toBackgroundColor() : 'default', margin: 0, padding: 0 }
    ), [isOver, dragDrop])

    return <TreeItem
        itemId={itemId}
        key={itemId}
        {...listeners}
        {...attributes}
        sx={treeSx}
        onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
        }}
        onKeyDown={(e) => {
            e.defaultMuiPrevented = true
            e.preventDefault()
            // e.stopPropagation()
        }}
        // Add a selected class so that we can mark expandable tree items as selected and have them show up properly
        label={(
            <Box
                key={`lbl-${entry.id}`}
                id={`lbl-${entry.id}`}
                ref={useCombinedRefs(setDragRef, setDropRef)}
                style={dragStyle}
                className='nav-item'
                typography='navigation'

                onClick={(e) => {
                    // Override click behavior to set active item, but not to propogate upward
                    // because we don't want to toggle expansion on anything other than the
                    // lefticon click
                    workspace.changeActive(type, entry.id)
                    e.preventDefault()
                    e.stopPropagation()
                }}

                onMouseEnter={() => {
                    setFocused(true)
                }}

                onMouseLeave={() => {
                    setFocused(false)
                }}
            >
                {
                    (icon && iconColor)
                        ? <Box className='nav-icon-box'><SvgIcon color={iconColor} >{icon}</SvgIcon></Box>
                        : null
                }
                <Box
                    className={isDisabled === true ? 'disabled nav-node-text' : 'nav-node-text'}
                    justifyContent='left'
                    alignItems='center'
                    display='flex'
                >
                    {entry.name.length > 0 ? entry.name : '(Unnamed)'}
                    <Box className='nav-node-text-state'>
                        {iconsFromState(entry)}
                    </Box>
                </Box>
                {
                    onMenu
                        ? <IconButton
                            sx={focused ? menuBtnSxVisible : menuBtnSxHidden}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (onMenu) onMenu(e, entry.id, type)
                            }}
                        >
                            <Box className='nav-icon-context'><MoreVertIcon style={{ fontSize: settings.navigationFontSize * 1.5 }} /></Box>
                        </IconButton>
                        : <></>
                }
            </Box >
        )}>
        {
            children
        }
    </TreeItem >
})