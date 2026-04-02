import { MenuItem, FormControl, InputLabel, Select } from '@mui/material'
import { Stack } from '@mui/material'
import { observer } from 'mobx-react-lite'
import { useWorkspace } from '../../../contexts/workspace.context'
import { EditableRequestGroup } from '../../../models/workspace/editable-request-group'
import { DEFAULT_SELECTION_ID, Selection } from '@apicize/lib-typescript'
import { EditableRequest } from '../../../models/workspace/editable-request'
import { useFeedback } from '../../../contexts/feedback.context'
import { useState, useEffect } from 'react'

export const RequestParametersEditor = observer(({
    requestOrGroup,
}: {
    requestOrGroup: EditableRequest | EditableRequestGroup,
}) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    useEffect(() => { workspace.nextHelpTopic = 'requests/parameters' }, [workspace])

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
    }, [feedback])

    if ((!workspace.activeParameters) || workspace.activeParameters.requestOrGroupId !== requestOrGroup.id) {
        workspace.initializeParameterList(requestOrGroup.id)
        return null
    }
    const parameters = workspace.activeParameters.parameters

    let credIndex = 0
    const itemsFromSelections = (selections: Selection[]) => {
        return selections.map(s => (
            <MenuItem key={`creds-${credIndex++}`} value={s.id}>{s.name}</MenuItem>
        ))
    }

    return (
        <Stack spacing={3} paddingTop='0.5rem'>
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
                    onChange={(e) => {
                        requestOrGroup.setSelectedScenarioId(e.target.value).catch(err => feedback.toastError(err))
                    }}
                    fullWidth
                    size='small'
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
                    value={requestOrGroup.selectedAuthorization?.id ?? DEFAULT_SELECTION_ID}
                    open={showAuthorizationMenu}
                    onClose={() => setShowAuthorizationMenu(false)}
                    onOpen={() => setShowAuthorizationMenu(true)}
                    onChange={(e) => {
                        requestOrGroup.setSelectedAuthorizationId(e.target.value).catch(err => feedback.toastError(err))
                    }}
                    fullWidth
                    size='small'
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
                    value={requestOrGroup.selectedCertificate?.id ?? DEFAULT_SELECTION_ID}
                    open={showCertificateMenu}
                    onClose={() => setShowCertificateMenu(false)}
                    onOpen={() => setShowCertificateMenu(true)}
                    onChange={(e) => {
                        requestOrGroup.setSelectedCertificateId(e.target.value).catch(err => feedback.toastError(err))
                    }}
                    fullWidth
                    size='small'
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
                    value={requestOrGroup.selectedProxy?.id ?? DEFAULT_SELECTION_ID}
                    open={showProxyMenu}
                    onClose={() => setShowProxyMenu(false)}
                    onOpen={() => setShowProxyMenu(true)}
                    onChange={(e) => {
                        requestOrGroup.setSelectedProxyId(e.target.value).catch(err => feedback.toastError(err))
                    }}
                    fullWidth
                    size='small'
                >
                    {itemsFromSelections(parameters.proxies)}
                </Select>
            </FormControl>
            <FormControl>
                <InputLabel id='proxy-data-id'>Data Set</InputLabel>
                <Select
                    labelId='proxy-data'
                    aria-labelledby='proxy-data-id'
                    id='cred-data'
                    label='Data Set'
                    value={requestOrGroup.selectedDataSet?.id ?? DEFAULT_SELECTION_ID}
                    open={showDataMenu}
                    onClose={() => setShowDataMenu(false)}
                    onOpen={() => setShowDataMenu(true)}
                    onChange={(e) => {
                        requestOrGroup.setSelectedDataId(e.target.value).catch(err => feedback.toastError(err))
                    }}
                    fullWidth
                    size='small'
                >
                    {itemsFromSelections(parameters.data)}
                </Select>
            </FormControl>
        </Stack>
    )
})
