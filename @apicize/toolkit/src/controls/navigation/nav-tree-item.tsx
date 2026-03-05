import { useDraggable, useDroppable } from "@dnd-kit/core"
import { SvgIcon, IconButton } from "@mui/material"
import { Box } from "@mui/system"
import { TreeItem } from "@mui/x-tree-view/TreeItem"
import { observer } from "mobx-react-lite"
import { DraggableData, DroppableData } from "../../models/drag-drop"
import { EntityType } from "../../models/workspace/entity-type"
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import { CSS, useCombinedRefs } from '@dnd-kit/utilities';
import React, { useState, JSX } from "react"
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
            icons.push(<WarningAmberIcon color="warning" fontSize='medium' sx={{ fontSize: '1.1rem', marginLeft: icons.length === 0 ? 'none' : '0.5em' }} key={`warn-${entry.id}`} />)
        }
        if ((entry.validationState & ValidationState.error) === ValidationState.error as number) {
            icons.push(<ErrorIcon color="error" fontSize='medium' sx={{ fontSize: '1.1rem', marginLeft: icons.length === 0 ? 'none' : '0.5em' }} key={`err-${entry.id}`} />)
        }
    }

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

    const { attributes, listeners, setNodeRef: setDragRef, transform } = isDraggable
        ? useDraggable({
            id: entry.id,
            data: {
                type: type,
                move: (relativeToId: string, relativePosition: IndexedEntityPosition) => {
                    if (onMove) {
                        onMove(entry.id, relativeToId, relativePosition)
                    }
                }
            } as DraggableData
        })
        : {
            attributes: undefined,
            listeners: undefined,
            setNodeRef: () => null,
            transform: null
        }

    const { isOver, setNodeRef: setDropRef } = acceptDropTypes
        ? useDroppable({
            id: entry.id,
            data: {
                acceptAppend: acceptDropAppends === true,
                acceptReposition: true,
                acceptsTypes: acceptDropTypes,
                depth: depth,
                isHeader: false,
            } as DroppableData
        })
        : { isOver: false, setNodeRef: () => null }

    const dragStyle = {
        transform: CSS.Translate.toString(transform)
    }

    return <TreeItem
        itemId={itemId}
        key={itemId}
        {...listeners}
        {...attributes}
        sx={{ background: isOver ? dragDrop.toBackgroundColor() : 'default', margin: 0, padding: 0 }}
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
                            sx={{
                                visibility: focused ? 'normal' : 'hidden',
                                margin: 0,
                                padding: 0,
                            }}
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