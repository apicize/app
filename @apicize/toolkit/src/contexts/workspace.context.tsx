import { action, computed, makeObservable, observable, runInAction } from "mobx"
import { Execution } from "../models/workspace/execution"
import { EditableRequest, RequestInfo } from "../models/workspace/editable-request"
import { EditableRequestGroup } from "../models/workspace/editable-request-group"
import { EditableScenario } from "../models/workspace/editable-scenario"
import { EditableAuthorization } from "../models/workspace/editable-authorization"
import { EditableCertificate } from "../models/workspace/editable-certificate"
import { EditableProxy } from "../models/workspace/editable-proxy"
import {
    AuthorizationType,
    BaseRequest,
    RequestGroup,
    Authorization,
    Scenario,
    Proxy,
    ExternalData,
    WorkspaceDefaultParameters,
    Body,
    NameValuePair,
    BasicAuthorization,
    OAuth2ClientAuthorization,
    OAuth2PkceAuthorization,
    ApiKeyAuthorization,
    Pkcs12Certificate,
    Pkcs8PemCertificate,
    PemCertificate,
    ExecutionResultSummary,
    ExecutionStatus,
    ExecutionResultDetail,
    ExecutionReportFormat,
} from "@apicize/lib-typescript"
import { EntityType } from "../models/workspace/entity-type"
import { createContext, useContext } from "react"
import { EditableDefaults } from "../models/workspace/editable-defaults"
import { EditableExternalDataEntry } from "../models/workspace/editable-external-data-entry"
import { EditableRequestEntry } from "../models/workspace/editable-request-entry"
import { Navigation, NavigationEntryState, NavigationRequestEntry, ParamNavigationSection } from "../models/navigation"
import { EditableRequestBody } from "../models/workspace/editable-request-body"
import { WorkspaceParameters } from "../models/workspace/workspace-parameters"
import { CachedTokenInfo } from "../models/workspace/cached-token-info"
import { RequestEditSessionType, ResultEditSessionType } from "../controls/editors/editor-types"
import { FeedbackStore, ToastSeverity } from "./feedback.context"
import { EditableSettings } from "../models/editable-settings"
import { IndexedEntityPosition } from "../models/workspace/indexed-entity-position"
import { EditableRequestHeaders } from "../models/workspace/editable-request-headers"
import { ReqwestEvent } from "../models/trace"
import { editor } from "monaco-editor"
import { EditorMode } from "../models/editor-mode"
import { base64Encode } from "../services/base64"

export type ResultsPanel = 'Info' | 'Headers' | 'Preview' | 'Text' | 'Details'

export enum WorkspaceMode {
    Normal,
    Help,
    Settings,
    Defaults,
    // Warnings,
    Console,
    RequestList,
    ScenarioList,
    AuthorizationList,
    CertificateList,
    ProxyList,
}

export type RequestPanel = 'Info' | 'Headers' | 'Query String' | 'Body' | 'Test' | 'Parameters' | 'Warnings'
export type GroupPanel = 'Info' | 'Parameters' | 'Warnings'

export class WorkspaceStore {
    private pkceTokens = new Map<string, CachedTokenInfo>()
    private indexedNavigationNames = new Map<string, string>()
    private indexedDataNames = new Map<string, string>()
    private cachedExecutionDetail: [string, number, ExecutionResultDetail] | null = null

    @observable accessor dirty = false
    @observable accessor editorCount = 0
    @observable accessor fileName = ''
    @observable accessor displayName = ''
    @observable accessor navigation = {
        requests: [],
        scenarios: { public: [], private: [], vault: [] },
        authorizations: { public: [], private: [], vault: [] },
        certificates: { public: [], private: [], vault: [] },
        proxies: { public: [], private: [], vault: [] },
    } as Navigation

    @observable accessor activeSelection: ActiveSelection | null = null

    @observable accessor activeParameters: ListParameters | null = null

    @observable accessor defaults = new EditableDefaults({}, this)
    @observable accessor data: EditableExternalDataEntry[] | null = null

    @observable accessor warnOnWorkspaceCreds: boolean = true
    // @observable accessor invalidItems = new Set<string>()

    @observable accessor requestPanel: RequestPanel = 'Info'
    @observable accessor groupPanel: GroupPanel = 'Info'

    executions = new Map<string, Execution>()
    @observable accessor executingRequestIDs: string[] = []

    private pendingPkceRequests = new Map<string, Map<string, boolean>>()

    @observable accessor expandedItems: string[] = ['hdr-r']
    @observable accessor mode = WorkspaceMode.Normal;
    @observable accessor helpTopic: string | null = null

    private helpTopicHistory: string[] = []
    public nextHelpTopic: string | null = null

    // Request/Group edit sessions, indexed by request/group ID and then by type (body, test, etc.)
    private requestModels = new Map<string, Map<RequestEditSessionType, editor.ITextModel>>()
    // Result edit sessions, indexed by request/group ID, and then by result index, and then by type
    private resultModels = new Map<string, Map<number, Map<ResultEditSessionType, editor.ITextModel>>>()

    constructor(
        private readonly feedback: FeedbackStore,
        private readonly callbacks: {
            close: () => Promise<void>,
            get: (entityType: EntityType, entityId: string) => Promise<Entity>,
            getTitle: (entityType: EntityType, id: string) => Promise<String>,
            getDirty: () => Promise<boolean>,
            list: (entityType: EntityType, requestId?: string) => Promise<ListEntities>,
            add: (entity: EntityType, relativeToId: string | null, relativePosition: IndexedEntityPosition | null, cloneFromId: string | null) => Promise<string>,
            update: (entity: Entity) => Promise<void>,
            delete: (entityType: EntityType, entityId: string) => Promise<void>,
            move: (entity: EntityType, entityId: string, relativeToId: string, relativePosition: IndexedEntityPosition) => Promise<string[]>,
            listLogs: () => Promise<ReqwestEvent[]>,
            clearLogs: () => Promise<void>,
            getRequestActiveAuthorization: (id: string) => Promise<Authorization | undefined>,
            getRequestActiveData: (id: string) => Promise<ExternalData | undefined>,
            storeToken: (authorizationId: string, tokenInfo: CachedTokenInfo) => Promise<void>,
            clearToken: (authorizationId: string) => Promise<void>,
            clearAllTokens: () => Promise<void>,
            executeRequest: (requestId: string, workbookFullName: string, singleRun: boolean) => Promise<ExecutionResultSummary[]>,
            cancelRequest: (requestId: string) => Promise<void>,
            getResultDetail: (requestId: string, index: number) => Promise<ExecutionResultDetail>,
            generateReport: (requestId: string, index: number, format: ExecutionReportFormat) => Promise<string>,
            getEntityType: (entityId: string) => Promise<EntityType | null>,
            findDescendantGroups: (groupId: string) => Promise<string[]>,
            initializePkce: (data: { authorizationId: string }) => Promise<void>,
            closePkce: (data: { authorizationId: string }) => Promise<void>,
            refreshToken: (data: { authorizationId: string }) => Promise<void>,
        }) {
        makeObservable(this)
    }


