import {
    Authorization, AuthorizationType,
    Selection
} from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable } from "mobx"
import { NO_SELECTION, NO_SELECTION_ID } from "../store"
import { EntityType } from "./entity-type"
import { EntityAuthorization, EntityTypeName, WorkspaceStore } from "../../contexts/workspace.context"

export class EditableAuthorization extends Editable<Authorization> {
    public readonly entityType = EntityType.Authorization

    @observable accessor type: AuthorizationType = AuthorizationType.Basic
    // API Key
    @observable accessor header: string = ''
    @observable accessor value: string = ''
    // Basic
    @observable accessor username: string = ''
    @observable accessor password: string = ''
    // OAuth2 Client
    @observable accessor accessTokenUrl = ''
    @observable accessor authorizeUrl = ''
    @observable accessor clientId = ''
    @observable accessor clientSecret = ''
    @observable accessor scope = ''
    @observable accessor audience = ''
    @observable accessor selectedCertificate: Selection | undefined = undefined
    @observable accessor selectedProxy: Selection | undefined = undefined
    // PKCE values (must be set in the client)
    @observable accessor accessToken: string | undefined = undefined
    @observable accessor refreshToken: string | undefined = undefined
    @observable accessor expiration: number | undefined = undefined
    @observable accessor sendCredentialsInBody: boolean = false

    public constructor(authorization: Authorization, workspace: WorkspaceStore) {
        super(workspace)
        this.id = authorization.id
        this.name = authorization.name ?? ''
        this.type = authorization.type

        switch (authorization.type) {
            case AuthorizationType.ApiKey:
                this.header = authorization.header
                this.value = authorization.value
                break
            case AuthorizationType.Basic:
                this.username = authorization.username
                this.password = authorization.password
                break
            case AuthorizationType.OAuth2Client:
                this.accessTokenUrl = authorization.accessTokenUrl
                this.clientId = authorization.clientId
                this.clientSecret = authorization.clientSecret
                this.sendCredentialsInBody = authorization.sendCredentialsInBody === true
                this.scope = authorization.scope
                this.audience = authorization.audience
                this.selectedCertificate = authorization.selectedCertificate ?? NO_SELECTION
                this.selectedProxy = authorization.selectedProxy ?? NO_SELECTION
                break
            case AuthorizationType.OAuth2Pkce:
                this.authorizeUrl = authorization.authorizeUrl
                this.accessTokenUrl = authorization.accessTokenUrl
                this.clientId = authorization.clientId
                this.sendCredentialsInBody = authorization.sendCredentialsInBody === false
                this.scope = authorization.scope
                this.audience = authorization.audience
                break
            default:
                throw new Error('Invalid authorization type')
        }

        return this
    }

    protected onUpdate() {
        this.markAsDirty()

        let result: EntityAuthorization
        switch (this.type) {
            case AuthorizationType.ApiKey:
                result = {
                    entityTypeName: EntityTypeName.Authorization,
                    type: AuthorizationType.ApiKey,
                    id: this.id,
                    name: this.name ?? '',
                    header: this.header,
                    value: this.value,
                }
                break
            case AuthorizationType.Basic:
                result = {
                    entityTypeName: EntityTypeName.Authorization,
                    type: AuthorizationType.Basic,
                    id: this.id,
                    name: this.name ?? '',
                    username: this.username,
                    password: this.password,
                }
                break
            case AuthorizationType.OAuth2Client:
                result = {
                    entityTypeName: EntityTypeName.Authorization,
                    type: AuthorizationType.OAuth2Client,
                    id: this.id,
                    name: this.name ?? '',
                    accessTokenUrl: this.accessTokenUrl,
                    clientId: this.clientId,
                    clientSecret: this.clientSecret,
                    sendCredentialsInBody: this.sendCredentialsInBody,
                    scope: this.scope,
                    audience: this.audience,
                    selectedCertificate: this.selectedCertificate && this.selectedCertificate.id !== NO_SELECTION_ID ? this.selectedCertificate : undefined,
                    selectedProxy: this.selectedProxy && this.selectedProxy.id !== NO_SELECTION_ID ? this.selectedProxy : undefined,
                }
                break
            case AuthorizationType.OAuth2Pkce:
                result = {
                    entityTypeName: EntityTypeName.Authorization,
                    type: AuthorizationType.OAuth2Pkce,
                    id: this.id,
                    name: this.name ?? '',
                    authorizeUrl: this.authorizeUrl,
                    accessTokenUrl: this.accessTokenUrl,
                    clientId: this.clientId,
                    sendCredentialsInBody: this.sendCredentialsInBody,
                    scope: this.scope,
                    audience: this.audience,
                }
                break
            default:
                throw new Error('Invalid authorization type')
        }
        this.workspace.updateAuthorization(result)
    }

