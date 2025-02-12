import { action, computed, makeObservable, observable, toJS } from "mobx"
import { DEFAULT_SELECTION_ID, NO_SELECTION, NO_SELECTION_ID } from "../models/store"
import { Execution, ExecutionGroup, ExecutionMenuItem, ExecutionRequest, ExecutionResult } from "../models/workspace/execution"
import { base64Decode, base64Encode, editableWorkspaceToStoredWorkspace } from "../services/apicize-serializer"
import { EditableRequest, EditableRequestGroup } from "../models/workspace/editable-request"
import { EditableScenario } from "../models/workspace/editable-scenario"
import { EditableAuthorization } from "../models/workspace/editable-authorization"
import { EditableCertificate } from "../models/workspace/editable-certificate"
import { EditableProxy } from "../models/workspace/editable-proxy"
import {
    Identifiable, Named, GetTitle, GroupExecution, BodyType, Method, AuthorizationType,
    CertificateType, Workspace, ApicizeExecution, ApicizeExecutionGroup, ApicizeExecutionItem, ApicizeExecutionRequest,
    Body, ApicizeExecutionDetails, Selection,
    Persistence,
    IndexedEntityManager,
    Request,
    RequestGroup,
} from "@apicize/lib-typescript"
import { EntitySelection } from "../models/workspace/entity-selection"
import { EditableNameValuePair } from "../models/workspace/editable-name-value-pair"
import { GenerateIdentifier } from "../services/random-identifier-generator"
import { EditableEntityType } from "../models/workspace/editable-entity-type"
import { EditableItem, EditableState } from "../models/editable"
import { createContext, useContext } from "react"
import { EditableDefaults } from "../models/workspace/editable-defaults"
import { EditableWarnings } from "../models/workspace/editable-warnings"

export enum WorkspaceMode {
    Normal,
    Help,
    Settings,
    Defaults,
    Console,
}

export class WorkspaceStore {
    /**
     * Workspace representing all requests, scenarios, authorizations, certificates and proxies
     */
    @observable accessor requests = new IndexedEntityManager<EditableRequest | EditableRequestGroup>(new Map(), [], new Map())

    @observable accessor scenarios = new IndexedEntityManager<EditableScenario>(new Map(), [], new Map())
    @observable accessor authorizations = new IndexedEntityManager<EditableAuthorization>(new Map(), [], new Map())
    @observable accessor certificates = new IndexedEntityManager<EditableCertificate>(new Map(), [], new Map())
    @observable accessor proxies = new IndexedEntityManager<EditableProxy>(new Map(), [], new Map())
    @observable accessor defaults = new EditableDefaults()
    @observable accessor warnings = new EditableWarnings()

    /**
     * Help context
     */
    @observable accessor mode = WorkspaceMode.Normal;
    @observable accessor helpTopic: string | null = null
    private helpTopicHistory: string[] = []
    public nextHelpTopic: string | null = null

    /**
     * Apicize executions underway or completed
     */
    @observable accessor executions = new Map<string, Execution>()

    @observable accessor active: EditableItem | null = null
    @observable accessor activeId: string | null = null

    @observable accessor appName = 'Apicize'
    @observable accessor appVersion = ''
    @observable accessor workbookFullName = ''
    @observable accessor workbookDisplayName = '(New )'
    @observable accessor dirty: boolean = false
    @observable accessor warnOnWorkspaceCreds: boolean = true
    @observable accessor invalidItems = new Set<string>()

    @observable accessor executingRequestIDs: string[] = []

    @observable accessor expandedItems = ['hdr-r']

    pendingPkceRequests = new Map<string, Map<string, number>>()

    constructor(
        private readonly callbacks: {
            onExecuteRequest: (workspace: Workspace, requestId: string, runs?: number) => Promise<ApicizeExecution>,
            onCancelRequest: (requestId: string) => Promise<void>,
            onClearToken: (authorizationId: string) => Promise<void>,
            onInitializePkce: (data: { authorizationId: string }) => Promise<void>,
            onClosePkce: (data: { authorizationId: string }) => Promise<void>,
            onRefreshToken: (data: { authorizationId: string }) => Promise<void>,
        }) {
        makeObservable(this)
    }

    anyInvalid() {
        for (const entities of [
            this.requests.values,
            this.scenarios.values,
            this.authorizations.values,
            this.certificates.values,
            this.proxies.values,
        ]) {
            for (const entity of entities) {
                if (entity.state === EditableState.Warning) { console.log('invalid', { type: entity.entityType, id: entity.id }); return true; }
            }
        }
        return false
    }

    @action
    changeApp(name: string, version: string) {
        this.appName = name
        this.appVersion = version
    }

    @action
    newWorkspace(newWorkspace: Workspace) {
        this.workbookFullName = ''
        this.workbookDisplayName = ''
        this.dirty = false
        this.warnOnWorkspaceCreds = true
        this.requests.reset()

        this.scenarios = new IndexedEntityManager(
            new Map(Object.values(newWorkspace.scenarios.entities).map((e) =>
                [e.id, EditableScenario.fromWorkspace(e)]
            )),
            newWorkspace.scenarios.topLevelIds,
            new Map(Object.entries(newWorkspace.scenarios.childIds)),
        )

        this.authorizations = new IndexedEntityManager(
            new Map(Object.values(newWorkspace.authorizations.entities).map((e) =>
                [e.id, EditableAuthorization.fromWorkspace(e)]
            )),
            newWorkspace.authorizations.topLevelIds,
            new Map(Object.entries(newWorkspace.authorizations.childIds)),
        )

        this.certificates = new IndexedEntityManager(
            new Map(Object.values(newWorkspace.certificates.entities).map((e) =>
                [e.id, EditableCertificate.fromWorkspace(e)]
            )),
            newWorkspace.certificates.topLevelIds ?? [],
            new Map(Object.entries(newWorkspace.certificates.childIds)),
        )

        this.proxies = new IndexedEntityManager(
            new Map(Object.values(newWorkspace.proxies.entities).map((e) =>
                [e.id, EditableProxy.fromWorkspace(e)]
            )),
            newWorkspace.proxies.topLevelIds ?? [],
            new Map(Object.entries(newWorkspace.proxies.childIds)),
        )

        this.warnings.set(newWorkspace.warnings)
        this.defaults = new EditableDefaults()

        this.expandedItems = ['hdr-r']
        this.executions.clear()
        this.invalidItems.clear()
        this.active = null
        this.pendingPkceRequests.clear()
    }

