import { Identifiable } from "./identifiable"
import { Named } from "./named"
import { Selection } from "./selection"
import { ValidationErrors } from "./validation"

/**
 * Specifies the type of authorization used for a request
 */
export enum AuthorizationType {
    Basic = 'Basic',
    OAuth2Client = 'OAuth2Client',
    OAuth2Pkce = 'OAuth2Pkce',
    ApiKey = 'ApiKey'
};

/**
 * Specifies how to persist sensitive information
 */

export type Authorization = BasicAuthorization | OAuth2ClientAuthorization
    | OAuth2PkceAuthorization | ApiKeyAuthorization

/**
 * Information required for basic authentication
 */
export interface BasicAuthorization extends Identifiable, Named, ValidationErrors {
    type: AuthorizationType.Basic
    username: string
    password: string
}

/**
 * Information required for OAuth2 client flow authentication
 */
export interface OAuth2ClientAuthorization extends Identifiable, Named, ValidationErrors {
    type: AuthorizationType.OAuth2Client
    accessTokenUrl: string
    clientId: string
    clientSecret: string
    audience: string
    scope: string
    selectedCertificate?: Selection
    selectedProxy?: Selection
    sendCredentialsInBody?: boolean
}

/**
 * Information required for OAuth2 PKCE flow authentication
 */
export interface OAuth2PkceAuthorization extends Identifiable, Named, ValidationErrors {
    type: AuthorizationType.OAuth2Pkce
    authorizeUrl: string
    accessTokenUrl: string
    refreshTokenUrl?: string
    clientId: string
    scope: string
    audience: string
    sendCredentialsInBody?: boolean
}

/**
 * Information required for API key authentication (passed in via header)
 */
export interface ApiKeyAuthorization extends Identifiable, Named, ValidationErrors {
    type: AuthorizationType.ApiKey
    header: string
    value: string
}