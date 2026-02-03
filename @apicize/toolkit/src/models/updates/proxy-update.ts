import { EntityTypeName } from "../../contexts/workspace.context"
import { EntityType } from "../workspace/entity-type"

export interface ProxyUpdate {
    type: EntityTypeName.Proxy
    entityType: EntityType.Proxy
    id: string
    name?: string
    url?: string
}