    @action
    loadWorkspace(newWorkspace: Workspace, fileName: string, displayName: string) {
        this.requests = new IndexedEntityManager(
            new Map(Object.entries(newWorkspace.requests.entities).map(([id, e]) =>
                [id,
                    (e as unknown as Request)['url'] === undefined
                        ? EditableRequestGroup.fromWorkspace(e as RequestGroup)
                        : EditableRequest.fromWorkspace(e as Request)
                ]
            )),
            newWorkspace.requests.topLevelIds,
            new Map(Object.entries(newWorkspace.requests.childIds)),
        )
        this.scenarios = new IndexedEntityManager(
            new Map(Object.values(newWorkspace.scenarios.entities).map((e) =>
                [e.id, EditableScenario.fromWorkspace(e)]
            )),
            newWorkspace.scenarios.topLevelIds,
            new Map(Object.entries(newWorkspace.scenarios.childIds)),
        )

        this.authorizations = new IndexedEntityManager(
            new Map(Object.values(newWorkspace.authorizations.entities).map((e) =>
                [e.id, EditableAuthorization.fromWorkspace(e)]
            )),
            newWorkspace.authorizations.topLevelIds,
            new Map(Object.entries(newWorkspace.authorizations.childIds)),
        )

        this.certificates = new IndexedEntityManager(
            new Map(Object.values(newWorkspace.certificates.entities).map((e) =>
                [e.id, EditableCertificate.fromWorkspace(e)]
            )),
            newWorkspace.certificates.topLevelIds ?? [],
            new Map(Object.entries(newWorkspace.certificates.childIds)),
        )

        this.proxies = new IndexedEntityManager(
            new Map(Object.values(newWorkspace.proxies.entities).map((e) =>
                [e.id, EditableProxy.fromWorkspace(e)]
            )),
            newWorkspace.proxies.topLevelIds ?? [],
            new Map(Object.entries(newWorkspace.proxies.childIds)),
        )

        this.defaults = EditableDefaults.fromWorkspace(newWorkspace)

        this.warnings.set(newWorkspace.warnings)

        const expandedItems = ['hdr-r']
        if (this.requests.childIds) {
            for (const groupId of this.requests.childIds.keys()) {
                expandedItems.push(`g-${groupId}`)
            }
        }
        this.expandedItems = expandedItems

        for (const entity of this.requests.values) {
            if (entity.state === EditableState.Warning) this.invalidItems.add(entity.id)
        }
        for (const entity of this.scenarios.values) {
            if (entity.state === EditableState.Warning) this.invalidItems.add(entity.id)
        }
        for (const entity of this.authorizations.values) {
            if (entity.state === EditableState.Warning) this.invalidItems.add(entity.id)
        }
        for (const entity of this.certificates.values) {
            if (entity.state === EditableState.Warning) this.invalidItems.add(entity.id)
        }
        for (const entity of this.proxies.values) {
            if (entity.state === EditableState.Warning) this.invalidItems.add(entity.id)
        }
        this.active = this.warnings.hasEntries ? this.warnings : null
        this.workbookFullName = fileName
        this.workbookDisplayName = displayName
        this.dirty = false
        this.warnOnWorkspaceCreds = true
        this.executions.clear()
        this.invalidItems.clear()
        this.pendingPkceRequests.clear()
    }

    @action
    updateSavedLocation(fileName: string, displayName: string) {
        this.workbookFullName = fileName
        this.workbookDisplayName = displayName
        this.dirty = false
    }

    getWorkspace() {
        return editableWorkspaceToStoredWorkspace(
            this.requests,
            this.scenarios,
            this.authorizations,
            this.certificates,
            this.proxies,
            this.defaults,
        )
    }

    @action
    toggleExpanded(itemId: string, isExpanded: boolean) {
        let expanded = new Set(this.expandedItems)
        if (isExpanded) {
            expanded.add(itemId)
        } else {
            expanded.delete(itemId)
        }
        this.expandedItems = [...expanded]
    }

    @action
    changeActive(type: EditableEntityType, id: string) {
        this.activeId = `${type}-${id}`
        switch (type) {
            case EditableEntityType.Workbook:
                switch (id) {
                    case 'console':
                        this.mode = WorkspaceMode.Console;
                        break
                    case 'settings':
                        this.mode = WorkspaceMode.Settings;
                        break
                    case 'defaults':
                        this.mode = WorkspaceMode.Defaults;
                        break
                }
                break
            case EditableEntityType.Request:
            case EditableEntityType.Group:
                this.mode = WorkspaceMode.Normal
                const r = this.requests.get(id)
                if (!r) throw new Error(`Invalid request ID ${id}`)
                this.active = r
                break
            case EditableEntityType.Scenario:
                this.mode = WorkspaceMode.Normal
                const s = this.scenarios.get(id)
                if (!s) throw new Error(`Invalid scenario ID ${id}`)
                this.active = s
                break
            case EditableEntityType.Authorization:
                this.mode = WorkspaceMode.Normal
                const a = this.authorizations.get(id)
                if (!a) throw new Error(`Invalid authorization ID ${id}`)
                this.active = a
                break
            case EditableEntityType.Certificate:
                this.mode = WorkspaceMode.Normal
                const c = this.certificates.get(id)
                if (!c) throw new Error(`Invalid certificate ID ${id}`)
                this.active = c
                break
            case EditableEntityType.Proxy:
                this.mode = WorkspaceMode.Normal
                const p = this.proxies.get(id)
                if (!p) throw new Error(`Invalid proxy ID ${id}`)
                this.active = p
                break
            case EditableEntityType.Warnings:
                this.mode = WorkspaceMode.Normal
                this.active = this.warnings
                this.nextHelpTopic = 'settings'
                break
            default:
                this.active = null
                this.mode = WorkspaceMode.Normal
                break
        }
    }

    @action
    clearActive() {
        this.active = null
        this.activeId = null
    }

    /**
     * Generate a list of entities, including default and none selections, returns list and selected ID
     * @param index
     * @param defaultName 
     * @returns tuple of list and selected ID
     */
    private buildParameterList = <T extends Identifiable & Named>(
        index: IndexedEntityManager<T>,
        defaultName?: string): EntitySelection[] => {
        const list: EntitySelection[] = []
        if (defaultName !== undefined) {
            list.push({ id: DEFAULT_SELECTION_ID, name: `Default (${defaultName})` })
        }
        list.push({ id: NO_SELECTION_ID, name: `Off` })

        // Get the public, private and global values
        for (const persistence of [Persistence.Workbook, Persistence.Private, Persistence.Vault]) {
            for (const entity of index.getChildren(persistence)) {
                list.push({ id: entity.id, name: GetTitle(entity) })
            }
        }

        return list
    }


    @action
    addRequest(targetID?: string | null) {
        const entry = new EditableRequest()
        entry.id = GenerateIdentifier()
        entry.runs = 1
        entry.test = `describe('status', () => {
    it('equals 200', () => {
        expect(response.status).to.equal(200)
    })
})`
        this.requests.add(entry, false, targetID)
        this.dirty = true
        this.changeActive(EditableEntityType.Request, entry.id)
    }

    @action
    deleteRequest(id: string) {
        if (this.active?.id === id) {
            this.clearActive()
        }
        this.requests.remove(id)
        this.executions.delete(id)
        this.dirty = true
    }

    @action
    moveRequest(id: string, destinationID: string | null, onLowerHalf: boolean | null, onLeft: boolean | null) {
        this.requests.move(id, destinationID, onLowerHalf, onLeft)
        this.dirty = true
        if (this.active?.id !== id) {
            this.changeActive(EditableEntityType.Request, id)
        }
    }

