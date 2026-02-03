import { Variable } from "@apicize/lib-typescript"
import { EntityType } from "../workspace/entity-type"
import { EntityTypeName } from "../../contexts/workspace.context"

export interface ScenarioUpdate {
    type: EntityTypeName.Scenario
    entityType: EntityType.Scenario
    id: string
    name?: string
    variables?: Variable[]
}