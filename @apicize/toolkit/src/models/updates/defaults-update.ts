import { EntityType } from "../workspace/entity-type"
import { EntityTypeName } from "../../contexts/workspace.context"
import { Selection } from "@apicize/lib-typescript"

export interface DefaultsUpdate {
    type: EntityTypeName.Defaults
    entityType: EntityType.Defaults
    selectedScenario?: Selection
    selectedAuthorization?: Selection
    selectedCertificate?: Selection
    selectedProxy?: Selection
    selectedData?: Selection
    validationWarnings?: string[]
}