    @action
    copyRequest(id: string) {
        const copySeletion = (selection?: Selection) => {
            return selection
                ? { id: selection.id, name: selection.name } as Selection
                : undefined
        }
        // Return the ID of the duplicated entry
        const copyEntry = (entry: EditableRequest | EditableRequestGroup, appendCopySuffix: boolean) => {
            if (entry.entityType === EditableEntityType.Request) {
                const request = new EditableRequest()
                request.id = GenerateIdentifier()
                request.name = `${GetTitle(entry)}${appendCopySuffix ? ' - copy' : ''}`
                request.runs = entry.runs
                request.dirty = true
                request.url = entry.url
                request.method = entry.method
                request.mode = entry.mode
                request.timeout = entry.timeout
                request.headers = entry.headers.map(h => ({ ...h, id: GenerateIdentifier() } as EditableNameValuePair))
                request.queryStringParams = entry.queryStringParams.map(q => ({ ...q, id: GenerateIdentifier() } as EditableNameValuePair))
                request.body = entry.body
                    ? structuredClone(toJS(entry.body))
                    : { type: BodyType.None, data: undefined }
                request.test = entry.test
                request.selectedScenario = copySeletion(entry.selectedScenario)
                request.selectedAuthorization = copySeletion(entry.selectedAuthorization)
                request.selectedCertificate = copySeletion(entry.selectedCertificate)
                request.selectedProxy = copySeletion(entry.selectedProxy)

                this.requests.set(request.id, request)
                return request
            }

            const group = new EditableRequestGroup()
            group.id = GenerateIdentifier()
            group.name = `${GetTitle(entry)}${appendCopySuffix ? ' - copy' : ''}`
            group.runs = entry.runs
            group.dirty = true
            group.execution = entry.execution
            group.selectedScenario = copySeletion(entry.selectedScenario)
            group.selectedAuthorization = copySeletion(entry.selectedAuthorization)
            group.selectedCertificate = copySeletion(entry.selectedCertificate)
            group.selectedProxy = copySeletion(entry.selectedProxy)

            this.requests.set(group.id, group)

            const sourceChildIDs = this.requests.childIds.get(source.id)
            if (sourceChildIDs && sourceChildIDs.length > 0) {
                const dupedChildIDs: string[] = []
                sourceChildIDs.forEach(childID => {
                    const childEntry = this.requests.get(childID)
                    if (childEntry) {
                        const dupedChildID = copyEntry(childEntry, false).id
                        dupedChildIDs.push(dupedChildID)
                    }
                })
                this.requests.childIds.set(group.id, dupedChildIDs)
            }
            return group
        }

        const source = this.requests.get(id)
        const copiedEntry = copyEntry(source, true)

        this.requests.add(copiedEntry, source.entityType === EditableEntityType.Group, id)

        this.dirty = true
        this.changeActive(EditableEntityType.Request, copiedEntry.id)
    }

    @action
    deleteWorkspaceWarning(warningId: string) {
        this.warnings.delete(warningId)
        if (!this.warnings.hasEntries) {
            this.changeActive(EditableEntityType.None, '')
        }
    }

    @action
    setName(value: string) {
        const namable = this.active as Named
        namable.name = value
        this.dirty = true
    }

    @action
    setRequestUrl(value: string) {
        if (this.active?.entityType === EditableEntityType.Request) {
            const request = this.active as EditableRequest
            request.url = value
            this.dirty = true
        }
    }

    @action
    setRequestMethod(value: Method) {
        if (this.active?.entityType === EditableEntityType.Request) {
            const request = this.active as EditableRequest
            request.method = value
            this.dirty = true
        }
    }

    @action
    setRequestTimeout(value: number) {
        if (this.active?.entityType === EditableEntityType.Request) {
            const request = this.active as EditableRequest
            request.timeout = value
            this.dirty = true
        }
    }

    @action
    setRequestQueryStringParams(value: EditableNameValuePair[] | undefined) {
        if (this.active?.entityType === EditableEntityType.Request) {
            const request = this.active as EditableRequest
            request.queryStringParams = value ?? []
            this.dirty = true
        }
    }

    @action
    setRequestHeaders(value: EditableNameValuePair[] | undefined) {
        if (this.active?.entityType === EditableEntityType.Request) {
            const request = this.active as EditableRequest
            request.headers = value ?? []
            this.dirty = true
        }
    }

    @action
    setRequestBodyType(value: BodyType | undefined) {
        if (this.active?.entityType === EditableEntityType.Request) {
            const request = this.active as EditableRequest
            let newBody: Body
            if (request.body && request.body.data) {
                switch (value) {
                    case BodyType.Raw:
                        switch (request.body.type) {
                            case BodyType.Form:
                                newBody = {
                                    type: BodyType.Raw, data: base64Encode((new TextEncoder()).encode(
                                        encodeFormData(request.body.data as EditableNameValuePair[])
                                    ))
                                }
                                break
                            case BodyType.XML:
                            case BodyType.JSON:
                            case BodyType.Text:
                                newBody = { type: BodyType.Raw, data: base64Encode((new TextEncoder()).encode(request.body.data)) }
                                break
                            case BodyType.Raw:
                                newBody = { type: BodyType.Raw, data: request.body.data }
                                break
                            default:
                                newBody = {
                                    type: BodyType.Raw, data: ''
                                }
                        }
                        break
                    case BodyType.Form:
                        switch (request.body.type) {
                            case BodyType.JSON:
                            case BodyType.XML:
                            case BodyType.Text:
                            case BodyType.Raw:
                                newBody = {
                                    type: BodyType.Form,
                                    data: decodeFormData(request.body.data)
                                }
                                break
                            case BodyType.Form:
                                newBody = { type: BodyType.Form, data: request.body.data }
                                break
                            default:
                                newBody = {
                                    type: BodyType.Form, data: []
                                }
                                break
                        }
                        break
                    case BodyType.JSON:
                    case BodyType.XML:
                    case BodyType.Text:
                        switch (request.body.type) {
                            case BodyType.JSON:
                            case BodyType.XML:
                            case BodyType.Text:
                                newBody = { type: value, data: request.body.data }
                                break
                            case BodyType.Raw:
                                newBody = { type: value, data: (new TextDecoder()).decode(base64Decode(request.body.data)) }
                                break
                            default:
                                newBody = { type: BodyType.None, data: undefined }
                                break
                        }
                        break
                    case BodyType.None:
                    default:
                        newBody = {
                            type: BodyType.None,
                            data: undefined
                        }

                }
            } else {
                switch (value) {
                    case BodyType.Form:
                        newBody = {
                            type: BodyType.Form,
                            data: []
                        }
                        break
                    case BodyType.XML:
                    case BodyType.JSON:
                    case BodyType.Text:
                        newBody = {
                            type: value,
                            data: ''
                        }
                        break
                    case BodyType.None:
                    default:
                        newBody = {
                            type: BodyType.None,
                            data: undefined
                        }
                        break
                }

            }

            request.body = newBody
            this.dirty = true
        }
    }

    @action
    setRequestBody(body: Body) {
        if (this.active?.entityType === EditableEntityType.Request) {
            const request = this.active as EditableRequest
            request.body = body
            this.dirty = true
        }
    }

    @action
    setRequestBodyData(value: string | EditableNameValuePair[]) {
        if (this.active?.entityType === EditableEntityType.Request) {
            const request = this.active as EditableRequest
            request.body.data = value
            this.dirty = true
        }
    }

