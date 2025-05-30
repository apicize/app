import { Box, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { ReactNode } from "react";

export const EditorTitle = observer((props: { name: string, diag?: string, icon: JSX.Element, children?: ReactNode }) => {
    return (
        <Typography variant='h1' className='editor-title' aria-label={props.name} component='div' display='flex' alignItems='center' sx={{ margin: 0 }}>
            <div className='icon'>{props.icon}</div>
            <Box className='text'>
                {props.name?.length ?? 0 > 0 ? props.name : '(Unnamed)'}
                {props.diag?.length ?? 0 > 0 ? <Box className='diag id'>{props.diag}</Box> : null}
            </Box>
            {props.children}
        </Typography>
    )
})