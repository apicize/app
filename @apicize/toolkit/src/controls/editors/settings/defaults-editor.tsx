import Stack from '@mui/material/Stack'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import { SxProps } from '@mui/material/styles'
import { observer } from 'mobx-react-lite';
import { useWorkspace } from '../../../contexts/workspace.context';
import { Selection } from '@apicize/lib-typescript';
import { useEffect, useState } from 'react';
import { useFeedback } from '../../../contexts/feedback.context';
import { EditableDefaults } from '../../../models/workspace/editable-defaults';
import { WorkspaceParameters } from '../../../models/workspace/workspace-parameters';

interface ParameterEditorProps {
    sx?: SxProps
    className?: string
    defaults: EditableDefaults
    parameters: WorkspaceParameters
    showDefaultScenarioMenu: boolean
    setShowDefaultScenarioMenu: (show: boolean) => void
    showDefaultAuthorizationMenu: boolean
    setShowDefaultAuthorizationMenu: (show: boolean) => void
    showDefaultCertificateMenu: boolean
    setShowDefaultCertificateMenu: (show: boolean) => void
    showDefaultProxyMenu: boolean
    setShowDefaultProxyMenu: (show: boolean) => void
    showDefaultDataMenu: boolean
    setShowDefaultDataMenu: (show: boolean) => void
}

const ParameterEditor = observer(({
    sx,
    className,
    defaults,
    parameters,
    showDefaultScenarioMenu,
    setShowDefaultScenarioMenu,
    showDefaultAuthorizationMenu,
    setShowDefaultAuthorizationMenu,
    showDefaultCertificateMenu,
    setShowDefaultCertificateMenu,
    showDefaultProxyMenu,
    setShowDefaultProxyMenu,
    showDefaultDataMenu,
    setShowDefaultDataMenu,
}: ParameterEditorProps) => {

    const feedback = useFeedback()

    let credIndex = 0
    const itemsFromSelections = (selections: Selection[]) => {
        return selections.map(s => (
            <MenuItem key={`creds-${credIndex++}`} value={s.id}>{s.name}</MenuItem>
        ))
    }

    return <Stack spacing={3} sx={sx} marginTop='0.25rem' className={className}>
        <FormControl>
            <InputLabel id='scenario-label-id'>Scenarios</InputLabel>
            <Select
                labelId='scenario-label'
                aria-labelledby='scenario-label-id'
                id='cred-scenario'
                label='Scenario'
                value={defaults.selectedScenario.id}
                open={showDefaultScenarioMenu}
                onClose={() => setShowDefaultScenarioMenu(false)}
                onOpen={() => setShowDefaultScenarioMenu(true)}
                onChange={(e) => {
                    defaults.setScenarioId(e.target.value).catch(err => feedback.toastError(err))
                }}
                size='small'
                fullWidth
            >
                {itemsFromSelections(parameters.scenarios)}
            </Select>
        </FormControl>
        <FormControl>
            <InputLabel id='auth-label-id'>Authorization</InputLabel>
            <Select
                labelId='auth-label'
                aria-labelledby='auth-label-id'
                id='cred-auth'
                label='Authorization'
                value={defaults.selectedAuthorization.id}
                open={showDefaultAuthorizationMenu}
                onClose={() => setShowDefaultAuthorizationMenu(false)}
                onOpen={() => setShowDefaultAuthorizationMenu(true)}
                onChange={(e) => {
                    defaults.setAuthorizationId(e.target.value).catch(err => feedback.toastError(err))
                }}
                size='small'
                fullWidth
            >
                {itemsFromSelections(parameters.authorizations)}
            </Select>
        </FormControl>
        <FormControl>
            <InputLabel id='cert-label-id'>Certificate</InputLabel>
            <Select
                labelId='cert-label'
                aria-labelledby='cert-label-id'
                id='cred-cert'
                label='Certificate'
                value={defaults.selectedCertificate.id}
                open={showDefaultCertificateMenu}
                onClose={() => setShowDefaultCertificateMenu(false)}
                onOpen={() => setShowDefaultCertificateMenu(true)}
                onChange={(e) => {
                    defaults.setCertificateId(e.target.value).catch(err => feedback.toastError(err))
                }}
                size='small'
                fullWidth
            >
                {itemsFromSelections(parameters.certificates)}
            </Select>
        </FormControl>
        <FormControl>
            <InputLabel id='proxy-label-id'>Proxy</InputLabel>
            <Select
                labelId='proxy-label'
                aria-labelledby='proxy-label-id'
                id='cred-proxy'
                label='Proxy'
                value={defaults.selectedProxy.id}
                open={showDefaultProxyMenu}
                onClose={() => setShowDefaultProxyMenu(false)}
                onOpen={() => setShowDefaultProxyMenu(true)}
                onChange={(e) => {
                    defaults.setProxyId(e.target.value).catch(err => feedback.toastError(err))
                }}
                size='small'
                fullWidth
            >
                {itemsFromSelections(parameters.proxies)}
            </Select>
        </FormControl>
        <FormControl>
            <InputLabel id='data-label-id'>Data Set</InputLabel>
            <Select
                labelId='data-label'
                aria-labelledby='data-label-id'
                id='cred-data'
                label='Data Set'
                value={defaults.selectedData.id}
                open={showDefaultDataMenu}
                onClose={() => setShowDefaultDataMenu(false)}
                onOpen={() => setShowDefaultDataMenu(true)}
                onChange={(e) => {
                    defaults.setDataId(e.target.value).catch(err => feedback.toastError(err))
                }}
                fullWidth
                size='small'
            >
                {itemsFromSelections(parameters.data)}
            </Select>
        </FormControl>
    </Stack>
})