    @action
    setRequestRuns(value: number) {
        switch (this.active?.entityType) {
            case EditableEntityType.Request:
                const request = this.active as EditableRequest
                request.runs = value
                this.dirty = true
                break
            case EditableEntityType.Group:
                const group = this.active as EditableRequestGroup
                group.runs = value
                this.dirty = true
                break
        }
    }

    @action
    setRequestTest(value: string | undefined) {
        if (this.active?.entityType === EditableEntityType.Request) {
            const request = this.active as EditableRequest
            request.test = value ?? ''
            this.dirty = true
        }
    }

    @action
    setRequestSelectedScenarioId(entityId: string) {
        if (this.active?.entityType === EditableEntityType.Request || this.active?.entityType === EditableEntityType.Group) {
            const request = this.active as EditableRequest
            request.selectedScenario = entityId === DEFAULT_SELECTION_ID
                ? undefined
                : entityId == NO_SELECTION_ID
                    ? NO_SELECTION
                    : { id: entityId, name: GetTitle(this.scenarios.get(entityId)) }
            this.dirty = true
        }
    }

    @action
    setRequestSelectedAuthorizationId(entityId: string) {
        if (this.active?.entityType === EditableEntityType.Request || this.active?.entityType === EditableEntityType.Group) {
            const request = this.active as EditableRequest
            request.selectedAuthorization = entityId === DEFAULT_SELECTION_ID
                ? undefined
                : entityId == NO_SELECTION_ID
                    ? NO_SELECTION
                    : { id: entityId, name: GetTitle(this.authorizations.get(entityId)) }
            this.dirty = true
        }
    }

    @action
    setRequestSelectedCertificateId(entityId: string) {
        if (this.active?.entityType === EditableEntityType.Request || this.active?.entityType === EditableEntityType.Group) {
            const request = this.active as EditableRequest
            request.selectedCertificate = entityId === DEFAULT_SELECTION_ID
                ? undefined
                : entityId == NO_SELECTION_ID
                    ? NO_SELECTION
                    : { id: entityId, name: GetTitle(this.certificates.get(entityId)) }
            this.dirty = true
        }
    }

    @action
    setRequestSelectedProxyId(entityId: string) {
        if (this.active?.entityType === EditableEntityType.Request || this.active?.entityType === EditableEntityType.Group) {
            const request = this.active as EditableRequest
            request.selectedProxy = entityId === DEFAULT_SELECTION_ID
                ? undefined
                : entityId == NO_SELECTION_ID
                    ? NO_SELECTION
                    : { id: entityId, name: GetTitle(this.proxies.get(entityId)) }
            this.dirty = true
        }
    }

    @action
    deleteRequestWarning(warningId: string) {
        if (this.active?.entityType === EditableEntityType.Request || this.active?.entityType === EditableEntityType.Group) {
            const request = this.active as EditableRequest
            if (request.warnings) {
                request.warnings.delete(warningId)
            }
        }
    }

    getRequestActiveAuthorization(request: EditableRequest | EditableRequestGroup) {
        let r: EditableRequest | EditableRequestGroup | null | undefined = request
        while (r) {
            const authId = r.selectedAuthorization?.id ?? null
            switch (authId) {
                case DEFAULT_SELECTION_ID:
                case null:
                    // get parent
                    break
                case NO_SELECTION_ID:
                    return undefined
                default:
                    return this.authorizations.get(authId)
            }
            r = this.requests.findParent(r.id)
        }
        return (this.defaults.selectedAuthorization.id && this.defaults.selectedAuthorization.id != NO_SELECTION_ID)
            ? this.authorizations.get(this.defaults.selectedAuthorization?.id)
            : undefined
    }

    getRequestParameterLists() {
        let activeScenarioId = DEFAULT_SELECTION_ID
        let activeAuthorizationId = DEFAULT_SELECTION_ID
        let activeCertificateId = DEFAULT_SELECTION_ID
        let activeProxyId = DEFAULT_SELECTION_ID

        // Determine the active credentials by working our way up the hierarchy
        if (this.active?.entityType === EditableEntityType.Request || this.active?.entityType === EditableEntityType.Group) {
            const request = this.active as EditableRequest
            let e = this.requests.findParent(request.id)
            while (e) {
                let r = e as (EditableRequest & EditableRequest)
                if (activeScenarioId === DEFAULT_SELECTION_ID && r.selectedScenario) {
                    activeScenarioId = r.selectedScenario.id
                }
                if (activeAuthorizationId === DEFAULT_SELECTION_ID && r.selectedAuthorization) {
                    activeAuthorizationId = r.selectedAuthorization.id
                }
                if (activeCertificateId === DEFAULT_SELECTION_ID && r.selectedCertificate) {
                    activeCertificateId = r.selectedCertificate.id
                }
                if (activeProxyId === DEFAULT_SELECTION_ID && r.selectedProxy) {
                    activeProxyId = r.selectedProxy.id
                }

                if (activeScenarioId !== DEFAULT_SELECTION_ID
                    && activeAuthorizationId !== DEFAULT_SELECTION_ID
                    && activeCertificateId !== DEFAULT_SELECTION_ID
                    && activeProxyId !== DEFAULT_SELECTION_ID
                ) {
                    break
                }

                e = this.requests.findParent(e.id)
            }
        }

        const defaultScenario = activeScenarioId == DEFAULT_SELECTION_ID
            ? this.defaults.selectedScenario.id === NO_SELECTION_ID
                ? 'None Configured'
                : GetTitle(this.scenarios.get(this.defaults.selectedScenario.id))
            : activeScenarioId === NO_SELECTION_ID
                ? 'Off'
                : GetTitle(this.scenarios.get(activeScenarioId))

        const defaultAuthorization = activeAuthorizationId == DEFAULT_SELECTION_ID
            ? this.defaults.selectedAuthorization.id === NO_SELECTION_ID
                ? 'None Configured'
                : GetTitle(this.authorizations.get(this.defaults.selectedAuthorization.id))
            : activeAuthorizationId === NO_SELECTION_ID
                ? 'Off'
                : GetTitle(this.authorizations.get(activeAuthorizationId))

        const defaultCertificate = activeCertificateId == DEFAULT_SELECTION_ID
            ? this.defaults.selectedCertificate.id === NO_SELECTION_ID
                ? 'None Configured'
                : GetTitle(this.certificates.get(this.defaults.selectedCertificate.id))
            : activeCertificateId === NO_SELECTION_ID
                ? 'Off'
                : GetTitle(this.certificates.get(activeCertificateId))

        const defaultProxy = activeProxyId == DEFAULT_SELECTION_ID
            ? this.defaults.selectedProxy.id === NO_SELECTION_ID
                ? 'None Configured'
                : GetTitle(this.proxies.get(this.defaults.selectedProxy.id))
            : activeProxyId === NO_SELECTION_ID
                ? 'Off'
                : GetTitle(this.proxies.get(activeProxyId))

        return {
            scenarios: this.buildParameterList(this.scenarios, defaultScenario),
            authorizations: this.buildParameterList(this.authorizations, defaultAuthorization),
            certificates: this.buildParameterList(this.certificates, defaultCertificate),
            proxies: this.buildParameterList(this.proxies, defaultProxy),
        }
    }

    getDefaultParameterLists() {
        return {
            scenarios: this.buildParameterList(this.scenarios),
            authorizations: this.buildParameterList(this.authorizations),
            certificates: this.buildParameterList(this.certificates),
            proxies: this.buildParameterList(this.proxies),
        }
    }

