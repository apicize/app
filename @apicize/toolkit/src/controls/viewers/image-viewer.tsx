import { Box } from "@mui/material"

export const KNOWN_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'bmp', 'tif', 'tiff']

export function ImageViewer({ base64Data, extensionToRender }: {
    base64Data: string | undefined,
    extensionToRender?: string
}) {
    if (base64Data && base64Data.length > 0 && extensionToRender && extensionToRender.length > 0) {
        return (
            <Box
                style={{
                    flexGrow: 1,
                    flexBasis: 0,
                    overflow: 'auto',
                    position: 'relative',
                    marginTop: 0,
                    boxSizing: 'border-box',
                    width: '100%',
                    maxWidth: '100%',
                }}
            >
                <img
                    aria-label="response image"
                    style={{
                        position: 'absolute'
                    }}
                    src={`data:image/${extensionToRender};base64,${base64Data}`}
                />
            </Box>
        )
    } else {
        return (<></>)
    }

}
