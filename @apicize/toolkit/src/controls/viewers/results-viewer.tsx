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
import { ResultsPanel } from "../../contexts/workspace.context";
// import { MAX_TEXT_RENDER_LENGTH } from "./text-viewer";
import RequestIcon from "../../icons/request-icon";
import CodeIcon from '@mui/icons-material/Code';
import { ExecutionResultDetail, ExecutionResultSuccess } from "@apicize/lib-typescript";
import { EditableRequestEntry } from '../../models/workspace/editable-request-entry'
import { ResponseCodeViewer } from './result/response-curl-viewer'

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
    const selectedResultMenuItem = request.selectedResultMenuItem
    const hasValidSelection = !!selectedResultMenuItem && !(detail !== null && detail.execCtr !== selectedResultMenuItem.execCtr)

    const selectedSummary = hasValidSelection ? request.getSummary(selectedResultMenuItem.execCtr) : null

    const hasResults = hasValidSelection && selectedSummary

    const disableHeadersPanel = !selectedSummary?.hasResponseHeaders
    const disableText = (!selectedSummary?.responseBodyLength) || (selectedSummary.responseBodyLength === 0)
    const disablePreview = (!selectedSummary?.responseBodyLength) || (selectedSummary.responseBodyLength === 0 || selectedSummary.responseBodyLength > MAX_TEXT_RENDER_LENGTH)
    // Code generation applies to individual requests only; groups have no URL.
    const disableCode = !selectedSummary?.url

    if (! hasResults) {
        return null
    }

    // Keep request.resultsPanel as the user's persistent tab preference. If the selected tab has no
    // content for the current result (e.g. transiently while re-executing), fall back to displaying
    // 'Info' without overwriting the preference, so it snaps back once the content is available again.
    const panelUnavailable =
        (disableHeadersPanel && request.resultsPanel === 'Headers')
        || (disableText && request.resultsPanel === 'Text')
        || (disablePreview && request.resultsPanel === 'Preview')
        || (disableCode && request.resultsPanel === 'Code')
    const activePanel: ResultsPanel = panelUnavailable ? 'Info' : request.resultsPanel

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
    > | undefined

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
            onChange={(_: React.SyntheticEvent, newValue: ResultsPanel) => {
                if (newValue) {
                    onUpdateResultsPanel(newValue)
                }
            }}
            value={activePanel}
            sx={{ marginRight: '12px' }}
            aria-label="text alignment">
            <ToggleButton value="Info" title="Information" aria-label='show info' size='small'><ScienceOutlinedIcon color={infoColor ?? 'disabled'} /></ToggleButton>
            <ToggleButton value="Headers" title="Headers" aria-label='show headers' size='small' disabled={disableHeadersPanel}><ViewListOutlinedIcon /></ToggleButton>
            <ToggleButton value="Text" title="Body (Raw)" aria-label='show body text' size='small' disabled={disableText}><ArticleOutlinedIcon /></ToggleButton>
            <ToggleButton value="Preview" title="Body (Preview)" aria-label='show body preview' disabled={disablePreview} size='small'><PreviewIcon /></ToggleButton>
            <ToggleButton value="Code" title="Generate Code" aria-label='generate code' size='small' disabled={disableCode}><SvgIcon><CodeIcon /></SvgIcon></ToggleButton>
            <ToggleButton value="Details" title="Details" aria-label='show details' size='small'><SvgIcon><RequestIcon /></SvgIcon></ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ overflow: 'hidden', flexGrow: 1, bottom: '0', position: 'relative' }}>
            <Box position='relative' width='100%' height='100%'>
                {
                    activePanel === 'Info' ? <ResultInfoViewer request={request} />
                        : activePanel === 'Headers' ? <ResponseHeadersViewer detail={detail} />
                            : activePanel === 'Text' ? <ResultRawPreview detail={detail} />
                                : activePanel === 'Preview' ? <ResultResponsePreview detail={detail} />
                                    : activePanel === 'Code' ? <ResponseCodeViewer request={request} detail={detail} />
                                        : activePanel === 'Details' ? <ResultDetailsViewer detail={detail} />
                                            : null
                }
            </Box>
        </Box>
    </Stack>
})