    getStoredWorkspace() {
        return editableWorkspaceToStoredWorkspace(
            this.requests,
            this.scenarios,
            this.authorizations,
            this.certificates,
            this.proxies,
            this.defaults,
        )
    }

    @action
    addGroup(targetID?: string | null) {
        const entry = new EditableRequestGroup()
        entry.id = GenerateIdentifier()
        entry.runs = 1
        this.requests.add(entry, true, targetID)
        this.dirty = true
        this.changeActive(EditableEntityType.Request, entry.id)
    }

    @action
    deleteGroup(id: string) {
        this.deleteRequest(id)
    }

    @action
    moveGroup(id: string, destinationID: string | null, onLowerHalf: boolean | null, onLeft: boolean | null) {
        this.moveRequest(id, destinationID, onLeft, onLowerHalf)
    }

    @action
    copyGroup(id: string) {
        this.copyRequest(id)
    }

    @action
    setGroupExecution(value: GroupExecution) {
        if (this.active?.entityType === EditableEntityType.Group) {
            const group = this.active as EditableRequestGroup
            group.execution = value
            this.dirty = true
        }
    }

    @action
    setMultiRunExecution(value: GroupExecution) {
        if (this.active?.entityType === EditableEntityType.Request) {
            const request = this.active as EditableRequest
            request.multiRunExecution = value
            this.dirty = true
        } else if (this.active?.entityType === EditableEntityType.Group) {
            const group = this.active as EditableRequestGroup
            group.multiRunExecution = value
            this.dirty = true
        }
    }

    @action
    addScenario(persistence: Persistence, targetID?: string | null) {
        const scenario = new EditableScenario()
        scenario.id = GenerateIdentifier()
        this.scenarios.add(scenario, false, targetID || persistence)
        this.changeActive(EditableEntityType.Scenario, scenario.id)
        this.dirty = true
    }

    @action
    deleteScenario(id: string) {
        for (const entity of this.requests.values) {
            if (entity.selectedScenario?.id === id) {
                entity.selectedScenario = undefined
            }
        }
        if (this.defaults.selectedScenario.id == id) {
            this.defaults.selectedScenario = NO_SELECTION
        }
        this.scenarios.remove(id)
        this.clearActive()
        this.dirty = true
    }

    @action
    moveScenario(id: string, destinationID: string | null, onLowerHalf: boolean | null, isSection: boolean | null) {
        this.scenarios.move(id, destinationID, onLowerHalf, isSection)
        this.dirty = true
        // if (selectedScenario !== NO_SELECTION) {
        //     activateScenario(id)
        // }
    }

    @action
    copyScenario(id: string) {
        const source = this.scenarios.get(id)
        if (!source) return
        const scenario = new EditableScenario()
        scenario.id = GenerateIdentifier()
        scenario.name = `${GetTitle(source)} - Copy`
        scenario.dirty = true
        scenario.variables = source.variables.map(v => ({
            id: GenerateIdentifier(),
            name: v.name,
            value: v.value,
            disabled: v.disabled
        }))
        this.scenarios.add(scenario, false, id)
        this.dirty = true
        this.changeActive(EditableEntityType.Scenario, scenario.id)
    }

    @action
    setScenarioVariables(value: EditableNameValuePair[] | undefined) {
        if (this.active?.entityType === EditableEntityType.Scenario) {
            const scenario = this.active as EditableScenario
            scenario.variables = value || []
        }
    }

    @action
    addAuthorization(persistence: Persistence, targetID?: string | null) {
        const authorization = new EditableAuthorization()
        authorization.id = GenerateIdentifier()
        this.authorizations.add(authorization, false, targetID ?? persistence)
        this.changeActive(EditableEntityType.Authorization, authorization.id)
        this.dirty = true
    }

    @action
    deleteAuthorization(id: string) {
        for (const entity of this.requests.values) {
            if (entity.selectedAuthorization?.id === id) {
                entity.selectedAuthorization = undefined
            }
        }
        if (this.defaults.selectedAuthorization.id == id) {
            this.defaults.selectedAuthorization = NO_SELECTION
        }

        this.authorizations.remove(id)
        this.clearActive()
        this.dirty = true
    }

    @action
    moveAuthorization(id: string, destinationID: string | null, onLowerHalf: boolean | null, onLeft: boolean | null) {
        this.authorizations.move(id, destinationID, onLowerHalf, onLeft)
        this.dirty = true
        // if (selectedAuthorizationId !== id) {
        //     activateAuthorization(id)
        // }
    }

    @action
    copyAuthorization(id: string) {
        const source = this.authorizations.get(id)
        if (!source) return
        const authorization = new EditableAuthorization()
        authorization.id = GenerateIdentifier()
        authorization.name = `${GetTitle(source)} - Copy`
        authorization.type = source.type
        authorization.dirty = true
        authorization.header = source.header
        authorization.value = source.value
        authorization.username = source.username
        authorization.password = source.password
        authorization.accessTokenUrl = source.accessTokenUrl
        authorization.authorizeUrl = source.authorizeUrl
        authorization.clientId = source.clientId
        authorization.clientSecret = source.clientSecret
        authorization.scope = source.scope
        authorization.selectedCertificate = source.selectedCertificate
        authorization.selectedProxy = source.selectedProxy

        this.authorizations.add(authorization, false, id)
        this.dirty = true
        this.changeActive(EditableEntityType.Authorization, authorization.id)
    }

    getAuthorizationCertificateList() {
        return this.buildParameterList(this.certificates)
    }

    getAuthorizationProxyList() {
        return this.buildParameterList(this.proxies)
    }

    @action
    setAuthorizationType(value: AuthorizationType.ApiKey | AuthorizationType.Basic
        | AuthorizationType.OAuth2Client | AuthorizationType.OAuth2Pkce) {
        if (this.active?.entityType === EditableEntityType.Authorization) {
            const auth = this.active as EditableAuthorization
            auth.type = value
            this.dirty = true
        }
    }

    @action
    setAuthorizationUsername(value: string) {
        if (this.active?.entityType === EditableEntityType.Authorization) {
            const auth = this.active as EditableAuthorization
            auth.username = value
            this.dirty = true
        }
    }

    @action
    setAuthorizationPassword(value: string) {
        if (this.active?.entityType === EditableEntityType.Authorization) {
            const auth = this.active as EditableAuthorization
            auth.password = value
            this.dirty = true
        }
    }

    @action
    setAccessTokenUrl(value: string) {
        if (this.active?.entityType === EditableEntityType.Authorization) {
            const auth = this.active as EditableAuthorization
            auth.accessTokenUrl = value
            this.dirty = true
        }
    }

    @action
    setAuthorizationUrl(value: string) {
        if (this.active?.entityType === EditableEntityType.Authorization) {
            const auth = this.active as EditableAuthorization
            auth.authorizeUrl = value
            this.dirty = true
        }
    }

    @action
    setAuthorizationClientId(value: string) {
        if (this.active?.entityType === EditableEntityType.Authorization) {
            const auth = this.active as EditableAuthorization
            auth.clientId = value
            this.dirty = true
        }
    }

