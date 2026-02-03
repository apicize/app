import { ExecutionConcurrency, Selection } from "@apicize/lib-typescript"
import { EntityTypeName } from "../../contexts/workspace.context"
import { EntityType } from "../workspace/entity-type"

export interface RequestGroupUpdate {
    type: EntityTypeName.Group
    entityType: EntityType.Group
    id: string
    name?: string
    key?: string
    runs?: number
    multiRunExecution?: ExecutionConcurrency
    execution?: ExecutionConcurrency
    selectedScenario?: Selection
    selectedAuthorization?: Selection
    selectedCertificate?: Selection
    selectedProxy?: Selection
    selectedData?: Selection
    validationWarnings?: string[]
}