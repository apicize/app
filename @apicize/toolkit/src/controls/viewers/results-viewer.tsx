import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import SvgIcon from '@mui/material/SvgIcon'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { SvgIconPropsColorOverrides, SxProps, Theme } from "@mui/material"
import { ScienceOutlinedIcon, ViewListOutlinedIcon, ArticleOutlinedIcon, PreviewIcon } from '../../icons'
import { OverridableStringUnion } from '@mui/types';
import React from "react"
import { ResultResponsePreview } from "./result/response-preview-viewer";
import { ResultRawPreview } from "./result/response-raw-viewer";
import { ResultInfoViewer } from "./result/result-info-viewer";
import { ResponseHeadersViewer } from "./result/response-headers-viewer";
import { ResultDetailsViewer } from "./result/result-details-viewer";
import { observer } from 'mobx-react-lite';
import { ResultsPanel, useWorkspace } from "../../contexts/workspace.context";
// import { MAX_TEXT_RENDER_LENGTH } from "./text-viewer";
import RequestIcon from "../../icons/request-icon";
import { ExecutionResultDetail, ExecutionResultSuccess } from "@apicize/lib-typescript";
import { EditableRequestEntry } from '../../models/workspace/editable-request-entry'

export const MAX_TEXT_RENDER_LENGTH = 64 * 1024 * 1024

export const ResultsViewer = observer((
    { sx, className, request, detail }:
        {
            sx?: SxProps<Theme>,
            className?: string,
            request: EditableRequestEntry,
            detail: ExecutionResultDetail | null,
        }
) => {
    if (!request.selectedResultMenuItem || (detail !== null && detail.execCtr !== request.selectedResultMenuItem.execCtr)) {
        return null
    }

    const selectedSummary = request.getSummary(request.selectedResultMenuItem.execCtr)

    const disableHeadersPanel = !selectedSummary.hasResponseHeaders
    const disableText = (!selectedSummary.responseBodyLength) || (selectedSummary.responseBodyLength === 0)
    const disablePreview = (!selectedSummary.responseBodyLength) || (selectedSummary.responseBodyLength === 0 || selectedSummary.responseBodyLength > MAX_TEXT_RENDER_LENGTH)

    if ((disableHeadersPanel && request.resultsPanel === 'Headers')
        || (disableText && request.resultsPanel === 'Text')
        || (disablePreview && request.resultsPanel === 'Preview')) {
        request.setResultsPanel('Info')
    }

    let infoColor: OverridableStringUnion<
        | 'inherit'
        | 'action'
        | 'disabled'
        | 'primary'
        | 'secondary'
        | 'error'
        | 'info'
        | 'success'
        | 'warning'
        | 'private'
        | 'vault',
        SvgIconPropsColorOverrides
    > | undefined = undefined

    if (selectedSummary.success === ExecutionResultSuccess.Success) {
        infoColor = 'success'
    } else if (selectedSummary.success === ExecutionResultSuccess.Failure) {
        infoColor = 'warning'
    } else {
        infoColor = 'error'
    }

    const onUpdateResultsPanel = (panel: ResultsPanel) => {
        request.setResultsPanel(panel)
    }

    return <Stack direction='row' sx={sx} className={className}>
        <ToggleButtonGroup
            className='button-column'
            orientation='vertical'
            exclusive
            onChange={(_: React.SyntheticEvent, newValue: ResultsPanel) => onUpdateResultsPanel(newValue)}
            value={request.resultsPanel}
            sx={{ marginRight: '12px' }}
            aria-label="text alignment">
            <ToggleButton value="Info" title="Show Result Info" aria-label='show info' size='small'><ScienceOutlinedIcon color={infoColor ?? 'disabled'} /></ToggleButton>
            <ToggleButton value="Headers" title="Show Response Headers" aria-label='show headers' size='small' disabled={disableHeadersPanel}><ViewListOutlinedIcon /></ToggleButton>
            <ToggleButton value="Text" title="Show Response Body as Text" aria-label='show body text' size='small' disabled={disableText}><ArticleOutlinedIcon /></ToggleButton>
            <ToggleButton value="Preview" title="Show Body as Preview" aria-label='show body preview' disabled={disablePreview} size='small'><PreviewIcon /></ToggleButton>
            <ToggleButton value="Details" title="Show Details" aria-label='show details' size='small'><SvgIcon><RequestIcon /></SvgIcon></ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ overflow: 'hidden', flexGrow: 1, bottom: '0', position: 'relative' }}>
            <Box position='relative' width='100%' height='100%'>
                {
                    request.resultsPanel === 'Info' ? <ResultInfoViewer request={request} />
                        : request.resultsPanel === 'Headers' ? <ResponseHeadersViewer detail={detail} />
                            : request.resultsPanel === 'Text' ? <ResultRawPreview detail={detail} />
                                : request.resultsPanel === 'Preview' ? <ResultResponsePreview detail={detail} />
                                    : request.resultsPanel === 'Details' ? <ResultDetailsViewer detail={detail} />
                                        : null
                }
            </Box>
        </Box>
    </Stack>
})