    @action
    setAuthorizationClientSecret(value: string) {
        if (this.active?.entityType === EditableEntityType.Authorization) {
            const auth = this.active as EditableAuthorization
            auth.clientSecret = value
            this.dirty = true
        }
    }

    @action
    setAuthorizationScope(value: string) {
        if (this.active?.entityType === EditableEntityType.Authorization) {
            const auth = this.active as EditableAuthorization
            auth.scope = value
            this.dirty = true
        }
    }

    @action
    setAuthorizationSelectedCertificateId(entityId: string) {
        if (this.active?.entityType === EditableEntityType.Authorization) {
            const auth = this.active as EditableAuthorization
            auth.selectedCertificate =
                entityId === DEFAULT_SELECTION_ID
                    ? undefined
                    : entityId == NO_SELECTION_ID
                        ? NO_SELECTION
                        : { id: entityId, name: GetTitle(this.certificates.get(entityId)) }
            this.dirty = true
        }
    }

    @action
    setAuthorizationSelectedProxyId(entityId: string) {
        if (this.active?.entityType === EditableEntityType.Authorization) {
            const auth = this.active as EditableAuthorization
            auth.selectedProxy =
                entityId === DEFAULT_SELECTION_ID
                    ? undefined
                    : entityId == NO_SELECTION_ID
                        ? NO_SELECTION
                        : { id: entityId, name: GetTitle(this.proxies.get(entityId)) }
            this.dirty = true
        }
    }

    @action
    setAuthorizationHeader(value: string) {
        if (this.active?.entityType === EditableEntityType.Authorization) {
            const auth = this.active as EditableAuthorization
            auth.header = value
            this.dirty = true
        }
    }

    @action
    setAuthorizationValue(value: string) {
        if (this.active?.entityType === EditableEntityType.Authorization) {
            const auth = this.active as EditableAuthorization
            auth.value = value
            this.dirty = true
        }
    }

    @action
    addCertificate(persistence: Persistence, targetID?: string | null) {
        const certificate = new EditableCertificate()
        certificate.id = GenerateIdentifier()
        this.certificates.add(certificate, false, targetID || persistence)
        this.changeActive(EditableEntityType.Certificate, certificate.id)
        this.dirty = true
    }

    @action
    deleteCertificate(id: string) {
        for (const entity of this.requests.values) {
            if (entity.selectedCertificate?.id === id) {
                entity.selectedCertificate = undefined
            }
        }
        if (this.defaults.selectedCertificate.id == id) {
            this.defaults.selectedCertificate = NO_SELECTION
        }

        this.certificates.remove(id)
        this.clearActive()
        this.dirty = true
    }

    @action
    moveCertificate(id: string, destinationID: string | null, onLowerHalf: boolean | null, onLeft: boolean | null) {
        this.certificates.move(id, destinationID, onLowerHalf, onLeft)
        this.dirty = true
    }

    @action
    copyCertificate(id: string) {
        const source = this.certificates.get(id)
        if (!source) return
        const certificate = new EditableCertificate()
        certificate.id = GenerateIdentifier()
        certificate.name = `${GetTitle(source)} - Copy`
        certificate.type = source.type
        certificate.dirty = true
        certificate.pem = source.pem
        certificate.key = source.key
        certificate.pfx = source.pfx
        certificate.password = source.password

        this.certificates.add(certificate, false, id)
        this.dirty = true
        this.changeActive(EditableEntityType.Certificate, certificate.id)
    }

    @action
    setCertificateType(value: CertificateType.PEM | CertificateType.PKCS8_PEM | CertificateType.PKCS12) {
        if (this.active?.entityType === EditableEntityType.Certificate) {
            const certificate = this.active as EditableCertificate
            certificate.type = value
            this.dirty = true
        }
    }

    @action
    setCertificatePem(value: string) {
        if (this.active?.entityType === EditableEntityType.Certificate) {
            const certificate = this.active as EditableCertificate
            certificate.pem = value
            this.dirty = true
        }
    }

    @action
    setCertificateKey(value: string | undefined) {
        if (this.active?.entityType === EditableEntityType.Certificate) {
            const certificate = this.active as EditableCertificate
            certificate.key = value || ''
            this.dirty = true
        }
    }

    @action
    setCertificatePfx(value: string) {
        if (this.active?.entityType === EditableEntityType.Certificate) {
            const certificate = this.active as EditableCertificate
            certificate.pfx = value
            this.dirty = true
        }
    }

    @action
    setCertificatePassword(value: string) {
        if (this.active?.entityType === EditableEntityType.Certificate) {
            const certificate = this.active as EditableCertificate
            certificate.password = value
            this.dirty = true
        }
    }

    @action
    addProxy(persistence: Persistence, targetID?: string | null) {
        const proxy = new EditableProxy()
        proxy.id = GenerateIdentifier()
        this.proxies.add(proxy, false, targetID || persistence)
        this.changeActive(EditableEntityType.Proxy, proxy.id)
        this.dirty = true
    }

    @action
    deleteProxy(id: string) {
        for (const entity of this.requests.values) {
            if (entity.selectedProxy?.id === id) {
                entity.selectedProxy = undefined
            }
        }
        if (this.defaults.selectedProxy.id == id) {
            this.defaults.selectedProxy = NO_SELECTION
        }
        this.proxies.remove(id)
        this.clearActive()
        this.dirty = true
    }

    @action
    moveProxy(id: string, destinationID: string | null, onLowerHalf: boolean | null, onLeft: boolean | null) {
        this.proxies.move(id, destinationID, onLowerHalf, onLeft)
        this.dirty = true
        // if (selectedProxyId !== id) {
        //     activateProxy(id)
        // }
    }

    @action
    copyProxy(id: string) {
        const source = this.proxies.get(id)
        if (source) {
            const proxy = new EditableProxy()
            proxy.id = GenerateIdentifier()
            proxy.name = `${GetTitle(source)} - Copy`
            proxy.url = source.url
            proxy.dirty = true

            this.proxies.add(proxy, false, id)
            this.dirty = true
            this.changeActive(EditableEntityType.Proxy, proxy.id)
        }
    }

    @action
    setProxyUrl(url: string) {
        if (this.active?.entityType === EditableEntityType.Proxy) {
            const proxy = this.active as EditableProxy
            proxy.url = url
            this.dirty = true
        }
    }

    getExecution(requestOrGroupId: string) {
        let execution = this.executions.get(requestOrGroupId)
        if (!execution) {
            execution = new ExecutionEntry(requestOrGroupId)
            this.executions.set(requestOrGroupId, execution)
        }
        return execution
    }

    deleteExecution(requestOrGroupId: string) {
        this.executions.delete(requestOrGroupId)
    }

    getExecutionResult(requestOrGroupId: string, executionResultId: string): ExecutionResult | undefined {
        return this.executions.get(requestOrGroupId)?.results.get(executionResultId)
    }

