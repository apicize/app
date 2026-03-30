import {
    Selection, Body, BodyType, ExecutionConcurrency, Method, NameValuePair, Request, ValidationWarnings, ValidationErrors,
    BodyJSON, BodyNone, BodyRaw, BodyText, BodyXML, ValidationErrorList, DEFAULT_SELECTION_ID, NO_SELECTION_ID, NO_SELECTION,
    DEFAULT_SELECTION
} from "@apicize/lib-typescript"
import { action, computed, observable, runInAction } from "mobx"
import { EditableNameValuePair } from "./editable-name-value-pair"
import { GenerateIdentifier } from "../../services/random-identifier-generator"
import { EntityType } from "./entity-type"
import { EditableEntityContext } from "../editable"
import { EntityTypeName } from "../../contexts/workspace.context"
import { EditableRequestEntry } from "./editable-request-entry"
import { RequestDuplex } from "undici-types"
import { EditableWarnings } from "./editable-warnings"
import { RequestExecution } from "../request-execution"
import { EditorMode } from "../editor-mode"
import { ExecutionResultViewState } from "./execution"
import { base64Encode } from "../../services/base64"
import { BodyConversion } from "../../services/body-conversion"
import { RequestUpdate } from "../updates/request-update"
import { RequestBodyInfo } from "./request-body-info"
import { EntityUpdate } from "../updates/entity-update"

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

    @observable accessor validationErrors: ValidationErrorList = {}
    @observable accessor validationWarnings = new EditableWarnings()

    public constructor(entry: Request, workspace: EditableEntityContext, executionResultViewState: ExecutionResultViewState, requestExecution: RequestExecution) {
        super(
            entry.id,
            entry.name ?? '',
            workspace,
            executionResultViewState,
            requestExecution
        )

        this.disabled = entry.disabled ?? false

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

        const idxQuery = this.url.indexOf('?')
        if (idxQuery !== -1) {
            const params = new URLSearchParams(this.url.substring(idxQuery + 1))
            for (const [name, value] of params) {
                if (!this.queryStringParams.find(p => p.name === name)) {
                    this.queryStringParams.push({
                        id: GenerateIdentifier(),
                        name,
                        value
                    })
                }
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

    protected async performUpdate(update: RequestUpdate) {
        this.markAsDirty()
        const updates = await this.workspace.update(update)
        runInAction(() => {
            if (updates) {
                this.validationErrors = updates.validationErrors || {}
            }
        })
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
                .catch(e => reject(e instanceof Error ? e : new Error(e)))
        })
    }
    @action
    setName(value: string) {
        this.name = value
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, name: value })
    }

    @action
    setDisabled(value: boolean) {
        this.disabled = value
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, disabled: value })
    }


    @action
    setKey(value: string) {
        this.key = value
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, key: value })
    }

    @action
    setRuns(value: number) {
        this.runs = value
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, runs: value })
    }

    @action
    setMultiRunExecution(value: ExecutionConcurrency) {
        this.multiRunExecution = value
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, multiRunExecution: value })
    }

    @action
    setUrl(value: string) {
        this.url = value
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, url: value })
    }

    @action
    setMethod(value: Method) {
        this.method = value
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, method: value })
    }

    @action
    setTimeout(value: number) {
        this.timeout = value
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, timeout: value })
    }

    @action
    setKeepAlive(value: boolean) {
        this.keepAlive = value
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, keepAlive: value })
    }

    @action
    setAcceptInvalidCerts(value: boolean) {
        this.acceptInvalidCerts = value
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, acceptInvalidCerts: value })
    }

    @action
    setNumberOfRedirects(value: number) {
        if (value < 0) {
            throw new Error('Number of redirects must be zero (disabled) or greater')
        }
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, numberOfRedirects: value })
    }

    @action
    setQueryStringParams(value: EditableNameValuePair[]) {
        this.queryStringParams = value
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, queryStringParams: value })
    }

    @action
    setHeaders(value: EditableNameValuePair[]) {
        this.headers = value
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, headers: value })
    }

    @action
    setTest(value: string | undefined) {
        this.test = value ?? ''
        return this.performUpdate({ type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id, test: value })
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
            ? DEFAULT_SELECTION
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({
            type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id,
            selectedScenario: this.selectedScenario ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedAuthorizationId(entityId: string) {
        this.selectedAuthorization = entityId === DEFAULT_SELECTION_ID
            ? DEFAULT_SELECTION
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({
            type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id,
            selectedAuthorization: this.selectedAuthorization ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedCertificateId(entityId: string) {
        this.selectedCertificate = entityId === DEFAULT_SELECTION_ID
            ? DEFAULT_SELECTION
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({
            type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id,
            selectedCertificate: this.selectedCertificate ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedProxyId(entityId: string) {
        this.selectedProxy = entityId === DEFAULT_SELECTION_ID
            ? DEFAULT_SELECTION
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({
            type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id,
            selectedProxy: this.selectedProxy ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedDataId(entityId: string) {
        this.selectedDataSet = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({
            type: EntityTypeName.Request, entityType: EntityType.Request, id: this.id,
            selecteData: this.selectedDataSet ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    refreshFromExternalSpecificUpdate(update: EntityUpdate) {
        if (update.entityType !== EntityType.Request) {
            return
        }
        if (update.name !== undefined) {
            this.name = update.name
        }
        if (update.disabled !== undefined) {
            this.disabled = update.disabled
        }
        if (update.key !== undefined) {
            this.key = update.key
        }
        if (update.url !== undefined) {
            this.url = update.url
        }
        if (update.method !== undefined) {
            this.method = update.method
        }
        if (update.runs !== undefined) {
            this.runs = update.runs
        }
        if (update.multiRunExecution !== undefined) {
            this.multiRunExecution = update.multiRunExecution
        }
        if (update.timeout !== undefined) {
            this.timeout = update.timeout
        }
        if (update.keepAlive !== undefined) {
            this.keepAlive = update.keepAlive
        }
        if (update.acceptInvalidCerts !== undefined) {
            this.acceptInvalidCerts = update.acceptInvalidCerts
        }
        if (update.numberOfRedirects !== undefined) {
            this.numberOfRedirects = update.numberOfRedirects
        }
        if (update.queryStringParams !== undefined) {
            this.queryStringParams = update.queryStringParams.map(nv => ({
                id: GenerateIdentifier(),
                name: nv.name,
                value: nv.value,
            }))
        }
        if (update.headers !== undefined) {
            this.headers = update.headers.map(nv => ({
                id: GenerateIdentifier(),
                name: nv.name,
                value: nv.value,
            }))
        }

        // if (update.redirect !== undefined) {
        //     this.redirect = update.redirect
        // }
        // if (update.mode !== undefined) {
        //     this.mode = update.mode
        // }
        // if (update.referrer !== undefined) {
        //     this.referrer = update.referrer
        // }
        // if (update.referrerPolicy !== undefined) {
        //     this.referrerPolicy = update.referrerPolicy
        // }
        // if (update.duplex !== undefined) {
        //     this.duplex = update.duplex
        // }


        if (update.test !== undefined) {
            this.test = update.test
        }

        if (update.body !== undefined) {
            if (update.body.type === BodyType.None) {
                this.body.type = BodyType.None
                this.bodyMimeType = null
                this.bodyLength = null
            } else {
                const editable = EditableRequest.createEditableBody(update.body)
                this.body.type = editable.type
                this.body.data = editable.data
                this.bodyMimeType = update.bodyMimeType ?? null
                this.bodyLength = update.bodyLength ?? null
            }
        }

        if (update.selectedScenario !== undefined) {
            this.selectedScenario = update.selectedScenario
        }
        if (update.selectedAuthorization !== undefined) {
            this.selectedAuthorization = update.selectedAuthorization
        }
        if (update.selectedCertificate !== undefined) {
            this.selectedCertificate = update.selectedCertificate
        }
        if (update.selectedProxy !== undefined) {
            this.selectedProxy = update.selectedProxy
        }
        if (update.selecteData !== undefined) {
            this.selectedDataSet = update.selecteData
        }
    }

    @action
    deleteWarning(id: string) {
        this.validationWarnings.delete(id)
        return this.performUpdate({
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
