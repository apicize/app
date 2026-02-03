import { Identifiable } from "./identifiable"
import { Named } from "./named"
import { ValidationErrors } from "./validation"

export enum DataSourceType {
    JSON = 'JSON',
    FileJSON = 'FILE-JSON',
    FileCSV = 'FILE-CSV',
}

export interface DataSet extends Identifiable, Named, ValidationErrors {
    id: string
    name: string
    type: DataSourceType
    source: string
}
