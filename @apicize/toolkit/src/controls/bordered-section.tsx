import React, { ReactNode } from "react";
import SvgIcon from "@mui/material/SvgIcon";
import { Box, SxProps, useTheme } from "@mui/system";

export function BorderedSection({ icon, title, children, sx }: { icon?: typeof SvgIcon, title?: string | ReactNode, children: React.ReactNode, sx?: SxProps }) {
    const theme = useTheme()
    const borderStyle = theme.palette.mode === 'dark' ? '1px solid #CCCCCC' : '1px solid #444444'

    return (
        <Box borderLeft={borderStyle} borderBottom={borderStyle} borderRight={borderStyle} borderRadius='5px' sx={sx}>
            <Box display='flex' flexDirection='row' width='100%'>
                <Box borderTop={borderStyle} width='1em' sx={{ borderTopLeftRadius: '5px' }}></Box>
                {(icon || title) && (
                    <Box display='flex' flexDirection='row' flexWrap='nowrap' alignItems='center' gap='0.25em' width='fit-content' height='2em'
                        margin='-1em 0.5em 0 0.5em' overflow='hidden' textOverflow='ellipsis' fontSize='1em' fontWeight='600'>
                        {icon && <SvgIcon component={icon} />}
                        {title && <span className='title'>{title}</span>}
                    </Box>
                )}
                <Box borderTop={borderStyle} width='1em' flexGrow={2} sx={{ borderTopRightRadius: '5px' }}></Box>
            </Box>
            <Box padding='1em' marginBottom='13px'>{children}</Box>
        </Box>
    );
}
