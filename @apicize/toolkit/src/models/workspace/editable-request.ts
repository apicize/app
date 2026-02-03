import { Selection, Body, BodyType, ExecutionConcurrency, Method, NameValuePair, Request, ValidationWarnings, ValidationErrors, BodyJSON, BodyNone, BodyRaw, BodyText, BodyXML, ValidationErrorList } from "@apicize/lib-typescript"
import { action, computed, observable, runInAction, toJS } from "mobx"
import { EditableNameValuePair } from "./editable-name-value-pair"
import { GenerateIdentifier } from "../../services/random-identifier-generator"
import { EntityType } from "./entity-type"
import { EntityRequest, EntityTypeName, EntityUpdateNotification, WorkspaceStore } from "../../contexts/workspace.context"
import { EditableRequestEntry } from "./editable-request-entry"
import { RequestDuplex } from "undici-types"
import { EditableWarnings } from "./editable-warnings"
import { RequestExecution } from "../request-execution"
import { EditorMode } from "../editor-mode"
import { IRequestEditorTextModel } from "../editor-text-model"
import { ExecutionResultViewState } from "./execution"
import { base64Encode } from "../../services/base64"
import { BodyConversion } from "../../services/body-conversion"
import { RequestUpdate } from "../updates/request-update"
import { DEFAULT_SELECTION_ID, NO_SELECTION_ID, NO_SELECTION } from "../store"
import { RequestBodyInfo } from "./request-body-info"

export class EditableRequest extends EditableRequestEntry {
    public readonly entityType = EntityType.Request

    @observable public accessor key = ''
    @observable public accessor url = ''

    @observable public accessor method = Method.Get
    @observable public accessor timeout = 30000
    @observable public accessor keepAlive = false
    @observable public accessor acceptInvalidCerts = false
    @observable public accessor numberOfRedirects = 10
    @observable public accessor queryStringParams: EditableNameValuePair[] = []
    @observable public accessor headers: EditableNameValuePair[] = []
    @observable public accessor redirect: RequestRedirect | null = null
    @observable public accessor mode: RequestMode | null = null
    @observable public accessor referrer: string | null = null
    @observable public accessor referrerPolicy: ReferrerPolicy | null = null
    @observable public accessor duplex: RequestDuplex | null = null

    @observable public accessor test = ''

    @observable public accessor isBodyInitialized = false
    @observable public accessor body: EditableBody = { type: BodyType.None, data: undefined }
    @observable public accessor bodyMimeType: string | null = null
    @observable public accessor bodyLength: number | null = null
    @observable public accessor bodyLanguage: EditorMode | null = null
    @observable public accessor bodyEditorModel: IRequestEditorTextModel | null = null

    @observable accessor validationErrors: ValidationErrorList = {}
    @observable accessor validationWarnings = new EditableWarnings()

    public constructor(entry: Request, workspace: WorkspaceStore, executionResultViewState: ExecutionResultViewState, requestExecution: RequestExecution) {
        super(workspace, executionResultViewState, requestExecution)

        this.id = entry.id
        this.name = entry.name ?? ''
        this.key = entry.key ?? ''
        this.runs = entry.runs
        this.multiRunExecution = entry.multiRunExecution

        this.selectedScenario = entry.selectedScenario ?? undefined
        this.selectedAuthorization = entry.selectedAuthorization ?? undefined
        this.selectedCertificate = entry.selectedCertificate ?? undefined
        this.selectedProxy = entry.selectedProxy ?? undefined
        this.selectedDataSet = entry.selectedData ?? undefined

        this.validationWarnings.set(entry.validationWarnings)
        this.validationErrors = entry.validationErrors ?? {}

        this.url = entry.url ?? ''
        this.method = entry.method ?? Method.Get
        this.timeout = entry.timeout ?? 30000
        this.acceptInvalidCerts = entry.acceptInvalidCerts
        this.keepAlive = entry.keepAlive
        this.queryStringParams = entry.queryStringParams?.map(q => ({
            id: GenerateIdentifier(),
            ...q
        })) ?? []
        this.headers = entry.headers?.map(h => ({
            id: GenerateIdentifier(),
            ...h
        })) ?? []

        let idxQuery = this.url.indexOf('?')
        if (idxQuery !== -1) {
            const params = new URLSearchParams(this.url.substring(idxQuery + 1))
            for (const [name, value] of params) {
                this.queryStringParams.push({
                    id: GenerateIdentifier(),
                    name,
                    value
                })
            }
            this.url = this.url.substring(0, idxQuery)
        }
        // this.body = entry.body ?? {
        //     type: BodyType.None,
        //     data: undefined,
        // }
        this.test = entry.test ?? ''

        this.mode = entry.mode ?? null
        this.referrer = entry.referrer ?? null
        this.referrerPolicy = entry.referrerPolicy ?? null
        this.duplex = entry.duplex ?? null
    }

