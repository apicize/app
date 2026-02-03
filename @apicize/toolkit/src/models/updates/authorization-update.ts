import { AuthorizationType, Selection } from "@apicize/lib-typescript"
import { EntityTypeName } from "../../contexts/workspace.context"
import { EntityType } from "../workspace/entity-type"

export interface AuthorizationUpdate {
    type: EntityTypeName.Authorization
    entityType: EntityType.Authorization
    authType?: AuthorizationType
    id: string
    name?: string
    username?: string
    password?: string
    accessTokenUrl?: string
    authorizeUrl?: string
    clientId?: string
    clientSecret?: string
    audience?: string | null
    scope?: string | null
    selectedCertificate?: Selection | null
    selectedProxy?: Selection | null
    sendCredentialsInBody?: boolean | null
    header?: string
    value?: string
    validationWarnings?: string[]
}
