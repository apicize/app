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
    DataSet,
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
    Body,
    TokenResult,
    DataSourceType,
} from "@apicize/lib-typescript"
import { EntityType } from "../models/workspace/entity-type"
import { createContext, useContext } from "react"
import { EditableDefaults } from "../models/workspace/editable-defaults"
import { EditableDataSet } from "../models/workspace/editable-data-set"
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
import { ClipboardPaylodRequest } from "../models/clipboard_payload_request"
import { RequestExecution } from "../models/request-execution"
import { IDataSetEditorTextModel, IRequestEditorTextModel, IResultEditorTextModel } from "../models/editor-text-model"
import { EntityUpdate } from "../models/updates/entity-update"
import { RequestBodyInfo, RequestBodyMimeInfo } from "../models/workspace/request-body-info"
import { DataSetContent } from "../models/updates/data-set-update"

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
    DataSetList = 10,
}

export type ResultsPanel = 'Info' | 'Headers' | 'Preview' | 'Text' | 'Details'
export type RequestPanel = 'Info' | 'Headers' | 'Query String' | 'Body' | 'Test' | 'Parameters' | 'Warnings'
export type GroupPanel = 'Info' | 'Parameters' | 'Warnings'

export type ActiveSelection = EditableRequest | EditableRequestGroup | EditableScenario |
    EditableAuthorization | EditableCertificate | EditableProxy | EditableDataSet |
    EditableDefaults
export class WorkspaceStore {
    private pkceTokens = new Map<string, CachedTokenInfo>()
    private indexedNavigationNames = new Map<string, string>()
    private indexedDataNames = new Map<string, string>()

    @observable accessor dirty = false
    @observable accessor editorCount = 0
    @observable accessor fileName = ''
    @observable accessor directory = ''
    @observable accessor displayName = ''
    @observable accessor navigation = {
        requests: [],
        scenarios: { public: [], private: [], vault: [] },
        dataSets: [],
        authorizations: { public: [], private: [], vault: [] },
        certificates: { public: [], private: [], vault: [] },
        proxies: { public: [], private: [], vault: [] }
    } as Navigation

    @observable accessor activeSelection: ActiveSelection | null = null
    @observable accessor activeParameters: WorkspaceParameters | null = null

