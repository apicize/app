import Box from '@mui/material/Box'
import { IconButton, Stack } from '@mui/material'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo';
import { observer } from 'mobx-react-lite'
import { ImageViewer, KNOWN_IMAGE_EXTENSIONS } from '../../../viewers/image-viewer';

interface RawBodyEditorProps {
    bodyLength: number | null
    bodyMimeType: string | null
    data: string
    hasClipboardImage: boolean
    onOpenFile: () => void
    onPasteFromClipboard: () => void
}

export const RawBodyEditor = observer(({ bodyLength, bodyMimeType, data, hasClipboardImage, onOpenFile, onPasteFromClipboard }: RawBodyEditorProps) => {
    let isImage: boolean
    let ext: string | undefined

    if (bodyMimeType?.startsWith('image/')) {
        ext = bodyMimeType.substring(6).toLocaleLowerCase()
        const idx = ext.indexOf('+')
        if (idx !== -1) {
            ext = ext.substring(0, idx)
        }
        isImage = KNOWN_IMAGE_EXTENSIONS.includes(ext)
    } else {
        isImage = false
    }

    return <Stack
        display='flex'
        direction='column'
        flexGrow={1}
        position='relative'
        boxSizing='border-box'
        width='100%'
        maxWidth='100%'
        height='100%'
        gap='10px'
    >
        <Stack
            direction='row'
            sx={{
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #444!important',
                width: 'fit-content',
            }}
        >
            <IconButton aria-label='load body from file' title='Load Body from File' onClick={onOpenFile} sx={{ marginRight: '4px' }}>
                <FileOpenIcon color='primary' />
            </IconButton>
            <IconButton aria-label='copy body from clipboard' title='Paste Body from Clipboard' disabled={!hasClipboardImage}
                onClick={onPasteFromClipboard} sx={{ marginRight: '4px' }}>
                <ContentPasteGoIcon color={hasClipboardImage ? 'primary' : 'disabled'} />
            </IconButton>
            <Stack direction='row' padding='10px' spacing='1rem'>
                <Box>{bodyLength ? bodyLength.toLocaleString() + ' Bytes' : ''}</Box>
                <Box>{bodyMimeType ? bodyMimeType : ''}</Box>
            </Stack>
        </Stack>
        {
            isImage
                ? <ImageViewer base64Data={data} extensionToRender={ext} />
                : null
        }
    </Stack>
})