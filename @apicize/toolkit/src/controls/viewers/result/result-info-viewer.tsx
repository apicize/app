import { Box, Grid, IconButton, Link, Menu, MenuItem, Stack, SvgIcon, useTheme } from "@mui/material"
import { Typography } from "@mui/material"
import CheckIcon from '@mui/icons-material/Check'
import BlockIcon from '@mui/icons-material/Block'
import { observer } from "mobx-react-lite"
import { useClipboard } from "../../../contexts/clipboard.context"
import { useWorkspace } from "../../../contexts/workspace.context"
import { ApicizeError, ApicizeTestBehavior, ExecutionReportFormat, ExecutionResultSuccess, ExecutionResultSummary } from "@apicize/lib-typescript"
import React, { useRef, useState } from "react"
import ViewIcon from "../../../icons/view-icon"
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { ToastSeverity, useFeedback } from "../../../contexts/feedback.context"
import { useApicizeSettings } from "../../../contexts/apicize-settings.context"
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'

const ApicizeErrorToString = (error?: ApicizeError): string => {
    const desc = error?.description ? ` ${error.description}` : ''
    const sub = error?.source ? ` ${ApicizeErrorToString(error.source)}` : ''
    return error ? `[${error.type}]${desc}${sub}` : ''
}

export const ResultInfoViewer = observer((props: { requestOrGroupId: string, resultIndex: number, results: ExecutionResultSummary[] }) => {

    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const theme = useTheme()
    const clipboardCtx = useClipboard()
    const feedback = useFeedback()

    const requestOrGroupId = props.requestOrGroupId
    const mainResultIndex = props.resultIndex
    const mainResult = props.results[mainResultIndex]

    let idx = 0
    let summaries: Map<number, ExecutionResultSummary>

    if (!mainResult) {
        return null
    }

    try {
        summaries = retrieveSummariesForIndex(props.results, mainResultIndex)
    } catch (e) {
        feedback.toastError(e)
        return null
    }

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

    const CopyDataButton = ({ parentKey: key, requestOrGroupId, index }: { parentKey: string, requestOrGroupId: string, index: number }) => {
        const [formatMenu, setFormatMenu] = useState<{
            open: boolean
            anchorEl: null | HTMLElement
        }>({
            open: false,
            anchorEl: null
        })

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
                onClick={e => copyToClipboard(e, requestOrGroupId, index)}>
                <ContentCopyIcon />
            </IconButton>

            <IconButton
                id={`${key}-copy`}
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
                    copyToClipboard(e, requestOrGroupId, index, ExecutionReportFormat.JSON)
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
                    copyToClipboard(e, requestOrGroupId, index, ExecutionReportFormat.CSV)
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

    const RenderExecution = ({ childResult, depth }: { childResult: ExecutionResultSummary, depth: number }) => {
        // const rowSuffix = props.result.info.rowNumber && props.result.info.rowCount ? ` Row ${props.result.info.rowNumber} of ${props.result.info.rowCount}` : ''
        let subtitle: string
        let color: string

        switch (childResult.success) {
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
        const key = isFirst ? 'first-result' : `result-${idx++}`

        return <Box key={key} className='results-test-section'>
            {
                <Grid container direction='row' display='flex' alignItems='center' >
                    <Grid display='flex' flexDirection='column' alignItems='start' alignContent='center' flexGrow='content'>
                        <Box display='flex'>
                            <Box sx={{ whiteSpace: 'nowrap' }} className='results-test-name'>
                                {childResult.name}{childResult.key ? <Typography className='tag'> [{childResult.key}]</Typography> : null}
                                <Box component='span' marginLeft='1rem' marginRight='0.5rem' sx={{ color }}> ({subtitle}) </Box>
                            </Box>
                        </Box>
                        <Box display='block' alignContent='start' marginLeft='1.5rem' className='results-test-timing'>
                            <Box>
                                {childResult.executedAt > 0 ? `@${fmtMinSec(childResult.executedAt)}` : '@Start'}{childResult.duration > 0 ? ` for ${childResult.duration.toLocaleString()} ms` : ''}
                            </Box>
                            {
                                childResult.url
                                    ? (<Box>{`${childResult.method ? `[${childResult.method}] ` : ''}${childResult.url}`}</Box>)
                                    : (null)
                            }
                            {
                                childResult.status
                                    ? (<Box>{`Status: ${childResult.status} ${childResult.statusText}`}</Box>)
                                    : (null)
                            }
                        </Box>
                    </Grid>
                    <Grid display='flex' flexBasis='content' alignItems='center' alignContent='start' marginLeft='1.0rem'>
                        <CopyDataButton parentKey={key} requestOrGroupId={requestOrGroupId} index={childResult.index} />
                        {
                            isFirst
                                ? <></>
                                : <Link title='View Details' underline='hover' display='inline-flex' marginLeft='0.5rem' alignItems='center' onClick={e => changeResult(e, childResult.index)}><SvgIcon><ViewIcon /></SvgIcon></Link>
                        }
                    </Grid>
                </Grid >
            }
            <Box margin='0.5rem 0 0.5rem 1.5rem'>
                {
                    childResult.error
                        ? (<TestInfo isError={true} text={`${ApicizeErrorToString(childResult.error)}`} />)
                        : (null)
                }
            </Box>
            {
                (childResult.testResults && childResult.testResults.length > 0)
                    ? <Box className='test-details'>
                        {
                            childResult.testResults.map(testResult => <TestBehavior behavior={testResult} key={`result-${idx++}`} />)
                        }
                    </Box>
                    : (null)
            }
            {
                (childResult.childIndexes ?? []).map(childIndex => {
                    const child = summaries.get(childIndex)
                    const childKey = `result-${idx++}`
                    return child ? <RenderExecution key={childKey} childResult={child} depth={depth + 1} /> : null
                })
            }
        </Box>

        {/* //     
        //     {/* {props.tokenCached
        //             ? (<TestInfo text='OAuth bearer token retrieved from cache' />)
        //             : (<></>)} */}

    }

    const TestInfo = (props: { isError?: boolean, text: string }) => {
        const key = `result-${idx++}`
        return <Box key={key}>
            {
                props.isError === true
                    ? (<Box color='#f44336' sx={{ ":first-letter": { textTransform: 'capitalize' }, whiteSpace: 'pre-wrap' }} >{props.text}</Box>)
                    : (<>{props.text}</>)
            }
        </Box>
    }

    const TestBehavior = (props: { behavior: ApicizeTestBehavior }) => {
        const key = `result-${idx++}`
        const behavior = props.behavior

        const error = (behavior.error && behavior.error.length > 0) ? behavior.error : null
        const logs = (behavior.logs?.length ?? 0) > 0 ? behavior.logs : null

        const className = 'test-result-behavior'

        return (error || logs)
            ? <Box key={key} className={className}>
                <Stack direction='row' key={`result-${idx++}`}>
                    <Box className='test-result-icon' key={`result-${idx++}`}>
                        {behavior.success ? (<CheckIcon color='success' />) : (<BlockIcon color='error' />)}
                    </Box>
                    <Stack direction='column' key={`result-${idx++}`} className='test-result-detail'>
                        <Box key={`result-${idx++}`}>
                            {behavior.name}{behavior.tag ? <Typography className='tag'> [{behavior.tag}]</Typography> : null}
                        </Box>
                        <Box className='test-result-detail-info'>
                            {
                                error
                                    ?
                                    <Stack direction='column' key={`result-${idx++}`}>
                                        <Typography key={`result-${idx++}`} className='test-result-error' color='error'>{behavior.error}</Typography>
                                    </Stack>
                                    : null
                            }
                            {
                                (behavior.logs ?? []).map((log) => (
                                    <Stack direction='column' key={`result-${idx++}`}>
                                        <code className='results-log' key={`result-${idx++}`}>{log}</code>
                                    </Stack>
                                ))
                            }
                        </Box>
                    </Stack>
                </Stack>
            </Box >
            : <Box key={key} className={className}>
                <Stack direction='row' key={`result-${idx++}`} className='test-result-detail'>
                    <Box className='test-result-icon' key={`result-${idx++}`}>
                        {behavior.success ? (<CheckIcon color='success' />) : (<BlockIcon color='error' />)}
                    </Box>
                    <Box key={`result-${idx++}`}>
                        <Typography sx={{ marginTop: 0, marginBottom: 0, paddingTop: 0 }} component='div' key={`result-${idx++}`}>
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

    const changeResult = (e: React.MouseEvent, index: number) => {
        e.preventDefault()
        e.stopPropagation()
        workspace.getExecution(requestOrGroupId)?.changeResultIndex(index)

    }

    const copyToClipboard = (e: React.MouseEvent, requestOrGroupId: string, index: number, format?: ExecutionReportFormat) => {
        try {
            e.preventDefault()
            e.stopPropagation()

            if (!format) {
                format = settings.reportFormat
            }

            workspace.generateReport(requestOrGroupId, index, format)
                .then(results => {
                    clipboardCtx.writeTextToClipboard(results)
                        .then(() =>
                            feedback.toast(`Data copied to clipboard (${format})`, ToastSeverity.Success)
                        )
                        .catch(e => feedback.toastError(e))
                })
                .catch(err => feedback.toastError(err))
        } catch (e) {
            feedback.toast(`${e}`, ToastSeverity.Error)
        }
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
            <Box>
                <RenderExecution childResult={mainResult} depth={0} />
            </Box>
        </Box>
    </Stack>
    return result
})

function retrieveSummariesForIndex(summaries: ExecutionResultSummary[], index: number) {
    const results = new Map<number, ExecutionResultSummary>()

    const appendIndex = (indexToAppend: number) => {
        if (indexToAppend < 0 || indexToAppend >= summaries.length) {
            throw new Error(`Invalid result index ${indexToAppend}`)
        }
        const summary = summaries[indexToAppend]
        results.set(indexToAppend, summary)
        return summary
    }

    const appendChildren = (summary: ExecutionResultSummary) => {
        if (summary.childIndexes) {
            for (const childIndex of summary.childIndexes) {
                if (!results.has(childIndex)) {
                    const child = appendIndex(childIndex)
                    appendChildren(child)
                }
            }
        }
    }

    const main = appendIndex(index)
    if (main.parentIndex) {
        appendIndex(main.parentIndex)
    }

    appendChildren(main)
    return results
}