    anyInvalid() {
        // for (const entities of [
        //     this.requests.values,
        //     this.scenarios.values,
        //     this.authorizations.values,
        //     this.certificates.values,
        //     this.proxies.values,
        // ]) {
        //     for (const entity of entities) {
        //         if (entity.state === EditableState.Warning) { console.log('invalid', { type: entity.entityType, id: entity.id }); return true; }
        //     }
        // }
        return false
    }

    @action
    initialize(initialization: SessionInitialization) {
        this.pkceTokens.clear()
        this.cachedExecutionDetail = null
        this.defaults = new EditableDefaults(initialization.defaults, this)
        this.fileName = initialization.fileName
        this.displayName = initialization.displayName
        this.dirty = initialization.dirty
        this.editorCount = initialization.editorCount
        this.navigation = initialization.navigation
        this.executions.clear()
        this.updateIndexedNames()
        this.warnOnWorkspaceCreds = true
        // this.invalidItems.clear()
        this.executingRequestIDs = []
        this.pendingPkceRequests.clear()
        this.mode = WorkspaceMode.Normal
        this.helpTopic = null
        this.helpTopicHistory = []
        this.nextHelpTopic = null
        this.requestModels.clear()
        this.resultModels.clear()
        this.helpTopic = initialization.helpTopic ?? null

        for (const requestOrGroupId of initialization.executingRequestIds) {
            const execution = this.getExecution(requestOrGroupId)
            execution.isRunning = true
        }

        for (const [requestOrGroupId, results] of Object.entries(initialization.resultSummaries)) {
            const execution = this.getExecution(requestOrGroupId)
            execution.completeExecution(results)
        }

        this.expandedItems = initialization.expandedItems ?? (this.navigation.requests.length > 0 ? ['hdr-r'] : [])
        this.mode = initialization.mode ?? WorkspaceMode.Normal

        this.activeSelection = (initialization.activeType && initialization.activeId)
            ? new ActiveSelection(initialization.activeId, initialization.activeType, this, this.feedback)
            : null

        if (initialization.error) {
            this.feedback.toast(initialization.error, ToastSeverity.Error)
        }
    }

    @action
    close() {
        return this.callbacks.close()
    }

    @action
    updateSaveState(state: SessionSaveState) {
        this.fileName = state.fileName
        this.displayName = state.displayName
        this.dirty = state.dirty
        this.editorCount = state.editorCount
    }

    @action
    setMode(mode: WorkspaceMode) {
        this.activeParameters = null
        this.mode = mode
    }

    @action
    updateExpanded(id: string | string[], isExpanded: boolean) {
        const expanded = [...this.expandedItems]
        for (const thisId of Array.isArray(id) ? id : [id]) {
            let idx = expanded.indexOf(thisId)
            if (isExpanded) {
                if (idx === -1) expanded.push(thisId)
            } else {
                if (idx !== -1) expanded.splice(idx, 1)
            }
        }
        this.expandedItems = expanded
    }

    // @action
    // toggleExpanded(itemId: string, isExpanded: boolean) {
    //     let expanded = new Set(this.expandedItems)
    //     if (isExpanded) {
    //         expanded.add(itemId)
    //     } else {
    //         expanded.delete(itemId)
    //     }
    //     this.expandedItems = [...expanded]
    // }

    @action
    changeActive(type: EntityType, id: string) {
        this.setMode(WorkspaceMode.Normal)
        const performExpand = type === EntityType.Group && this.activeSelection?.id !== id
        this.activeSelection = new ActiveSelection(id, type, this, this.feedback)
        if (performExpand) {
            this.updateExpanded(`${type}-${id}`, true)
        }
    }

    @action
    clearActive() {
        this.activeSelection = null
    }

    @action
    clearActiveConditionally(type: EntityType, id: string) {
        if (this.activeSelection && this.activeSelection.type === type && this.activeSelection.id === id) {
            this.activeSelection = null
        }
    }

