import { MenuItem, FormControl, InputLabel, Select } from '@mui/material'
import { Stack } from '@mui/material'
import { DEFAULT_SELECTION_ID } from '../../../models/store'
import { observer } from 'mobx-react-lite'
import { useWorkspace } from '../../../contexts/workspace.context'
import { EditableRequestGroup } from '../../../models/workspace/editable-request-group'
import { Selection } from '@apicize/lib-typescript'
import { EditableRequest } from '../../../models/workspace/editable-request'
import { useFeedback } from '../../../contexts/feedback.context'
import { reaction } from 'mobx'
import { useState, useEffect } from 'react'

export const RequestParametersEditor = observer(({
    requestOrGroup,
}: {
    requestOrGroup: EditableRequest | EditableRequestGroup,
}) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    workspace.nextHelpTopic = 'requests/parameters'

    // Register dropdowns so they can be hidden on modal dialogs
    const [showScenarioMenu, setShowScenarioMenu] = useState(false)
    const [showAuthorizationMenu, setShowAuthorizationMenu] = useState(false)
    const [showCertificateMenu, setShowCertificateMenu] = useState(false)
    const [showProxyMenu, setShowProxyMenu] = useState(false)
    const [showDataMenu, setShowDataMenu] = useState(false)
    useEffect(() => {
        const disposers = [
            feedback.registerModalBlocker(() => setShowScenarioMenu(false)),
            feedback.registerModalBlocker(() => setShowAuthorizationMenu(false)),
            feedback.registerModalBlocker(() => setShowCertificateMenu(false)),
            feedback.registerModalBlocker(() => setShowProxyMenu(false)),
            feedback.registerModalBlocker(() => setShowDataMenu(false)),
        ]
        return (() => {
            for (const disposer of disposers) {
                disposer()
            }
        })
    })

    if (!requestOrGroup.parameters) {
        workspace.getRequestParameterList(requestOrGroup.id)
            .then(p => requestOrGroup.setParameters(p))
            .catch(e => feedback.toastError(e))

        return null
    }

    let credIndex = 0
    const itemsFromSelections = (selections: Selection[]) => {
        return selections.map(s => (
            <MenuItem key={`creds-${credIndex++}`} value={s.id}>{s.name}</MenuItem>
        ))
    }

    return (
        <Stack spacing={3}>
            <FormControl>
                <InputLabel id='scenario-label-id'>Scenario</InputLabel>
                <Select
                    labelId='scenario-label'
                    aria-labelledby='scenario-label-id'
                    id='cred-scenario'
                    label='Scenario'
                    value={requestOrGroup.selectedScenario?.id ?? DEFAULT_SELECTION_ID}
                    open={showScenarioMenu}
                    onClose={() => setShowScenarioMenu(false)}
                    onOpen={() => setShowScenarioMenu(true)}
                    onChange={(e) => requestOrGroup.setSelectedScenarioId(e.target.value)}
                    fullWidth
                    size='small'
                >
                    {itemsFromSelections(requestOrGroup.parameters.scenarios)}
                </Select>
            </FormControl>
            <FormControl>
                <InputLabel id='auth-label-id'>Authorization</InputLabel>
                <Select
                    labelId='auth-label'
                    aria-labelledby='auth-label-id'
                    id='cred-auth'
                    label='Authorization'
                    value={requestOrGroup.selectedAuthorization?.id ?? DEFAULT_SELECTION_ID}
                    open={showAuthorizationMenu}
                    onClose={() => setShowAuthorizationMenu(false)}
                    onOpen={() => setShowAuthorizationMenu(true)}
                    onChange={(e) => requestOrGroup.setSelectedAuthorizationId(e.target.value)}
                    fullWidth
                    size='small'
                >
                    {itemsFromSelections(requestOrGroup.parameters.authorizations)}
                </Select>
            </FormControl>
            <FormControl>
                <InputLabel id='cert-label-id'>Certificate</InputLabel>
                <Select
                    labelId='cert-label'
                    aria-labelledby='cert-label-id'
                    id='cred-cert'
                    label='Certificate'
                    value={requestOrGroup.selectedCertificate?.id ?? DEFAULT_SELECTION_ID}
                    open={showCertificateMenu}
                    onClose={() => setShowCertificateMenu(false)}
                    onOpen={() => setShowCertificateMenu(true)}
                    onChange={(e) => requestOrGroup.setSelectedCertificateId(e.target.value)}
                    fullWidth
                    size='small'
                >
                    {itemsFromSelections(requestOrGroup.parameters.certificates)}
                </Select>
            </FormControl>
            <FormControl>
                <InputLabel id='proxy-label-id'>Proxy</InputLabel>
                <Select
                    labelId='proxy-label'
                    aria-labelledby='proxy-label-id'
                    id='cred-proxy'
                    label='Proxy'
                    value={requestOrGroup.selectedProxy?.id ?? DEFAULT_SELECTION_ID}
                    open={showProxyMenu}
                    onClose={() => setShowProxyMenu(false)}
                    onOpen={() => setShowProxyMenu(true)}
                    onChange={(e) => requestOrGroup.setSelectedProxyId(e.target.value)}
                    fullWidth
                    size='small'
                >
                    {itemsFromSelections(requestOrGroup.parameters.proxies)}
                </Select>
            </FormControl>
            <FormControl>
                <InputLabel id='proxy-data-id'>Seed Data</InputLabel>
                <Select
                    labelId='proxy-data'
                    aria-labelledby='proxy-data-id'
                    id='cred-data'
                    label='Seed Data'
                    value={requestOrGroup.selectedData?.id ?? DEFAULT_SELECTION_ID}
                    open={showDataMenu}
                    onClose={() => setShowDataMenu(false)}
                    onOpen={() => setShowDataMenu(true)}
                    onChange={(e) => requestOrGroup.setSelectedDataId(e.target.value)}
                    fullWidth
                    size='small'
                >
                    {itemsFromSelections(requestOrGroup.parameters.data)}
                </Select>
            </FormControl>
        </Stack>
    )
})