    public initializeBody(bodyInfo: RequestBodyInfo) {
        this.body = EditableRequest.createEditableBody(bodyInfo.body)
        this.bodyMimeType = bodyInfo.bodyMimeType ?? null
        this.bodyLength = bodyInfo.bodyLength ?? null
        this.isBodyInitialized = true
        this.checkEditModel()
    }

    protected performUpdate(update: RequestUpdate) {
        this.markAsDirty()
        this.workspace.update(update)
            .then(updates => runInAction(() => {
                if (updates) {
                    this.validationErrors = updates.validationErrors || {}
                }
            }))
    }

    @action
    public performUpdateBody(body: Body) {
        this.markAsDirty()
        return new Promise<void>((resolve, reject) => {
            this.workspace.updateRequestBody(
                this.id, body)
                .then((bodyInfo) => runInAction(() => {
                    const editableBody = EditableRequest.createEditableBody(body)
                    this.body.type = editableBody.type
                    this.body.data = editableBody.data
                    this.bodyMimeType = bodyInfo?.bodyMimeType ?? null
                    this.bodyLength = bodyInfo?.bodyLength ?? null
                    this.checkEditModel()
                    resolve()
                }))
                .catch(e => reject(e))
        })
    }
    @action
    setName(value: string) {
        this.name = value
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, name: value })
    }

    @action
    setKey(value: string) {
        this.key = value
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, key: value })
    }

    @action
    setRuns(value: number) {
        this.runs = value
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, runs: value })
    }

    @action
    setMultiRunExecution(value: ExecutionConcurrency) {
        this.multiRunExecution = value
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, multiRunExecution: value })
    }

    @action
    setUrl(value: string) {
        this.url = value
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, url: value })
    }

    @action
    setMethod(value: Method) {
        this.method = value
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, method: value })
    }

    @action
    setTimeout(value: number) {
        this.timeout = value
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, timeout: value })
    }

    @action
    setKeepAlive(value: boolean) {
        this.keepAlive = value
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, keepAlive: value })
    }

    @action
    setAcceptInvalidCerts(value: boolean) {
        this.acceptInvalidCerts = value
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, acceptInvalidCerts: value })
    }

    @action
    setNumberOfRedirects(value: number) {
        if (value < 0) {
            throw new Error('Number of redirects must be zero (disabled) or greater')
        }
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, numberOfRedirects: value })
    }

    @action
    setQueryStringParams(value: EditableNameValuePair[]) {
        this.queryStringParams = value
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, queryStringParams: value })
    }

    @action
    setHeaders(value: EditableNameValuePair[]) {
        this.headers = value
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, headers: value })
    }

    @action
    setTest(value: string | undefined) {
        this.test = value ?? ''
        this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, test: value })
    }

    @action
    setBodyFromRawData(data: Uint8Array) {
        this.markAsDirty()
        this.bodyLength = data.length
        return this.performUpdateBody({ type: BodyType.Raw, data: base64Encode(data) })
    }

    @action
    setBody(body: Body) {
        this.markAsDirty()
        return this.performUpdateBody(EditableRequest.createEditableBody(body))
    }

    @action
    async setBodyType(newBodyType: BodyType) {
        this.markAsDirty()
        return this.performUpdateBody(
            EditableRequest.createEditableBody(await (new BodyConversion(this.body)).convert(newBodyType))
        )
    }

    @action
    setBodyData(value: string | EditableNameValuePair[]) {
        if (this.isBodyInitialized) {
            this.body.data = value
            return this.performUpdateBody(this.body)
        } else {
            return Promise.resolve()
        }
    }

    @action
    setSelectedScenarioId(entityId: string) {
        this.selectedScenario = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({
            type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id,
            selectedScenario: this.selectedScenario ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedAuthorizationId(entityId: string) {
        this.selectedAuthorization = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({
            type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id,
            selectedAuthorization: this.selectedAuthorization ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedCertificateId(entityId: string) {
        this.selectedCertificate = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({
            type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id,
            selectedCertificate: this.selectedCertificate ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedProxyId(entityId: string) {
        this.selectedProxy = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({
            type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id,
            selectedProxy: this.selectedProxy ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedDataId(entityId: string) {
        this.selectedDataSet = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({
            type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id,
            selecteData: this.selectedDataSet ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    refreshFromExternalSpecificUpdate(notification: EntityUpdateNotification) {
        if (notification.update.entityType !== EntityType.Request) {
            return
        }
        if (notification.update.name !== undefined) {
            this.name = notification.update.name
        }
        if (notification.update.key !== undefined) {
            this.key = notification.update.key
        }
        if (notification.update.url !== undefined) {
            this.url = notification.update.url
        }
        if (notification.update.method !== undefined) {
            this.method = notification.update.method
        }
        if (notification.update.runs !== undefined) {
            this.runs = notification.update.runs
        }
        if (notification.update.multiRunExecution !== undefined) {
            this.multiRunExecution = notification.update.multiRunExecution
        }
        if (notification.update.timeout !== undefined) {
            this.timeout = notification.update.timeout
        }
        if (notification.update.keepAlive !== undefined) {
            this.keepAlive = notification.update.keepAlive
        }
        if (notification.update.acceptInvalidCerts !== undefined) {
            this.acceptInvalidCerts = notification.update.acceptInvalidCerts
        }
        if (notification.update.numberOfRedirects !== undefined) {
            this.numberOfRedirects = notification.update.numberOfRedirects
        }
        if (notification.update.queryStringParams !== undefined) {
            this.queryStringParams = notification.update.queryStringParams.map(nv => ({
                id: GenerateIdentifier(),
                name: nv.name,
                value: nv.value,
            }))
        }
        if (notification.update.headers !== undefined) {
            this.headers = notification.update.headers.map(nv => ({
                id: GenerateIdentifier(),
                name: nv.name,
                value: nv.value,
            }))
        }

        // if (notification.update.redirect !== undefined) {
        //     this.redirect = notification.update.redirect
        // }
        // if (notification.update.mode !== undefined) {
        //     this.mode = notification.update.mode
        // }
        // if (notification.update.referrer !== undefined) {
        //     this.referrer = notification.update.referrer
        // }
        // if (notification.update.referrerPolicy !== undefined) {
        //     this.referrerPolicy = notification.update.referrerPolicy
        // }
        // if (notification.update.duplex !== undefined) {
        //     this.duplex = notification.update.duplex
        // }


        if (notification.update.test !== undefined) {
            this.test = notification.update.test
        }

        if (notification.update.body !== undefined) {
            if (notification.update.body.type === BodyType.None) {
                this.body.type = BodyType.None
                this.bodyMimeType = null
                this.bodyLength = null
            } else {
                const editable = EditableRequest.createEditableBody(notification.update.body)
                this.body.type = editable.type
                this.body.data = editable.data
                this.bodyMimeType = notification.update.bodyMimeType ?? null
                this.bodyLength = notification.update.bodyLength ?? null
            }
        }

        let clearParameters = false
        if (notification.update.selectedScenario !== undefined) {
            this.selectedScenario = notification.update.selectedScenario.id === DEFAULT_SELECTION_ID
                ? undefined : notification.update.selectedScenario
            clearParameters = true
        }
        if (notification.update.selectedAuthorization !== undefined) {
            this.selectedAuthorization = notification.update.selectedAuthorization.id === DEFAULT_SELECTION_ID
                ? undefined : notification.update.selectedAuthorization
            clearParameters = true
        }
        if (notification.update.selectedCertificate !== undefined) {
            this.selectedCertificate = notification.update.selectedCertificate.id === DEFAULT_SELECTION_ID
                ? undefined : notification.update.selectedCertificate
            clearParameters = true
        }
        if (notification.update.selectedProxy !== undefined) {
            this.selectedProxy = notification.update.selectedProxy.id === DEFAULT_SELECTION_ID
                ? undefined : notification.update.selectedProxy
            clearParameters = true
        }
        if (notification.update.selecteData !== undefined) {
            this.selectedDataSet = notification.update.selecteData.id === DEFAULT_SELECTION_ID
                ? undefined : notification.update.selecteData
            clearParameters = true
        }
        if (clearParameters) {
            // If any selections were updated, clear parameters so that they get re-rendered
            this.parameters = undefined
        }

        this.validationWarnings.set(notification.validationWarnings)
        this.validationErrors = notification.validationErrors ?? {}
    }

    @action
    deleteWarning(id: string) {
        this.validationWarnings.delete(id)
        this.performUpdate({
            type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id,
            validationWarnings: [...this.validationWarnings.entries.values()]
        })
    }

    @computed get nameError() {
        return this.validationErrors['name']
    }

    @computed get urlError() {
        return this.validationErrors['url']
    }

    private static createEditableBody(body: Body | undefined): EditableBody {
        if (body?.type === BodyType.Form) {
            return {
                type: BodyType.Form,
                data: body.data.map(d => ({
                    id: GenerateIdentifier(),
                    name: d.name,
                    value: d.value,
                    disabled: d.disabled
                }))
            }
        } else {
            return body ?? {
                type: BodyType.None,
                data: undefined
            }
        }
    }

    private checkEditModel() {
        switch (this.body?.type) {
            case BodyType.JSON:
                this.bodyLanguage = EditorMode.json
                break
            case BodyType.XML:
                this.bodyLanguage = EditorMode.xml
                break
            case BodyType.Text:
                this.bodyLanguage = EditorMode.txt
                break
            default:
                this.bodyLanguage = null
                return
        }
    }
}


/**
 * This is all request information, excluding the request body
 */
export interface RequestInfo extends ValidationWarnings, ValidationErrors {
    id: string
    name: string
    key?: string
    url: string
    method: Method
    timeout: number
    keepAlive: boolean
    acceptInvalidCerts: boolean
    numberOfRedirects: number
    mode?: RequestMode
    runs: number
    multiRunExecution: ExecutionConcurrency
    headers?: NameValuePair[]
    queryStringParams?: NameValuePair[]
    redirect?: RequestRedirect
    referrer?: string
    referrerPolicy?: ReferrerPolicy
    duplex?: RequestDuplex
    test?: string,
    selectedScenario?: Selection,
    selectedAuthorization?: Selection,
    selectedCertificate?: Selection,
    selectedProxy?: Selection,
    selectedData?: Selection,
}

export type EditableBody = BodyNone | BodyJSON | BodyXML | BodyText | EditableBodyForm | BodyRaw

export interface EditableBodyForm {
    type: BodyType.Form
    data: EditableNameValuePair[]
}
