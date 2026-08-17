import { Box, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { ReactNode, JSX } from "react";
import { setTitleIfTruncated } from "../services/truncate-name";

export const EditorTitle = observer(({ name, diag, icon, children }: { name: string, diag?: string, icon: JSX.Element, children?: ReactNode }) => {
    return (
        <Typography variant='h1' className='editor-title' aria-label={name} component='div' display='flex' alignItems='center' sx={{ margin: 0 }}>
            <div className='icon'>{icon}</div>
            <Box className='text' marginRight='1em'>
                <Box
                    component='span'
                    className='editor-title-name'
                    onMouseEnter={(e) => setTitleIfTruncated(e.currentTarget, name)}
                >
                    {name?.length ?? 0 > 0 ? name : '(Unnamed)'}
                </Box>
                {diag?.length ?? 0 > 0 ? <Box className='diag id'>{diag}</Box> : null}
            </Box>
            {children}
        </Typography>
    )
})