export const DefaultsEditor = observer(({ sx }: { sx?: SxProps }) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    workspace.nextHelpTopic = 'settings/defaults'

    const defaults = workspace.defaults

    // Register dropdowns so they can be hidden on modal dialogs
    const [showDefaultScenarioMenu, setShowDefaultScenarioMenu] = useState(false)
    const [showDefaultAuthorizationMenu, setShowDefaultAuthorizationMenu] = useState(false)
    const [showDefaultCertificateMenu, setShowDefaultCertificateMenu] = useState(false)
    const [showDefaultProxyMenu, setShowDefaultProxyMenu] = useState(false)
    const [showDefaultDataMenu, setShowDefaultDataMenu] = useState(false)
    useEffect(() => {
        const disposers = [
            feedback.registerModalBlocker(() => setShowDefaultScenarioMenu(false)),
            feedback.registerModalBlocker(() => setShowDefaultAuthorizationMenu(false)),
            feedback.registerModalBlocker(() => setShowDefaultCertificateMenu(false)),
            feedback.registerModalBlocker(() => setShowDefaultProxyMenu(false)),
            feedback.registerModalBlocker(() => setShowDefaultDataMenu(false)),
        ]
        return (() => {
            for (const disposer of disposers) {
                disposer()
            }
        })
    })

    if ((!workspace.activeParameters) || workspace.activeParameters.requestOrGroupId !== null) {
        workspace.initializeParameterList(null)
        return null
    }
    const parameters = workspace.activeParameters.parameters

    const parameterEditorProps = {
        defaults,
        parameters,
        showDefaultScenarioMenu,
        setShowDefaultScenarioMenu,
        showDefaultAuthorizationMenu,
        setShowDefaultAuthorizationMenu,
        showDefaultCertificateMenu,
        setShowDefaultCertificateMenu,
        showDefaultProxyMenu,
        setShowDefaultProxyMenu,
        showDefaultDataMenu,
        setShowDefaultDataMenu,
    }

    return <ParameterEditor className='panels full-width' sx={sx} {...parameterEditorProps} />
})