    getExecutionResultDetails(requestOrGroupId: string, executionResultId: string): ApicizeExecutionDetails | undefined {
        const execution = this.executions.get(requestOrGroupId)?.results.get(executionResultId)
        const executedRequest =
            (execution?.type === 'request') ? execution : undefined
        let variables
        let request
        if (executedRequest?.request) {
            request = toJS(executedRequest.request)
            variables = request.variables ? { ...request.variables } : undefined
            request.variables = undefined
        } else {
            request = undefined
            variables = undefined
        }
        const response = executedRequest?.response
        if (response?.oauth2Token) {
            if (!response?.oauth2Token.url) { response.oauth2Token.url = undefined }
            if (!response?.oauth2Token.certificate) { response.oauth2Token.certificate = undefined }
            if (!response?.oauth2Token.proxy) { response.oauth2Token.proxy = undefined }
        }
        return execution
            ? {
                runNumber: execution.runNumber,
                executedAt: execution.executedAt,
                duration: execution.duration,
                testingContext: request
                    ? {
                        request,
                        response,
                        variables
                    }
                    : undefined,
                success: execution.success,
                error: executedRequest?.error ?? undefined,
                tests: executedRequest?.tests?.map(t => ({
                    testName: t.testName,
                    success: t.success,
                    error: t.error ?? undefined,
                    logs: t.logs ?? undefined
                })),
                outputVariables: executedRequest?.variables,
                requestsWithPassedTestsCount: execution.requestsWithPassedTestsCount,
                requestsWithFailedTestsCount: execution.requestsWithFailedTestsCount,
                requestsWithErrors: execution.requestsWithErrors,
                passedTestCount: execution.passedTestCount,
                failedTestCount: execution.failedTestCount
            }
            : undefined
    }

    getExecutionResposne(requestOrGroupId: string): ApicizeExecution | undefined {
        return this.executions.get(requestOrGroupId)?.response
    }

    @action
    reportExecutionResults(execution: Execution, executionResults: ApicizeExecution) {
        execution.running = false
        const previousPanel = execution.panel

        if (executionResults.items.length < 1) return

        const menu: ExecutionMenuItem[] = []
        const results = new Map<string, ExecutionResult>()
        let allTestsSucceeded: boolean | null = null

        const getTitle = (name: string, runNumber: number, numberOfRuns: number, level: number) => {
            return numberOfRuns > 1
                ? ((level === 0) ? `Run ${runNumber + 1} of ${numberOfRuns}` : `${name} (Run ${runNumber + 1} of ${numberOfRuns})`)
                : name
        }

        const addGroupResult = (item: ApicizeExecutionGroup, level: number): string[] => {
            const executionResultIds: string[] = []
            const numberOfRuns = item.runs.length
            for (let runNumber = 0; runNumber < numberOfRuns; runNumber++) {
                const run = item.runs[runNumber]
                const title = getTitle(item.name, runNumber, numberOfRuns, level)
                allTestsSucceeded = (allTestsSucceeded ?? true) && (run.requestsWithErrors + run.requestsWithFailedTestsCount === 0)
                const group: ExecutionGroup = {
                    childExecutionIDs: [],
                    type: 'group',
                    id: item.id,
                    name: item.name,
                    runNumber: runNumber + 1,
                    numberOfRuns,
                    executedAt: run.executedAt,
                    duration: run.duration,
                    success: run.success,
                    requestsWithPassedTestsCount: run.requestsWithPassedTestsCount,
                    requestsWithFailedTestsCount: run.requestsWithFailedTestsCount,
                    requestsWithErrors: run.requestsWithErrors,
                    passedTestCount: run.passedTestCount,
                    failedTestCount: run.passedTestCount
                }
                const executionResultId = GenerateIdentifier()
                executionResultIds.push(executionResultId)
                menu.push({ executionResultId, title, level })
                results.set(executionResultId, group)

                for (const child of run.items) {
                    group.childExecutionIDs = [...group.childExecutionIDs, ...addResult(child, level + 1)]
                }
            }
            return executionResultIds
        }

        const addRequestResult = (item: ApicizeExecutionRequest, level: number): string[] => {
            const executionResultIds: string[] = []
            const numberOfRuns = item.runs.length
            for (let runNumber = 0; runNumber < numberOfRuns; runNumber++) {
                const run = item.runs[runNumber]
                const title = getTitle(item.name, runNumber, numberOfRuns, level)
                allTestsSucceeded = (allTestsSucceeded ?? true) && (run.requestsWithErrors + run.requestsWithFailedTestsCount === 0)
                const executionResultId = GenerateIdentifier()
                executionResultIds.push(executionResultId)
                menu.push({ executionResultId, title, level })
                results.set(executionResultId, {
                    type: 'request',
                    id: item.id,
                    name: item.name,
                    run: runNumber + 1,
                    numberOfRuns,
                    ...run
                })
            }
            return executionResultIds;
        }

        const addResult = (item: ApicizeExecutionItem, level: number): string[] => {
            switch (item.type) {
                case 'group':
                    return addGroupResult(item, level)
                    break
                case 'request':
                    return addRequestResult(item, level)
                    break
            }
        }

        const result = executionResults.items[0]
        addResult(result, 0)
        execution.resultMenu = menu
        execution.results = results
        execution.resultIndex = (isNaN(execution.resultIndex) || execution.resultIndex >= execution.results.size)
            ? 0 : execution.resultIndex
        execution.response = executionResults
        execution.panel = (result.type === 'request' && previousPanel && allTestsSucceeded) ? previousPanel : 'Info'
    }

    // @action
    // reportExecutionComplete(execution: Execution) {
    //     execution.running = false
    // }

    @action
    async executeRequest(requestOrGroupId: string, runs?: number) {
        const requestOrGroup = this.requests.get(requestOrGroupId)
        let execution = this.executions.get(requestOrGroupId)
        if (execution) {
            execution.running = true
        } else {
            execution = new ExecutionEntry(requestOrGroupId)
            execution.running = true
            this.executions.set(requestOrGroupId, execution)
        }

        if (!(execution && requestOrGroup)) throw new Error(`Invalid ID ${requestOrGroupId}`)

        // Check if PKCE and initialize PKCE flow, queuing request upon completion
        const auth = this.getRequestActiveAuthorization(requestOrGroup)
        if (auth?.type === AuthorizationType.OAuth2Pkce) {
            if (auth.accessToken === undefined) {
                this.addPendingPkceRequest(auth.id, requestOrGroupId, runs)
                this.callbacks.onInitializePkce({
                    authorizationId: auth.id
                })
                return
            } else if (auth.expiration) {
                const nowInSec = Date.now() / 1000
                if (auth.expiration - nowInSec < 3) {
                    this.addPendingPkceRequest(auth.id, requestOrGroupId, runs)
                    this.callbacks.onRefreshToken({
                        authorizationId: auth.id
                    })
                    return
                }
            }
        }

        let idx = this.executingRequestIDs.indexOf(execution.requestOrGroupId)
        if (idx === -1) {
            this.executingRequestIDs.push(requestOrGroupId)
        }
        try {
            let executionResults = await this.callbacks.onExecuteRequest(this.getWorkspace(), requestOrGroupId, runs)
            this.reportExecutionResults(execution, executionResults)
        } finally {
            this.reportExecutionComplete(execution)
        }
    }

    @action
    reportExecutionComplete(execution: Execution) {
        let idx = this.executingRequestIDs.indexOf(execution.requestOrGroupId)
        if (idx !== -1) {
            this.executingRequestIDs.splice(idx, 1)
        }
        execution.running = false
    }


