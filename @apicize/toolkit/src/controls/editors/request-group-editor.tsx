import * as React from 'react'
import { ToggleButtonGroup, ToggleButton, Box, Stack, SxProps, SvgIcon } from '@mui/material'
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings'
import FolderIcon from '../../icons/folder-icon'
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AltRouteIcon from '@mui/icons-material/AltRoute'
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ResultsViewer } from '../viewers/results-viewer'
import { EditorTitle } from '../editor-title';
import { RequestParametersEditor } from './request/request-parameters-editor';
import { observer } from 'mobx-react-lite';
import { RunToolbar } from '../run-toolbar';
import { useWorkspace, GroupPanel } from '../../contexts/workspace.context';
import { RunResultsToolbar } from '../run-results-toolbar';
import { Panel, Group as PanelGroup, Separator, useDefaultLayout } from "react-resizable-panels";
import { useFileOperations } from '../../contexts/file-operations.context';
import { useApicizeSettings } from '../../contexts/apicize-settings.context'
import { RequestGroupInfoEditor } from './request/request-group-info-editor';
import { WarningsEditor } from './warnings-editor';
import { EditableRequestGroup } from '../../models/workspace/editable-request-group';
import { reaction, runInAction } from 'mobx';

export const RequestGroupEditor = observer(({ group, sx }: { group: EditableRequestGroup, sx?: SxProps }) => {
    const settings = useApicizeSettings()

    const workspace = useWorkspace()

    workspace.nextHelpTopic = 'workspace/groups'

    React.useEffect(() => {
        const disposer = reaction(
            () => workspace.data,
            () => runInAction(() => {
                group.parameters = undefined
            })
        )
        return () => disposer()
    })

    const handlePanelChanged = (_: React.SyntheticEvent, newValue: GroupPanel) => {
        if (newValue) {
            workspace.changeGroupPanel(newValue)
        }
    }

    let usePanel = workspace.groupPanel
    const hasWarnings = group.warnings.hasEntries

    if (!hasWarnings && usePanel === 'Warnings') {
        usePanel = 'Info'
    }

    // let lastResize = Date.now()
    // const saveIfSettled = () => {
    //     if (Date.now() - lastResize > 500) {
    //         fileOps.saveSettings()
    //     } else {
    //         setTimeout(saveIfSettled, 500)
    //     }
    // }

    const GroupPanel = observer(() => {
        return <>
            <Stack direction='row' className='editor-panel-header'>
                <EditorTitle
                    icon={<SvgIcon color='folder'><FolderIcon /></SvgIcon>}
                    name={group.name.length ?? 0 > 0 ? `${group.name} - ${usePanel}` : '(Unnamed)'}
                    diag={settings.showDiagnosticInfo ? group.id : undefined}
                >
                    <Box display='inline-flex' paddingLeft='1em' visibility={group.isRunning ? "visible" : "hidden"} width='2em'><PlayArrowIcon color="success" /></Box>
                </EditorTitle>
                <RunToolbar requestEntry={group} />
            </Stack>
            <Box className='editor-panel'>
                <Stack direction='row' className='editor-content' flexGrow={1}>
                    <ToggleButtonGroup
                        className='button-column'
                        orientation='vertical'
                        exclusive
                        onChange={handlePanelChanged}
                        value={usePanel}
                        sx={{ marginRight: '12px', zIndex: 100 }}
                        aria-label="text alignment">
                        <ToggleButton value="Info" title="Show Group Info" aria-label='show info' size='small'><DisplaySettingsIcon /></ToggleButton>
                        <ToggleButton value="Parameters" title="Show Group Parameters" aria-label='show test' size='small'><AltRouteIcon /></ToggleButton>
                        {
                            hasWarnings
                                ? <ToggleButton hidden={true} value="Warnings" title="Request Warnings" aria-label='show warnings'><WarningAmberIcon sx={{ color: '#FFFF00' }} /></ToggleButton>
                                : null
                        }
                    </ToggleButtonGroup>
                    <Box className='panels' flexGrow={1}>
                        <Box>
                            {usePanel === 'Info' ? <RequestGroupInfoEditor group={group} />
                                : usePanel === 'Parameters' ? <RequestParametersEditor requestOrGroup={group} />
                                    : usePanel === 'Warnings' ? <WarningsEditor warnings={group.warnings} onDelete={(id) => group.deleteWarning(id)} />
                                        : null}
                        </Box>
                    </Box>
                </Stack>
            </Box>
        </>
    })

    const GroupEditorLayout = observer(({ sx: editorSx }: { sx?: SxProps }) => {
        const sizeStorage = {
            getItem: (_: string) => {
                return settings.editorPanels
            },
            setItem: (_: string, value: string) => {
                runInAction(() => {
                    if (settings.editorPanels !== value) {
                        settings.editorPanels = value
                    }
                })
            }
        }

        const { defaultLayout, onLayoutChanged } = useDefaultLayout({
            id: "apicize-group",
            storage: sizeStorage
        });

        return group.resultMenuItems.length > 0 && group.selectedResultMenuItem
            ? <Box sx={{ ...editorSx }} >
                <PanelGroup orientation='horizontal' className='editor split' defaultLayout={defaultLayout} onLayoutChange={onLayoutChanged}>
                    <Panel id='request-editor' defaultSize={50} minSize={400} className='split-left'>
                        <GroupPanel />
                    </Panel>
                    <Separator className='resize-handle' />
                    <Panel id='results-viewer' defaultSize={50} minSize={400}>
                        <Box position='relative' display='flex' flexGrow={1} sx={{ height: '100%' }}>
                            <Box top={0}
                                left={0}
                                width='calc(100% - 1em)'
                                height='100%'
                                position='absolute'
                                display={group.isRunning ? 'block' : 'none'}
                                className="MuiBackdrop-root MuiModal-backdrop"
                                sx={{ zIndex: 99999, opacity: 0.5, transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms" }} />
                            <Box position='relative' display='flex' flexGrow={1} flexDirection='column' className='split-right'>
                                <RunResultsToolbar
                                    className='editor-panel-header'
                                    request={group}
                                />
                                <ResultsViewer
                                    className='results-panel'
                                    request={group}
                                    detail={workspace.currentExecutionDetail} />
                            </Box>
                        </Box>
                    </Panel>
                </PanelGroup>
            </Box>
            : <Box className='editor group single-panel' sx={editorSx}>
                <GroupPanel />
            </Box>
    })

    return <GroupEditorLayout sx={sx} />

})