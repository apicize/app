import { Box, Grid2, Stack, Typography } from "@mui/material"
import { ExecutionResult } from "../../../models/workspace/execution"

export function ResponseHeadersViewer(props: { result: ExecutionResult }) {
    if (!props.result.response) {
        return null
    }

    const headers = Object.entries(props.result.response.headers ?? {})
    let hdrCtr = 0

    return (
        <Stack direction="column" sx={{ flexGrow: 1, maxWidth: '80em', position: 'absolute', top: '0', bottom: '0' }}>
            {
                headers.length > 0
                    ? <Box overflow='auto' paddingRight='24px' height='100%' key={`header${hdrCtr++}`}>
                        <Typography variant='h2' sx={{ marginTop: 0, marginBottom: '2em', flexGrow: 0 }} component='div'>Response Headers</Typography>
                        <Grid2 container rowSpacing='1em'>
                            {
                                headers.map(([header, value]) =>
                                    <Grid2 container size={12}>
                                        <Grid2 size={{ md: 6, lg: 4 }}>{header}</Grid2>
                                        <Grid2 size={{ md: 6, lg: 8 }} sx={{ wordBreak: 'break-word' }}>{value}</Grid2>
                                    </Grid2>
                                )
                            }
                        </Grid2>
                    </Box>
                    : <Typography variant='h2' sx={{ marginTop: 0, flexGrow: 0 }} component='div'>No headers included in response</Typography>
            }
        </Stack>
    )
}
