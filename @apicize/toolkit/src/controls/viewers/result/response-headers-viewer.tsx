import { Box, Grid, Stack, Typography } from "@mui/material"
import { useState } from "react"
import { ExecutionResultDetail } from "@apicize/lib-typescript"

export function ResponseHeadersViewer({ detail }: { detail: ExecutionResultDetail | null }) {

    if (detail?.entityType !== 'request') {
        return
    }

    const [headers] = useState(Object.entries(detail.testContext.response?.headers ?? {}))
    let hdrCtr = 0
    return (
        <Stack direction="column" sx={{ flexGrow: 1, maxWidth: '80em', position: 'absolute', top: '0', bottom: '0' }}>
            {
                headers.length > 0
                    ? <Box overflow='auto' paddingRight='24px' height='100%' key={`header${hdrCtr++}`}>
                        <Typography variant='h2' sx={{ marginTop: 0, marginBottom: '2em', flexGrow: 0 }} component='div'>Response Headers</Typography>
                        <Grid container rowSpacing='1em'>
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
                    : <Typography variant='h2' sx={{ marginTop: 0, flexGrow: 0 }} component='div'>No headers included in response</Typography>
            }
        </Stack>
    )
}
