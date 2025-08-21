import { observer } from "mobx-react-lite";
import { createRef, useRef, useState } from "react";
import { useApicizeSettings } from "../../contexts/apicize-settings.context";
import { useFileOperations } from "../../contexts/file-operations.context";
import { useWorkspace } from "../../contexts/workspace.context";
import { ButtonGroup, IconButton, MenuItem } from "@mui/material";
import { Stack, Box, ResponsiveStyleValue, SxProps } from "@mui/system";
import { EntityType } from "../../models/workspace/entity-type";
import { DropdownMenu } from "./dropdown-menu";
import PostAddIcon from '@mui/icons-material/PostAdd'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import SaveIcon from '@mui/icons-material/Save'
import SaveAsIcon from '@mui/icons-material/SaveAs'
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'

export const NavFileOpsMenu = observer((props: { sx?: SxProps, orientation: 'horizontal' | 'vertical' }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const fileOps = useFileOperations()

    const [newMenu, setNewMenu] = useState<null | HTMLElement>(null)
    const [openMenu, setOpenMenu] = useState<null | HTMLElement>(null)

    const handleNewFileMenuClick = () => {
        const target = document.getElementById('file-new-menu-button')
        setNewMenu(target);
        document.getElementById('nav-new-file')?.focus()
    };
    const handleFileNew = () => {
        setNewMenu(null)
        fileOps.cloneWorkspace()
    }
    const handleNewFileMenuClose = () => {
        setNewMenu(null);
    };

    const handleOpenFileMenuClick = () => {
        const target = document.getElementById('file-open-menu-button')
        setOpenMenu(target);
        document.getElementById('nav-file-0')?.focus()
    };
    const handleFileOpen = (fileName: string, newWindow: boolean) => {
        setOpenMenu(null);
        fileOps.openWorkbook(newWindow, fileName)
    }
    const handleOpenFileMenuClose = () => {
        setOpenMenu(null);
    };

    const normalizeWorkbookFileName = (filename: string) => {
        if (filename.startsWith(settings.workbookDirectory)) {
            filename = filename.substring(settings.workbookDirectory.length + 1)
            if (filename.endsWith('.apicize')) {
                filename = filename.substring(0, filename.length - 8)
            }
        }
        return filename
    }

    window.onkeydown = ((e) => {
        if (e.ctrlKey) {
            switch (e.key) {
                case 'Enter':
                    if (!(workspace.activeSelection && (workspace.activeSelection.type === EntityType.Request || workspace.activeSelection.type === EntityType.Group))) {
                        return
                    }
                    workspace.launchExecution(workspace.activeSelection.id, !e.shiftKey)
                    break
                case 'n':
                    fileOps.newWorkbook(false)
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
                    }
                    break
                case 's':
                    if (e.shiftKey) {
                        fileOps.saveWorkbookAs()
                    } else {
                        fileOps.saveWorkbook()
                    }
                    break
            }
        }
    })

    let direction: ResponsiveStyleValue<'row' | 'column'>
    let alignDropBtnSelf: ResponsiveStyleValue<'begin' | 'end'>
    let alignDropBtnItems: ResponsiveStyleValue<'begin' | 'end'>
    let firstPanelTPad: string
    let buttonSpacing: string | undefined

    if (props.orientation == 'horizontal') {
        direction = 'row'
        firstPanelTPad = 'None'
        alignDropBtnSelf = 'begin'
        alignDropBtnItems = 'end'
    } else {
        direction = 'column'
        firstPanelTPad = '10em'
        alignDropBtnSelf = 'end'
        // buttonSpacing = '1em'
        alignDropBtnItems = 'begin'
    }

    return <ButtonGroup orientation={props.orientation} sx={props.sx}>
        <IconButton
            size='large'
            aria-label='new'
            title={`New Workspace (${settings.ctrlKey} + N)`} onClick={() => fileOps.newWorkbook(false)}
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
            <MenuItem autoFocus={true} key='nav-new-file' className='recent-file' sx={{ fontSize: 'inherit' }} disableRipple onClick={() => handleFileNew()}>
                <Box className='filename'>Open Workspace in New Window</Box>
                <OpenInBrowserIcon sx={{ marginRight: 0 }} fontSize='inherit' />
            </MenuItem>
        </DropdownMenu>

        <IconButton
            size="large"
            aria-label='open'
            id='file-open-btn'
            sx={{ marginTop: buttonSpacing }}
            title={`Open Workbook (${settings.ctrlKey} + O)`}
            onClick={() => fileOps.openWorkbook(false, undefined, true)}>
            <FileOpenIcon />
        </IconButton>
        {
            settings.recentWorkbookFileNames.length > 1
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
            settings.recentWorkbookFileNames.length > 1
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
                            <MenuItem autoFocus={idx == 0} key={`nav-file-${idx}`} sx={{ fontSize: 'inherit' }} className='recent-file' disableRipple onClick={() => handleFileOpen(f, false)}>
                                <Box className='filename'>{normalizeWorkbookFileName(f)}</Box>
                                <IconButton title='Open in New Window' onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFileOpen(f, true); }}><OpenInBrowserIcon sx={{ marginRight: 0 }} fontSize='inherit' /></IconButton>
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
            title={`Save to Workbook (${settings.ctrlKey} + S)`} disabled={workspace.fileName.length == 0} onClick={() => fileOps.saveWorkbook()}>
            <SaveIcon />
        </IconButton>
        <IconButton
            size='large'
            aria-label='save-as' sx={{ marginTop: buttonSpacing, paddingLeft: '8px', paddingRight: '8px' }}
            title={`Save to Workbook As (${settings.ctrlKey} + Shift + S)`} onClick={() => fileOps.saveWorkbookAs()}>
            <SaveAsIcon />
        </IconButton>
    </ButtonGroup>
})