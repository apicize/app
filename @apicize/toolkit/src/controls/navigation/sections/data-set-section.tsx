import { Persistence } from "@apicize/lib-typescript"
import { Box, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, SvgIcon, Theme, useTheme } from "@mui/material"
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import { EntityType } from "../../../models/workspace/entity-type"
import { useWorkspace, WorkspaceMode } from "../../../contexts/workspace.context"
import { useState } from "react"
import { MenuPosition } from "../../../models/menu-position"
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { useFeedback } from "../../../contexts/feedback.context"
import { observer } from "mobx-react-lite"
import { IndexedEntityPosition } from "../../../models/workspace/indexed-entity-position"
import { useApicizeSettings } from "../../../contexts/apicize-settings.context"
import DatasetIcon from '@mui/icons-material/Dataset';
import { NavTreeItem } from "../nav-tree-item"
import { TreeItem } from "@mui/x-tree-view"
import { NavigationEntry } from "../../../models/navigation"
import { EditableSettings } from "../../../models/editable-settings"

interface DataMenuProps {
    dataMenu: MenuPosition | undefined
    settings: EditableSettings
    theme: Theme
    onClose: () => void
    onAdd: (relativeToId: string, relativePosition: IndexedEntityPosition) => void
    onDupe: () => void
    onDelete: () => void
}

const DataMenu = observer(({ dataMenu, settings, theme, onClose, onAdd, onDupe, onDelete }: DataMenuProps) => {
    if (!dataMenu) return <></>
    return <Menu
        id='data-menu'
        open={dataMenu !== undefined}
        onClose={onClose}
        sx={{ fontSize: settings.navigationFontSize }}
        anchorReference='anchorPosition'
        anchorPosition={{
            top: dataMenu?.mouseY ?? 0,
            left: dataMenu?.mouseX ?? 0
        }}
    >
        <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(_) => onAdd(dataMenu.id, IndexedEntityPosition.After)}>
            <ListItemIcon>
                <SvgIcon fontSize='small' color='data'><DatasetIcon /></SvgIcon>
            </ListItemIcon>
            <ListItemText disableTypography>Add Data Set</ListItemText>
        </MenuItem>
        <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(_) => onDupe()}>
            <ListItemIcon>
                <SvgIcon fontSize='small' sx={{ color: theme.palette.data.light }}><ContentCopyOutlinedIcon /></SvgIcon>
            </ListItemIcon>
            <ListItemText disableTypography>Duplicate Data Set</ListItemText>
        </MenuItem>
        <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(_) => onDelete()}>
            <ListItemIcon>
                <DeleteIcon fontSize='small' color='error' />
            </ListItemIcon>
            <ListItemText disableTypography>Delete Data Set</ListItemText>
        </MenuItem>
    </Menu>
})

