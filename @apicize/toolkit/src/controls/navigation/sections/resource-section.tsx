import { Persistence } from "@apicize/lib-typescript"
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem, SvgIcon } from "@mui/material"
import DeleteIcon from '@mui/icons-material/RemoveCircleOutline';
import { SvgIconPropsColorOverrides } from "@mui/material"
import { OverridableStringUnion } from "@mui/types"
import { EntityType } from "../../../models/workspace/entity-type"
import { useWorkspace } from "../../../contexts/workspace.context"
import { useState, JSX } from "react"
import { ParameterSection } from "./parameter-section"
import { MenuPosition } from "../../../models/menu-position"
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { useFeedback } from "../../../contexts/feedback.context"
import { observer } from "mobx-react-lite"
import { IndexedEntityPosition } from "../../../models/workspace/indexed-entity-position"
import { useApicizeSettings } from "../../../contexts/apicize-settings.context"
import { ClipboardDataType, useClipboard } from "../../../contexts/clipboard.context";
import { ClipboardPaylodRequest } from "../../../models/clipboard_payload_request";
import { ParamNavigationSection } from "../../../models/navigation";

export interface ResourceSectionProps {
    includeHeader: boolean
    entityType: EntityType
    title: string
    singularName: string
    icon: JSX.Element
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
        SvgIconPropsColorOverrides>
    helpTopic: string
    clipboardDataType: ClipboardDataType
    parameters: ParamNavigationSection
    addEntity: (relativeToId: string, relativePosition: IndexedEntityPosition, cloneFromId: string | null) => void
    deleteEntity: (id: string) => void
    moveEntity: (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => void
    buildClipboardPayload: (id: string) => ClipboardPaylodRequest
}

export const ResourceSection = observer(({
    includeHeader,
    entityType,
    title,
    singularName,
    icon,
    iconColor,
    helpTopic,
    clipboardDataType,
    parameters,
    addEntity,
    deleteEntity,
    moveEntity,
    buildClipboardPayload,
}: ResourceSectionProps) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const clipboard = useClipboard()
    const settings = useApicizeSettings()

    const [menu, setMenu] = useState<MenuPosition | undefined>(undefined)

    const closeMenu = () => {
        setMenu(undefined)
    }

    const handleSelect = (id: string) => {
        workspace.changeActive(entityType, id)
    }

    const handleAdd = (relativeToId: string, relativePosition: IndexedEntityPosition, cloneFromId: string | null) => {
        closeMenu()
        addEntity(relativeToId, relativePosition, cloneFromId)
    }

    const handleSelectHeader = (headerId: string, helpTopic?: string) => {
        if (helpTopic) {
            workspace.showHelp(helpTopic, headerId)
        }
    }

    const handleCut = (id: string) => {
        closeMenu()
        workspace.copyToClipboard(buildClipboardPayload(id), singularName)
            .then(() => deleteEntity(id))
            .catch(err => feedback.toastError(err))
    }

    const handleCopy = (id: string) => {
        closeMenu()
        workspace.copyToClipboard(buildClipboardPayload(id), singularName)
            .catch(err => feedback.toastError(err))
    }

    const handleMove = (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => {
        handleSelect(id)
        moveEntity(id, relativeToId, relativePosition)
    }

    const handleDupe = () => {
        closeMenu()
        const id = menu?.id
        if (!id) return
        addEntity(id, IndexedEntityPosition.After, id)
    }

    const handlePaste = (relativeToId: string, relativePosition: IndexedEntityPosition) => {
        closeMenu()
        workspace.pasteFromClipboard(relativeToId, relativePosition, clipboardDataType).catch(err => feedback.toastError(err))
    }

    const showMenu = (event: React.MouseEvent, persistence: Persistence, id: string) => {
        setMenu({
            id,
            type: entityType,
            mouseX: event.clientX - 1,
            mouseY: event.clientY - 6,
            persistence,
        })
    }

    const handleDelete = () => {
        closeMenu()
        const id = menu?.id
        if (!id) return
        feedback.confirm({
            title: `Delete ${singularName}`,
            message: `Are you are you sure you want to delete ${workspace.getNavigationName(id)}?`,
            okButton: 'Yes',
            cancelButton: 'No',
            defaultToCancel: true
        }).then((result) => {
            if (result) {
                deleteEntity(id)
            }
        }).catch(err => feedback.toastError(err))
    }

    const menuId = `${entityType}-menu`

    const contextMenu = menu
        ? <Menu
            id={menuId}
            open={menu !== undefined}
            onClose={closeMenu}
            sx={{ fontSize: settings.navigationFontSize }}
            anchorReference='anchorPosition'
            anchorPosition={{
                top: menu?.mouseY ?? 0,
                left: menu?.mouseX ?? 0
            }}
        >
            <MenuItem
                className='navigation-menu-item'
                sx={{ fontSize: 'inherit' }}
                onClick={(_) => handleAdd(menu.id, IndexedEntityPosition.After, null)}>
                <ListItemIcon>
                    <SvgIcon color={iconColor} fontSize='inherit'>{icon}</SvgIcon>
                </ListItemIcon>
                <ListItemText disableTypography>Add {singularName}</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem
                className='navigation-menu-item'
                sx={{ fontSize: 'inherit' }}
                onClick={() => handleCut(menu.id)}>
                <ListItemIcon>
                    <ContentCutIcon fontSize='inherit' />
                </ListItemIcon>
                <ListItemText disableTypography>Cut to Clipboard</ListItemText>
            </MenuItem>
            <MenuItem
                className='navigation-menu-item'
                sx={{ fontSize: 'inherit' }}
                onClick={() => handleCopy(menu.id)}>
                <ListItemIcon>
                    <ContentCopyIcon fontSize='inherit' />
                </ListItemIcon>
                <ListItemText disableTypography>Copy to Clipboard</ListItemText>
            </MenuItem>
            <MenuItem
                className='navigation-menu-item'
                sx={{ fontSize: 'inherit' }}
                disabled={clipboard.type !== clipboardDataType}
                onClick={() => handlePaste(menu.id, IndexedEntityPosition.After)}>
                <ListItemIcon>
                    <ContentPasteIcon fontSize='inherit' />
                </ListItemIcon>
                <ListItemText disableTypography>Paste from Clipboard</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem
                className='navigation-menu-item'
                sx={{ fontSize: 'inherit' }}
                onClick={() => handleDupe()}>
                <ListItemIcon>
                    <ContentCopyOutlinedIcon color={iconColor} fontSize='inherit' />
                </ListItemIcon>
                <ListItemText disableTypography>Duplicate {singularName}</ListItemText>
            </MenuItem>
            <MenuItem
                className='navigation-menu-item'
                sx={{ fontSize: 'inherit' }}
                onClick={() => handleDelete()}>
                <ListItemIcon>
                    <DeleteIcon color='error' fontSize='inherit' />
                </ListItemIcon>
                <ListItemText disableTypography>Delete {singularName}</ListItemText>
            </MenuItem>
        </Menu>
        : <></>

    return <ParameterSection
        title={title}
        includeHeader={includeHeader}
        icon={icon}
        contextMenu={contextMenu}
        iconColor={iconColor}
        helpTopic={helpTopic}
        type={entityType}
        parameters={parameters}
        singularName={singularName}
        pasteDisabled={clipboard.type !== clipboardDataType}
        onSelect={handleSelect}
        onSelectHeader={handleSelectHeader}
        onAdd={handleAdd}
        onPaste={handlePaste}
        onMove={handleMove}
        onItemMenu={showMenu}
    />
})
