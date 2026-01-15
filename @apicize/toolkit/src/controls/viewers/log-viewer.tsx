import { Box, Checkbox, FormControl, FormControlLabel, IconButton, Stack, SvgIcon, SxProps, Theme } from "@mui/material"
import { observer } from "mobx-react-lite"
import { useLog } from "../../contexts/log.context"
import { ReqwestEvent } from "../../models/trace"
import { EditorTitle } from "../editor-title"
import LogIcon from "../../icons/log-icon"
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import React, { useEffect, useRef } from "react"
import { useClipboard } from "../../contexts/clipboard.context"
import { useWorkspace } from "../../contexts/workspace.context"
import { reaction, runInAction } from "mobx"
import { useFeedback } from "../../contexts/feedback.context"

export const LogViewer = React.memo(observer(({
    sx
}: {
    sx?: SxProps<Theme>
}) => {
    const log = useLog()
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const clipboard = useClipboard()
    const bottomRef = useRef<HTMLDivElement | null>(null);

    workspace.nextHelpTopic = 'logs'

    let ctr = 0

    useEffect(() => {
        runInAction(() => {
            log.checkInitialized(workspace)
                .catch(e => feedback.toastError(e))
        })

        // const disposer = reaction(
        //     () => ({ follow: log.follow, _length: log.events.length }),
        //     ({ follow }) => {
        //         // bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        //         setTimeout(() => {
        //             if (follow && bottomRef.current) {
        //                 bottomRef.current.scrollTop = bottomRef.current.scrollHeight
        //             }
        //         }, 10)
        //     }
        // )

        // return () => disposer()
    }, [])


    const renderEvent = (e: ReqwestEvent) => {
        switch (e.event) {
            case 'Connect':
                return <Box sx={{ position: 'relative' }} key={`console-${ctr++}`}>{e.timestamp} CONNECT {e.host}</Box>
            case 'Read':
            case 'Write':
                return <Box sx={{ position: 'relative' }} key={`console-${ctr++}`}>{e.timestamp} ${e.event.toUpperCase()} [{e.id}]
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

    const clear = () => {
        workspace.clearLogs()
            .catch(e => feedback.toastError(e))
    }

    return <Stack display='flex' direction='column' className='log-panel' width='100%'>
        <Box className='editor-panel-header' sx={{ maxWidth: 'None' }} flexGrow={0}>
            <EditorTitle icon={<SvgIcon><LogIcon /></SvgIcon>} name='Communication Logs'>
                <Box>
                    <IconButton
                        aria-label="copy text to clipboard"
                        title="Copy Text to Clipboard"
                        size='medium'
                        color='primary'
                        sx={{ marginLeft: '1rem' }}
                        onClick={_ => clipboard.writeTextToClipboard(eventsToText())}>
                        <ContentCopyIcon />
                    </IconButton>
                    <IconButton color='primary' size='medium' aria-label='Clear' title='Clear Entries' onClick={() => clear()}><ClearAllIcon fontSize='inherit' /></IconButton>
                    <IconButton color='primary' size='medium' aria-label='Close' title='Close' onClick={() => workspace.returnToNormal()}><CloseIcon fontSize='inherit' /></IconButton>
                </Box>
            </EditorTitle>
            <FormControl sx={{ justifySelf: 'end' }}>
                <FormControlLabel control={<Checkbox checked={log.follow} onChange={(e) => log.setFollow(e.target.checked)} />} label="Follow Log" />
            </FormControl>
        </Box>
        <Box className='editor-panel' display='flex' flexGrow={1} bottom={0} position='relative' maxWidth='None'>
            <Stack ref={bottomRef} direction={'column'} spacing={1} className='console' paddingBottom='2em' paddingRight='2em' flexGrow='1'>
                {log.events.map(renderEvent)}
            </Stack>
        </Box>
    </Stack>
}))

