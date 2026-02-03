import { useEffect } from 'react'
import { useMemo } from 'react'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import SvgIcon from '@mui/material/SvgIcon'
import { SxProps } from '@mui/material'
import { DisplaySettingsIcon, ViewListIcon, ViewListOutlinedIcon, PlayArrowIcon, ArticleOutlinedIcon, AltRouteIcon } from '../../icons'
import { RequestInfoEditor } from './request/request-info-editor'
import { RequestHeadersEditor } from './request/request-headers-editor'
import { ScienceIcon, WarningAmberIcon } from '../../icons';
import { RequestQueryStringEditor } from './request/request-query-string-editor'
import { RequestTestEditor } from './request/request-test-editor'
import { ResultsViewer } from '../viewers/results-viewer'
import { EditorTitle } from '../editor-title';
import { observer } from 'mobx-react-lite';
import { RunToolbar } from '../run-toolbar';
import { useWorkspace, RequestPanel } from '../../contexts/workspace.context';
import { RunResultsToolbar } from '../run-results-toolbar';
import { Panel, Group as PanelGroup, Separator, useDefaultLayout } from "react-resizable-panels";
import RequestIcon from '../../icons/request-icon';
import { useApicizeSettings } from '../../contexts/apicize-settings.context'
import { RequestBodyEditor } from './request/request-body-editor'
import { WarningsEditor } from './warnings-editor'
import { RequestParametersEditor } from './request/request-parameters-editor'
import { EditableRequest } from '../../models/workspace/editable-request'
import { reaction, runInAction } from 'mobx'

const RequestPanel = observer(({
    request,
}: {
    request: EditableRequest,
}) => {
    const workspace = useWorkspace()
    const settings = useApicizeSettings()

    let selectedPanel = workspace.requestPanel
    let hasWarnings = request.validationWarnings.hasEntries

    const handlePanelChanged = (_: React.SyntheticEvent, newValue: RequestPanel) => {
        if (newValue) {
            workspace.changeRequestPanel(newValue)
        }
    }

    const panelsClass = useMemo(() =>
        (selectedPanel === 'Body' || selectedPanel === 'Test') ? 'panels full-width' : 'panels',
        [selectedPanel]
    )

    if (!hasWarnings && selectedPanel === 'Warnings') {
        selectedPanel = 'Info'
        return null
    }

    return <>
        <Stack direction='row' className='editor-panel-header'>
            <EditorTitle
                icon={<SvgIcon color='request'><RequestIcon /></SvgIcon>}
                name={(request.name.length > 0) ? `${request.name} - ${selectedPanel}` : `(Unnamed) - ${selectedPanel}`}
                diag={settings.showDiagnosticInfo ? request.id : undefined}
            >
                <Box display='inline-flex' paddingLeft='1em' visibility={request.isRunning ? "visible" : "hidden"} width='2em'><PlayArrowIcon color="success" /></Box>
            </EditorTitle>
            <RunToolbar requestEntry={request} />
        </Stack>
        <Box className='editor-panel'>
            <Stack direction='row' flexGrow={1} className='editor-content' overflow='hidden'>
                <ToggleButtonGroup
                    className='button-column'
                    orientation='vertical'
                    exclusive
                    onChange={handlePanelChanged}
                    value={selectedPanel}
                    sx={{ marginRight: '12px', zIndex: 100 }}
                    aria-label="text alignment">
                    <ToggleButton value="Info" title="Show Request Info" aria-label='show info' size='small'><DisplaySettingsIcon /></ToggleButton>
                    <ToggleButton value="Query String" title="Show Request Query String" aria-label='show query string' size='small'><ViewListIcon /></ToggleButton>
                    <ToggleButton value="Headers" title="Show Request Headers" aria-label='show headers' size='small'><ViewListOutlinedIcon /></ToggleButton>
                    <ToggleButton value="Body" title="Show Request Body" aria-label='show body' size='small'><ArticleOutlinedIcon /></ToggleButton>
                    <ToggleButton value="Test" title="Show Request Tests" aria-label='show test' size='small'><ScienceIcon /></ToggleButton>
                    <ToggleButton value="Parameters" title="Show Request Parameters" aria-label='show parameters' size='small'><AltRouteIcon /></ToggleButton>
                    {
                        hasWarnings
                            ? <ToggleButton hidden={true} value="Warnings" title="Request Warnings" aria-label='show warnings' size='small'><WarningAmberIcon sx={{ color: '#FFFF00' }} /></ToggleButton>
                            : null
                    }
                </ToggleButtonGroup>


                <Box flexGrow={1} className={panelsClass}>
                    {selectedPanel === 'Info' ? <RequestInfoEditor request={request} />
                        : selectedPanel === 'Headers' ? <RequestHeadersEditor request={request} />
                            : selectedPanel === 'Query String' ? <RequestQueryStringEditor request={request} />
                                : selectedPanel === 'Body' ? <RequestBodyEditor request={request} />
                                    : selectedPanel === 'Test' ? <RequestTestEditor request={request} />
                                        : selectedPanel === 'Parameters' ? <RequestParametersEditor requestOrGroup={request} />
                                            : selectedPanel === 'Warnings' ? <WarningsEditor warnings={request.validationWarnings} onDelete={(id) => request.deleteWarning(id)} />
                                                : null}
                </Box>
            </Stack>
        </Box>
    </>
})

export const RequestEditor = observer(({ sx, request }: { sx?: SxProps, request: EditableRequest }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()

    workspace.nextHelpTopic = 'workspace/requests'

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
        id: "apicize-request",
        storage: sizeStorage
    });

    // Access observables directly in the parent to establish tracking
    const isRunning = request.isRunning
    const resultMenuItems = request.resultMenuItems
    const selectedResultMenuItem = request.selectedResultMenuItem
    const detail = workspace.currentExecutionDetail

    return resultMenuItems.length > 0 && selectedResultMenuItem
        ? <Box sx={sx}>
            <PanelGroup defaultLayout={defaultLayout} onLayoutChange={onLayoutChanged} orientation='horizontal' className='editor split'>
                <Panel id='request-editor' defaultSize={50} minSize={400} className='split-left'>
                    <RequestPanel request={request} />
                </Panel>
                <Separator className='resize-handle' />
                {
                    <Panel id='results-viewer' defaultSize={50} minSize={400} >
                        <Box position='relative' display='flex' flexGrow={1} height='100%'>
                            <Box top={0}
                                left={0}
                                width='calc(100% - 1em)'
                                height='100%'
                                position='absolute'
                                display={isRunning ? 'block' : 'none'}
                                className="MuiBackdrop-root MuiModal-backdrop"
                                sx={{ zIndex: 99999, opacity: 0.5, transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms", backgroundColor: "#000000" }} />
                            <Box position='relative' display='flex' flexGrow={1} flexDirection='column' className='split-right'>
                                <RunResultsToolbar
                                    className='editor-panel-header'
                                    request={request}
                                />
                                <ResultsViewer
                                    className='results-panel'
                                    request={request}
                                    detail={detail}
                                />
                            </Box>
                        </Box>
                    </Panel>
                }
            </PanelGroup>
        </Box>
        : <Box className='editor request single-panel' sx={sx}>
            <RequestPanel request={request} />
        </Box>
})
