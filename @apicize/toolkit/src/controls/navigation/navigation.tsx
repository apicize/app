import { observer } from "mobx-react-lite"
import { WarningAmberIcon, PlayArrowIcon, AirlineStopsIcon } from '../../icons'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { TreeItem } from '@mui/x-tree-view/TreeItem'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import SvgIcon from '@mui/material/SvgIcon'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useEffect, useCallback, useMemo } from 'react'
import { EntityType } from "../../models/workspace/entity-type";
import { useWorkspace, WorkspaceMode } from "../../contexts/workspace.context";
import DefaultsIcon from "../../icons/defaults-icon";
import { ScenarioSection } from "./sections/scenario-scection";
import { AuthorizationSection } from "./sections/authorization-section";
import { CertificateSection } from "./sections/certificate-section";
import { ProxySection } from "./sections/proxy-section";
import { RequestSection } from "./sections/request-section";
import useWindowSize from "../../window-size";
import { useApicizeSettings } from "../../contexts/apicize-settings.context";
import { NavFileOpsMenu } from "./nav-file-ops-menu"
import AuthIcon from "../../icons/auth-icon"
import CertificateIcon from "../../icons/certificate-icon"
import RequestIcon from "../../icons/request-icon"
import ScenarioIcon from "../../icons/scenario-icon"
import { NavOpsMenu } from "./nav-ops-menu"
import { iconsFromState } from "./nav-tree-item"
import { ValidationState } from "@apicize/lib-typescript"

const PREFERRED_WIDTH = 1200