    @observable accessor defaults = new EditableDefaults({}, this)

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
    // Result edit sessions, indexed by request/group ID, and then by result index, and then by type
    private dataSetModels = new Map<string, IDataSetEditorTextModel>()

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
            listParameters: (requestId?: string) => Promise<WorkspaceParameters>,
            add: (entity: EntityType, relativeToId: string | null, relativePosition: IndexedEntityPosition | null, cloneFromId: string | null) => Promise<string>,
            update: (entity: EntityUpdate) => Promise<UpdateResponse>,
            delete: (entityType: EntityType, entityId: string) => Promise<void>,
            move: (entity: EntityType, entityId: string, relativeToId: string, relativePosition: IndexedEntityPosition) => Promise<string[]>,
            listLogs: () => Promise<ReqwestEvent[]>,
            clearLogs: () => Promise<void>,
            getRequestActiveAuthorization: (id: string) => Promise<Authorization | undefined>,
            getRequestActiveData: (id: string) => Promise<DataSet | undefined>,
            storeToken: (authorizationId: string, tokenInfo: CachedTokenInfo) => Promise<void>,
            clearToken: (authorizationId: string) => Promise<void>,
            clearAllTokens: () => Promise<void>,
            startExecution: (requestId: string, workbookFullName: string, singleRun: boolean) => Promise<{ [execuingRequestOrGroupId: string]: undefined }>,
            cancelExecution: (requestId: string) => Promise<void>,
            clearExecution: (requestOrGroupId: string) => Promise<void>,
            getExecutionResultViewState: (requestId: string) => Promise<ExecutionResultViewState>,
            updateExecutionResultViewState: (requestId: string, executionResultViewState: ExecutionResultViewState) => Promise<undefined>,
            getResultDetail: (execCtr: number) => Promise<ExecutionResultDetail>,
            getEntityType: (entityId: string) => Promise<EntityType | null>,
            getDataSetContent: (dataSetId: string) => Promise<DataSetContent>,
            findDescendantGroups: (groupId: string) => Promise<string[]>,
            getOAuth2ClientToken: (data: { authorizationId: string }) => Promise<TokenResult>,
            initializePkce: (data: { authorizationId: string }) => Promise<void>,
            closePkce: (data: { authorizationId: string }) => Promise<void>,
            refreshToken: (data: { authorizationId: string }) => Promise<void>,
            copyToClipboard: (payloadRequest: ClipboardPaylodRequest) => Promise<void>,
            getRequestBody: (requestId: string) => Promise<RequestBodyInfo>,
            updateRequestBody: (requestId: string, body?: Body) => Promise<RequestBodyMimeInfo>,
            updateRequestBodyFromClipboard: (requestId: String) => Promise<RequestBodyInfo>,
            openUrl: (url: string) => Promise<void>,
        }) {
        makeObservable(this)
        this.initialize(initialization)
    }

    @action
    initialize(initialization: WorkspaceInitialization) {
        this.defaults = new EditableDefaults(initialization.defaults, this)
        this.fileName = initialization.saveState.fileName
        this.directory = initialization.saveState.directory
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
        this.mode = initialization.session.mode ?? WorkspaceMode.Normal
        this.helpTopic = null
        this.helpTopicHistory = []
        this.nextHelpTopic = null
        this.requestModels.clear()
        this.resultModels.clear()
        this.dataSetModels.clear()
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

        if (initialization.error) {
            this.feedback.toast(`Initialization error: ${initialization.error}`, ToastSeverity.Error)
        }
    }

    @action
    close() {
        return this.callbacks.close()
    }

    updateSaveState(state: SessionSaveState) {
        runInAction(() => {
            this.fileName = state.fileName
            this.directory = state.directory
            this.displayName = state.displayName
            this.dirty = state.dirty
            this.editorCount = state.editorCount
        })
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
                runInAction(() => {
                    if (this.activeSelection?.entityType === EntityType.Request && this.activeSelection.id === id) {
                        this.activeSelection.initializeBody(bodyInfo)
                    }
                })
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
            if (updateExpandedToValue !== isExpanded) {
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
        for (const entry of this.navigation.dataSets) {
            this.indexedNavigationNames.set(entry.id, entry.name)
        }
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
            case EntityType.DataSet:
                return this.navigation.dataSets.find(e => e.id === id)
            case EntityType.Defaults:
                return this.defaults
            default:
                throw entityType satisfies never
        }
    }

    @action
    updateNavigationState(entry: UpdatedNavigationEntry) {
        const match = this.findNavigationEntry(entry.id, entry.entityType)
        if (match) {
            match.name = entry.disabled ? entry.name + ' (disabled)' : entry.name
            match.validationState = entry.validationState
            match.executionState = entry.executionState
            match.disabled = entry.disabled
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
            case EntityType.DataSet:
                return await this.getDataSet(id)
            case EntityType.Proxy:
                return await this.getProxy(id)
            case EntityType.Defaults:
                return this.defaults
            default:
                throw type satisfies never
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

    getRequestParameterList(requestOrGroupId: string): Promise<WorkspaceParameters> {
        return this.callbacks.listParameters(requestOrGroupId)
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

    @action
    addDataSet(relativeToId: string | null, relativePosition: IndexedEntityPosition, cloneFromId: string | null) {
        this.callbacks.add(EntityType.DataSet, relativeToId, relativePosition, cloneFromId)
            .then(id => {
                if (relativeToId && relativePosition === IndexedEntityPosition.Under) {
                    this.updateExpanded(`g-${relativeToId}`, true)
                }
                this.changeActive(EntityType.DataSet, id)
            })
            .catch(e => this.feedback.toastError(e))
    }

    @action
    deleteDataSet(id: string) {
        this.callbacks.delete(EntityType.DataSet, id)
            .then(() => {
                this.clearActiveConditionally(EntityType.DataSet, id)
            })
            .catch(e => this.feedback.toastError(e))
    }

    @action
    moveDataSet(id: string, relativeToId: string, relativePosition: IndexedEntityPosition) {
        this.callbacks.move(EntityType.DataSet, id, relativeToId, relativePosition)
            .then(parentIds => {
                this.updateExpanded(parentIds.map(pid => `g-${pid}`), true)
            })
            .catch(e => this.feedback.toastError(e))
    }


    async getDataSet(id: string) {
        const [result, content] = await Promise.all([
            this.callbacks.get(EntityType.DataSet, id),
            this.callbacks.getDataSetContent(id)
        ])
        if (result.entityTypeName === EntityTypeName.DataSet) {
            return new EditableDataSet(result, this, content)
        }
        throw new Error(`Invalid data set ${id}`)
    }

    /**
     * Initialize the parameters list
     * @returns 
     */
    initializeParameterList() {
        this.callbacks.listParameters()
            .then(results => runInAction(() => {
                this.activeParameters = results
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
    async startExecution(requestOrGroupId: string, singleRun: boolean = false) {
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
            await this.callbacks.startExecution(
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
    async cancelExecution(requestOrGroupId: string) {
        const request = await this.getRequestEntry(requestOrGroupId)
        request.isRunning = false

        let idx = this.executingRequestIDs.indexOf(requestOrGroupId)
        if (idx !== -1) {
            this.executingRequestIDs.splice(idx, 1)
        }
        return this.callbacks.cancelExecution(requestOrGroupId)
    }

    @action
    clearExecution(requestOrGroupId: string) {
        return this.callbacks.clearExecution(requestOrGroupId)
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
            this.startExecution(requestOrGroupId, singleRun)
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
                this.cancelExecution(requestOrGroupId)
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

    /**
     * Returns edit model if exists for the specified request/group
     * Note:  request.body should already be initialized when this is called
     * @param requestId
     * @param type 
     * @returns 
     */
    async getDataSetEditModel(dataSet: EditableDataSet): Promise<IDataSetEditorTextModel> {
        const dataSetId = dataSet.id

        let model = this.dataSetModels.get(dataSetId)
        if (model) {
            return model
        }

        model = editor.createModel(dataSet.text, EditorMode.json) as IDataSetEditorTextModel
        model.dataSetId = dataSetId
        this.dataSetModels.set(dataSetId, model)
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
        this.dataSetModels.clear()
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

    async updateRequestBody(requestId: string, body: Body | undefined): Promise<RequestBodyMimeInfo | null> {
        try {
            if (body) {
                return await this.callbacks.updateRequestBody(requestId, body) ?? null
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
            if (this.activeSelection?.entityType === EntityType.Request && this.activeSelection.id === bodyInfo.id) {
                this.activeSelection.refreshFromExternalSpecificUpdate({
                    update: {
                        type: EntityTypeName.Request,
                        entityType: EntityType.Request,
                        id: bodyInfo.id,
                        body: bodyInfo.body,
                        bodyLength: bodyInfo.bodyLength,
                        bodyMimeType: bodyInfo.bodyMimeType,
                    }
                })
            }
        })
        return bodyInfo
    }

    public openUrl(url: string) {
        this.callbacks.openUrl(url)
            .catch((err) => this.feedback.toastError(err))
    }

    public update(update: EntityUpdate) {
        return this.callbacks.update(update)
    }

    @action
    refreshFromExternalUpdate(notification: EntityUpdateNotification) {
        if (notification.update.entityType === EntityType.Defaults && this.mode === WorkspaceMode.Defaults) {
            this.defaults.refreshFromExternalSpecificUpdate(notification)
            return
        }

        let activeSelection = this.activeSelection
        if (activeSelection && activeSelection.entityType === notification.update.entityType &&
            (notification.update.entityType === EntityType.Defaults || activeSelection.id === notification.update.id)) {
            activeSelection.refreshFromExternalSpecificUpdate(notification)
        }
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


export type Entity = EntityRequestEntry | EntityRequest | EntityGroup |
    EntityScenario | EntityAuthorization | EntityCertificate | EntityProxy |
    EntityDataSet | EntityDefaults

export enum EntityTypeName {
    RequestEntry = 'RequestEntry',
    Request = 'Request',
    Group = 'RequestGroup',
    Scenario = 'Scenario',
    Authorization = 'Authorization',
    Certificate = 'Certificate',
    Proxy = 'Proxy',
    DataSet = 'DataSet',
    Defaults = 'Defaults',
    Parameters = 'Parameters',
}

export interface EntityRequestEntry extends RequestEntryInfo {
    entityTypeName: EntityTypeName.RequestEntry
}

export interface EntityRequest extends Request {
    entityTypeName: EntityTypeName.Request
}

export interface EntityGroup extends RequestGroup {
    entityTypeName: EntityTypeName.Group
}

export interface EntityScenario extends Scenario {
    entityTypeName: EntityTypeName.Scenario
}

export interface EntityDataSet extends DataSet {
    entityTypeName: EntityTypeName.DataSet
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

export interface EntityDataSet extends DataSet {
    entityTypeName: EntityTypeName.DataSet
}

export interface EntityDefaults extends WorkspaceDefaultParameters {
    entityTypeName: EntityTypeName.Defaults
}

export interface UpdatedNavigationEntry {
    id: string
    name: string
    entityType: EntityType
    validationState?: ValidationState
    executionState?: ExecutionState
    disabled: boolean
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
    directory: string
    displayName: string
    dirty: boolean
    editorCount: number
}

export interface RequestEntryInfo {
    request?: Request
    group?: RequestGroup
}

export interface SessionEntity {
    entityType: EntityType,
    entityId: string
}

export interface UpdateResponse {
    validationWarnings?: string[]
    validationErrors?: { [name: string]: string },
}

export interface EntityUpdateNotification {
    update: EntityUpdate
    validationWarnings?: string[]
    validationErrors?: { [name: string]: string },
}

export interface OpenDataSetFileResponse {
    relativeFileName: string
    dataSetContent?: DataSetContent
}