    @action
    refreshFromExternalUpdate(updatedItem: Entity) {
        let forceRequestRefresh = false
        switch (updatedItem.entityType) {
            case 'Request':
            case 'Group':
            case 'Body':
            case 'Headers':
            case 'Scenario':
            case 'Authorization':
            case 'Certificate':
            case 'Proxy':
                this.activeSelection?.refreshFromExternalUpdate(updatedItem)
                break
            case 'Defaults':
                this.defaults.refreshFromExternalUpdate(updatedItem)
                forceRequestRefresh = true
                break
            case 'DataList':
                this.setDataList(updatedItem.list)
                forceRequestRefresh = true
                break
            case 'Data':
                this.setData(updatedItem)
                forceRequestRefresh = true
                break
        }

        if (forceRequestRefresh) {
            if (this.mode === WorkspaceMode.Normal) {
                // If we are looking at a request and have externally updated data, refresh the request
                // in case the data referred to is now invalid 
                switch (this.activeSelection?.type) {
                    case EntityType.Request:
                    case EntityType.Group:
                    case EntityType.RequestEntry:
                        this.changeActive(this.activeSelection.type, this.activeSelection.id)
                        break
                }
            }
        }
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
            this.feedback.toastError(e)
        }
    }

    @action showNextHelpTopic() {
        this.showHelp(
            (this.nextHelpTopic && this.nextHelpTopic.length > 0) ? this.nextHelpTopic : 'home'
        )
    }

    @action
    public returnToNormal() {
        this.mode = WorkspaceMode.Normal
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

    getNavigationName(id: string) {
        return this.indexedNavigationNames.get(id) ?? '(Unnamed)'
    }

    getDataName(id: string) {
        return this.indexedDataNames.get(id) ?? '(Unnamed)'
    }

    private updateIndexedNames() {
        this.indexedNavigationNames.clear()

        const updateFromRequest = (entry: NavigationRequestEntry) => {
            this.indexedNavigationNames.set(entry.id, entry.name)
            if (entry.children) {
                for (const child of entry.children) {
                    updateFromRequest(child)
                }
            }
        }

        const updateFromSection = (section: ParamNavigationSection) => {
            for (const entry of section.public) {
                this.indexedNavigationNames.set(entry.id, entry.name)
            }
            for (const entry of section.private) {
                this.indexedNavigationNames.set(entry.id, entry.name)
            }
            for (const entry of section.vault) {
                this.indexedNavigationNames.set(entry.id, entry.name)
            }
        }

        for (const entry of this.navigation.requests) {
            updateFromRequest(entry)
        }
        updateFromSection(this.navigation.scenarios)
        updateFromSection(this.navigation.authorizations)
        updateFromSection(this.navigation.certificates)
        updateFromSection(this.navigation.proxies)
    }

    @action
    setNavigation(navigation: Navigation) {
        this.navigation = navigation
        this.updateIndexedNames()

        // Ensure the currently active entry still exists
        if (this.activeSelection) {
            const type = this.activeSelection.type
            const id = this.activeSelection.id
            this.callbacks.getEntityType(id)
                .then(entity => { if (!entity) this.clearActiveConditionally(type, id) })
                .catch(e => this.feedback.toastError(e))
        }
    }

    findNavigationEntry(id: string, entityType: EntityType) {
        const findMatchingRequest = (entries: NavigationRequestEntry[]): NavigationRequestEntry | null => {
            for (const entry of entries) {
                if (entry.id === id) {
                    return entry
                }
                if (entry.children) {
                    const match = findMatchingRequest(entry.children)
                    if (match) {
                        return match
                    }
                }
            }
            return null
        }

        const findMatchingParameter = (section: ParamNavigationSection) => {
            return section.public.find(e => e.id === id)
                || section.private.find(e => e.id === id)
                || section.vault.find(e => e.id === id)
        }

        switch (entityType) {
            case EntityType.Request:
            case EntityType.Group:
            case EntityType.RequestEntry:
                return findMatchingRequest(this.navigation.requests)
            case EntityType.Scenario:
                return findMatchingParameter(this.navigation.scenarios)
            case EntityType.Authorization:
                return findMatchingParameter(this.navigation.authorizations)
            case EntityType.Certificate:
                return findMatchingParameter(this.navigation.certificates)
            case EntityType.Proxy:
                return findMatchingParameter(this.navigation.proxies)
        }
    }

    @action
    async updateNavigationEntry(entry: UpdatedNavigationEntry) {
        const match = this.findNavigationEntry(entry.id, entry.entityType)
        if (match) {
            match.name = entry.name
            match.state = entry.state
        }
    }

    @action
    setExpandedItems(expandedItems: string[]) {
        this.expandedItems = expandedItems
    }

    async getRequestEntry(id: string) {
        const result = await this.callbacks.get(EntityType.RequestEntry, id)
        if (result.entityType == 'RequestEntry') {
            if (result.request) {
                return new EditableRequest(result.request, this)
            } else if (result.group) {
                return new EditableRequestGroup(result.group, this)
            }
        }
        throw new Error(`getRequestEntry - Invalid request ${id} ${result.entityType}`)
    }

    async getRequest(id: string) {
        const result = await this.callbacks.get(EntityType.RequestEntry, id)
        if (result.entityType == 'RequestEntry') {
            if (result.request) {
                return new EditableRequest(result.request, this)
            }
        }
        throw new Error(`Entity is not a request ${id} (${result.entityType})`)
    }

    async getRequestGroup(id: string) {
        const result = await this.callbacks.get(EntityType.RequestEntry, id)
        if (result.entityType == 'RequestEntry') {
            if (result.group) {
                return new EditableRequestGroup(result.group, this)
            }
        }
        throw new Error(`Invalid group ${id}`)
    }

    getResponseTitle(id: string) {
        return this.callbacks.getTitle(EntityType.RequestEntry, id)
    }

    async getRequestHeaders(id: string) {
        const result = await this.callbacks.get(EntityType.Headers, id)
        if (result.entityType == 'Headers') {
            return new EditableRequestHeaders(result, this)
        }
        throw new Error(`Entity is not a request body ${id} (${result.entityType})`)
    }

    async getRequestBody(id: string) {
        const result = await this.callbacks.get(EntityType.Body, id)
        if (result.entityType == 'Body') {
            return new EditableRequestBody(result, this)
        }
        throw new Error(`Entity is not a request body ${id} (${result.entityType})`)
    }

    updateRequest(request: EntityRequest) {
        this.callbacks.update(request).catch((e) => {
            this.feedback.toastError(e)
        })
    }

    updateGroup(group: EntityGroup) {
        this.callbacks.update(group).catch((e) => {
            this.feedback.toastError(e)
        })
    }

    updateHeaders(headers: EntityHeaders) {
        this.callbacks.update(headers).catch((e) => {
            this.feedback.toastError(e)
        }).finally(() => {
            runInAction(() => {
                if (this.activeSelection && this.activeSelection.type === EntityType.Request && this.activeSelection.id === headers.id) {
                    // todo:  trigger check of body headers
                    // const requestHeaders = this.activeSelection.request?.headers?.sort((a, b) => a.name.localeCompare(b.name)) ?? []
                    // const bodyHeaders = this.activeSelection.requestBody?.headers?.sort((a, b) => a.name.localeCompare(b.name)) ?? []

                    // let sameHeaders = requestHeaders.length === bodyHeaders.length &&
                    //     requestHeaders.every((hdr, idx) => {
                    //         const other = bodyHeaders[idx]
                    //         return hdr.name === other.name && hdr.value === other.value
                    //     })
                    // if (!sameHeaders) {
                    //     this.changeActive(EntityType.Request, body.id)
                    // }
                }
            })
        })
    }

    updateBody(body: EntityBody) {
        this.callbacks.update(body).catch((e) => {
            this.feedback.toastError(e)
        })
    }

    @action
    addRequest(relativeToId: string | null, relativePosition: IndexedEntityPosition, cloneFromId: string | null) {
        this.callbacks.add(EntityType.Request, relativeToId, relativePosition, cloneFromId)
            .then(id => {
                if (relativeToId && relativePosition === IndexedEntityPosition.Under) {
                    this.updateExpanded(`g-${relativeToId}`, true)
                }
                this.changeActive(EntityType.Request, id)
            })
            .catch(e => this.feedback.toastError(e))
    }

    @action
    deleteRequest(id: string) {
        this.callbacks.delete(EntityType.Request, id)
            .then(() => this.clearActiveConditionally(EntityType.Request, id))
            .catch(e => this.feedback.toastError(e))
    }

    @action
    moveRequest(requestId: string, relativeToId: string, relativePosition: IndexedEntityPosition) {
        this.callbacks.move(EntityType.Request, requestId, relativeToId, relativePosition)
            .then(parentIds => {
                this.updateExpanded(parentIds.map(pid => `g-${pid}`), true)
            })
            .catch(e => this.feedback.toastError(e))
    }

    getRequestActiveAuthorization(request: EditableRequestEntry) {
        return this.callbacks.getRequestActiveAuthorization(request.id)
    }

    getRequestActiveData(request: EditableRequestEntry) {
        return this.callbacks.getRequestActiveData(request.id)
    }
    async getRequestParameterList(requestOrGroupId: string): Promise<WorkspaceParameters> {
        const results = await this.callbacks.list(EntityType.Parameters, requestOrGroupId)
        if (results.entityType !== 'Parameters') {
            throw new Error('Parameters not available')
        }
        return results
    }

    @action
    addGroup(relativeToId: string | null, relativePosition: IndexedEntityPosition, cloneFromId: string | null) {
        this.callbacks.add(EntityType.Group, relativeToId, relativePosition, cloneFromId)
            .then(id => {
                if (relativeToId && relativePosition === IndexedEntityPosition.Under) {
                    this.updateExpanded(`g-${relativeToId}`, true)
                }
                this.changeActive(EntityType.Group, id)
            })
            .catch(e => this.feedback.toastError(e))
    }

    @action
    deleteGroup(id: string) {
        this.deleteRequest(id)
    }

    @action
    moveGroup(groupId: string, relativeToId: string, relativePosition: IndexedEntityPosition) {
        this.callbacks.move(EntityType.Group, groupId, relativeToId, relativePosition)
            .then(parentIds => {
                this.updateExpanded(parentIds.map(pid => `g-${pid}`), true)
            })
            .catch(e => this.feedback.toastError(e))
    }

    async getScenario(id: string) {
        const result = await this.callbacks.get(EntityType.Scenario, id)
        if (result.entityType === 'Scenario') {
            return new EditableScenario(result, this)
        }
        throw new Error(`Invalid scenario ${id}`)
    }

    getScenarioTitle(id: string) {
        return this.callbacks.getTitle(EntityType.Scenario, id)
    }

    @action
    addScenario(relativeToId: string, relativePosition: IndexedEntityPosition, cloneFromId: string | null) {
        this.callbacks.add(
            EntityType.Scenario,
            relativeToId,
            relativePosition,
            cloneFromId)
            .then(id => this.changeActive(EntityType.Scenario, id))
            .catch(e => this.feedback.toastError(e))
    }

    @action
    deleteScenario(id: string) {
        this.callbacks.delete(EntityType.Scenario, id)
            .then(() => this.clearActiveConditionally(EntityType.Scenario, id))
            .catch(e => this.feedback.toastError(e))
    }

    @action
    moveScenario(scenarioId: string, relativeToId: string, relativePosition: IndexedEntityPosition) {
        this.callbacks.move(EntityType.Scenario, scenarioId, relativeToId, relativePosition)
            .then(parentIds => {
                this.updateExpanded(parentIds.map(parentId => `hdr-${EntityType.Scenario}-${parentId}`), true)
            })
            .catch(e => this.feedback.toastError(e))
    }

    updateScenario(scenario: EntityScenario) {
        this.callbacks.update(scenario).catch((e) => {
            this.feedback.toastError(e)
        })
    }

    async getAuthorization(id: string) {
        const result = await this.callbacks.get(EntityType.Authorization, id)
        if (result.entityType === 'Authorization') {
            return new EditableAuthorization(result, this)
        }
        throw new Error(`Invalid authorization ${id}`)
    }

    getAuthorizationTitle(id: string) {
        return this.callbacks.getTitle(EntityType.Authorization, id)
    }

    @action
    addAuthorization(relativeToId: string, relativePosition: IndexedEntityPosition, cloneFromId: string | null) {
        this.callbacks.add(
            EntityType.Authorization,
            relativeToId,
            relativePosition,
            cloneFromId)
            .then(id => this.changeActive(EntityType.Authorization, id))
            .catch(e => this.feedback.toastError(e))
    }

    @action
    deleteAuthorization(id: string) {
        this.callbacks.delete(EntityType.Authorization, id)
            .then(() => this.clearActiveConditionally(EntityType.Authorization, id))
            .catch(e => this.feedback.toastError(e))
    }

    @action
    moveAuthorization(authorizationId: string, relativeToId: string, relativePosition: IndexedEntityPosition) {
        this.callbacks.move(EntityType.Authorization, authorizationId, relativeToId, relativePosition)
            .then(parentIds => {
                this.updateExpanded(parentIds.map(parentId => `hdr-${EntityType.Authorization}-${parentId}`), true)
            })
            .catch(e => this.feedback.toastError(e))
    }

    updateAuthorization(authorization: EntityAuthorization) {
        this.callbacks.update(authorization).catch((e) => {
            this.feedback.toastError(e)
        })
    }

    async getCertificate(id: string) {
        const result = await this.callbacks.get(EntityType.Certificate, id)
        if (result.entityType === 'Certificate') {
            return new EditableCertificate(result, this)
        }
        throw new Error(`Invalid certificate ${id}`)
    }

    getCertificateTitle(id: string) {
        return this.callbacks.getTitle(EntityType.Certificate, id)
    }

    @action
    async addCertificate(relativeToId: string, relativePosition: IndexedEntityPosition, cloneFromId: string | null) {
        this.callbacks.add(
            EntityType.Certificate,
            relativeToId,
            relativePosition,
            cloneFromId
        )
            .then(id => this.changeActive(EntityType.Certificate, id))
            .catch(e => this.feedback.toastError(e))
    }

    @action
    deleteCertificate(id: string) {
        this.callbacks.delete(EntityType.Certificate, id)
            .then(() => this.clearActiveConditionally(EntityType.Certificate, id))
            .catch(e => this.feedback.toastError(e))
    }

    @action
    moveCertificate(certifiateId: string, relativeToId: string, relativePosition: IndexedEntityPosition) {
        this.callbacks.move(EntityType.Certificate, certifiateId, relativeToId, relativePosition)
            .then(parentIds => {
                this.updateExpanded(parentIds.map(parentId => `hdr-${EntityType.Certificate}-${parentId}`), true)
            })
            .catch(e => this.feedback.toastError(e))
    }

    updateCertificate(certificate: EntityCertificate) {
        this.callbacks.update(certificate).catch((e) => {
            this.feedback.toastError(e)
        })
    }

    async getProxy(id: string) {
        const result = await this.callbacks.get(EntityType.Proxy, id)
        if (result.entityType === 'Proxy') {
            return new EditableProxy(result, this)
        }
        throw new Error(`Invalid proxy ${id}`)
    }

    getProxyTitle(id: string) {
        return this.callbacks.getTitle(EntityType.Proxy, id)
    }

    @action
    addProxy(relativeToId: string, relativePosition: IndexedEntityPosition, cloneFromId: string | null) {
        this.callbacks.add(
            EntityType.Proxy,
            relativeToId,
            relativePosition,
            cloneFromId)
            .then(id => this.changeActive(EntityType.Proxy, id))
            .catch(e => this.feedback.toastError(e))
    }

    @action
    async deleteProxy(id: string) {
        this.callbacks.delete(EntityType.Proxy, id)
            .then(() => this.clearActiveConditionally(EntityType.Proxy, id))
            .catch(e => this.feedback.toastError(e))
    }

    @action
    moveProxy(proxyId: string, relativeToId: string, relativePosition: IndexedEntityPosition) {
        this.callbacks.move(EntityType.Proxy, proxyId, relativeToId, relativePosition)
            .then(parentIds => {
                this.updateExpanded(parentIds.map(parentId => `hdr-${EntityType.Proxy}-${parentId}`), true)
            })
            .catch(e => this.feedback.toastError(e))
    }

    updateProxy(proxy: EntityProxy) {
        this.callbacks.update(proxy).catch((e) => {
            this.feedback.toastError(e)
        })
    }

    @action
    updateDefaults(defaults: WorkspaceDefaultParameters) {
        this.defaults = new EditableDefaults(defaults, this)
        this.callbacks.update({ entityType: 'Defaults', ...defaults }).catch((e) => {
            this.feedback.toastError(e)
        }).finally(() => {
            runInAction(() => {
                switch (this.activeSelection?.type) {
                    case EntityType.Request:
                    case EntityType.Group:
                    case EntityType.RequestEntry:
                        this.activeSelection.parameters = null
                        break
                }
            })
        })
    }

    @action
    addData(cloneFromId: string | null) {
        this.callbacks.add(
            EntityType.Data,
            null,
            null,
            cloneFromId)
            // .then(() => this.updateDataLists())
            .catch(e => this.feedback.toastError(e))

    }

    @action
    deleteData(id: string) {
        this.callbacks.delete(EntityType.Data, id)
            // .then(() => this.updateDataLists())
            .catch(e => this.feedback.toastError(e))
    }

    async getData(id: string) {
        const result = await this.callbacks.get(EntityType.Data, id)
        if (result.entityType === 'Data') {
            return new EditableExternalDataEntry(result, this)
        }
        throw new Error(`Invalid data item ${id}`)
    }

    getDataTitle(id: string) {
        return this.callbacks.getTitle(EntityType.Data, id)
    }

    updateData(data: EntityData) {
        this.callbacks.update(data).catch((e) => {
            this.feedback.toastError(e)
        })
    }

    @action
    setDataList(data: ExternalData[]) {
        this.data = data.map(d => new EditableExternalDataEntry(d, this))
    }

    @action
    setData(data: ExternalData) {
        const match = this.data?.find(d => d.id === data.id)
        if (match) {
            match.refreshFromExternalUpdate(match)
        }
    }

    getDataList() {
        return this.callbacks.list(EntityType.Data)
    }

    /**
     * Initialize the data list
     * @returns 
     */
    initializeDataList() {
        this.callbacks.list(EntityType.Data)
            .then(result => {
                if (result.entityType !== 'Data') {
                    throw new Error('Data not available')
                }
                runInAction(() => {
                    this.data = result.data.map(d => new EditableExternalDataEntry(d, this))
                })
            })
            .catch(e => this.feedback.toastError(e))
    }

    /**
     * Initialize the parameters list
     * @returns 
     */
    initializeParameterList() {
        this.callbacks.list(EntityType.Parameters)
            .then(results => runInAction(() => {
                if (results.entityType !== 'Parameters') {
                    this.feedback.toast('Parameters not available', ToastSeverity.Error)
                } else {
                    this.activeParameters = results
                }
            }))
            .catch(e => this.feedback.toastError(e))
    }

    @action
    getExecution(requestOrGroupId: string) {
        let execution = this.executions.get(requestOrGroupId)
        if (!execution) {
            execution = new Execution(requestOrGroupId)
            this.executions.set(requestOrGroupId, execution)
        }
        return execution
    }

    @action
    deleteExecution(requestOrGroupId: string) {
        this.executions.delete(requestOrGroupId)
    }

    /***
     * Return execution detail, keeping the most recent one cached in memory
     */
    async getExecutionResultDetail(requestOrGroupId: string, index: number, forOutput: boolean): Promise<ExecutionResultDetail> {

        const formatForOutput = (detail: ExecutionResultDetail) => {
            const d1 = structuredClone(detail)
            if (d1.entityType === 'request') {
                if (d1.testContext.request?.body?.type === 'Binary') {
                    //@ts-expect-error
                    d1.testContext.request.body.data = base64Encode(d1.testContext.request.body.data)
                }
                if (d1.testContext.response?.body?.type === 'Binary') {
                    //@ts-expect-error
                    d1.testContext.response.body.data = base64Encode(d1.testContext.response.body.data)
                }
            }
            delete (d1 as any)['entityType']
            return d1
        }


        if (this.cachedExecutionDetail !== null) {
            const [cachedId, cachedIndex, cachedDetail] = this.cachedExecutionDetail
            if (cachedId === requestOrGroupId && cachedIndex === index) {
                return forOutput ? formatForOutput(cachedDetail) : cachedDetail
            }
        }

        const detail = await this.callbacks.getResultDetail(requestOrGroupId, index)
        this.cachedExecutionDetail = [requestOrGroupId, index, detail]
        return forOutput ? formatForOutput(detail) : detail
    }

    @action
    async generateReport(requestId: string, index: number, format: ExecutionReportFormat): Promise<string> {
        return await this.callbacks.generateReport(requestId, index, format)
    }

    @action
    updateExecutionStatus(status: ExecutionStatus) {
        const execution = this.getExecution(status.requestOrGroupId)
        if (!execution) {
            this.feedback.toast(`Invalid execution request ${status.requestOrGroupId}`, ToastSeverity.Error)
        }

        const navigation = this.findNavigationEntry(status.requestOrGroupId, EntityType.RequestEntry)

        if (status.running) {
            if (!execution.isRunning) {
                execution.startExecution()
            }
            if (navigation) {
                navigation.state |= NavigationEntryState.Running
            }
        } else {
            this.cachedExecutionDetail = null
            if (status.results) {
                execution.completeExecution(status.results)
            } else {
                execution.stopExecution()
            }
            if (navigation) {
                navigation.state &= ~NavigationEntryState.Running
            }
        }
    }

    @action
    launchExecution(requestOrGroupId: string, singleRun: boolean = false) {
        let execution: Execution | undefined
        (async () => {
            const requestOrGroup = await this.getRequestEntry(requestOrGroupId)
            if (!requestOrGroup) throw new Error(`Invalid ID ${requestOrGroupId}`)

            execution = this.executions.get(requestOrGroupId)
            if (!execution) {
                execution = new Execution(requestOrGroupId)
                this.executions.set(requestOrGroupId, execution)
            }

            execution.startExecution()

            // Check if PKCE and initialize PKCE flow, queuing request upon completion
            const auth = await this.getRequestActiveAuthorization(requestOrGroup)
            if (auth?.type === AuthorizationType.OAuth2Pkce) {
                const tokenInfo = this.pkceTokens.get(auth.id)
                if (tokenInfo === undefined) {
                    this.addPendingPkceRequest(auth.id, requestOrGroupId, singleRun)
                    this.callbacks.initializePkce({
                        authorizationId: auth.id
                    })
                    return
                } else if (tokenInfo.expiration) {
                    const nowInSec = Date.now() / 1000
                    if (tokenInfo.expiration - nowInSec < 3) {
                        this.addPendingPkceRequest(auth.id, requestOrGroupId, singleRun)
                        this.callbacks.refreshToken({
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
                let executionResults = await this.callbacks.executeRequest(
                    requestOrGroupId,
                    this.fileName,
                    singleRun)

                this.resultModels.delete(requestOrGroupId)
                this.cachedExecutionDetail = null
                execution.completeExecution(executionResults)
            } finally {
                if (execution.isRunning) {
                    execution.stopExecution()
                }
                let idx = this.executingRequestIDs.indexOf(execution.requestOrGroupId)
                if (idx !== -1) {
                    this.executingRequestIDs.splice(idx, 1)
                }
            }
        })()
            .catch((error) => {
                if (execution) {
                    if (execution.isRunning) {
                        execution.stopExecution()
                    }
                    runInAction(() => {
                        this.updateExecutionStatus({
                            requestOrGroupId: requestOrGroupId,
                            running: false
                        })
                    })
                }
                const msg = `${error}`
                const asWarning = msg == 'cancelled' || msg == 'No results returned'
                this.feedback.toast(msg, asWarning ? ToastSeverity.Warning : ToastSeverity.Error)

            })
    }

    @action
    cancelRequest(requestOrGroupId: string) {
        const match = this.executions.get(requestOrGroupId)
        if (match) {
            match.isRunning = false
        }

        let idx = this.executingRequestIDs.indexOf(requestOrGroupId)
        if (idx !== -1) {
            this.executingRequestIDs.splice(idx, 1)
        }
        return this.callbacks.cancelRequest(requestOrGroupId)
    }

    @action
    async clearToken(authorizationId: string) {
        await this.callbacks.clearToken(authorizationId)
        this.pkceTokens.delete(authorizationId)
    }

    @action
    async clearTokens() {
        await this.callbacks.clearAllTokens()
        this.pkceTokens.clear()
    }

    @action
    changeRequestPanel(panel: RequestPanel) {
        this.requestPanel = panel
    }

    @action
    changeGroupPanel(panel: GroupPanel) {
        this.groupPanel = panel
    }

    @action
    changeResultsPanel(requestOrGroupId: string, panel: ResultsPanel) {
        const match = this.executions.get(requestOrGroupId)
        if (match) {
            match.panel = panel
        }
    }

    @action
    initializePkce(authorizationId: string) {
        this.callbacks.initializePkce({
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
    async updatePkceAuthorization(authorizationId: string, accessToken: string, refreshToken: string | undefined, expiration: number | undefined) {
        const auth = this.getAuthorization(authorizationId)
        if (!auth) {
            throw new Error('Invalid authorization ID')
        }
        const pendingRequests = [...(this.pendingPkceRequests.get(authorizationId)?.entries() ?? [])]
        this.pendingPkceRequests.delete(authorizationId)

        await this.callbacks.closePkce({ authorizationId })

        const tokenInfo = { accessToken, expiration, refreshToken }
        await this.callbacks.storeToken(authorizationId, tokenInfo)
        this.pkceTokens.set(authorizationId, tokenInfo)

        // Execute pending requests
        for (const [requestOrGroupId, singleRun] of pendingRequests) {
            this.launchExecution(requestOrGroupId, singleRun)
        }
    }

    /**
     * Track any requests that should be executed when a PKCE authorization is completed
     * @param authorizationId 
     * @param requestOrGroupId 
     * @param runs 
     */
    private addPendingPkceRequest(authorizationId: string, requestOrGroupId: string, singleRun: boolean) {
        const pendingForAuth = this.pendingPkceRequests.get(authorizationId)
        if (pendingForAuth) {
            pendingForAuth.set(requestOrGroupId, singleRun)
        } else {
            this.pendingPkceRequests.set(authorizationId,
                new Map([[requestOrGroupId, singleRun]]))
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

    /**
     * Returns edit model if exists for the specified request/group
     * @param requestOrGroupId
     * @param type 
     * @returns 
     */
    async getRequestEditModel(requestOrGroupId: string, type: RequestEditSessionType, mode: EditorMode): Promise<editor.ITextModel> {
        const models = this.requestModels.get(requestOrGroupId)
        if (models) {
            let model = models.get(type)
            if (model) {
                if (model.getLanguageId() === mode) {
                    return model
                }
            }
        }

        let text: string
        switch (type) {
            case RequestEditSessionType.Test:
                let request = await this.getRequest(requestOrGroupId)
                text = request.test
                break
            case RequestEditSessionType.Body:
                let body = await this.getRequestBody(requestOrGroupId)
                if (typeof body.data === 'string') {
                    text = body.data
                } else {
                    text = ''
                }
                break
            default:
                throw new Error(`Invalid edit model type "${type}"`)

        }

        let model = editor.createModel(text, mode)
        if (models) {
            models.set(type, model)
        } else {
            this.requestModels.set(requestOrGroupId, new Map([[type, model]]))
        }
        return model
    }

    /**
     * Returns edit model if exists for the specified result
     * @param requestOrGroupId
     * @param index
     * @param type 
     * @returns 
     */
    async getResultEditModel(requestOrGroupId: string, index: number, type: ResultEditSessionType, mode: EditorMode): Promise<editor.ITextModel> {
        const existingModel = this.resultModels.get(requestOrGroupId)?.get(index)?.get(type)
        if (existingModel) {
            return existingModel
        }

        let text: string
        switch (type) {
            case ResultEditSessionType.Base64:
                const detail = await this.getExecutionResultDetail(requestOrGroupId, index, false)
                text = (detail.entityType === 'request' && detail.testContext.response?.body?.type === 'Binary')
                    ? base64Encode(detail.testContext.response.body.data)
                    : ''
                break
            default:
                const detail1 = await this.getExecutionResultDetail(requestOrGroupId, index, false)
                text = (detail1.entityType === 'request' && detail1.testContext.response?.body?.type !== 'Binary')
                    ? detail1.testContext.response?.body?.text ?? ''
                    : ''
                break
        }

        let model = editor.createModel(text, mode)
        let requestModels = this.resultModels.get(requestOrGroupId)
        if (!requestModels) {
            requestModels = new Map()
            this.resultModels.set(requestOrGroupId, requestModels)
        }
        let entries = requestModels.get(index)
        if (!entries) {
            entries = new Map()
            requestModels.set(index, entries)
        }
        entries.set(type, model)
        return model
    }

    @action
    clearAllEditSessions() {
        // Dispose all models before clearing
        for (const [, models] of this.requestModels) {
            for (const [, model] of models) {
                model.dispose()
            }
        }

        for (const [, resultMap] of this.resultModels) {
            for (const [, typeMap] of resultMap) {
                for (const [, model] of typeMap) {
                    model.dispose()
                }
            }
        }

        this.requestModels.clear()
        this.resultModels.clear()
    }

    /**
     * Clear all of the result edit sessions for the specified request or group
     * @param requestOrGroupId 
     */
    @action
    clearResultEditSessions(requestOrGroupId: string) {
        this.resultModels.delete(requestOrGroupId)
    }

    public listLogs(): Promise<ReqwestEvent[]> {
        return this.callbacks.listLogs()
    }

    public clearLogs(): Promise<void> {
        return this.callbacks.clearLogs()
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

/**
 * Tracks the currently active selection, initializes updates editable entities
 */
export class ActiveSelection {
    @observable public accessor request: EditableRequest | null = null
    @observable public accessor group: EditableRequestGroup | null = null
    @observable public accessor requestBody: EditableRequestBody | null = null
    @observable public accessor requestHeaders: EditableRequestHeaders | null = null
    @observable public accessor scenario: EditableScenario | null = null
    @observable public accessor authorization: EditableAuthorization | null = null
    @observable public accessor certificate: EditableCertificate | null = null
    @observable public accessor proxy: EditableProxy | null = null

    @observable accessor parameters: WorkspaceParameters | null = null

    public constructor(
        public readonly id: string,
        public readonly type: EntityType,
        private readonly workspace: WorkspaceStore,
        private readonly feedback: FeedbackStore,
    ) {
        makeObservable(this)
        switch (type) {
            case EntityType.Request:
                workspace.getRequest(id)
                    .then((request) => {
                        runInAction(() => {
                            this.request = request
                        })
                    })
                    .catch(e => feedback.toastError(e))
                break
            case EntityType.Group:
                workspace.getRequestGroup(id)
                    .then((group) => {
                        runInAction(() => {
                            this.group = group
                        })
                    })
                    .catch(e => feedback.toastError(e))
                break
            case EntityType.Scenario:
                workspace.getScenario(id)
                    .then(result => runInAction(() => {
                        this.scenario = result
                    }))
                    .catch(e => feedback.toastError(e))
                break
            case EntityType.Authorization:
                workspace.getAuthorization(id)
                    .then(result => runInAction(() => {
                        this.authorization = result
                    }))
                    .catch(e => feedback.toastError(e))
                break
            case EntityType.Certificate:
                workspace.getCertificate(id)
                    .then(result => runInAction(() => {
                        this.certificate = result
                    }))
                    .catch(e => feedback.toastError(e))
                break
            case EntityType.Proxy:
                workspace.getProxy(id)
                    .then(result => runInAction(() => {
                        this.proxy = result
                    }))
                    .catch(e => feedback.toastError(e))
                break
        }
    }

    refreshFromExternalUpdate(updatedItem: Entity) {
        switch (updatedItem.entityType) {
            case "Request":
                if (this.request && this.request.id == updatedItem.id) {
                    this.request.refreshFromExternalUpdate(updatedItem)
                }
                break
            case "Group":
                if (this.group && this.group.id == updatedItem.id) {
                    this.group.refreshFromExternalUpdate(updatedItem)
                }
                break
            case "Headers":
                if (this.request && this.request.id == updatedItem.id && this.requestHeaders) {
                    this.requestHeaders.refreshFromExternalUpdate(updatedItem)
                }
                break
            case "Body":
                if (this.request && this.request.id == updatedItem.id && this.requestBody) {
                    this.requestBody.refreshFromExternalUpdate(updatedItem)
                }
                break
            case "Scenario":
                if (this.scenario && this.scenario.id == updatedItem.id) {
                    this.scenario.refreshFromExternalUpdate(updatedItem)
                }
                break
            case "Authorization":
                if (this.authorization && this.authorization.id == updatedItem.id) {
                    this.authorization.refreshFromExternalUpdate(updatedItem)
                }
                break
            case "Certificate":
                if (this.certificate && this.certificate.id == updatedItem.id) {
                    this.certificate.refreshFromExternalUpdate(updatedItem)
                }
                break
            case "Proxy":
                if (this.proxy && this.proxy.id == updatedItem.id) {
                    this.proxy.refreshFromExternalUpdate(updatedItem)
                }
                break
        }
    }

    @action
    public initializeBody() {
        if (this.type === EntityType.Request) {
            this.workspace.getRequestBody(this.id)
                .then(result => runInAction(() => {
                    this.requestBody = result
                }))
                .catch(e => this.feedback.toastError(e))
        }
    }

    @action
    public initializeHeaders() {
        if (this.type === EntityType.Request) {
            this.workspace.getRequestHeaders(this.id)
                .then(result => runInAction(() => {
                    this.requestHeaders = result
                }))
                .catch(e => this.feedback.toastError(e))
        }
    }

    @action
    public initializeParameters() {
        switch (this.type) {
            case EntityType.Request:
            case EntityType.Group:
            case EntityType.RequestEntry:
                this.workspace.getRequestParameterList(this.id)
                    .then(result => runInAction(() => {
                        this.parameters = result
                    }))
                    .catch(e => this.feedback.toastError(e))
                break
        }
    }
}

export type Entity = EntityRequestEntry | EntityRequest | EntityGroup | EntityHeaders |
    EntityBody | EntityScenario | EntityAuthorization | EntityCertificate | EntityProxy |
    EntityData | EntityDataList | EntityDefaults

export interface EntityRequestEntry {
    entityType: 'RequestEntry'
    request?: BaseRequest
    group: RequestGroup
}

export interface EntityRequest extends RequestInfo {
    entityType: 'Request'
}

export interface EntityGroup extends RequestGroup {
    entityType: 'Group'
}

export interface EntityHeaders {
    entityType: 'Headers'
    id: string
    headers?: NameValuePair[]
}

export interface EntityBody {
    entityType: 'Body'
    id: string
    body?: Body
}

export interface EntityScenario extends Scenario {
    entityType: 'Scenario'
}

export interface EntityBasicAuthorization extends BasicAuthorization {
    entityType: 'Authorization'
}

export interface EntityOAuth2ClientAuthorization extends OAuth2ClientAuthorization {
    entityType: 'Authorization'
}

export interface EntityOAuth2PkceAuthorization extends OAuth2PkceAuthorization {
    entityType: 'Authorization'
}

export interface EntityApiKeyAuthorization extends ApiKeyAuthorization {
    entityType: 'Authorization'
}

export type EntityAuthorization = EntityBasicAuthorization | EntityOAuth2ClientAuthorization |
    EntityOAuth2PkceAuthorization | EntityApiKeyAuthorization

export interface EntityPkcs12Certificate extends Pkcs12Certificate {
    entityType: 'Certificate'
}

export interface EntityPkcs8PemCertificate extends Pkcs8PemCertificate {
    entityType: 'Certificate'
}

export interface EntityPemCertificate extends PemCertificate {
    entityType: 'Certificate'
}

export type EntityCertificate = EntityPkcs12Certificate | EntityPkcs8PemCertificate | EntityPemCertificate

export interface EntityProxy extends Proxy {
    entityType: 'Proxy'
}

export interface EntityData extends ExternalData {
    entityType: 'Data'
}

export interface EntityDataList {
    entityType: 'DataList'
    list: ExternalData[]
}

export interface EntityDefaults extends WorkspaceDefaultParameters {
    entityType: 'Defaults'
}

export enum ListEntityType {
    Parameters = 1,
    Data = 2,
    Defaults = 3,
}

export interface ListParameters extends WorkspaceParameters {
    entityType: 'Parameters'
}

export interface ListData {
    entityType: 'Data'
    data: ExternalData[]
}

export type ListEntities = ListParameters | ListData


export interface UpdatedNavigationEntry {
    id: string
    name: string
    entityType: EntityType
    state: number
}

export interface SessionInitialization {
    settings: EditableSettings
    workspaceId: string
    navigation: Navigation
    executingRequestIds: string[],
    resultSummaries: { [resultOrGroupId: string]: ExecutionResultSummary[] },
    dirty: boolean
    editorCount: number
    defaults: WorkspaceDefaultParameters
    data: ExternalData[]
    fileName: string
    displayName: string

    expandedItems?: string[]
    mode?: WorkspaceMode
    activeType?: EntityType
    activeId?: string
    helpTopic?: string

    error: string | undefined
}

export interface SessionSaveState {
    fileName: string
    displayName: string
    dirty: boolean
    editorCount: number
}


export interface WorkspaceCloneState {
    expandedItems?: string[]
    activeType?: EntityType
    activeId?: string
}
