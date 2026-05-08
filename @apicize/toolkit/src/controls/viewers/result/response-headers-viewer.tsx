import { Box, Grid, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import { ExecutionResultDetail } from "@apicize/lib-typescript"
import { observer } from "mobx-react-lite"
import InputIcon from '@mui/icons-material/Input';
import OutputIcon from '@mui/icons-material/Output';
import { ResponseOrRequest, useWorkspace } from "../../../contexts/workspace.context"

export const ResponseHeadersViewer = observer(({ detail }: { detail: ExecutionResultDetail | null }) => {

    const workspace = useWorkspace()
    let responseOrRequest = workspace.responseOrRequest

    if (detail?.entityType !== 'request') {
        return
    }

    const h1 = detail.testContext.response?.headers
    const h2 = detail.testContext.request?.headers
    const hasResponse = !!h1
    const hasRequest = !!h2

    if (responseOrRequest === ResponseOrRequest.response) {
        if (!hasResponse && hasRequest) {
            responseOrRequest = ResponseOrRequest.request
        }
    } else {
        if (!hasRequest && hasResponse) {
            responseOrRequest = ResponseOrRequest.response
        }
    }

    const h = (responseOrRequest === ResponseOrRequest.response) ? h1 : h2
    const headers = h ? Object.entries(h) : []

    let hdrCtr = 0
    return (
        <Stack direction="column" sx={{ flexGrow: 1, maxWidth: '80em', position: 'absolute', top: '0', bottom: '0' }}>
            {
                headers.length > 0
                    ? <Box overflow='auto' height='100%' key={`header${hdrCtr++}`}>
                        <Box display='flex' flexDirection='row' alignContent='top' sx={{ marginTop: 0, marginBottom: '2em', flexGrow: 0, height: '3rem' }}>
                            <Typography variant='h2' sx={{ marginTop: 0, marginBottom: 0, flexGrow: 0, height: '3rem', display: 'flex', alignItems: 'center' }} component='div'>
                                {responseOrRequest === ResponseOrRequest.response ? 'Response' : 'Request'} Headers
                            </Typography>
                            <Box display='flex' flexDirection='row' flexGrow={1} justifyContent='end'>
                                <ToggleButtonGroup aria-label='response or request' size='small' color='primary' value={responseOrRequest} exclusive onChange={(_, v) => workspace.changeResponseOrRequest(v as ResponseOrRequest)}>
                                    <ToggleButton title='Review Request Headers' color='primary' aria-label='request' value={ResponseOrRequest.request} disabled={!hasRequest} sx={{ '&:not(.Mui-selected):not(.Mui-disabled)': { color: 'primary.main' } }}><InputIcon /></ToggleButton>
                                    <ToggleButton title='Review Response Headers' color='primary' aria-label='response' value={ResponseOrRequest.response} disabled={!hasResponse} sx={{ '&:not(.Mui-selected):not(.Mui-disabled)': { color: 'primary.main' } }}><OutputIcon /></ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                        </Box>
                        <Grid container rowSpacing='1em' paddingRight='24px' flexGrow={1}>
                            {
                                headers.map(([header, value]) =>
                                    <Grid container size={12} key={`header${hdrCtr++}`}>
                                        <Grid size={{ md: 6, lg: 4 }}>{header}</Grid>
                                        <Grid size={{ md: 6, lg: 8 }} sx={{ wordBreak: 'break-word' }}>{value}</Grid>
                                    </Grid>
                                )
                            }
                        </Grid>
                    </Box>
                    : <Typography variant='h2' sx={{ marginTop: 0, flexGrow: 0 }} component='div'>No headers included in {responseOrRequest === ResponseOrRequest.response ? 'response' : 'request'}</Typography>
            }
        </Stack >
    )
})