interface DataSetContentsProps {
    dataSets: NavigationEntry[]
    dataMenu: MenuPosition | undefined
    settings: EditableSettings
    theme: Theme
    onCloseMenu: () => void
    onAddData: (relativeToId: string, relativePosition: IndexedEntityPosition) => void
    onDupeData: () => void
    onDeleteData: () => void
    onSelect: (id: string) => void
    onShowMenu: (event: React.MouseEvent, persistence: Persistence, id: string) => void
    onMove: (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => void
}

const DataSetContents = observer(({
    dataSets,
    dataMenu,
    settings,
    theme,
    onCloseMenu,
    onAddData,
    onDupeData,
    onDeleteData,
    onSelect,
    onShowMenu,
    onMove
}: DataSetContentsProps) => {
    return <>
        <DataMenu
            dataMenu={dataMenu}
            settings={settings}
            theme={theme}
            onClose={onCloseMenu}
            onAdd={onAddData}
            onDupe={onDupeData}
            onDelete={onDeleteData}
        />
        {
            dataSets.map((e) => <NavTreeItem
                type={EntityType.DataSet}
                entry={e}
                key={e.id}
                depth={2}
                onSelect={onSelect}
                isDraggable={true}
                acceptDropTypes={[EntityType.DataSet]}
                onMenu={(e, id) => onShowMenu(e, Persistence.Workbook, id)}
                onMove={onMove}
            />)
        }
    </>
})

export const DataSetSection = observer(({
    includeHeader,
}: {
    includeHeader: boolean,
}) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const theme = useTheme()
    const settings = useApicizeSettings()

    const [dataMenu, setDataMenu] = useState<MenuPosition | undefined>(undefined)
    const [focused, setFocused] = useState<boolean>(false)

    const closeDataMenu = () => {
        setDataMenu(undefined)
    }

    const selectData = (id: string) => {
        workspace.changeActive(EntityType.DataSet, id)
    }

    const handleAddData = (relativeToId: string | null, relativePosition: IndexedEntityPosition) => {
        closeDataMenu()
        workspace.addDataSet(relativeToId, relativePosition, null)
    }

    const handleSelectHeader = (headerId: string, helpTopic?: string) => {
        // closeAllMenus()
        if (helpTopic) {
            workspace.showHelp(helpTopic, headerId)
        }
    }

    const handleMoveData = (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => {
        selectData(id)
        workspace.moveDataSet(id, relativeToId, relativePosition)
    }

    const handleDupeData = () => {
        closeDataMenu()
        const id = dataMenu?.id
        if (!id) return
        workspace.addDataSet(id, IndexedEntityPosition.After, id)
    }

    const showDataMenu = (event: React.MouseEvent, persistence: Persistence, id: string) => {
        setDataMenu(
            {
                id,
                type: EntityType.DataSet,
                mouseX: event.clientX - 1,
                mouseY: event.clientY - 6,
                persistence,
            }
        )
    }

    const handleDeleteData = () => {
        closeDataMenu()
        const id = dataMenu?.id
        if (!id) return
        feedback.confirm({
            title: 'Delete Data Source',
            message: `Are you are you sure you want to delete ${workspace.getNavigationName(id)}?`,
            okButton: 'Yes',
            cancelButton: 'No',
            defaultToCancel: true
        }).then((result) => {
            if (result) {
                workspace.deleteDataSet(id)
            }
        })
    }

    const dataSetContentsProps = {
        dataMenu,
        settings,
        theme,
        onCloseMenu: closeDataMenu,
        onAddData: handleAddData,
        onDupeData: handleDupeData,
        onDeleteData: handleDeleteData,
        onSelect: selectData,
        onShowMenu: showDataMenu,
        onMove: handleMoveData
    }

    const headerId = `hdr-${EntityType.DataSet}`
    return includeHeader
        ? <TreeItem
            itemId={headerId}
            key={headerId}
            id={headerId}
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
                        handleSelectHeader(`hdr-${EntityType.DataSet}`, 'workspace/data-sets')
                    }}
                    onMouseEnter={() => {
                        setFocused(true)
                    }}

                    onMouseLeave={() => {
                        setFocused(false)
                    }}
                >
                    <Box className='nav-icon-box' typography='navigation'><SvgIcon color='data' fontSize='inherit'><DatasetIcon /></SvgIcon></Box>
                    <Box className='nav-node-text' typography='navigation' sx={{ flexGrow: 1 }}>
                        Data Sets
                    </Box>
                    <IconButton sx={{ flexGrow: 0, margin: 0, padding: 0, visibility: focused ? 'normal' : 'hidden' }} onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleAddData(null, IndexedEntityPosition.After)
                        workspace.updateExpanded(headerId, true)
                    }}>
                        <Box className='nav-icon-context'>
                            <AddIcon style={{ fontSize: settings.navigationFontSize * 1.5 }} />
                        </Box>
                    </IconButton>

                </Box>
            )}>
            <DataSetContents dataSets={workspace.navigation.dataSets} {...dataSetContentsProps} />
        </TreeItem>
        : <DataSetContents dataSets={workspace.navigation.dataSets} {...dataSetContentsProps} />
})