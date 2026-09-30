import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import BlockIcon from '@mui/icons-material/Block'

/**
 * Overlay displayed over an editor while a file is dragged over it, indicating
 * whether the file can be dropped and what dropping it will do
 */
export function FileDropOverlay({ visible, valid = true, title, subtitle }: {
    visible: boolean
    valid?: boolean
    title: string
    subtitle?: string
}) {
    return <Box top={0}
        left={0}
        width='100%'
        height='100%'
        position='absolute'
        display={visible ? 'flex' : 'none'}
        flexDirection='column'
        alignItems='center'
        justifyContent='center'
        gap={1}
        sx={theme => {
            const color = valid ? theme.palette.primary.main : theme.palette.error.main
            return {
                zIndex: 99999,
                boxSizing: 'border-box',
                pointerEvents: 'none',
                border: `3px dashed ${color}`,
                borderRadius: 2,
                backgroundColor: alpha(color, 0.15),
                backdropFilter: 'blur(2px)',
                color,
            }
        }}>
        {valid
            ? <UploadFileIcon sx={{ fontSize: '4em' }} />
            : <BlockIcon sx={{ fontSize: '4em' }} />}
        <Typography variant='h6' component='div' sx={{ color: 'inherit' }}>{title}</Typography>
        {subtitle
            ? <Typography variant='body2' component='div' sx={{ color: 'text.secondary' }}>{subtitle}</Typography>
            : null}
    </Box>
}
