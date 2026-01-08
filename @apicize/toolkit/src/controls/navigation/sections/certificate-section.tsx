import { Persistence } from "@apicize/lib-typescript"
import { ListItemIcon, ListItemText, Menu, MenuItem, SvgIcon, useTheme } from "@mui/material"
import CertificateIcon from "../../../icons/certificate-icon"
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import { EntityType } from "../../../models/workspace/entity-type"
import { useWorkspace } from "../../../contexts/workspace.context"
import { useState } from "react"
import { ParameterSection } from "./parameter-section"
import { MenuPosition } from "../../../models/menu-position"
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { useFeedback } from "../../../contexts/feedback.context"
import { observer } from "mobx-react-lite"
import { IndexedEntityPosition } from "../../../models/workspace/indexed-entity-position"
import { useApicizeSettings } from "../../../contexts/apicize-settings.context"

export const CertificateSection = observer(({ includeHeader }: { includeHeader: boolean }) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const theme = useTheme()
    const settings = useApicizeSettings()

    const [certificateMenu, setCertificateMenu] = useState<MenuPosition | undefined>(undefined)

    const closeCertificateMenu = () => {
        setCertificateMenu(undefined)
    }

    const selectCertificate = (id: string) => {
        workspace.changeActive(EntityType.Certificate, id)
    }

    const handleAddCertificate = (targetCertificateId: string, targetPosition: IndexedEntityPosition) => {
        closeCertificateMenu()
        workspace.addCertificate(targetCertificateId, targetPosition, null)
    }

    const handleSelectHeader = (headerId: string, helpTopic?: string) => {
        // closeAllMenus()
        if (helpTopic) {
            workspace.showHelp(helpTopic, headerId)
        }
    }

    const handleMoveCertificate = (id: string, relativeToId: string, relativePosition: IndexedEntityPosition) => {
        selectCertificate(id)
        workspace.moveCertificate(id, relativeToId, relativePosition)
    }

    const handleDupeCertificate = () => {
        closeCertificateMenu()
        const id = certificateMenu?.id
        if (!id) return
        workspace.addCertificate(id, IndexedEntityPosition.After, id)
    }

    const showCertificateMenu = (event: React.MouseEvent, persistence: Persistence, id: string) => {
        setCertificateMenu(
            {
                id,
                type: EntityType.Certificate,
                mouseX: event.clientX - 1,
                mouseY: event.clientY - 6,
                persistence,
            }
        )
    }

    const handleDeleteCertificate = () => {
        closeCertificateMenu()
        const id = certificateMenu?.id
        if (!id) return
        feedback.confirm({
            title: 'Delete Certificate',
            message: `Are you are you sure you want to delete ${workspace.getNavigationName(id)}?`,
            okButton: 'Yes',
            cancelButton: 'No',
            defaultToCancel: true
        }).then((result) => {
            if (result) {
                workspace.deleteCertificate(id)
            }
        })
    }

    function CertificateMenu() {
        return certificateMenu
            ? <Menu
                id='certificate-menu'
                open={certificateMenu !== undefined}
                onClose={closeCertificateMenu}
                sx={{ fontSize: settings.navigationFontSize }}
                anchorReference='anchorPosition'
                anchorPosition={{
                    top: certificateMenu?.mouseY ?? 0,
                    left: certificateMenu?.mouseX ?? 0
                }}
            >
                <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(_) => handleAddCertificate(certificateMenu.id, IndexedEntityPosition.After)}>
                    <ListItemIcon>
                        <SvgIcon fontSize='small' color='certificate'><CertificateIcon /></SvgIcon>
                    </ListItemIcon>
                    <ListItemText disableTypography>Add Certificate</ListItemText>
                </MenuItem>
                <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(e) => handleDupeCertificate()}>
                    <ListItemIcon>
                        <SvgIcon fontSize='small' sx={{ color: theme.palette.certificate.light }}><ContentCopyOutlinedIcon /></SvgIcon>
                    </ListItemIcon>
                    <ListItemText disableTypography>Duplicate Certificate</ListItemText>
                </MenuItem>
                <MenuItem className='navigation-menu-item' sx={{ fontSize: 'inherit' }} onClick={(e) => handleDeleteCertificate()}>
                    <ListItemIcon>
                        <SvgIcon color='error'><DeleteIcon /></SvgIcon>
                    </ListItemIcon>
                    <ListItemText disableTypography>Delete Certificate</ListItemText>
                </MenuItem>
            </Menu>
            : <></>
    }

    return <ParameterSection
        title='Certificates'
        includeHeader={includeHeader}
        icon={<CertificateIcon />}
        contextMenu={<CertificateMenu />}
        iconColor='certificate'
        helpTopic='workspace/certificates'
        type={EntityType.Certificate}
        parameters={workspace.navigation.certificates}
        onSelect={selectCertificate}
        onSelectHeader={handleSelectHeader}
        onAdd={handleAddCertificate}
        onMove={handleMoveCertificate}
        onItemMenu={showCertificateMenu}
    />
})