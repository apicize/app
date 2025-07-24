import { Typography } from "@mui/material";
import { Box } from "@mui/material";
import ApicizeIcon from "../icons/apicize-icon";
import { useApicizeSettings } from "../contexts/apicize-settings.context";

export function logo() {
    const settings = useApicizeSettings()
    let name = settings.appName
    let version = settings.appVersion

    return <Box className='logo' display='flex'>
        <Box className='logo-icon'>
            <ApicizeIcon width='120' height='120' />
        </Box>
        <Box className='logo-header'>
            <Typography variant='h1' component='div' sx={{ marginBottom: 0 }}>{name}</Typography>
            <Typography variant='h2' component='div'>{version}</Typography>
        </Box>
    </Box>
}