// @ts-nocheck

/******************************************************************************
 * Setup script definitions (shared definitions are in script-common.d.ts)
 ******************************************************************************/

/** @deprecated describe() is not available in Setup scripts */
declare function describe(...args: never[]): never

/** @deprecated it() is not available in Setup scripts */
declare function it(...args: never[]): never

/** @deprecated tag() is not available in Setup scripts */
declare function tag(...args: never[]): never

/**
 * Type of request body data
 */
declare enum BodyType {
    Text = 'Text',
    JSON = 'JSON',
    XML = 'XML',
    GraphQL = 'GraphQL',
    Form = 'Form',
    Raw = 'Raw'
}

/**
 * Name/value pair (header, query string parameter or form value)
 */
declare interface NameValuePair {
    name: string
    value: string
    disabled?: boolean
}

/**
 * List of name/value pairs that can also be read, set or deleted by name
 * (ex. `request.headers['Accept'] = 'text/plain'`, `delete request.headers['Accept']`).
 * Names that match array members (ex. `length`, `map`) retain their array meaning
 */
declare type NamedValuePairs = NameValuePair[] & { [name: string]: any }

/**
 * Text body data
 */
declare interface SetupBodyText {
    type: BodyType.Text
    data: string
}

/**
 * JSON body data
 */
declare interface SetupBodyJSON {
    type: BodyType.JSON
    /**
     * Serialized JSON (objects assigned here will be serialized)
     */
    data: string | any
}

/**
 * XML body data
 */
declare interface SetupBodyXML {
    type: BodyType.XML
    data: string
}

/**
 * GraphQL body data
 */
declare interface SetupBodyGraphQL {
    type: BodyType.GraphQL
    data: {
        /**
         * GraphQL query
         */
        query: string
        /**
         * GraphQL request extensions (objects assigned here will be serialized)
         */
        extensions?: string | any | null
    }
}

/**
 * Form body data
 */
declare interface SetupBodyForm {
    type: BodyType.Form
    data: NameValuePair[]
}

/**
 * Raw body data
 */
declare interface SetupBodyRaw {
    type: BodyType.Raw
    /**
     * Base64 encoded binary data
     */
    data: string
}

/**
 * Body to submit with request
 */
declare type SetupBody = SetupBodyText | SetupBodyJSON | SetupBodyXML | SetupBodyGraphQL | SetupBodyForm | SetupBodyRaw

/**
 * Apicize request information, updates are applied before the request is dispatched
 */
declare interface ApicizeSetupRequest {
    /**
     * URL of the request
     */
    url: string
    /**
     * HTTP method of the request
     */
    method?: string
    /**
     * Headers to submit with the request (names are case-insensitive)
     */
    headers: NamedValuePairs
    /**
     * Query string parameters to submit with the request (names are case-sensitive)
     */
    queryStringParams: NamedValuePairs
    /**
     * Body to submit with the request
     */
    body?: SetupBody
    /**
     * Set the specified header, replacing any existing header with the same name (case-insensitive)
     * @param name Header name
     * @param value Header value
     */
    setHeader(name: string, value: any): void
    /**
     * Remove the specified header (case-insensitive)
     * @param name Header name
     */
    removeHeader(name: string): void
    /**
     * Set the specified query string parameter, replacing any existing parameter with the same name
     * @param name Parameter name
     * @param value Parameter value
     */
    setQueryParam(name: string, value: any): void
    /**
     * Remove the specified query string parameter
     * @param name Parameter name
     */
    removeQueryParam(name: string): void
}

/**
 * HTTP Request to be dispatched (not available in Group Setup scripts)
 */
declare const request: ApicizeSetupRequest

/**
 * @deprecated response is not available in Setup scripts
 */
declare const response: never
