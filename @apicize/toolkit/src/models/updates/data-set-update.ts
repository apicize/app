import { DataSourceType } from "@apicize/lib-typescript"
import { CsvRow } from "../../services/csv-conversion"
import { EntityType } from "../workspace/entity-type"
import { EntityTypeName } from "../../contexts/workspace.context"

export interface DataSetUpdate {
    type: EntityTypeName.DataSet
    entityType: EntityType.DataSet
    id: string
    name?: string
    sourceType?: DataSourceType
    sourceFileName?: string
    sourceText?: string
    csvColumns?: string[]
    csvRows?: CsvRow[]
}

export interface DataSetContent {
    csvColumns?: string[]
    csvRows?: CsvRow[]
    sourceText?: string
}