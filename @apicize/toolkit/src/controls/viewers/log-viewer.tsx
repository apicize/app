import { Box, IconButton, Stack, SvgIcon, SxProps, Theme } from "@mui/material"
import { observer } from "mobx-react-lite"
import { useLog } from "../../contexts/log.context"
import { ReqwestEvent } from "../../models/trace"
import { EditorTitle } from "../editor-title"
import LogIcon from "../../icons/log-icon"
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { useWorkspace } from "../../contexts/workspace.context"
import { useRef } from "react"
import { useClipboard } from "../../contexts/clipboard.context"

export const LogViewer = observer((props: {
    sx?: SxProps<Theme>
}) => {
    const log = useLog()
    const clipboard = useClipboard()
    const workspace = useWorkspace()

    let ctr = useRef(0)

    const nextCtr = () => {
        let newCtr = ctr.current + 1
        ctr.current = newCtr
        return newCtr
    }

    const renderEvent = (e: ReqwestEvent) => {
        switch (e.event) {
            case 'Connect':
                return <Box sx={{ position: 'relative' }} key={`console-${nextCtr()}`}>{e.timestamp} CONNECT {e.host}</Box>
            case 'Read':
            case 'Write':
                return <Box sx={{ position: 'relative' }} key={`console-${nextCtr()}`}>{e.timestamp} ${e.event.toUpperCase()} [{e.id}]
                    <Box marginLeft='3em'>
                        <pre className='log'>
                            {e.data}
                        </pre>
                    </Box>
                </Box>
            default:
                return <></>
        }
    }

    const eventsToText = () => {
        return log.events.map(e => {
            switch (e.event) {
                case 'Connect':
                    return `${e.timestamp} CONNECT ${e.host}`
                case 'Read':
                case 'Write':
                    return `${e.timestamp} ${e.event.toUpperCase()} [${e.id}]\r\n${e.data.replaceAll('\r\n', '\n').split('\n').map(l => '   ' + l).join('\r\n')}`
                default:
                    return ''
            }
        }).join('\r\n\r\n')
    }

    return <Stack direction={'column'} className='editor' position='relative' bottom={0} flexGrow={1}>
        <Box className='editor-panel-header'>
            <EditorTitle icon={<SvgIcon><LogIcon /></SvgIcon>} name='Communication Logs' />
            <IconButton
                aria-label="copy text to clipboard"
                title="Copy Text to Clipboard"
                size='medium'
                color='primary'
                sx={{ marginLeft: '1rem' }}
                onClick={_ => clipboard.writeTextToClipboard(eventsToText())}>
                <ContentCopyIcon />
            </IconButton>
            <IconButton color='primary' size='medium' aria-label='Clear' title='Clear Entries' onClick={() => log.clear()}><ClearAllIcon fontSize='inherit' /></IconButton>
            <IconButton color='primary' size='medium' aria-label='Close' title='Close' onClick={() => workspace.returnToNormal()}><CloseIcon fontSize='inherit' /></IconButton>
        </Box>
        <Stack direction={'column'} spacing={1} className='console' paddingBottom='2em' paddingRight='2em' >
            {log.events.map(renderEvent)}
        </Stack>
    </Stack>
})

