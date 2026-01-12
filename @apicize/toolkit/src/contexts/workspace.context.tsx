import { action, computed, makeObservable, observable, runInAction, toJS } from "mobx"
import { ExecutionEvent, ExecutionResultViewState } from "../models/workspace/execution"
import { EditableRequest } from "../models/workspace/editable-request"
import { EditableRequestGroup } from "../models/workspace/editable-request-group"
import { EditableScenario } from "../models/workspace/editable-scenario"
import { EditableAuthorization } from "../models/workspace/editable-authorization"
import { EditableCertificate } from "../models/workspace/editable-certificate"
import { EditableProxy } from "../models/workspace/editable-proxy"
import {
    AuthorizationType,
    Request,
    RequestGroup,
    Authorization,
    Scenario,
    Proxy,
    ExternalData,
    WorkspaceDefaultParameters,
    BasicAuthorization,
    OAuth2ClientAuthorization,
    OAuth2PkceAuthorization,
    ApiKeyAuthorization,
    Pkcs12Certificate,
    Pkcs8PemCertificate,
    PemCertificate,
    ExecutionResultDetail,
    ValidationState,
    ExecutionState,
    RequestEntry,
    Body,
    BodyType,
    NameValuePair,
    TokenResult,
} from "@apicize/lib-typescript"
import { EntityType } from "../models/workspace/entity-type"
import { createContext, useContext } from "react"
import { EditableDefaults } from "../models/workspace/editable-defaults"
import { EditableExternalDataEntry } from "../models/workspace/editable-external-data-entry"
import { EditableRequestEntry } from "../models/workspace/editable-request-entry"
import { Navigation, NavigationRequestEntry, ParamNavigationSection } from "../models/navigation"
import { WorkspaceParameters } from "../models/workspace/workspace-parameters"
import { CachedTokenInfo } from "../models/workspace/cached-token-info"
import { RequestEditSessionType, ResultEditSessionType } from "../controls/editors/editor-types"
import { FeedbackStore, ToastSeverity } from "./feedback.context"
import { EditableSettings } from "../models/editable-settings"
import { IndexedEntityPosition } from "../models/workspace/indexed-entity-position"
import { ReqwestEvent } from "../models/trace"
import { editor } from "monaco-editor"
import { EditorMode } from "../models/editor-mode"
import { base64Encode } from "../services/base64"
import { ClipboardPaylodRequest } from "../models/clipboard_payload_request"
import { RequestExecution } from "../models/request-execution"
import { IRequestEditorTextModel, IResultEditorTextModel } from "../models/editor-text-model"

export enum WorkspaceMode {
    Normal = 0,
    Help = 1,
    Settings = 2,
    Defaults = 3,
    // Warnings,
    Console = 4,
    RequestList = 5,
    ScenarioList = 6,
    AuthorizationList = 7,
    CertificateList = 8,
    ProxyList = 9,
}

export type ResultsPanel = 'Info' | 'Headers' | 'Preview' | 'Text' | 'Details'
export type RequestPanel = 'Info' | 'Headers' | 'Query String' | 'Body' | 'Test' | 'Parameters' | 'Warnings'
export type GroupPanel = 'Info' | 'Parameters' | 'Warnings'

export type ActiveSelection = EditableRequest | EditableRequestGroup | EditableScenario |
    EditableAuthorization | EditableCertificate | EditableProxy

export class WorkspaceStore {
    private pkceTokens = new Map<string, CachedTokenInfo>()
    private indexedNavigationNames = new Map<string, string>()
    private indexedDataNames = new Map<string, string>()

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
    // @updateActiveobservable accessor invalidItems = new Set<string>()

    @observable accessor requestPanel: RequestPanel = 'Info'
    @observable accessor groupPanel: GroupPanel = 'Info'

    @observable accessor executingRequestIDs: string[] = []

    private pendingPkceRequests = new Map<string, Map<string, boolean>>()

    @observable accessor expandedItems: string[] = []
    @observable accessor mode = WorkspaceMode.Normal;
    @observable accessor helpTopic: string | null = null