    @action
    cancelRequest(requestOrGroupId: string) {
        const match = this.executions.get(requestOrGroupId)
        if (match) {
            match.running = false
        }

        let idx = this.executingRequestIDs.indexOf(requestOrGroupId)
        if (idx !== -1) {
            this.executingRequestIDs.splice(idx, 1)
        }
        return this.callbacks.onCancelRequest(requestOrGroupId)
    }

    @action
    async clearTokens() {
        // Clear any PKCE tokens
        for (const auth of this.authorizations.values) {
            if (auth.type === AuthorizationType.OAuth2Pkce) {
                auth.accessToken = undefined
                auth.refreshToken = undefined
                auth.expiration = undefined
            }
        }
        // Clear tokens cached in the Rust library
        await Promise.all(
            this.authorizations.values.map(v => this.callbacks.onClearToken(v.id))
        )
    }

    @action
    changePanel(requestOrGroupId: string, panel: string) {
        const match = this.executions.get(requestOrGroupId)
        if (match) {
            match.panel = panel
        }
    }

    @action
    changeResultIndex(requestOrGroupId: string, resultIndex: number) {
        const execution = this.executions.get(requestOrGroupId)
        if (!execution) throw new Error(`Invalid Request ID ${requestOrGroupId}`)
        execution.resultIndex = resultIndex
    }

    @action
    setDefaultScenarioId(entityId: string) {
        this.defaults.selectedScenario = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: GetTitle(this.scenarios.get(entityId)) }
        this.dirty = true
    }

    @action
    setDefaultAuthorizationId(entityId: string) {
        this.defaults.selectedAuthorization = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: GetTitle(this.authorizations.get(entityId)) }
        this.dirty = true
    }

    @action
    setDefaultCertificateId(entityId: string) {
        this.defaults.selectedCertificate = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: GetTitle(this.certificates.get(entityId)) }
        this.dirty = true
    }

    @action
    setDefaultProxyId(entityId: string) {
        this.defaults.selectedProxy = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: GetTitle(this.proxies.get(entityId)) }
        this.dirty = true
    }

    @action
    initializePkce(authorizationId: string) {
        this.callbacks.onInitializePkce({
            authorizationId
        })
    }

    /**
     * Update the PKCE authorization and execute any pending requests
     * @param authorizationId 
     * @param accessToken 
     * @param refreshToken 
     * @param expiration 
     */
    @action
    updatePkceAuthorization(authorizationId: string, accessToken: string, refreshToken: string | undefined, expiration: number | undefined) {
        const auth = this.authorizations.get(authorizationId)
        if (!auth) {
            throw new Error('Invalid authorization ID')
        }
        const pendingRequests = [...(this.pendingPkceRequests.get(authorizationId)?.entries() ?? [])]
        this.pendingPkceRequests.delete(authorizationId)

        this.callbacks.onClosePkce({ authorizationId })

        auth.accessToken = accessToken
        auth.refreshToken = refreshToken
        auth.expiration = expiration

        // Execute pending requests
        for (const [requestOrGroupId, runs] of pendingRequests) {
            this.executeRequest(requestOrGroupId, runs)
        }
    }

    /**
     * Track any requests that should be executed when a PKCE authorization is completed
     * @param authorizationId 
     * @param requestOrGroupId 
     * @param runs 
     */
    private addPendingPkceRequest(authorizationId: string, requestOrGroupId: string, runs?: number) {
        const pendingForAuth = this.pendingPkceRequests.get(authorizationId)
        if (pendingForAuth) {
            pendingForAuth.set(requestOrGroupId, runs ?? 1)
        } else {
            this.pendingPkceRequests.set(authorizationId,
                new Map([[requestOrGroupId, runs ?? 1]]))
        }
    }

    /**
     * Cancel any pending requests
     * @param authorizationId 
     */
    @action
    cancelPendingPkceAuthorization(authorizationId: string) {
        const pending = this.pendingPkceRequests.get(authorizationId)
        if (pending) {
            for (const requestOrGroupId of pending.keys()) {
                const match = this.executions.get(requestOrGroupId)
                if (match) {
                    this.cancelRequest(requestOrGroupId)
                }
            }
        }
        this.pendingPkceRequests.set(authorizationId, new Map())
    }

    @action
    public showHelp(newHelpTopic: string, updateHistory = true) {
        try {
            if (newHelpTopic != this.helpTopic) {
                if (updateHistory && this.helpTopic) {
                    const newHistory = [...this.helpTopicHistory]
                    if (newHistory.length > 10) {
                        newHistory.pop()
                    }
                    newHistory.push(this.helpTopic)
                    this.helpTopicHistory = newHistory
                }
                this.nextHelpTopic = null
                this.helpTopic = newHelpTopic
            }
            this.mode = WorkspaceMode.Help
        } catch (e) {
            console.error(`${e}`)
        }
    }

    @action showNextHelpTopic() {
        this.showHelp(
            (this.nextHelpTopic && this.nextHelpTopic.length > 0) ? this.nextHelpTopic : 'home'
        )
    }

    @action
    public returnToNormal() {
        if (this.active) {
            this.changeActive(this.active.entityType, this.active.id)
        } else {
            this.mode = WorkspaceMode.Normal
        }
    }

    @computed
    public get hasHistory(): boolean {
        return this.helpTopicHistory.length > 0
    }

    @action
    public helpBack() {
        const lastTopic = this.helpTopicHistory.pop()
        if (lastTopic) {
            this.showHelp(lastTopic, false)
        }
    }

    @computed
    public get allowHelpHome() {
        return this.helpTopic !== 'home'
    }

    @computed
    public get allowHelpAbout() {
        return this.helpTopic !== 'about'
    }

    @computed
    public get allowHelpBack() {
        return this.helpTopicHistory.length > 0
    }
}

class ExecutionEntry implements Execution {
    @observable accessor running = false
    @observable accessor resultIndex = NaN
    @observable accessor resultMenu: ExecutionMenuItem[] = []
    @observable accessor results = new Map<string, ExecutionRequest | ExecutionGroup>()
    @observable accessor panel = 'Info'

    constructor(public readonly requestOrGroupId: string) {
        makeObservable(this)
    }
}

export const WorkspaceContext = createContext<WorkspaceStore | null>(null)

export function useWorkspace() {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspace must be used within a WorkspaceContext.Provider');
    }
    return context;
}

const encodeFormData = (data: EditableNameValuePair[]) =>
    (data.length === 0)
        ? ''
        : data.map(nv =>
            `${encodeURIComponent(nv.name)}=${encodeURIComponent(nv.value)}`
        ).join('&')

const decodeFormData = (bodyData: string | number[] | undefined) => {
    let data: string | undefined;
    if (bodyData instanceof Array) {
        const buffer = Uint8Array.from(bodyData)
        data = (new TextDecoder()).decode(buffer)
    } else {
        data = bodyData
    }
    if (data && data.length > 0) {
        const parts = data.split('&')
        return parts.map(p => {
            const id = GenerateIdentifier()
            const nv = p.split('=')
            if (nv.length == 1) {
                return { id, name: decodeURIComponent(nv[0]), value: "" } as EditableNameValuePair
            } else {
                return { id, name: decodeURIComponent(nv[0]), value: decodeURIComponent(nv[1]) } as EditableNameValuePair
            }
        })
    } else {
        return []
    }
}