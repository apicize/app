import { Identifiable } from './identifiable';
import { Named } from './named';
import {
    ReferrerPolicy,
    RequestDuplex,
    RequestMode,
    RequestRedirect
} from 'undici-types'
import { Executable, ExecutionConcurrency } from './executable';
import { NameValuePair } from './name-value-pair';
import { SelectedParameters } from './selected-parameters';
import { ValidationWarnings, ValidationErrors, ValidationState } from './validation';

export enum BodyType {
    None = 'None',
    Text = 'Text',
    JSON = 'JSON',
    GraphQL = 'GraphQL',
    XML = 'XML',
    Form = 'Form',
    MultipartForm = 'MultipartForm',
    Raw = 'Raw',
}

export const BodyTypes = [BodyType.None, BodyType.Text, BodyType.JSON,
BodyType.XML, BodyType.GraphQL, BodyType.Form, BodyType.MultipartForm, BodyType.Raw]

export type Body = BodyNone | BodyJSON | BodyXML | BodyGraphQL | BodyText | BodyForm | BodyMultipartForm | BodyRaw

export interface BodyNone {
    type: BodyType.None
    data: undefined
}

export interface BodyJSON {
    type: BodyType.JSON
    data: string
}

export interface BodyXML {
    type: BodyType.XML
    data: string
}

export interface BodyText {
    type: BodyType.Text
    data: string
}

export interface BodyGraphQLData {
    query: string
    extensions?: string
}
export interface BodyGraphQL {
    type: BodyType.GraphQL
    data: BodyGraphQLData
}

export interface BodyForm {
    type: BodyType.Form
    data: NameValuePair[]
}

export enum MultipartFormItemType {
    Text = 'Text',
    File = 'File',
}

/**
 * Item in a multipart form body, either a text value or file contents
 */
export interface MultipartFormItem {
    name: string
    /**
     * Item type (defaults to Text if not specified)
     */
    type?: MultipartFormItemType
    /**
     * Value (Text items only)
     */
    value?: string
    /**
     * File name (File items only)
     */
    fileName?: string
    /**
     * Base64 encoded file contents (File items only)
     */
    data?: string
    disabled?: boolean
}

export interface BodyMultipartForm {
    type: BodyType.MultipartForm
    data: MultipartFormItem[]
}

export interface BodyRaw {
    type: BodyType.Raw
    data: string
}

export interface RequestEntry extends Identifiable, Named, SelectedParameters, Executable, ValidationErrors, ValidationWarnings {
    disabled?: boolean
    key?: string
    validationState?: ValidationState
}

export interface Request extends RequestEntry {
    url: string
    method: string
    timeout: number
    keepAlive: boolean
    acceptInvalidCerts: boolean
    numberOfRedirects?: number
    headers?: NameValuePair[]
    queryStringParams?: NameValuePair[]
    redirect?: RequestRedirect
    // integrity?: string
    mode?: RequestMode
    referrer?: string
    referrerPolicy?: ReferrerPolicy
    duplex?: RequestDuplex
    setup?: string,
    test?: string,
    body?: Body
}

export interface RequestGroup extends RequestEntry {
    /**
     * Group-level concurrency
     */
    execution: ExecutionConcurrency
    setup?: string,
}
