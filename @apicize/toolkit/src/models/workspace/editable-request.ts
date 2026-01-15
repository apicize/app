import { Selection, Body, BodyType, MultiRunExecution, Method, NameValuePair, Request, ValidationWarnings, ValidationErrors, BodyJSON, BodyNone, BodyRaw, BodyText, BodyXML, ValidationErrorList } from "@apicize/lib-typescript"
import { action, computed, observable, runInAction, toJS } from "mobx"
import { EditableNameValuePair } from "./editable-name-value-pair"
import { GenerateIdentifier } from "../../services/random-identifier-generator"
import { EntityType } from "./entity-type"
import { EntityRequest, EntityTypeName, RequestBodyInfo, RequestBodyInfoWithBody, WorkspaceStore } from "../../contexts/workspace.context"
import { EditableRequestEntry } from "./editable-request-entry"
import { RequestDuplex } from "undici-types"
import { EditableWarnings } from "./editable-warnings"
import { RequestExecution } from "../request-execution"
import { EditorMode } from "../editor-mode"
import { IRequestEditorTextModel } from "../editor-text-model"
import { ExecutionResultViewState } from "./execution"
import { base64Encode } from "../../services/base64"
import { BodyConversion } from "../../services/body-conversion"

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
    @observable public accessor headers: EditableNameValuePair[] | undefined = undefined
    @observable public accessor redirect: RequestRedirect | undefined = undefined
    @observable public accessor mode: RequestMode | undefined = undefined
    @observable public accessor referrer: string | undefined = undefined
    @observable public accessor referrerPolicy: ReferrerPolicy | undefined = undefined
    @observable public accessor duplex: RequestDuplex | undefined = undefined

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
        this.selectedData = entry.selectedData ?? undefined

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

        this.mode = entry.mode
        this.referrer = entry.referrer
        this.referrerPolicy = entry.referrerPolicy
        this.duplex = entry.duplex
    }

    public initializeBody(bodyInfo: RequestBodyInfoWithBody) {
        this.body = EditableRequest.createEditableBody(bodyInfo.body)
        this.bodyMimeType = bodyInfo.bodyMimeType ?? null
        this.bodyLength = bodyInfo.bodyLength ?? null
        this.isBodyInitialized = true
        this.checkEditModel()
    }

    public onUpdate() {
        this.markAsDirty()

        const validationWarnings = this.validationWarnings.hasEntries ? [...this.validationWarnings.entries.values()] : undefined
        if (this.name.trim().length > 0) {
            delete this.validationErrors['name']
        } else {
            this.validationErrors['name'] = 'Name is required'
        }
        if (this.url.trim().length > 0) {
            delete this.validationErrors['url']
        } else {
            this.validationErrors['url'] = 'URL is required'
        }

        const request: EntityRequest = {
            entityTypeName: EntityTypeName.Request,
            id: this.id,
            name: this.name,
            key: this.key.length > 0 ? this.key : undefined,
            url: this.url,
            method: this.method,
            queryStringParams: toJS(this.queryStringParams),
            headers: toJS(this.headers),
            // body: (this.body && this.body.type !== BodyType.None)
            //     ? toJS(this.body)
            //     : undefined,
            test: this.test,
            duplex: this.duplex,
            // integrity: this.integrity,
            keepAlive: this.keepAlive,
            acceptInvalidCerts: this.acceptInvalidCerts,
            numberOfRedirects: this.numberOfRedirects,
            mode: this.mode,
            runs: this.runs,
            timeout: this.timeout,
            multiRunExecution: this.multiRunExecution,
            selectedScenario: this.selectedScenario,
            selectedAuthorization: this.selectedAuthorization,
            selectedCertificate: this.selectedCertificate,
            selectedProxy: this.selectedProxy,
            selectedData: this.selectedData,
            validationWarnings: this.validationWarnings.entries.size > 0
                ? undefined
                : [...this.validationWarnings.entries.values()],
            validationErrors: Object.keys(this.validationErrors).length > 0 ? this.validationErrors : undefined,
        }

        if ((request.queryStringParams?.length ?? 0) === 0) {
            delete request.queryStringParams
        } else {
            request.queryStringParams?.forEach(p => delete (p as unknown as any).id)
        }

        this.workspace.updateRequest(request)
    }

    @action
    public onUpdateBody(body: Body) {
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
    refreshBodyFromExternalUpdate(bodyInfo: RequestBodyInfoWithBody | null) {
        this.markAsDirty()
        if (bodyInfo?.body) {
            const editable = EditableRequest.createEditableBody(bodyInfo.body)
            this.body.type = editable.type
            this.body.data = editable.data
            this.bodyMimeType = bodyInfo.bodyMimeType ?? null
            this.bodyLength = bodyInfo.bodyLength ?? null
        } else {
            this.body.type = BodyType.None
            this.bodyMimeType = null
            this.bodyLength = null
        }
        this.checkEditModel()
    }

    @action
    setKey(value: string) {
        this.key = value
        this.onUpdate()
    }


    @action
    setUrl(value: string) {
        this.url = value
        this.onUpdate()
    }

    @action
    setMethod(value: Method) {
        this.method = value
        this.onUpdate()
    }

    @action
    setTimeout(value: number) {
        this.timeout = value
        this.onUpdate()
    }

    @action
    setKeepAlive(value: boolean) {
        this.keepAlive = value
        this.onUpdate()
    }

    @action
    setAcceptInvalidCerts(value: boolean) {
        this.acceptInvalidCerts = value
        this.onUpdate()
    }

    @action
    setNumberOfRedirects(value: number) {
        if (value < 0) {
            throw new Error('Number of redirects must be zero (disabled) or greater')
        }
        this.numberOfRedirects = value
        this.onUpdate()
    }

    @action
    setQueryStringParams(value: EditableNameValuePair[] | undefined) {
        this.queryStringParams = value ?? []
        this.onUpdate()
    }

    @action
    setHeaders(value: EditableNameValuePair[] | undefined) {
        this.headers = value ?? []
        this.onUpdate()
    }

    @action
    setBodyFromRawData(data: Uint8Array) {
        this.markAsDirty()
        this.bodyLength = data.length
        return this.setBody({ type: BodyType.Raw, data: base64Encode(data) })
    }

    @action
    setBody(body: Body) {
        this.markAsDirty()
        return this.onUpdateBody(EditableRequest.createEditableBody(body))
    }

    @action
    async setBodyType(newBodyType: BodyType) {
        this.markAsDirty()
        return this.onUpdateBody(
            EditableRequest.createEditableBody(await (new BodyConversion(this.body)).convert(newBodyType))
        )
    }

    @action
    setBodyData(value: string | EditableNameValuePair[]) {
        if (this.isBodyInitialized) {
            this.body.data = value
            return this.onUpdateBody(this.body)
        } else {
            return Promise.resolve()
        }
    }

    @action
    setTest(value: string | undefined) {
        this.test = value ?? ''
        this.onUpdate()
    }

    @action
    deleteWarning(id: string) {
        this.validationWarnings.delete(id)
        this.onUpdate()
    }

    @action
    refreshFromExternalUpdate(entity: EntityRequest) {
        this.name = entity.name ?? ''
        this.key = entity.key ?? ''
        this.url = entity.url
        this.method = entity.method
        this.timeout = entity.timeout
        this.keepAlive = entity.keepAlive
        this.acceptInvalidCerts = entity.acceptInvalidCerts
        this.mode = entity.mode
        this.runs = entity.runs
        this.multiRunExecution = entity.multiRunExecution
        this.queryStringParams = entity.queryStringParams?.map((q) => ({ id: GenerateIdentifier(), ...q })) ?? []
        this.headers = entity.headers?.map((h) => ({ id: GenerateIdentifier(), ...h })) ?? []
        this.redirect = entity.redirect
        this.referrer = entity.referrer
        this.referrerPolicy = entity.referrerPolicy
        this.duplex = entity.duplex
        // this.isBodyInitialized = false
        // this.body = EditableRequest.createEditableBody(entity.body)
        this.test = entity.test ?? ''
        this.selectedScenario = entity.selectedScenario
        this.selectedAuthorization = entity.selectedAuthorization
        this.selectedCertificate = entity.selectedCertificate
        this.selectedProxy = entity.selectedProxy
        this.selectedData = entity.selectedData
        this.validationWarnings.set(entity.validationWarnings)
    }

    @computed get nameError() {
        return ((this.name?.length ?? 0) === 0)
    }

    @computed get urlError() {
        return this.url.length == 0
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
    multiRunExecution: MultiRunExecution
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
