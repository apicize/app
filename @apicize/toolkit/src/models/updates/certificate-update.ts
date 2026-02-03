import { CertificateType } from "@apicize/lib-typescript"
import { EntityType } from "../workspace/entity-type"
import { EntityTypeName } from "../../contexts/workspace.context"

export interface CertificateUpdate {
    type: EntityTypeName.Certificate
    entityType: EntityType.Certificate
    id: string
    certType?: CertificateType
    name?: string
    pfx?: string
    password?: string
    pem?: string
    key?: string | null
}