export const NavigationControl = observer(() => {

    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const windowSize = useWindowSize()

    const listModes = useMemo(() => [
        WorkspaceMode.RequestList,
        WorkspaceMode.ScenarioList,
        WorkspaceMode.AuthorizationList,
        WorkspaceMode.CertificateList,
        WorkspaceMode.ProxyList
    ], [])


    useEffect(() => {
        // If window size returns to non-narrow state, and there is a list displayed, go back to "normal"
        if (windowSize.width >= PREFERRED_WIDTH && listModes.includes(workspace.mode)) {
            workspace.setMode(WorkspaceMode.Normal)
        }
    }, [windowSize, listModes, workspace])

    const toggleMode = useCallback((mode: WorkspaceMode) => {
        workspace.setMode((workspace.mode === mode) ? WorkspaceMode.Normal : mode)
    }, [workspace])

    const isNarrowMode = useMemo(() =>
        settings.alwaysHideNavTree || windowSize.width < PREFERRED_WIDTH,
        [settings.alwaysHideNavTree, windowSize.width]
    )

    return isNarrowMode
        ? <Box className='navigation-narrow' display='flex'>
            <Stack direction='column' sx={{ flexGrow: 1 }} className='nav-selection-pane' typography='navigation'>
                <ToggleButtonGroup orientation="vertical" value={workspace.mode}>
                    <ToggleButton title='Requests and Groups' value={WorkspaceMode.RequestList} onClick={() => toggleMode(WorkspaceMode.RequestList)}>
                        <SvgIcon color='request'>
                            <RequestIcon />
                        </SvgIcon>
                    </ToggleButton>
                    <ToggleButton title='Scenarios' value={WorkspaceMode.ScenarioList} onClick={() => toggleMode(WorkspaceMode.ScenarioList)}>
                        <SvgIcon color='scenario'>
                            <ScenarioIcon />
                        </SvgIcon>
                    </ToggleButton>
                    <ToggleButton title='Authorizations' value={WorkspaceMode.AuthorizationList} onClick={() => toggleMode(WorkspaceMode.AuthorizationList)}>
                        <SvgIcon color='authorization'>
                            <AuthIcon />
                        </SvgIcon>
                    </ToggleButton>
                    <ToggleButton title='Certificates' value={WorkspaceMode.CertificateList} onClick={() => toggleMode(WorkspaceMode.CertificateList)}>
                        <SvgIcon color='certificate'>
                            <CertificateIcon />
                        </SvgIcon>
                    </ToggleButton>
                    <ToggleButton title='Proxies' value={WorkspaceMode.ProxyList} onClick={() => toggleMode(WorkspaceMode.ProxyList)}>
                        <SvgIcon color='proxy'>
                            <AirlineStopsIcon />
                        </SvgIcon>
                    </ToggleButton>
                    <ToggleButton title='Defaults' value={WorkspaceMode.Defaults} onClick={() => toggleMode(WorkspaceMode.Defaults)}>+
                        <SvgIcon color='defaults'>
                            <DefaultsIcon />
                        </SvgIcon>
                    </ToggleButton>
                </ToggleButtonGroup>
                <NavFileOpsMenu orientation='vertical' sx={{ marginTop: '5em' }} />
            </Stack>
            <NavOpsMenu orientation='vertical' sx={{ display: 'flex', alignSelf: 'flex-end', margin: '0', alignContent: 'center', gap: '0.2em', width: '100%' }} />
        </Box>
        : <Stack bgcolor='workspace.main' direction='column' useFlexGap gap='0.2em' className='nav-selection-pane' typography='navigation'>
            <Stack direction='row' bgcolor='toolbar.main' padding='0.5em 1em 0.5em 0.5em' minWidth='22em' className='nav-toolbar' fontSize='inherit' typography='navigation'>
                <NavFileOpsMenu orientation='horizontal' sx={{ display: 'flex', typography: 'navigation' }} />
                <NavOpsMenu orientation='horizontal' sx={{ display: 'flex', marginLeft: 'auto', alignContent: 'right', gap: '0.2em', paddingLeft: '2em' }} />
            </Stack>
            <SimpleTreeView
                id='navigation'
                key='navigation'
                aria-label='request navigator'
                // defaultCollapseIcon={<ExpandMoreIcon />}
                // defaultExpandIcon={<ChevronRightIcon />}
                sx={{ paddingRight: '0.8em', fontSize: settings.navigationFontSize }}
                expansionTrigger='iconContainer'
                expandedItems={workspace.expandedItems}
                selectedItems={workspace.activeSelection ? `${workspace.activeSelection.entityType}-${workspace.activeSelection.id}` : null}
                multiSelect={false}
                onItemExpansionToggle={(_, itemId, isExpanded) => {
                    workspace.updateExpanded(itemId, isExpanded)
                }}
                onSelectedItemsChange={(_, itemId) => {
                    if (itemId) {
                        if (itemId === 'defaults') {
                            workspace.setMode(WorkspaceMode.Defaults)
                        } else {
                            // const i = itemId.indexOf('-')
                            // if (i !== -1) {
                            //     const type = parseInt(itemId.substring(0, i)) as EntityType
                            //     if (type !== EntityType.Header) {
                            //         const id = itemId.substring(i + 1)
                            //         workspace.changeActive(type, id)
                            //     }
                            // }
                        }
                    } else {
                        workspace.clearActive()
                    }
                }}
                className='navigation-tree'
            >
                <RequestSection includeHeader={true} />
                <ScenarioSection includeHeader={true} />
                <AuthorizationSection includeHeader={true} />
                <CertificateSection includeHeader={true} />
                <ProxySection includeHeader={true} />
                <TreeItem
                    itemId="defaults"
                    sx={{ margin: '1.0em 0 1.0em 0', padding: 0 }}
                    key='defaults'
                    label={(
                        <Box
                            className='nav-item'
                            typography='navigation'
                        >
                            <Box className='nav-icon-box'>
                                <SvgIcon color='defaults'><DefaultsIcon /></SvgIcon>
                            </Box>
                            <Box className='nav-node-text' display='flex' flexGrow={1} alignItems='center'>
                                Defaults
                                <Box display='inline-flex' width='2em' paddingLeft='1em' justifyItems='center' justifyContent='left'>
                                    {
                                        iconsFromState({
                                            id: 'defaults',
                                            name: '',
                                            validationState: workspace.defaults.warnings.hasEntries ? ValidationState.warning : undefined,
                                            executionState: undefined,
                                        })
                                    }
                                </Box>
                            </Box>
                        </Box>
                    )} />
                {/* {
                    workspace.warnings.hasEntries
                        ? <TreeItem
                            itemId="wkbk-warnings"
                            sx={{ margin: '0.5em 0 1.0em 0', padding: 0 }}
                            key='wkbk-warnings'
                            label={(
                                <Box
                                    component='span'
                                    display='flex'
                                    justifyContent='space-between'
                                    alignItems='center'
                                >
                                    <Box className='nav-icon-box'>
                                        <SvgIcon color='warning' fontSize='small'><WarningAmberIcon /></SvgIcon>
                                    </Box>
                                    <Box className='nav-node-text' display='flex' flexGrow={1} alignItems='center'>
                                        Warnings
                                    </Box>
                                </Box>
                            )} onClick={() => workspace.changeActive(EntityType.Warnings, '')} />
                        : null
                }                 */}
            </SimpleTreeView>
        </Stack >
})