    @action
    setType(value: AuthorizationType) {
        this.type = value
        this.onUpdate()
    }

    @action
    setUsername(value: string) {
        this.username = value
        this.onUpdate()
    }

    @action
    setPassword(value: string) {
        this.password = value
        this.onUpdate()
    }

    @action
    setAccessTokenUrl(value: string) {
        this.accessTokenUrl = value
        this.onUpdate()
    }

    @action
    setUrl(value: string) {
        this.authorizeUrl = value
        this.onUpdate()
    }

    @action
    setClientId(value: string) {
        this.clientId = value
        this.onUpdate()
    }

    @action
    setClientSecret(value: string) {
        this.clientSecret = value
        this.onUpdate()
    }

    @action
    setCredentialsInBody(value: boolean) {
        this.sendCredentialsInBody = value
        this.onUpdate()
    }

    @action
    setScope(value: string) {
        this.scope = value
        this.onUpdate()
    }

    @action
    setAudience(value: string) {
        this.audience = value
        this.onUpdate()
    }

    @action
    setSelectedCertificate(selection: Selection | undefined) {
        this.selectedCertificate = selection && selection.id != NO_SELECTION_ID ? selection : undefined
        this.onUpdate()
    }

    @action
    setSelectedProxy(selection: Selection | undefined) {
        this.selectedProxy = selection && selection.id != NO_SELECTION_ID ? selection : undefined
        this.onUpdate()
    }

    @action
    setHeader(value: string) {
        this.header = value
        this.onUpdate()
    }

    @action
    setValue(value: string) {
        this.value = value
        this.onUpdate()
    }

    @action
    refreshFromExternalUpdate(updatedItem: EntityAuthorization) {
        this.name = updatedItem.name ?? ''
        switch (updatedItem.type) {
            case AuthorizationType.ApiKey:
                this.header = updatedItem.header
                this.value = updatedItem.value
                break
            case AuthorizationType.Basic:
                this.username = updatedItem.username
                this.password = updatedItem.password
                break
            case AuthorizationType.OAuth2Client:
                this.accessTokenUrl = updatedItem.accessTokenUrl
                this.clientId = updatedItem.clientId
                this.clientSecret = updatedItem.clientSecret
                this.audience = updatedItem.audience
                this.scope = updatedItem.scope
                this.sendCredentialsInBody = updatedItem.sendCredentialsInBody ?? true
                this.selectedCertificate = updatedItem.selectedCertificate ?? NO_SELECTION
                this.selectedProxy = updatedItem.selectedProxy ?? NO_SELECTION
                break
            case AuthorizationType.OAuth2Pkce:
                this.authorizeUrl = updatedItem.authorizeUrl
                this.accessTokenUrl = updatedItem.accessTokenUrl
                this.clientId = updatedItem.clientId
                this.scope = updatedItem.scope
                this.audience = updatedItem.audience
                this.sendCredentialsInBody = updatedItem.sendCredentialsInBody ?? true
                break
        }
    }

    @computed get headerInvalid() {
        return this.type === AuthorizationType.ApiKey && ((this.header?.length ?? 0) === 0)
    }

    // @computed get valueInvalid() {
    //     return this.type === AuthorizationType.ApiKey && ((this.value?.length ?? 0) === 0)
    // }

    @computed get usernameInvalid() {
        return this.type === AuthorizationType.Basic && ((this.username?.length ?? 0) === 0)
    }

    @computed get accessTokenUrlInvalid() {
        return (this.type === AuthorizationType.OAuth2Client || this.type === AuthorizationType.OAuth2Pkce) &&
            ! /^(\{\{.+\}\}|https?:\/\/)(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?$/.test(this.accessTokenUrl)
    }

    @computed get authorizationUrlInvalid() {
        return (this.type === AuthorizationType.OAuth2Pkce) &&
            ! /^(\{\{.+\}\}|https?:\/\/)(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?$/.test(this.authorizeUrl)
    }

    @computed get clientIdInvalid() {
        return (this.type === AuthorizationType.OAuth2Client || this.type === AuthorizationType.OAuth2Pkce) &&
            ((this.clientId?.length ?? 0) === 0)
    }

    @computed get validationErrors(): { [property: string]: string } | undefined {
        const results: { [property: string]: string } = {}
        if (this.nameInvalid) {
            results.name = 'Name is required'
        }
        if (this.headerInvalid) {
            results.header = 'Header is invalid'
        }
        if (this.usernameInvalid) {
            results.usernanme = 'User name is invalid'
        }
        if (this.accessTokenUrlInvalid) {
            results.accessTokenUrl = 'Access token URL is invalid'
        }
        if (this.authorizationUrlInvalid) {
            results.authorizationUrl = 'Authorization URL is invalid'
        }
        return Object.keys(results).length > 0 ? results : undefined
    }
}
