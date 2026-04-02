import { Typography } from "@mui/material";
import { Box } from "@mui/material";
import ApicizeIcon from "../icons/apicize-icon";
import { useApicizeSettings } from "../contexts/apicize-settings.context";

export const Logo = () => {
    const settings = useApicizeSettings()
    const name = settings.appName
    const version = settings.appVersion

    return <Box className='logo' display='flex'>
        <Box className='logo-icon'>
            <ApicizeIcon />
        </Box>
        <Box className='logo-header'>
            <Typography variant='h1' component='div' sx={{ marginBottom: 0 }}>{name}</Typography>
            <Typography variant='h2' component='div'>{version}</Typography>
        </Box>
    </Box>
}