import {
    Authorization, AuthorizationType,
    Selection,
    ValidationErrorList
} from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable, runInAction } from "mobx"
import { NO_SELECTION, NO_SELECTION_ID } from "../store"
import { EntityType } from "./entity-type"
import { EntityTypeName, EntityUpdateNotification, WorkspaceStore } from "../../contexts/workspace.context"
import { AuthorizationUpdate } from "../updates/authorization-update"

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

    @observable accessor validationErrors: ValidationErrorList

    public constructor(authorization: Authorization, workspace: WorkspaceStore) {
        super(workspace)
        this.id = authorization.id
        this.name = authorization.name ?? ''
        this.type = authorization.type

        switch (authorization.type) {
            case AuthorizationType.ApiKey:
                this.header = authorization.header
                this.value = authorization.value
                this.validationErrors = authorization.validationErrors ?? {}
                break
            case AuthorizationType.Basic:
                this.username = authorization.username
                this.password = authorization.password
                this.validationErrors = authorization.validationErrors ?? {}
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
                this.validationErrors = authorization.validationErrors ?? {}
                break
            case AuthorizationType.OAuth2Pkce:
                this.authorizeUrl = authorization.authorizeUrl
                this.accessTokenUrl = authorization.accessTokenUrl
                this.clientId = authorization.clientId
                this.sendCredentialsInBody = authorization.sendCredentialsInBody === false
                this.scope = authorization.scope
                this.audience = authorization.audience
                this.validationErrors = authorization.validationErrors ?? {}
                break
            default:
                throw new Error('Invalid authorization type')
        }

        return this
    }

    protected performUpdate(update: AuthorizationUpdate) {
        this.markAsDirty()
        this.workspace.update(update)
            .then(updates => runInAction(() => {
                if (updates) {
                    this.validationErrors = updates.validationErrors || {}
                }
            }))
    }

    @action
    setName(value: string) {
        this.name = value
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, name: value })
    }

    @action
    setType(value: AuthorizationType) {
        if (value === this.type) {
            return
        }
        this.type = value
        switch (this.type) {
            case AuthorizationType.Basic:
                this.performUpdate({
                    id: this.id,
                    type: EntityTypeName.Authorization,
                    entityType: EntityType.Authorization,
                    authType: AuthorizationType.Basic,
                    username: this.username,
                    password: this.password
                })
                break
            case AuthorizationType.OAuth2Client:
                this.performUpdate({
                    id: this.id,
                    type: EntityTypeName.Authorization,
                    entityType: EntityType.Authorization,
                    authType: AuthorizationType.OAuth2Client,
                    accessTokenUrl: this.accessTokenUrl,
                    clientId: this.clientId,
                    clientSecret: this.clientSecret,
                    audience: this.audience,
                    scope: this.scope,
                    selectedCertificate: this.selectedCertificate ?? null,
                    selectedProxy: this.selectedProxy ?? null,
                    sendCredentialsInBody: this.sendCredentialsInBody
                })
                break
            case AuthorizationType.OAuth2Pkce:
                this.performUpdate({
                    id: this.id,
                    type: EntityTypeName.Authorization,
                    entityType: EntityType.Authorization,
                    authType: AuthorizationType.OAuth2Pkce,
                    accessTokenUrl: this.accessTokenUrl,
                    authorizeUrl: this.authorizeUrl,
                    clientId: this.clientId,
                    scope: this.scope,
                    sendCredentialsInBody: this.sendCredentialsInBody
                })
                break
            case AuthorizationType.ApiKey:
                this.performUpdate({
                    id: this.id,
                    type: EntityTypeName.Authorization,
                    entityType: EntityType.Authorization,
                    authType: AuthorizationType.ApiKey,
                    header: this.header,
                    value: this.value,
                })
                break
            default:
                throw this.type satisfies never
        }
    }

    @action
    setUsername(value: string) {
        this.username = value
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, username: value })
    }

    @action
    setPassword(value: string) {
        this.password = value
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, password: value })
    }

    @action
    setAccessTokenUrl(value: string) {
        this.accessTokenUrl = value
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, accessTokenUrl: value })
    }

    @action
    setUrl(value: string) {
        this.authorizeUrl = value
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, authorizeUrl: value })
    }

    @action
    setClientId(value: string) {
        this.clientId = value
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, clientId: value })
    }

    @action
    setClientSecret(value: string) {
        this.clientSecret = value
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, clientSecret: value })
    }

    @action
    setSendCredentialsInBody(value: boolean) {
        this.sendCredentialsInBody = value
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, sendCredentialsInBody: value })
    }

    @action
    setScope(value: string) {
        this.scope = value
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, scope: value })
    }

    @action
    setAudience(value: string) {
        this.audience = value
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, audience: value })
    }

    @action
    setSelectedCertificate(selection: Selection | undefined) {
        this.selectedCertificate = selection && selection.id != NO_SELECTION_ID ? selection : undefined
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, selectedCertificate: selection ?? null })
    }

    @action
    setSelectedProxy(selection: Selection | undefined) {
        this.selectedProxy = selection && selection.id != NO_SELECTION_ID ? selection : undefined
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, selectedProxy: selection ?? null })
    }

    @action
    setHeader(value: string) {
        this.header = value
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, header: value })
    }

    @action
    setValue(value: string) {
        this.value = value
        this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, value })
    }

    @action
    refreshFromExternalSpecificUpdate(notification: EntityUpdateNotification) {
        if (notification.update.entityType !== EntityType.Authorization) {
            return
        }
        if (notification.update.authType !== undefined) {
            this.type = notification.update.authType
        }
        if (notification.update.name !== undefined) {
            this.name = notification.update.name
        }
        if (notification.update.username !== undefined) {
            this.username = notification.update.username
        }
        if (notification.update.password !== undefined) {
            this.password = notification.update.password
        }
        if (notification.update.header !== undefined) {
            this.password = notification.update.header
        }
        if (notification.update.value !== undefined) {
            this.password = notification.update.value
        }
        if (notification.update.accessTokenUrl !== undefined) {
            this.accessTokenUrl = notification.update.accessTokenUrl
        }
        if (notification.update.authorizeUrl !== undefined) {
            this.authorizeUrl = notification.update.authorizeUrl
        }
        if (notification.update.clientId !== undefined) {
            this.clientId = notification.update.clientId
        }
        if (notification.update.clientSecret !== undefined) {
            this.clientSecret = notification.update.clientSecret
        }
        if (notification.update.audience !== undefined) {
            this.audience = notification.update.audience ?? ''
        }
        if (notification.update.scope !== undefined) {
            this.scope = notification.update.scope ?? ''
        }
        if (notification.update.selectedCertificate !== undefined) {
            this.selectedCertificate = notification.update.selectedCertificate ?? undefined
        }
        if (notification.update.selectedProxy !== undefined) {
            this.selectedProxy = notification.update.selectedProxy ?? undefined
        }
        if (notification.update.sendCredentialsInBody !== undefined) {
            this.sendCredentialsInBody = notification.update.sendCredentialsInBody === true
        }

        // this.validationWarnings = notification.validationWarnings ?? []
        this.validationErrors = notification.validationErrors ?? {}
    }

    @computed get nameError() {
        // return this.type === AuthorizationType.ApiKey && ((this.header?.length ?? 0) === 0)
        return this.validationErrors['nameError']
    }

    @computed get headerError() {
        // return this.type === AuthorizationType.ApiKey && ((this.header?.length ?? 0) === 0)
        return this.validationErrors['header']
    }

    // @computed get valueInvalid() {
    //     return this.type === AuthorizationType.ApiKey && ((this.value?.length ?? 0) === 0)
    // }

    @computed get usernameError() {
        // return this.type === AuthorizationType.Basic && ((this.username?.length ?? 0) === 0)
        return this.validationErrors['username']
    }

    @computed get accessTokenUrlError() {
        return this.validationErrors['accessTokenUrl']
        // return (this.type === AuthorizationType.OAuth2Client || this.type === AuthorizationType.OAuth2Pkce) &&
        //     ! /^(\{\{.+\}\}|https?:\/\/)(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?$/.test(this.accessTokenUrl)
    }

    @computed get authorizationUrlError() {
        return this.validationErrors['authorizationUrl']
        // return (this.type === AuthorizationType.OAuth2Pkce) &&
        //     ! /^(\{\{.+\}\}|https?:\/\/)(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?$/.test(this.authorizeUrl)
    }

    @computed get clientIdError() {
        return this.validationErrors['clientId']
        // return (this.type === AuthorizationType.OAuth2Client || this.type === AuthorizationType.OAuth2Pkce) &&
        //     ((this.clientId?.length ?? 0) === 0)
    }

    // @computed get validationErrors(): { [property: string]: string } | undefined {
    //     const results: { [property: string]: string } = {}
    //     if (this.nameError) {
    //         results.name = 'Name is required'
    //     }
    //     if (this.headerInvalid) {
    //         results.header = 'Header is invalid'
    //     }
    //     if (this.usernameInvalid) {
    //         results.usernanme = 'User name is invalid'
    //     }
    //     if (this.accessTokenUrlInvalid) {
    //         results.accessTokenUrl = 'Access token URL is invalid'
    //     }
    //     if (this.authorizationUrlInvalid) {
    //         results.authorizationUrl = 'Authorization URL is invalid'
    //     }
    //     return Object.keys(results).length > 0 ? results : undefined
    // }
}