    @observable public accessor currentExecutionDetail: ExecutionResultDetail | null = null

    @observable public accessor hideSuccess = false
    @observable public accessor hideFailure = false
    @observable public accessor hideError = false

    private helpTopicHistory: string[] = []
    public nextHelpTopic: string | null = null

    // Request/Group edit sessions, indexed by request/group ID and then by type (body, test, etc.)
    private requestModels = new Map<string, Map<RequestEditSessionType, IRequestEditorTextModel>>()
    // Result edit sessions, indexed by request/group ID, and then by result index, and then by type
    private resultModels = new Map<string, Map<number, Map<ResultEditSessionType, IResultEditorTextModel>>>()

    constructor(
        initialization: WorkspaceInitialization,
        private readonly feedback: FeedbackStore,
        private readonly callbacks: {
            close: () => Promise<void>,
            get: (entityType: EntityType, entityId: string) => Promise<Entity>,
            updateActiveEntity: (entity?: SessionEntity) => Promise<undefined>,
            updateExpandedItems: (ids?: string[]) => Promise<undefined>,
            updateMode: (mode: WorkspaceMode) => Promise<undefined>,
            getTitle: (entityType: EntityType, id: string) => Promise<String>,
            getExecution: (requestOrGroupId: string) => Promise<RequestExecution>,
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
            executeRequest: (requestId: string, workbookFullName: string, singleRun: boolean) => Promise<{ [execuingRequestOrGroupId: string]: undefined }>,
            cancelRequest: (requestId: string) => Promise<void>,
            getExecutionResultViewState: (requestId: string) => Promise<ExecutionResultViewState>,
            updateExecutionResultViewState: (requestId: string, executionResultViewState: ExecutionResultViewState) => Promise<undefined>,
            getResultDetail: (execCtr: number) => Promise<ExecutionResultDetail>,
            getEntityType: (entityId: string) => Promise<EntityType | null>,
            findDescendantGroups: (groupId: string) => Promise<string[]>,
            getOAuth2ClientToken: (data: { authorizationId: string }) => Promise<TokenResult>,
            initializePkce: (data: { authorizationId: string }) => Promise<void>,
            closePkce: (data: { authorizationId: string }) => Promise<void>,
            refreshToken: (data: { authorizationId: string }) => Promise<void>,
            copyToClipboard: (payloadRequest: ClipboardPaylodRequest) => Promise<void>,
            getRequestBody: (requestId: string) => Promise<RequestBodyInfoWithBody>,
            updateRequestBody: (requestId: string, body?: Body) => Promise<RequestBodyInfo>,
            updateRequestBodyFromClipboard: (requestId: String) => Promise<RequestBodyInfoWithBody>,
            openUrl: (url: string) => Promise<void>,
        }) {
        makeObservable(this)
        this.initialize(initialization)
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
    initialize(initialization: WorkspaceInitialization) {
        this.defaults = new EditableDefaults(initialization.defaults, this)
        this.fileName = initialization.saveState.fileName
        this.displayName = initialization.saveState.displayName
        this.dirty = initialization.saveState.dirty
        this.editorCount = initialization.saveState.editorCount
        this.navigation = initialization.navigation
        this.updateIndexedNames()
        this.warnOnWorkspaceCreds = true
        // this.invalidItems.clear()
        this.executingRequestIDs = []
        this.processExecutionEvents(initialization.executions)
        this.pendingPkceRequests.clear()
        this.mode = WorkspaceMode.Normal
        this.helpTopic = null
        this.helpTopicHistory = []
        this.nextHelpTopic = null
        this.requestModels.clear()
        this.resultModels.clear()
        this.expandedItems = initialization.session.expandedItems ?? []
        if (initialization.session.activeEntity) {
            this.performChangeActive(
                initialization.session.activeEntity.entityType,
                initialization.session.activeEntity.entityId,
                undefined)
        } else {
            runInAction(() => {
                this.activeSelection = null
            })
        }

        this.helpTopic = initialization.session.helpTopic ?? null
        this.mode = initialization.session.mode ?? WorkspaceMode.Normal

        if (initialization.error) {
            this.feedback.toast(`Initialization error: ${initialization.error}`, ToastSeverity.Error)
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
        this.mode = mode
        this.callbacks.updateMode(mode)
            .catch(e => this.feedback.toastError(e))
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
        this.callbacks.updateExpandedItems(expanded.length > 0 ? expanded : undefined)
    }

    @action
    async changeActive(type: EntityType, id: string) {
        const expandId = `${type}-${id}`
        const isExpanded = this.expandedItems.includes(expandId)
        const isAlreadyActive = this.activeSelection?.entityType === type && this.activeSelection?.id === id
        const updateExpandedToValue = type === EntityType.Group
            ? isAlreadyActive
                ? !isExpanded
                : true
            : null

        if (this.activeSelection?.entityType !== type || this.activeSelection?.id !== id) {
            this.setMode(WorkspaceMode.Normal)
            this.performChangeActive(type, id, () => runInAction(() => {
                if (updateExpandedToValue !== null) {
                    this.updateExpanded(expandId, updateExpandedToValue)
                }
            }))
        } else if (updateExpandedToValue !== null) {
            this.updateExpanded(expandId, updateExpandedToValue)
        }
    }

    performChangeActive(type: EntityType, id: string, onChange?: () => void) {
        (async () => {
            try {
                let selection = await this.generateActiveSelection(id, type)
                runInAction(() => {
                    this.activeSelection = selection

                    // Trigger request body update when retrieving a request
                    if (selection.entityType === EntityType.Request) {
                        this.changeRequestBody(selection.id)
                    }

                    if (onChange) {
                        onChange()
                    }
                })

                await this.callbacks.updateActiveEntity({
                    entityType: type,
                    entityId: id
                })
            } catch (e) {
                this.feedback.toastError(e)
            }
        })().catch(e => this.feedback.toastError(e))
    }

    changeRequestBody(id: string) {
        if (this.activeSelection?.entityType === EntityType.Request && this.activeSelection.id === id &&
            this.activeSelection.isBodyInitialized) {
            return this.activeSelection.body
        }

        this.callbacks.getRequestBody(id)
            .then(bodyInfo => {
                if (this.activeSelection?.entityType === EntityType.Request && this.activeSelection.id === id) {
                    this.activeSelection.initializeBody(bodyInfo)
                }
            })
            .catch(e => this.feedback.toastError(e))
    }

    @action
    clearActive() {
        this.activeSelection = null
        this.callbacks.updateActiveEntity()
            .then(() => { })
            .catch(e => this.feedback.toastError(e))
    }

    @action
    clearActiveConditionally(entityType: EntityType, id: string) {
        if (this.activeSelection && this.activeSelection.entityType === entityType && this.activeSelection.id === id) {
            this.activeSelection = null
        }
    }

    @action
    refreshFromExternalUpdate(updatedItem: Entity) {
        let activeSelection = this.activeSelection
        switch (updatedItem.entityTypeName) {
            case EntityTypeName.Request:
                if (activeSelection && activeSelection?.entityType === EntityType.Request && activeSelection.id === updatedItem.id) {
                    activeSelection.refreshFromExternalUpdate(updatedItem)
                }
                break
            case EntityTypeName.Group:
                if (activeSelection && activeSelection?.entityType === EntityType.Group && activeSelection.id === updatedItem.id) {
                    activeSelection.refreshFromExternalUpdate(updatedItem)
                }
                break
            case EntityTypeName.Scenario:
                if (activeSelection && activeSelection?.entityType === EntityType.Scenario && activeSelection.id === updatedItem.id) {
                    activeSelection.refreshFromExternalUpdate(updatedItem)
                }
                break
            case EntityTypeName.Authorization:
                if (activeSelection && activeSelection?.entityType === EntityType.Authorization && activeSelection.id === updatedItem.id) {
                    activeSelection.refreshFromExternalUpdate(updatedItem)
                }
                break
            case EntityTypeName.Certificate:
                if (activeSelection && activeSelection?.entityType === EntityType.Certificate && activeSelection.id === updatedItem.id) {
                    activeSelection.refreshFromExternalUpdate(updatedItem)
                }
                break
            case EntityTypeName.Proxy:
                if (activeSelection && activeSelection?.entityType === EntityType.Proxy && activeSelection.id === updatedItem.id) {
                    activeSelection.refreshFromExternalUpdate(updatedItem)
                }
                break
            case EntityTypeName.Defaults:
                this.defaults.refreshFromExternalUpdate(updatedItem)
                break
            case EntityTypeName.DataList:
                this.setDataList(updatedItem.list)
                break
            case EntityTypeName.Data:
                this.setData(updatedItem)
                break
        }

        if (this.mode === WorkspaceMode.Normal) {
            // If we are looking at a request and have externally updated data, refresh the request
            // in case the data referred to is now invalid 
            if (activeSelection?.entityType === EntityType.Request || activeSelection?.entityType === EntityType.Group) {
                activeSelection.parameters = undefined
            }
        }
    }

    /**
     * Display help, optionally triggering an expansion/collapse of a parameter header
     */
    @action
    public showHelp(newHelpTopic: string, expandHeaderId: string | null = null, updateHistory = true) {
        if (expandHeaderId) {
            const isExpanded = this.expandedItems.includes(expandHeaderId)
            const updateExpandedToValue = (this.mode === WorkspaceMode.Help && this.helpTopic === newHelpTopic)
                ? !isExpanded
                : true
            if (updateExpandedToValue !== null) {
                this.updateExpanded(expandHeaderId, updateExpandedToValue)
            }
        }

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
        }

        setTimeout(() => {
            runInAction(() => {
                try {
                    this.helpTopic = newHelpTopic
                    this.mode = WorkspaceMode.Help
                } catch (e) {
                    this.feedback.toastError(e)
                }
            })
        }, 100)
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
            this.showHelp(lastTopic, null, false)
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

    // Additional computed values for performance optimization
    @computed
    public get hasExecutingRequests(): boolean {
        return this.executingRequestIDs.length > 0
    }

    @computed
    public get executingRequestCount(): number {
        return this.executingRequestIDs.length
    }

    @computed
    public get hasActiveSelection(): boolean {
        return this.activeSelection !== null
    }

    @computed
    public get isRequestSelected(): boolean {
        return this.activeSelection instanceof EditableRequest
    }

    @computed
    public get isGroupSelected(): boolean {
        return this.activeSelection instanceof EditableRequestGroup
    }

    @computed
    public get canShowRequestPanel(): boolean {
        return this.activeSelection instanceof EditableRequest ||
            this.activeSelection instanceof EditableRequestGroup
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
            const entityType = this.activeSelection.entityType
            const id = this.activeSelection.id
            this.callbacks.getEntityType(id)
                .then(entity => { if (!entity) this.clearActiveConditionally(entityType, id) })
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
            case EntityType.RequestEntry:
            case EntityType.Request:
            case EntityType.Group:
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
    async updateNavigationState(entry: UpdatedNavigationEntry) {
        const match = this.findNavigationEntry(entry.id, entry.entityType)
        if (match) {
            match.name = entry.name
            match.validationState = entry.validationState
            match.executionState = entry.executionState
        }
    }

    @action
    setExpandedItems(expandedItems: string[]) {
        this.expandedItems = expandedItems
    }

    async generateActiveSelection(
        id: string,
        type: EntityType,
    ) {
        switch (type) {
            case EntityType.RequestEntry:
            case EntityType.Request:
            case EntityType.Group:
                return await this.getRequestEntry(id)
            case EntityType.Scenario:
                return await this.getScenario(id)
            case EntityType.Authorization:
                return await this.getAuthorization(id)
            case EntityType.Certificate:
                return await this.getCertificate(id)
            case EntityType.Proxy:
                return await this.getProxy(id)
            default:
                throw new Error('Invalid entity type')
        }
    }

    async getRequestEntry(id: string) {
        switch (this.activeSelection?.entityType) {
            case EntityType.Request:
            case EntityType.Group:
                if (this.activeSelection.id === id) {
                    return this.activeSelection
                }
                break
        }

        const result = await this.callbacks.get(EntityType.RequestEntry, id)

        if (!result) {
            throw new Error(`Request Entry ID "${id}" is not valid`)
        }

        if (result.entityTypeName === 'RequestEntry') {
            const execution = await this.callbacks.getExecution(id)
            const executionResultViewState = await this.callbacks.getExecutionResultViewState(id)
            if (result.request) {
                return new EditableRequest(result.request, this, executionResultViewState, execution)
            }
            if (result.group) {
                return new EditableRequestGroup(result.group, this, executionResultViewState, execution)
            }
        }

        throw new Error(`Entity is not a request or group ${id} (${result.entityTypeName})`)
    }

    getResponseTitle(id: string) {
        return this.callbacks.getTitle(EntityType.Request, id)
    }

    updateRequest(request: EntityRequest) {
        this.callbacks.update(request).catch((e) => {
            this.feedback.toastError(e)
        })
    }

    updateRequestHeaders(headerInfo: EntityRequestHeaders) {
        this.callbacks.update(headerInfo).catch((e) => {
            this.feedback.toastError(e)
        })
    }

    updateGroup(group: EntityGroup) {
        this.callbacks.update(group).catch((e) => {
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
            .then(() => {
                this.clearActiveConditionally(EntityType.Request, id)
            })
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
        if (results.entityTypeName !== EntityTypeName.Parameters) {
            throw new Error('Request parameters not available')
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
        if (result.entityTypeName === EntityTypeName.Scenario) {
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
        if (result.entityTypeName === EntityTypeName.Authorization) {
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
        if (result.entityTypeName === EntityTypeName.Certificate) {
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
        if (result.entityTypeName === EntityTypeName.Proxy) {
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
        this.callbacks.update({ entityTypeName: EntityTypeName.Defaults, ...defaults }).catch((e) => {
            this.feedback.toastError(e)
        }).finally(() => {
            runInAction(() => {
                // switch (this.activeSelection?.entityType) {
                //     case EntityType.Request:
                //     case EntityType.Group:
                //         this.activeSelection.parameters = null
                //         break
                // }
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
        if (result.entityTypeName === EntityTypeName.Data) {
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
        this.callbacks.list(EntityType.DataList)
            .then(result => {
                if (result.entityTypeName !== EntityTypeName.DataList) {
                    throw new Error(`Data not available (${result.entityTypeName})`)
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
                if (results.entityTypeName !== EntityTypeName.Parameters) {
                    this.feedback.toast('Parameters not available ofr initialization', ToastSeverity.Error)
                } else {
                    this.activeParameters = results
                }
            }))
            .catch(e => this.feedback.toastError(e))
    }

    /**
     * Retrieve execution result view state
     * @param requestOrGroupId
     */
    @action
    async getExecutionResultViewState(requestOrGroupId: string) {
        try {
            return await this.callbacks.getExecutionResultViewState(requestOrGroupId)
        } catch (e) {
            this.feedback.toastError(e)
        }
    }

    /**
     * Retrieve execution result view state
     * @param execCtr 
     */
    @action
    updateExecutionResultViewState(requestOrGroupId: string, executionResultViewState: ExecutionResultViewState) {
        this.callbacks.updateExecutionResultViewState(requestOrGroupId, executionResultViewState)
            .catch(e => this.feedback.toastError(e))
    }

    /**
     * Updates execution detail
     * @param execCtr 
     */
    @action
    updateExecutionDetail(execCtr: number) {
        this.currentExecutionDetail = null
        this.callbacks.getResultDetail(execCtr)
            .then((d: ExecutionResultDetail) => runInAction(() => {
                this.currentExecutionDetail = d
            }))
            .catch(e => this.feedback.toastError(e))
    }

    @action
    processExecutionEvents(events: { [requestOrGroupId: string]: ExecutionEvent }) {
        for (const [requestOrGroupId, event] of Object.entries(events)) {
            this.getRequestEntry(requestOrGroupId)
                .then(r => runInAction(() => {
                    r.processExecutionEvent(event)
                    if (this.activeSelection?.id === r.id && r.selectedResultMenuItem !== null) {
                        this.updateExecutionDetail(r.selectedResultMenuItem.execCtr)
                    }
                }))
                .catch(e => this.feedback.toastError(e))
            const navigation = this.findNavigationEntry(requestOrGroupId, EntityType.Request)
            if (navigation) {
                navigation.executionState = event.executionState
            }
        }
    }

    @action
    async launchExecution(requestOrGroupId: string, singleRun: boolean = false) {
        let requestEntry: EditableRequestEntry | null = null
        try {
            try {
                requestEntry = await this.getRequestEntry(requestOrGroupId)
            } catch (e) {
                this.feedback.toastError(e)
                return
            }
            if (!requestEntry) throw new Error(`Invalid ID ${requestOrGroupId}`)

            requestEntry.startExecution()

            // Check if PKCE and initialize PKCE flow, queuing request upon completion
            const auth = await this.getRequestActiveAuthorization(requestEntry)
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

            let idx = this.executingRequestIDs.indexOf(requestOrGroupId)
            if (idx === -1) {
                this.executingRequestIDs.push(requestOrGroupId)
            }
            await this.callbacks.executeRequest(
                requestOrGroupId,
                this.fileName,
                singleRun)
            this.resultModels.delete(requestOrGroupId)
        } catch (error) {
            const msg = `${error}`
            const asWarning = msg == 'cancelled' || msg == 'No results returned'
            this.feedback.toast(msg, asWarning ? ToastSeverity.Warning : ToastSeverity.Error)
        } finally {
            if (requestEntry && requestEntry.isRunning) {
                requestEntry.stopExecution()
            }
            let idx = this.executingRequestIDs.indexOf(requestOrGroupId)
            if (idx !== -1) {
                this.executingRequestIDs.splice(idx, 1)
            }
        }
    }

    @action
    async cancelRequest(requestOrGroupId: string) {
        const request = await this.getRequestEntry(requestOrGroupId)
        request.isRunning = false

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

    @action getOAuth2ClientToken(authorizationId: string): Promise<TokenResult> {
        return this.callbacks.getOAuth2ClientToken({ authorizationId })
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
                this.cancelRequest(requestOrGroupId)
                    .catch((e) => this.feedback.toastError(e))
            }
        }
        this.pendingPkceRequests.set(authorizationId, new Map())
    }

    /**
     * Returns edit model if exists for the specified request/group
     * Note:  request.body should already be initialized when this is called
     * @param requestId
     * @param type 
     * @returns 
     */
    async getRequestEditModel(request: EditableRequest, type: RequestEditSessionType, mode: EditorMode): Promise<IRequestEditorTextModel> {
        const requestId = request.id

        const models = this.requestModels.get(requestId)
        if (models) {
            let model = models.get(type)
            if (model) {
                if (model.getLanguageId() === mode) {
                    return model
                }
            }
        }

        if (!request.isBodyInitialized) {
            throw new Error('Body is not yet initialized')
        }

        let text: string
        switch (type) {
            case RequestEditSessionType.Test:
                text = request.test
                break
            case RequestEditSessionType.Body:
                if (request.body && typeof request.body.data === 'string') {
                    text = request.body.data
                } else {
                    text = ''
                }
                break
            default:
                throw new Error(`Invalid edit model type "${type}"`)
        }

        const model = editor.createModel(text, mode) as IRequestEditorTextModel
        model.requestId = requestId
        model.type = type
        if (models) {
            models.set(type, model)
        } else {
            this.requestModels.set(requestId, new Map([[type, model]]))
        }
        return model
    }

    /**
    * Returns edit model if exists for the specified result
    * @param requestOrGroupId
    * @param execCtr
    * @param type 
    * @returns 
    */
    getResultEditModel(detail: ExecutionResultDetail, type: ResultEditSessionType, mode: EditorMode): editor.ITextModel {
        let id: string
        let text: string

        switch (detail.entityType) {
            case 'request':
                switch (type) {
                    case ResultEditSessionType.Base64:
                        text = (detail.testContext.response?.body?.type === 'Binary')
                            ? detail.testContext.response.body.data
                            : ''
                        break
                    default:
                        text = (detail.testContext.response?.body?.type !== 'Binary')
                            ? detail.testContext.response?.body?.text ?? ''
                            : ''
                        break
                }
                break
            case 'grouped':
                text = JSON.stringify(detail)
                break
            default:
                text = ''
                break
        }

        const model = editor.createModel(text, mode) as IResultEditorTextModel
        model.resultId = detail.id
        model.execCtr = detail.execCtr
        model.type = type

        let requestModels = this.resultModels.get(detail.id)
        if (!requestModels) {
            requestModels = new Map()
            this.resultModels.set(detail.id, requestModels)
        }
        let entries = requestModels.get(detail.execCtr)
        if (!entries) {
            entries = new Map()
            requestModels.set(detail.execCtr, entries)
        }
        entries.set(type, model)
        return model
    }

    @action
    clearAllEditSessions() {
        for (const [, resultMap] of this.resultModels) {
            for (const [, typeMap] of resultMap) {
                for (const [, model] of typeMap) {
                    model.dispose()
                }
            }
        }
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

    public copyToClipboard(payloadRequest: ClipboardPaylodRequest, description: string) {
        this.callbacks.copyToClipboard(payloadRequest)
            .then(() => this.feedback.toast(`${description} copied to clipboard`, ToastSeverity.Info))
            .catch((err) => this.feedback.toastError(err))
    }

    async updateRequestBody(requestId: string, body: Body | undefined): Promise<RequestBodyInfo | null> {
        try {
            if (body) {
                const bodyInfo = await this.callbacks.updateRequestBody(requestId, body) ?? null
                // todo:  send to other sessions?
                return bodyInfo
            } else {
                return null
            }
        } catch (e) {
            this.feedback.toastError(e)
            return null
        }
    }
    
    public async updateRequestBodyFromClipboard(requestId: String): Promise<RequestBodyInfo> {
        const bodyInfo = await this.callbacks.updateRequestBodyFromClipboard(requestId)
        runInAction(() => {
            if (this.activeSelection?.entityType === EntityType.Request && this.activeSelection.id === bodyInfo.requestId) {
                this.activeSelection.onUpdateBodyFromExternal(bodyInfo)
            }
        })
        return bodyInfo
    }

    public openUrl(url: string) {
        this.callbacks.openUrl(url)
            .catch((err) => this.feedback.toastError(err))
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


export type Entity = EntityRequestEntry | EntityRequest | EntityGroup | EntityRequestHeaders | EntityRequestBody |
    EntityScenario | EntityAuthorization | EntityCertificate | EntityProxy |
    EntityData | EntityDataList | EntityDefaults

export enum EntityTypeName {
    RequestEntry = 'RequestEntry',
    Request = 'Request',
    ReqeustHeaders = 'RequestHeaders',
    RequestBody = 'RequestBody',
    Group = 'Group',
    Scenario = 'Scenario',
    Authorization = 'Authorization',
    Certificate = 'Certificate',
    Proxy = 'Proxy',
    Data = 'Data',
    DataList = 'DataList',
    Defaults = 'Defaults',
    Parameters = 'Parameters',
}

export interface EntityRequestEntry extends RequestEntryInfo {
    entityTypeName: EntityTypeName.RequestEntry
}

export interface EntityRequest extends Request {
    entityTypeName: EntityTypeName.Request
}

export interface EntityRequestHeaders extends RequestHeaderInfo {
    entityTypeName: EntityTypeName.ReqeustHeaders
}

export interface EntityRequestBody extends RequestBodyInfo {
    entityTypeName: EntityTypeName.RequestBody
}

export interface EntityGroup extends RequestGroup {
    entityTypeName: EntityTypeName.Group
}

export interface EntityScenario extends Scenario {
    entityTypeName: EntityTypeName.Scenario
}

export interface EntityBasicAuthorization extends BasicAuthorization {
    entityTypeName: EntityTypeName.Authorization
}

export interface EntityOAuth2ClientAuthorization extends OAuth2ClientAuthorization {
    entityTypeName: EntityTypeName.Authorization
}

export interface EntityOAuth2PkceAuthorization extends OAuth2PkceAuthorization {
    entityTypeName: EntityTypeName.Authorization
}

export interface EntityApiKeyAuthorization extends ApiKeyAuthorization {
    entityTypeName: EntityTypeName.Authorization
}

export type EntityAuthorization = EntityBasicAuthorization | EntityOAuth2ClientAuthorization |
    EntityOAuth2PkceAuthorization | EntityApiKeyAuthorization

export interface EntityPkcs12Certificate extends Pkcs12Certificate {
    entityTypeName: EntityTypeName.Certificate
}

export interface EntityPkcs8PemCertificate extends Pkcs8PemCertificate {
    entityTypeName: EntityTypeName.Certificate
}

export interface EntityPemCertificate extends PemCertificate {
    entityTypeName: EntityTypeName.Certificate
}

export type EntityCertificate = EntityPkcs12Certificate | EntityPkcs8PemCertificate | EntityPemCertificate

export interface EntityProxy extends Proxy {
    entityTypeName: EntityTypeName.Proxy
}

export interface EntityData extends ExternalData {
    entityTypeName: EntityTypeName.Data
}

export interface EntityDataList {
    entityTypeName: EntityTypeName.DataList
    list: ExternalData[]
}

export interface EntityDefaults extends WorkspaceDefaultParameters {
    entityTypeName: EntityTypeName.Defaults
}

export enum ListEntityType {
    Parameters = 1,
    Data = 2,
    Defaults = 3,
}

export interface ListParameters extends WorkspaceParameters {
    entityTypeName: EntityTypeName.Parameters
}

export interface ListData {
    entityTypeName: EntityTypeName.DataList
    data: ExternalData[]
}

export type ListEntities = ListParameters | ListData


export interface UpdatedNavigationEntry {
    id: string
    name: string
    entityType: EntityType
    validationState?: ValidationState
    executionState?: ExecutionState
}

export interface Session {
    /**
     * Session ID associated with the session
     */
    workspaceId: String
    /**
     * Track which request is active in the session, if any
     */
    activeEntity?: SessionEntity
    /**
     * Expanded item IDs
     */
    expandedItems?: string[]
    /**
     * Track which exec ctr is selected for each request or group
     */
    requestExecCtrs: { [requestOrGroupId: string]: number },
    /**
     * Current session mode (what is being displayed)
     */
    mode?: number,
    /**
     * Most recent help topic
     */
    helpTopic?: string
}

export interface WorkspaceInitialization {
    session: Session
    navigation: Navigation
    saveState: SessionSaveState
    executions: { [requestOrGroupId: string]: ExecutionEvent }
    defaults: WorkspaceDefaultParameters
    settings: EditableSettings
    error: string | undefined
}

export interface SessionSaveState {
    fileName: string
    displayName: string
    dirty: boolean
    editorCount: number
}

export interface RequestEntryInfo {
    request?: Request
    group?: RequestGroup
}

export interface RequestHeaderInfo {
    id: string
    headers?: NameValuePair[]
}

export interface RequestBodyInfo {
    requestId: string
    bodyMimeType?: string
    bodyLength?: number
}

export interface RequestBodyInfoWithBody extends RequestBodyInfo {
    body?: Body
}

export interface SessionEntity {
    entityType: EntityType,
    entityId: string
}
