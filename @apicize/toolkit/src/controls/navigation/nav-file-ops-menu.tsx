import { observer } from "mobx-react-lite"
import { useCallback, useEffect, useState } from "react"
import { useApicizeSettings } from "../../contexts/apicize-settings.context"
import { useFileOperations } from "../../contexts/file-operations.context"
import { useWorkspace } from "../../contexts/workspace.context"
import { ButtonGroup, IconButton, MenuItem } from "@mui/material"
import { Box, ResponsiveStyleValue, SxProps } from "@mui/system"
import { EntityType } from "../../models/workspace/entity-type"
import { DropdownMenu } from "./dropdown-menu"
import PostAddIcon from '@mui/icons-material/PostAdd'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import SaveIcon from '@mui/icons-material/Save'
import SaveAsIcon from '@mui/icons-material/SaveAs'
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { ToastSeverity, useFeedback } from "../../contexts/feedback.context"

export const NavFileOpsMenu = observer(({ sx, orientation }: { sx?: SxProps, orientation: 'horizontal' | 'vertical' }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const fileOps = useFileOperations()
    const feedback = useFeedback()

    const [newMenu, setNewMenu] = useState<null | HTMLElement>(null)

    const [openMenu, setOpenMenu] = useState<null | HTMLElement>(null)

    const handleNewFileMenuClick = () => {
        const target = document.getElementById('file-new-menu-button')
        setNewMenu(target)
        document.getElementById('nav-new-file')?.focus()
    }

    const handleNewFileMenuClose = () => {
        setNewMenu(null)
    }

    const handleOpenFileMenuClick = () => {
        const target = document.getElementById('file-open-menu-button')
        setOpenMenu(target)
        document.getElementById('nav-file-0')?.focus()
    }

    const handleFileOpen = async (fileName: string, newWindow: boolean) => {
        setOpenMenu(null)
        const newSessionId = await fileOps.openWorkbook(newWindow, fileName)
        if (newWindow) {
            let idx = fileName.length - 1
            while (idx > 0 && !['/', '\\'].includes(fileName[idx])) {
                idx--
            }
            const showFileName = idx > 0 ? fileName.substring(idx + 1) : fileName
            feedback.toast(`Opening ${showFileName}...`, ToastSeverity.Info, newSessionId)
        }
    }

    const handleOpenFileMenuClose = () => {
        setOpenMenu(null)
    }

    const handleOpenNewInNewWindow = () => {
        fileOps.newWorkbook(true)
            .then((newSessionId) => {
                feedback.toast('Opening New Session...', ToastSeverity.Info, newSessionId)
            })
            .catch(err => feedback.toastError(err))
    }

    const normalizeWorkbookFileName = (filename: string) => {
        if (filename.startsWith(settings.workbookDirectory)) {
            filename = filename.substring(settings.workbookDirectory.length + 1)
            if (filename.endsWith('.apicize')) {
                filename = filename.substring(0, filename.length - 8)
            }
        }
        return filename
    }

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.ctrlKey) {
            switch (e.key) {
                case 'Enter':
                    if (!(workspace.activeSelection && (workspace.activeSelection.entityType === EntityType.Request || workspace.activeSelection.entityType === EntityType.Group))) {
                        return
                    }
                    workspace.startExecution(workspace.activeSelection.id, !e.shiftKey)
                        .catch(err => feedback.toastError(err))
                    break
                case 'n':
                    fileOps.newWorkbook(false)
                        .catch(err => feedback.toastError(err))
                    break
                // case 'O':
                //     TODO - need to work on making recent file drop down keyboard-friendly
                //     handleFileMenuClick()
                //     break
                case 'o':
                    if (e.shiftKey) {
                        handleOpenFileMenuClick()
                    } else {
                        fileOps.openWorkbook(false)
                            .catch(err => feedback.toastError(err))
                    }
                    break
                case 's':
                    if (e.shiftKey) {
                        fileOps.saveWorkbookAs()
                            .catch(err => feedback.toastError(err))
                    } else {
                        fileOps.saveWorkbook()
                            .catch(err => feedback.toastError(err))
                    }
                    break
            }
        }
    }, [workspace, fileOps, feedback])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [handleKeyDown])

    let alignDropBtnSelf: ResponsiveStyleValue<'begin' | 'end'>
    let alignDropBtnItems: ResponsiveStyleValue<'begin' | 'end'>
    let buttonSpacing: string | undefined

    if (orientation == 'horizontal') {
        alignDropBtnSelf = 'begin'
        alignDropBtnItems = 'end'
        buttonSpacing = undefined
    } else {
        alignDropBtnSelf = 'end'
        alignDropBtnItems = 'begin'
        buttonSpacing = '1em'
    }

    return <ButtonGroup orientation={orientation} sx={sx}>
        <IconButton
            size='large'
            aria-label='new'
            title={`New Workspace (${settings.ctrlKey} + N)`} onClick={() => {
                fileOps.newWorkbook(false).catch(err => feedback.toastError(err))
            }}
            sx={{ fontSize: 'inherit', paddingLeft: '8px', paddingRight: '4px' }}
        >
            <PostAddIcon />
        </IconButton>

        <IconButton
            id='file-new-menu-button'
            title='New Workspace'
            size="large"
            sx={{ minWidth: '1em', width: '1em', alignSelf: alignDropBtnSelf, alignItems: alignDropBtnItems }}
            onClick={handleNewFileMenuClick}
        ><KeyboardArrowDownIcon />
        </IconButton>

        <DropdownMenu
            id="file-new-menu"
            autoFocus
            className="drop-down-menu"
            sx={{ fontSize: settings.navigationFontSize }}
            anchorEl={newMenu}
            open={newMenu !== null}
            onClose={handleNewFileMenuClose}
        >
            <MenuItem autoFocus={true} key='nav-new-file' className='recent-file' sx={{ fontSize: 'inherit' }} disableRipple onClick={() => handleOpenNewInNewWindow()}>
                <Box className='filename'>Open New Workspace in New Window</Box>
                <OpenInBrowserIcon sx={{ marginRight: 0 }} fontSize='inherit' />
            </MenuItem>
        </DropdownMenu>

        <IconButton
            size="large"
            aria-label='open'
            id='file-open-btn'
            sx={{ marginTop: buttonSpacing }}
            title={`Open Workbook (${settings.ctrlKey} + O)`}
            onClick={() => {
                fileOps.openWorkbook(false, undefined, true).catch(err => feedback.toastError(err))
            }}>
            <FileOpenIcon />
        </IconButton>
        {
            settings.recentWorkbookFileNames.length > 0
                ? <><IconButton
                    id='file-open-menu-button'
                    title='Open Recent Workbook'
                    size="large"
                    sx={{ minWidth: '1em', width: '1em', alignSelf: alignDropBtnSelf, alignItems: alignDropBtnItems }}
                    onClick={handleOpenFileMenuClick}
                ><KeyboardArrowDownIcon />
                </IconButton>
                    <DropdownMenu
                        id="file-open-menu"
                        autoFocus
                        className="drop-down-menu"
                        sx={{ fontSize: settings.navigationFontSize }}
                        slotProps={{
                            list: {
                                'aria-labelledby': 'file-open-menu-button',
                            }
                        }}
                        anchorEl={openMenu}
                        open={openMenu !== null}
                        onClose={handleOpenFileMenuClose}
                    >
                    </DropdownMenu>
                </>
                : null
        }
        {
            settings.recentWorkbookFileNames.length > 0
                ? <DropdownMenu
                    id="file-open-menu"
                    autoFocus
                    className="drop-down-menu"
                    sx={{ fontSize: settings.navigationFontSize }}
                    slotProps={{
                        list: {
                            'aria-labelledby': 'file-open-menu-button',
                        }
                    }}
                    anchorEl={openMenu}
                    open={openMenu !== null}
                    onClose={handleOpenFileMenuClose}
                >
                    {
                        settings.recentWorkbookFileNames.map((f, idx) => (
                            <MenuItem autoFocus={idx == 0} key={`nav-file-${idx}`} sx={{ fontSize: 'inherit' }} className='recent-file' disableRipple onClick={() => {
                                handleFileOpen(f, false).catch(err => feedback.toastError(err))
                            }}>
                                <Box className='filename'>{normalizeWorkbookFileName(f)}</Box>
                                <IconButton title='Open in New Window' onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleFileOpen(f, true).catch(err => feedback.toastError(err))
                                }}><OpenInBrowserIcon sx={{ marginRight: 0 }} fontSize='inherit' /></IconButton>
                            </MenuItem>
                        ))
                    }
                </DropdownMenu>
                : null
        }
        <IconButton
            size='large'
            aria-label='save'
            sx={{ marginTop: buttonSpacing, paddingLeft: '8px', paddingRight: '8px' }}
            title={`Save to Workbook (${settings.ctrlKey} + S)`} disabled={workspace.fileName.length == 0} onClick={() => {
                fileOps.saveWorkbook().catch(err => feedback.toastError(err))
            }}>
            <SaveIcon />
        </IconButton>
        <IconButton
            size='large'
            aria-label='save-as' sx={{ marginTop: buttonSpacing, paddingLeft: '8px', paddingRight: '8px' }}
            title={`Save to Workbook As (${settings.ctrlKey} + Shift + S)`} onClick={() => {
                fileOps.saveWorkbookAs().catch(err => feedback.toastError(err))
            }}>
            <SaveAsIcon />
        </IconButton>
    </ButtonGroup>
})