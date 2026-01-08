import { Box, Button, Grid, IconButton, Link, Menu, MenuItem, Stack, SvgIcon, useTheme } from "@mui/material"
import { Typography } from "@mui/material"
import CheckIcon from '@mui/icons-material/Check'
import BlockIcon from '@mui/icons-material/Block'
import { observer } from "mobx-react-lite"
import { useWorkspace } from "../../../contexts/workspace.context"
import { ApicizeError, ApicizeTestBehavior, ExecutionReportFormat, ExecutionResultSuccess, ExecutionResultSummary, RequestEntry } from "@apicize/lib-typescript"
import React, { useRef, useState } from "react"
import ViewIcon from "../../../icons/view-icon"
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useApicizeSettings } from "../../../contexts/apicize-settings.context"
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import ErrorIcon from '@mui/icons-material/Error';
import { EditableRequestEntry } from "../../../models/workspace/editable-request-entry"
import { ResultErrorIcon, ResultFailureIcon, ResultSuccessIcon } from "../../../icons"
import { useFeedback } from "../../../contexts/feedback.context"

const ApicizeErrorToString = (error?: ApicizeError): string => {
    const desc = error?.description ? ` ${error.description}` : ''
    const sub = error?.source ? ` ${ApicizeErrorToString(error.source)}` : ''
    return error ? `[${error.type}]${desc}${sub}` : ''
}

