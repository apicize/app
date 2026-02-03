import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { SxProps } from '@mui/material/styles'
import Box from '@mui/material/Box'
import SvgIcon from '@mui/material/SvgIcon'
import FileOpenIcon from '@mui/icons-material/FileOpen';
import { EditorTitle } from '../editor-title';
import { CertificateType } from '@apicize/lib-typescript';
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo';
import { base64Decode, base64Encode } from '../../services/base64';
import { observer } from 'mobx-react-lite';
import { useClipboard } from '../../contexts/clipboard.context';
import { useFileOperations } from '../../contexts/file-operations.context';
import { ToastSeverity, useFeedback } from '../../contexts/feedback.context';
import CertificateIcon from '../../icons/certificate-icon';
import { useWorkspace } from '../../contexts/workspace.context';
import { SshFileType } from '../../models/workspace/ssh-file-type';
import { useApicizeSettings } from '../../contexts/apicize-settings.context';
import { EditableCertificate } from '../../models/workspace/editable-certificate'
import { useState, useEffect } from 'react'

export const CertificateEditor = observer(({ certificate, sx }: { certificate: EditableCertificate, sx: SxProps }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()

    workspace.nextHelpTopic = 'workspace/certificates'
    const feedback = useFeedback()
    const clipboard = useClipboard()
    const fileOps = useFileOperations()

    // Register dropdowns so they can be hidden on modal dialogs
    const [showCertificateTypeMenu, setShowCertificateTypeMenu] = useState(false)
    useEffect(() => {
        const disposer = feedback.registerModalBlocker(() => setShowCertificateTypeMenu(false))
        return (() => {
            disposer()
        })
    })

    let pemToView: string = ''
    if (certificate.pem && (certificate.pem.length > 0)) {
        try {
            pemToView = (new TextDecoder('ascii')).decode(base64Decode(certificate.pem))
        } catch {
            pemToView = '(Invalid)'
        }
    }

    let keyToView: string = ''
    if (certificate.key) {
        try {
            keyToView = (new TextDecoder('ascii')).decode(base64Decode(certificate.key))
        } catch {
            keyToView = '(Invalid)'
        }
    }

    const pasteDataFromClipboard = async (fileType: SshFileType) => {
        try {
            const text = await clipboard.getClipboardText()
            if (text.length > 0) {
                switch (fileType) {
                    case SshFileType.PEM:
                        certificate.setPem(text)
                        feedback.toast('PEM pasted from clipboard', ToastSeverity.Success)
                        break
                    case SshFileType.Key:
                        certificate.setKey(text)
                        feedback.toast('Key pasted from clipboard', ToastSeverity.Success)
                        break
                }
            }
        } catch (e) {
            feedback.toast(`Unable to access clipboard image - ${e}`, ToastSeverity.Error)
        }
    }

    const openFile = async (fileType: SshFileType) => {
        try {
            const data = await fileOps.openSshFile(fileType)
            if (data) {
                switch (fileType) {
                    case SshFileType.PEM:
                        certificate.setPem(data)
                        break
                    case SshFileType.Key:
                        certificate.setKey(data)
                        break
                    case SshFileType.PFX:
                        certificate.setCertificatePfx(data)
                        break
                }
                feedback.toast(`${fileType} loaded from file`, ToastSeverity.Success)
            }
        } catch (e) {
            feedback.toast(`${e}`, ToastSeverity.Error)
        }
    }

    return (
        <Stack className='editor certificate' direction='column' sx={sx}>
            <Box className='editor-panel-header'>
                <EditorTitle
                    icon={<SvgIcon color='certificate'><CertificateIcon /></SvgIcon>}
                    name={certificate.name?.length ?? 0 > 0 ? certificate.name : '(Unnamed)'}
                    diag={settings.showDiagnosticInfo ? certificate.id : undefined}
                />
            </Box>
            <Box className='editor-panel'>
                <Stack className='editor-content' direction={'column'} spacing={3}>
                    <TextField
                        id='cert-name'
                        label='Name'
                        aria-label='name'
                        error={!!certificate.nameError}
                        autoFocus={certificate.name === ''}
                        size='small'
                        value={certificate.name}
                        helperText={certificate.nameError ?? ''}
                        onChange={e => certificate.setName(e.target.value)}
                        fullWidth
                    />
                    <FormControl>
                        <InputLabel id='cert-type-label-id'>Type</InputLabel>
                        <Select
                            labelId='cert-type-label-id'
                            id='cert-type'
                            value={certificate.type}
                            label='Type'
                            size='small'
                            open={showCertificateTypeMenu}
                            onClose={() => setShowCertificateTypeMenu(false)}
                            onOpen={() => setShowCertificateTypeMenu(true)}
                            onChange={e => certificate.setType(e.target.value as
                                CertificateType.PEM | CertificateType.PKCS8_PEM | CertificateType.PKCS12)}
                        >
                            <MenuItem value={CertificateType.PKCS8_PEM}>PKCS 8 (PEM)</MenuItem>
                            <MenuItem value={CertificateType.PKCS12}>PKCS 12 (PFX)</MenuItem>
                            <MenuItem value={CertificateType.PEM}>PEM</MenuItem>
                        </Select>
                    </FormControl>
                    <Box paddingTop='2em'>
                        {
                            certificate.type === CertificateType.PKCS8_PEM
                                ? (
                                    <Stack direction='column' spacing={3}>
                                        <Stack direction={'row'} spacing={3} position='relative'>
                                            <Typography variant='h6' component='div'>SSL PEM Certificate / Chain</Typography>
                                            <IconButton color='primary' size='medium' aria-label='open pem certificate chain filename' title='Open Certificate PEM File'
                                                onClick={() => openFile(SshFileType.PEM)}
                                            ><FileOpenIcon fontSize='inherit' /></IconButton>
                                            <IconButton color='primary' disabled={!clipboard.hasText} size='medium' aria-label='paste-pem' title='Paste PEM from Clipboard'
                                                onClick={() => pasteDataFromClipboard(SshFileType.PEM)}><ContentPasteGoIcon fontSize='inherit' /></IconButton>
                                        </Stack>
                                        <TextField
                                            id='cert-pem'
                                            label='PEM'
                                            aria-label='pem file contents'
                                            error={!!certificate.pemError}
                                            multiline
                                            slotProps={{
                                                input: {
                                                    className: 'code',
                                                    readOnly: true
                                                }
                                            }}
                                            rows={8}
                                            value={pemToView}
                                            size='small'
                                            fullWidth
                                        />
                                        <Stack direction={'row'} spacing={3} position='relative'>
                                            <Typography variant='h6' component='div'>SSL Key</Typography>
                                            <IconButton color='primary' size='medium' aria-label='open certificate key file' title='Open Certificate Key File'
                                                onClick={() => openFile(SshFileType.Key)}
                                            ><FileOpenIcon fontSize='inherit' /></IconButton>
                                            <IconButton color='primary' disabled={!clipboard.hasText} size='medium' aria-label='paste-key' title='Paste Key from Clipboard'
                                                onClick={() => pasteDataFromClipboard(SshFileType.Key)}><ContentPasteGoIcon fontSize='inherit' /></IconButton>
                                        </Stack>
                                        <TextField
                                            id='cert-key'
                                            label='Certificate Key'
                                            aria-label='certificate key file contents'
                                            error={!!certificate.keyError}
                                            multiline
                                            slotProps={{
                                                input: {
                                                    className: 'code',
                                                    readOnly: true
                                                }
                                            }}
                                            rows={8}
                                            value={keyToView}
                                            size='small'
                                            fullWidth
                                        />
                                    </Stack>
                                )
                                : certificate.type === CertificateType.PKCS12 ? (
                                    <Stack direction={'column'} spacing={3}>
                                        <Stack direction={'row'} spacing={3} position='relative'>
                                            <Typography variant='h6' component='div'>PFX Certificate</Typography>
                                            <IconButton color='primary' size='medium' aria-label='open certificate pfx file' title='Open Certificate PFX File'
                                                onClick={() => openFile(SshFileType.PFX)}
                                            ><FileOpenIcon fontSize='inherit' /></IconButton>
                                        </Stack>
                                        <Stack direction={'row'} spacing={3}>
                                            <TextField
                                                id='cert-pfx'
                                                label='PFX'
                                                multiline
                                                slotProps={{
                                                    input: {
                                                        className: 'code',
                                                        readOnly: true
                                                    }
                                                }}
                                                rows={8}
                                                value={certificate.pfx ? base64Encode(new Uint8Array(Buffer.from(certificate.pfx))) : ''}
                                                size='small'
                                                fullWidth
                                            />
                                        </Stack>
                                        <TextField
                                            id='cert-key'
                                            label='Certificate Key'
                                            aria-label='certificate pfx file contents'
                                            className="password"
                                            value={certificate.password}
                                            onChange={e => certificate.setPassword(e.target.value)}
                                            size='small'
                                            fullWidth
                                        />
                                    </Stack>
                                ) : (
                                    <Stack direction={'column'} spacing={3}>
                                        <Stack direction={'row'} spacing={3} position='relative'>
                                            <Typography variant='h6' component='div'>SSL PEM Certificate / Chain</Typography>
                                            <IconButton color='primary' size='medium' aria-label='open pem certificate chain filename' title='Open Certificate PEM File'
                                                onClick={() => openFile(SshFileType.PEM)}
                                            ><FileOpenIcon fontSize='inherit' /></IconButton>
                                            <IconButton color='primary' disabled={!clipboard.hasText} size='medium' aria-label='paste-pem' title='Paste PEM from Clipboard'
                                                onClick={() => pasteDataFromClipboard(SshFileType.PEM)}><ContentPasteGoIcon fontSize='inherit' /></IconButton>
                                        </Stack>
                                        <Stack direction={'row'} spacing={3}>
                                            <TextField
                                                id='cert-pem'
                                                label='PEM'
                                                aria-label='pem file contents'
                                                multiline
                                                error={!!certificate.pemError}
                                                slotProps={{
                                                    input: {
                                                        readOnly: true,
                                                        className: 'code'
                                                    }
                                                }}

                                                rows={8}
                                                value={pemToView}
                                                size='small'
                                                fullWidth
                                            />
                                        </Stack>
                                    </Stack>
                                )
                        }
                    </Box>
                </Stack>
            </Box>
        </Stack >
    )
})
