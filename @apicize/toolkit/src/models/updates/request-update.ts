import { ExecutionConcurrency, Method, NameValuePair, Body, Selection } from "@apicize/lib-typescript"
import { EntityType } from "../workspace/entity-type"
import { EntityTypeName } from "../../contexts/workspace.context"

export interface RequestUpdate {
    type: EntityTypeName.Request
    entityType: EntityType.Request
    id: string
    name?: string
    key?: string
    url?: string
    method?: Method
    runs?: number
    multiRunExecution?: ExecutionConcurrency
    timeout?: number
    keepAlive?: boolean
    acceptInvalidCerts?: boolean
    numberOfRedirects?: number
    queryStringParams?: NameValuePair[]
    headers?: NameValuePair[]
    // redirect?: RequestRedirect | null
    // mode?: RequestMode | null
    // referrer?: string | null
    // referrerPolicy?: ReferrerPolicy | null
    // duplex?: RequestDuplex | null
    test?: string
    body?: Body
    bodyMimeType?: string | null
    bodyLength?: number | null
    selectedScenario?: Selection
    selectedAuthorization?: Selection
    selectedCertificate?: Selection
    selectedProxy?: Selection
    selecteData?: Selection
    validationWarnings?: string[]
}