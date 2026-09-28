// @ts-nocheck

/**
 * Describes something under test (code, entity, etc.)
 * @param name Name of what is being tested
 * @param fn Function that includes child "describe" and "it" functions
 */
declare function describe(name: string, fn: () => void): void

/**
 * Tests an expected behavior
 * @param name Name of the behavior being tested
 * @param fn Function that throws an Error (or fails assertion) upon failure
 */
declare function it(name: string, fn: () => void): void

/**
 * Define an associative tag that can be used to link to test cases, documentation, etc.
 * @param name Name of the tag - use handlebars to include active ($) data/scenario/output values
 */
declare function tag(name: string): void

/**
 * Type of body data (request or response)
 */
declare enum BodyType {
    Text = 'Text',
    JSON = 'JSON',
    XML = 'XML',
    GraphQL = 'GraphQL',
    Form = 'Form',
    Binary = 'Binary'
}

/**
 * Binary data
 */
declare interface BodyBinary {
    type: BodyType.Binary
    /**
     * Base64 encoded binary data
     */
    data: string
}

/**
 * Text body data
 */
declare interface BodyText {
    type: BodyType.Text
    /**
     * Submitted text
     */
    text: string
}

/**
 * JSON body data
 */
declare interface BodyJSON {
    type: BodyType.JSON
    /**
     * Submitted serialized JSON
     */
    text: string
    /**
     * Deserialized data
     */
    data: any
}

/**
 * XML body data
 */
declare interface BodyXML {
    type: BodyType.XML
    /**
     * Submitted serialized XML
     */
    text: string
    /**
     * Deserialized data
     */
    data: any
}

/**
 * GraphQL body data
 */
declare interface BodyGraphQL {
    type: BodyType.GraphQL
    data: {
        /**
         * GraqhQL query
         */
        query: String,
        /**
         * GraphQL operaton name
         */
        operationName?: string,
        /**
         * GraphQL request extensions
         */
        extensions?: string
    }
}

/**
 * Form body data
 */
declare interface BodyForm {
    type: BodyType.Form
    /**
     * Submitted form values
     */
    data: NameStringPairs
}

/**
 * Body submitted with request or received in response
 */
declare type Body = BodyBinary | BodyText | BodyJSON | BodyXML | BodyForm

/**
 * Apicize request information
 */
declare interface ApicizeRequest {
    /**
     * URL of the request
     */
    url: string
    /**
     * HTTP method of the request
     */
    method: string
    /**
     * Headers submitted with the request
     */
    headers?: NameStringPairs
    /**
     * Body submitted with the request
     */
    body?: Body
}

/**
 * OAuth token generated during Apicize request
 */
declare interface OAuth2Token {
    /**
     * Token (usually JWT)
     */
    token: string
    /**
     * Set to true if the cached copy of token was sent, false if it was retrieved during request
     */
    cached: boolean
    /**
     * Token URL
     */
    url: string
}

/**
 * Apicize response information
 */

declare interface ApicizeResponse {
    /**
     * Duration of HTTP execution (milliseconds)
     */
    duration: number
    /**
     * HTTP status code
     */
    status: number
    /**
     * HTTP status text
     */
    statusText?: string
    /**
     * Headers received in reponse
     */
    headers?: Headers
    /**
     * body received in response
     */
    body?: Body
    /**
     * Set to OAuth2 token sent with request if authorization is OAuth2 client or PKCE
     */
    oauth2Token?: OAuth2Token
}

/**
 * HTTP Request
 */
declare const request: ApicizeRequest

/**
 * HTTP Response
 */
declare const response: ApicizeResponse