export const ResultInfoViewer = observer(({
    request,
}: {
    request: EditableRequestEntry,
}) => {

    const workspace = useWorkspace()
    const theme = useTheme()
    const settings = useApicizeSettings()
    const feedback = useFeedback()

    const [selectedSummary, setSelectedSummary] = useState<ExecutionResultSummary | null>(null)

    const [formatMenu, setFormatMenu] = useState<{
        open: boolean
        anchorEl: null | HTMLElement
    }>({
        open: false,
        anchorEl: null
    })

    if (!request.selectedResultMenuItem) {
        return null
    }

    if (selectedSummary?.execCtr !== request.selectedResultMenuItem?.execCtr) {
        try {
            setSelectedSummary(request.getSummary(request.selectedResultMenuItem.execCtr))
        } catch (e) {
            feedback.toastError(e)
        }
        return null
    }

    const total = selectedSummary.requestSuccessCount + selectedSummary.requestFailureCount + selectedSummary.requestErrorCount

    if (total === 0) {
        return null
    }

    let hideSuccess = request.hideSuccess
    let hideFailure = request.hideFailure
    let hideError = request.hideError

    let hasSuccess = selectedSummary.requestSuccessCount > 0
    let hasFailure = selectedSummary.requestFailureCount > 0
    let hasError = selectedSummary.requestErrorCount > 0

    let enableSuccessFilter = hasSuccess
    let enableFailureFilter = hasFailure
    let enableErrorFilter = hasError

    if (selectedSummary.requestSuccessCount === total) {
        hideSuccess = false
        enableSuccessFilter = false
    } else if (selectedSummary.requestFailureCount === total) {
        hideFailure = false
        enableFailureFilter = false
    } else if (selectedSummary.requestErrorCount === total) {
        hideError = false
        enableErrorFilter = false
    }




    let idx = 0

    const executingTitle = request.selectedResultMenuItem.executingName

    const fmtMinSec = (value: number, subZero: string | null = null) => {
        if (value === 0 && subZero) {
            return subZero
        }
        const m = Math.floor(value / 60000)
        value -= m * 60000
        const s = Math.floor(value / 1000)
        value -= s * 1000
        return `${m.toLocaleString().padStart(2, '0')}:${s.toString().padStart(2, '0')}${(0.1).toLocaleString()[1]}${value.toString().padEnd(3, '0')}`
    }

    const CopyDataButton = ({ execCtr }: { execCtr: number }) => {
        const handleFormatMenuClick = ({ currentTarget }: { currentTarget: HTMLElement }) => {
            setFormatMenu({ open: true, anchorEl: currentTarget });
        }

        const handleFormatMenuClose = () => {
            setFormatMenu((prevState) => ({ ...prevState, open: false }));
        }

        return <>
            <IconButton
                title={`Copy Data to Clipboard (${settings.reportFormat})`}
                color='primary'
                onClick={e => copyToClipboard(e, execCtr)}>
                <ContentCopyIcon />
            </IconButton>

            <IconButton
                id={`copy-${execCtr}`}
                title={`Copy Data to Clipboard (Select Format)`}
                size="large"
                sx={{ padding: '0 0.75em 0 0.75em', minWidth: '1em', width: '1em', marginLeft: '-0.3em', alignSelf: 'begin', alignItems: 'end' }}
                onClick={handleFormatMenuClick}
            ><KeyboardArrowDownIcon />
            </IconButton>
            <Menu
                id="copy-format-options"
                autoFocus
                className="drop-down-menu"
                anchorEl={formatMenu.anchorEl}
                open={formatMenu.open}
                onClose={handleFormatMenuClose}
            >
                <MenuItem autoFocus={settings.reportFormat == ExecutionReportFormat.JSON} key='report-format-json' disableRipple onClick={e => {
                    copyToClipboard(e, execCtr, ExecutionReportFormat.JSON)
                    settings.setReportFormat(ExecutionReportFormat.JSON)
                    handleFormatMenuClose()
                }}>
                    <Box display='flex' alignContent='center'>
                        Apicize JSON Format
                        {
                            settings.reportFormat === ExecutionReportFormat.JSON
                                ? <CheckIcon sx={{ marginLeft: '0.5em' }} />
                                : null
                        }
                    </Box>
                </MenuItem>
                <MenuItem autoFocus={settings.reportFormat == ExecutionReportFormat.CSV} key='report-format-csv' disableRipple onClick={e => {
                    copyToClipboard(e, execCtr, ExecutionReportFormat.CSV)
                    settings.setReportFormat(ExecutionReportFormat.CSV)
                    handleFormatMenuClose()
                }}>
                    <Box display='flex' alignContent='center'>
                        Apicize CSV Format
                        {
                            settings.reportFormat === ExecutionReportFormat.CSV
                                ? <CheckIcon sx={{ marginLeft: '0.5em' }} />
                                : null
                        }
                    </Box>
                </MenuItem>
            </Menu>
        </>
    }

    const RenderExecution = ({ result: result, depth }: { result: ExecutionResultSummary, depth: number }) => {
        // const rowSuffix = props.result.info.rowNumber && props.result.info.rowCount ? ` Row ${props.result.info.rowNumber} of ${props.result.info.rowCount}` : ''
        let subtitle: string
        let color: string

        const totalToShow = (
            hideSuccess ? 0 : result.requestSuccessCount
        ) + (
                hideFailure ? 0 : result.requestFailureCount
            ) + (
                hideError ? 0 : result.requestErrorCount
            )

        if (totalToShow === 0) {
            return null
        }

        switch (result.success) {
            case ExecutionResultSuccess.Error:
                subtitle = 'Error'
                color = theme.palette.error.main
                break
            case ExecutionResultSuccess.Failure:
                subtitle = 'Failure'
                color = theme.palette.warning.main
                break
            default:
                subtitle = 'Success'
                color = theme.palette.success.main
                break
        }

        const isFirst = depth === 0
        const key = isFirst ? 'first-result' : `result-${request.id}-${idx++}`

        return <Box key={key} className='results-test-section'>
            <>
                {
                    depth === 0 && executingTitle
                        ? <Typography variant="h3" sx={{ marginTop: 0, paddingTop: 0, fontStyle: 'italic' }}>Executed from {executingTitle}</Typography>
                        : null
                }
                {
                    <Grid container direction='row' display='flex' alignItems='center' >
                        <Grid display='flex' flexDirection='column' alignItems='start' alignContent='center' flexGrow='content'>
                            <Box display='flex'>
                                <Box sx={{ whiteSpace: 'nowrap' }} className='results-test-name'>
                                    {result.name}{result.key ? <Typography className='tag'> [{result.key}]</Typography> : null}
                                    <Box component='span' marginLeft='1rem' marginRight='0.5rem' sx={{ color }}> ({subtitle}) </Box>
                                </Box>
                            </Box>
                            <Box display='block' alignContent='start' marginLeft='1.5rem' className='results-test-timing'>
                                <Box>
                                    {result.executedAt > 0 ? `@${fmtMinSec(result.executedAt)}` : '@Start'}{result.duration > 0 ? ` for ${result.duration.toLocaleString()} ms` : ''}
                                </Box>
                                {
                                    result.url
                                        ? (<Box className='results-url'>{`${result.method ? `${result.method} ` : ''}${result.url}`}</Box>)
                                        : (null)
                                }
                                {
                                    result.status
                                        ? (<Box>{`Status: ${result.status} ${result.statusText}`}</Box>)
                                        : (null)
                                }
                            </Box>
                        </Grid>
                        <Grid display='flex' flexBasis='content' alignItems='center' alignContent='start' marginLeft='1.0rem'>
                            <CopyDataButton execCtr={result.execCtr} />
                            {
                                isFirst
                                    ? <></>
                                    : <Link title='View Details' underline='hover' display='inline-flex' marginLeft='0.5rem' alignItems='center' onClick={e => changeResult(e, result.execCtr)}><SvgIcon><ViewIcon /></SvgIcon></Link>
                            }
                        </Grid>
                    </Grid >
                }
                <Box margin='0.5rem 0 0.5rem 1.5rem'>
                    {
                        result.error
                            ? (<TestInfo success={result.success} text={`${ApicizeErrorToString(result.error)}`} />)
                            : (null)
                    }
                </Box>
                {
                    (result.testResults && result.testResults.length > 0)
                        ? <Box className='test-details'>
                            {
                                result.testResults.map(testResult => <TestBehavior behavior={testResult} key={`result-${request.id}-${idx++}`} />)
                            }
                        </Box>
                        : (null)
                }
                {
                    (result.childExecCtrs ?? []).map(childExecCtr => {
                        try {
                            const child = request.getSummary(childExecCtr)
                            const childKey = `result-${request.id}-${idx++}`
                            return child ? <RenderExecution key={childKey} result={child} depth={depth + 1} /> : null
                        } catch (e) {
                            feedback.toastError(e)
                            return null
                        }
                    })
                }
            </>
        </Box>

        {/* //     
        //     {/* {props.tokenCached
        //             ? (<TestInfo text='OAuth bearer token retrieved from cache' />)
        //             : (<></>)} */}

    }

    const TestInfo = ({ success, text }: { success: ExecutionResultSuccess, text: string }) => {
        const key = `result-${request.id}-${idx++}`
        switch (success) {
            case ExecutionResultSuccess.Error:
                return <Stack key={key} direction='row'>
                    <Box className='test-result-icon'><ErrorIcon color="error" fontSize='medium' /></Box>
                    <Typography className='test-result-detail' color='error'>{text}</Typography>
                </Stack>
            case ExecutionResultSuccess.Failure:
                return <Box key={key} color='warn' className='test-result-behavior'><Box className='test-result-text'></Box>{text}</Box>
            default:
                return <Box key={key} className='test-result-behavior'>{text}</Box>
        }
    }

    const TestBehavior = ({ behavior }: { behavior: ApicizeTestBehavior }) => {
        const key = `result-${request.id}-${idx++}`

        const error = (behavior.error && behavior.error.length > 0) ? behavior.error : null
        const logs = (behavior.logs?.length ?? 0) > 0 ? behavior.logs : null

        const className = 'test-result-behavior'

        return (error || logs)
            ? <Box key={key} className={className}>
                <Stack direction='row' key={`result-${request.id}-${idx++}`}>
                    <Box className='test-result-icon' key={`result-${idx++}`}>
                        {behavior.success ? (<CheckIcon color='success' />) : (<BlockIcon color='warning' />)}
                    </Box>
                    <Stack direction='column' key={`result-${request.id}-${idx++}`} className='test-result-detail'>
                        <Box key={`result-${request.id}-${idx++}`}>
                            {behavior.name}{behavior.tag ? <Typography className='tag'> [{behavior.tag}]</Typography> : null}
                        </Box>
                        <Box className='test-result-detail-info'>
                            {
                                error
                                    ?
                                    <Stack direction='column' key={`result-${request.id}-${idx++}`}>
                                        <Typography key={`result-${request.id}-${idx++}`} className='test-result-error' color='warning'>{behavior.error}</Typography>
                                    </Stack>
                                    : null
                            }
                            {
                                (behavior.logs ?? []).map((log) => (
                                    <Stack direction='column' key={`result-${request.id}-${idx++}`}>
                                        <code className='results-log' key={`result-${request.id}-${idx++}`}>{log}</code>
                                    </Stack>
                                ))
                            }
                        </Box>
                    </Stack>
                </Stack>
            </Box >
            : <Box key={key} className={className}>
                <Stack direction='row' key={`result-${request.id}-${idx++}`} className='test-result-detail'>
                    <Box className='test-result-icon' key={`result-${request.id}-${idx++}`}>
                        {behavior.success ? (<CheckIcon color='success' />) : (<BlockIcon color='error' />)}
                    </Box>
                    <Box key={`result-${request.id}-${idx++}`}>
                        <Typography sx={{ marginTop: 0, marginBottom: 0, paddingTop: 0 }} component='div' key={`result-${request.id}-${idx++}`}>
                            {behavior.name} {behavior.tag ? <Typography className='tag'>[{behavior.tag}]</Typography> : null}
                        </Typography>
                    </Box>
                </Stack>
            </Box >
    }

    // const TestScenario = (props: { scenario: ApicizeTestScenario }) => {
    //     const key = `result-${idx++}`
    //     const scenario = props.scenario

    //     if (scenario.children.length === 1) {
    //         const child = scenario.children[0]
    //         if (child.type === 'Behavior') {
    //             return <TestBehavior behavior={child} namePrefix={scenario.name} />
    //         }
    //     }

    //     return <Box key={key} className='test-result'>
    //         <Stack direction='row' key={`result-${idx++}`}>
    //             <Box sx={{ width: '1.5rem', marginRight: '0.5rem' }} key={`result-${idx++}`}>
    //                 {scenario.success ? (<CheckIcon color='success' />) : (<BlockIcon color='error' />)}
    //             </Box>
    //             <Stack direction='column'>
    //                 <Box key={`result-${idx++}`}>
    //                     <Typography sx={{ marginTop: 0, marginBottom: 0, paddingTop: 0 }} component='div' key={`result-${idx++}`}>
    //                         {scenario.name}
    //                     </Typography>
    //                 </Box>
    //                 {
    //                     scenario.children.map(c => <TestResult result={c} key={`result-${idx++}`} />)
    //                 }
    //             </Stack>
    //         </Stack>
    //     </Box>
    // }

    const changeResult = (e: React.MouseEvent, execCtr: number) => {
        e.preventDefault()
        e.stopPropagation()
        request.changeExecCtr(execCtr)

    }

    const copyToClipboard = (e: React.MouseEvent, execCtr: number, format?: ExecutionReportFormat) => {
        const payloadType = format === ExecutionReportFormat.CSV ? 'ResponseSummaryCsv' : 'ResponseSummaryJson'
        workspace.copyToClipboard({
            payloadType,
            execCtr: execCtr
        }, payloadType === "ResponseSummaryCsv" ? 'Summary as CSV' : 'Summary as JSON')
    }

    const result = <Stack className="results-info" sx={{
        position: 'absolute', top: 0, bottom: 0, right: 0, width: '100%', overflow: 'hidden', display: 'flex',
    }}>
        {/* <Typography variant='h2' sx={{ marginTop: 0, flexGrow: 0 }} component='div'>
            {title}
            <IconButton
                aria-label="copy results to clipboard"
                title="Copy Results to Clipboard"
                sx={{ marginLeft: '1rem' }}
                color='primary'
                onClick={_ => copyToClipboard(result)}>
                <ContentCopyIcon />
            </IconButton>
        </Typography> */}
        <Box sx={{ overflow: 'auto', bottom: 0, paddingRight: '24px', position: 'relative' }}>
            <Box display='flex' flexDirection='row' alignItems='start' gap='1em' margin='0 1.5em 1.5em 1.5em'>
                <Button
                    variant='outlined'
                    size='small'
                    disabled={!enableSuccessFilter}
                    className={hasSuccess ? '' : 'borderless'}
                    color={hideSuccess ? 'unselected' : 'success'}
                    onClick={(e) => { if (enableSuccessFilter) { request.toggleSuccess() } else { e.stopPropagation(); e.preventDefault(); } }}
                    startIcon={<SvgIcon><ResultSuccessIcon /></SvgIcon>}>
                    <Typography color={request.hideSuccess || !hasSuccess ? 'unselected' : 'success'}>Success: {selectedSummary.requestSuccessCount}</Typography>
                </Button>
                <Button
                    variant='outlined'
                    size='small'
                    disabled={!enableFailureFilter}
                    className={hasFailure ? '' : 'borderless'}
                    color={hideFailure ? 'unselected' : 'warning'}
                    onClick={(e) => { if (enableFailureFilter) { request.toggleFailure() } else { e.stopPropagation(); e.preventDefault(); } }}
                    startIcon={<SvgIcon><ResultFailureIcon /></SvgIcon>}>
                    <Typography color={request.hideFailure || !hasFailure ? 'unselected' : 'warning'}>Failure: {selectedSummary.requestFailureCount}</Typography>
                </Button>
                <Button
                    variant='outlined'
                    size='small'
                    disabled={!enableErrorFilter}
                    className={hasError ? '' : 'borderless'}
                    color={hideError ? 'unselected' : 'error'}
                    onClick={(e) => { if (enableErrorFilter) { request.toggleError() } else { e.stopPropagation(); e.preventDefault(); } }}
                    startIcon={<SvgIcon><ResultErrorIcon /></SvgIcon>}>
                    <Typography color={request.hideError || !hasError ? 'unselected' : 'error'}>Error: {selectedSummary.requestErrorCount}</Typography>
                </Button>
            </Box>
            <Box>
                <RenderExecution result={selectedSummary} depth={0} />
            </Box>
        </Box>
    </Stack>
    return result
})

