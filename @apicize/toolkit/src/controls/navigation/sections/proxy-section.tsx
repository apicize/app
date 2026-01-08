import { Persistence } from "@apicize/lib-typescript"
import { ListItemIcon, ListItemText, Menu, MenuItem, SvgIcon, useTheme } from "@mui/material"
import ProxyIcon from "../../../icons/proxy-icon"
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import { EntityType } from "../../../models/workspace/entity-type"
import { useWorkspace } from "../../../contexts/workspace.context"
import { useState } from "react"
import { ParameterSection } from "./parameter-section"
import { MenuPosition } from "../../../models/menu-position"
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { useFeedback } from "../../../contexts/feedback.context"
import { observer } from "mobx-react-lite"
import { IndexedEntityPosition } from "../../../models/workspace/indexed-entity-position"
import { useApicizeSettings } from "../../../contexts/apicize-settings.context"

export const ProxySection = observer(({
    includeHeader,
}: {
    includeHeader: boolean,
}) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const theme = useTheme()
    const settings = useApicizeSettings()

    const [proxyMenu, setProxyMenu] = useState<MenuPosition | undefined>(undefined)

    const closeProxyMenu = () => {
        setProxyMenu(undefined)
    }

    const selectProxy = (id: string) => {
        workspace.changeActive(EntityType.Proxy, id)
    }

    const handleAddProxy = (relativeToId: string, relativePosition: IndexedEntityPosition) => {
        closeProxyMenu()
        workspace.addProxy(relativeToId, relativePosition, null)
    }

    const handleSelectHeader = (headerId: string, helpTopic?: string) => {
        // closeAllMenus()
        if (helpTopic) {
            workspace.showHelp(helpTopic, headerId)
        }
    }

    const handleMoveProxy = (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => {
        selectProxy(id)
        workspace.moveProxy(id, relativeToId, relativePosition)
    }

    const handleDupeProxy = () => {
        closeProxyMenu()
        const id = proxyMenu?.id
        if (!id) return
        workspace.addProxy(id, IndexedEntityPosition.After, id)
    }

    const showProxyMenu = (event: React.MouseEvent, persistence: Persistence, id: string) => {
        setProxyMenu(
            {
                id,
                type: EntityType.Proxy,
                mouseX: event.clientX - 1,
                mouseY: event.clientY - 6,
                persistence,
            }
        )
    }

    const handleDeleteProxy = () => {
        closeProxyMenu()
        const id = proxyMenu?.id
        if (!id) return
        feedback.confirm({
            title: 'Delete Proxy',
            message: `Are you are you sure you want to delete ${workspace.getNavigationName(id)}?`,
            okButton: 'Yes',
            cancelButton: 'No',
            defaultToCancel: true
        }).then((result) => {
            if (result) {
                workspace.deleteProxy(id)
            }
        })
    }

    function ProxyMenu() {
        return proxyMenu
            ? <Menu
                id='proxy-menu'
                open={proxyMenu !== undefined}
                onClose={closeProxyMenu}
                sx={{ fontSize: settings.navigationFontSize }}
                anchorReference='anchorPosition'
                anchorPosition={{
                    top: proxyMenu?.mouseY ?? 0,
                    left: proxyMenu?.mouseX ?? 0
                }}
            >
                <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(_) => handleAddProxy(proxyMenu.id, IndexedEntityPosition.After)}>
                    <ListItemIcon>
                        <SvgIcon fontSize='small' color='proxy'><ProxyIcon /></SvgIcon>
                    </ListItemIcon>
                    <ListItemText disableTypography>Add Proxy</ListItemText>
                </MenuItem>
                <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(e) => handleDupeProxy()}>
                    <ListItemIcon>
                        <SvgIcon fontSize='small' sx={{ color: theme.palette.proxy.light }}><ContentCopyOutlinedIcon /></SvgIcon>
                    </ListItemIcon>
                    <ListItemText disableTypography>Duplicate Proxy</ListItemText>
                </MenuItem>
                <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(e) => handleDeleteProxy()}>
                    <ListItemIcon>
                        <DeleteIcon fontSize='small' color='error' />
                    </ListItemIcon>
                    <ListItemText disableTypography>Delete Proxy</ListItemText>
                </MenuItem>
            </Menu>
            : <></>
    }

    return <ParameterSection
        title='Proxys'
        includeHeader={includeHeader}
        icon={<ProxyIcon />}
        contextMenu={<ProxyMenu />}
        iconColor='proxy'
        helpTopic='workspace/proxies'
        type={EntityType.Proxy}
        parameters={workspace.navigation.proxies}
        onSelect={selectProxy}
        onSelectHeader={handleSelectHeader}
        onAdd={handleAddProxy}
        onMove={handleMoveProxy}
        onItemMenu={showProxyMenu}
    />
})