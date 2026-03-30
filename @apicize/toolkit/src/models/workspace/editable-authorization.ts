import {
    Authorization,
    AuthorizationType,
    NO_SELECTION,
    NO_SELECTION_ID,
    Selection,
    ValidationErrorList
} from "@apicize/lib-typescript"
import { Editable, EditableEntityContext } from "../editable"
import { action, computed, observable, runInAction } from "mobx"
import { EntityType } from "./entity-type"
import { EntityTypeName } from "../../contexts/workspace.context"
import { AuthorizationUpdate } from "../updates/authorization-update"
import { EditableWarnings } from "./editable-warnings"
import { EntityUpdate } from "../updates/entity-update"

export class EditableAuthorization extends Editable {
    public readonly entityType = EntityType.Authorization
    @observable accessor encrypted: boolean

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

    @observable accessor validationWarnings = new EditableWarnings()
    @observable accessor validationErrors: ValidationErrorList = {}

    public constructor(authorization: Authorization, workspace: EditableEntityContext) {
        super(authorization.id, authorization.name ?? '', workspace)

        if ('data' in authorization) {
            this.encrypted = true
        } else {
            this.encrypted = false
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
                    this.sendCredentialsInBody = authorization.sendCredentialsInBody === true
                    this.scope = authorization.scope
                    this.audience = authorization.audience
                    this.validationErrors = authorization.validationErrors ?? {}
                    break
                default:
                    throw new Error('Invalid authorization type')
            }

        }
    }

    protected async performUpdate(update: AuthorizationUpdate) {
        this.markAsDirty()
        const updates = await this.workspace.update(update)
        if (updates) {
            runInAction(() => {
                this.validationErrors = updates.validationErrors || {}
                this.validationWarnings.set(updates.validationWarnings)
            })
        }
    }

    @action
    deleteWarning(warningId: string) {
        this.validationWarnings.delete(warningId)
        return this.performUpdate({
            id: this.id,
            type: EntityTypeName.Authorization,
            entityType: EntityType.Authorization,
            validationWarnings: [...this.validationWarnings.entries.values()]
        })
    }

    @action
    setName(value: string) {
        this.name = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, name: value })
    }

    @action
    setType(value: AuthorizationType) {
        if (value !== this.type) {
            return Promise.resolve()
        }
        this.type = value
        switch (this.type) {
            case AuthorizationType.Basic:
                return this.performUpdate({
                    id: this.id,
                    type: EntityTypeName.Authorization,
                    entityType: EntityType.Authorization,
                    authType: AuthorizationType.Basic,
                    username: this.username,
                    password: this.password
                })
            case AuthorizationType.OAuth2Client:
                return this.performUpdate({
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
            case AuthorizationType.OAuth2Pkce:
                return this.performUpdate({
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
            case AuthorizationType.ApiKey:
                return this.performUpdate({
                    id: this.id,
                    type: EntityTypeName.Authorization,
                    entityType: EntityType.Authorization,
                    authType: AuthorizationType.ApiKey,
                    header: this.header,
                    value: this.value,
                })
            default:
                throw new Error(`Unhandled authorization type: ${this.type satisfies never}`)
        }
    }

    @action
    setUsername(value: string) {
        this.username = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, username: value })
    }

    @action
    setPassword(value: string) {
        this.password = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, password: value })
    }

    @action
    setAccessTokenUrl(value: string) {
        this.accessTokenUrl = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, accessTokenUrl: value })
    }

    @action
    setUrl(value: string) {
        this.authorizeUrl = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, authorizeUrl: value })
    }

    @action
    setClientId(value: string) {
        this.clientId = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, clientId: value })
    }

    @action
    setClientSecret(value: string) {
        this.clientSecret = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, clientSecret: value })
    }

    @action
    setSendCredentialsInBody(value: boolean) {
        this.sendCredentialsInBody = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, sendCredentialsInBody: value })
    }

    @action
    setScope(value: string) {
        this.scope = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, scope: value })
    }

    @action
    setAudience(value: string) {
        this.audience = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, audience: value })
    }

    @action
    setSelectedCertificate(selection: Selection | undefined) {
        this.selectedCertificate = selection && selection.id != NO_SELECTION_ID ? selection : undefined
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, selectedCertificate: selection ?? null })
    }

    @action
    setSelectedProxy(selection: Selection | undefined) {
        this.selectedProxy = selection && selection.id != NO_SELECTION_ID ? selection : undefined
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, selectedProxy: selection ?? null })
    }

    @action
    setHeader(value: string) {
        this.header = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, header: value })
    }

    @action
    setValue(value: string) {
        this.value = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Authorization, entityType: EntityType.Authorization, value })
    }

    @action
    refreshFromExternalSpecificUpdate(update: EntityUpdate) {
        if (update.entityType !== EntityType.Authorization) {
            return
        }
        if (update.encrypted !== undefined) {
            this.encrypted = update.encrypted
        }
        if (update.authType !== undefined) {
            this.type = update.authType
        }
        if (update.name !== undefined) {
            this.name = update.name
        }
        if (update.username !== undefined) {
            this.username = update.username
        }
        if (update.password !== undefined) {
            this.password = update.password
        }
        if (update.header !== undefined) {
            this.password = update.header
        }
        if (update.value !== undefined) {
            this.password = update.value
        }
        if (update.accessTokenUrl !== undefined) {
            this.accessTokenUrl = update.accessTokenUrl
        }
        if (update.authorizeUrl !== undefined) {
            this.authorizeUrl = update.authorizeUrl
        }
        if (update.clientId !== undefined) {
            this.clientId = update.clientId
        }
        if (update.clientSecret !== undefined) {
            this.clientSecret = update.clientSecret
        }
        if (update.audience !== undefined) {
            this.audience = update.audience ?? ''
        }
        if (update.scope !== undefined) {
            this.scope = update.scope ?? ''
        }
        if (update.selectedCertificate !== undefined) {
            this.selectedCertificate = update.selectedCertificate ?? undefined
        }
        if (update.selectedProxy !== undefined) {
            this.selectedProxy = update.selectedProxy ?? undefined
        }
        if (update.sendCredentialsInBody !== undefined) {
            this.sendCredentialsInBody = update.sendCredentialsInBody === true
        }
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
