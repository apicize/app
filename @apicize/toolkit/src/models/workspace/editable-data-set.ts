import { DataSet, DataSourceType, ValidationErrorList } from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable, runInAction } from "mobx"
import { EntityType } from "./entity-type"
import { EditableEntityContext } from "../editable"
import { EntityTypeName, EntityUpdateNotification } from "../../contexts/workspace.context"
import { csvToObject, csvFromObject, toCsvString, CsvRow } from "../../services/csv-conversion"
import { GenerateIdentifier } from "../../services/random-identifier-generator"
import { DataSetContent, DataSetUpdate } from "../updates/data-set-update"

export enum EditableDataSetType {
    None,
    JSON,
    CSV
}

export class EditableDataSet extends Editable<DataSet> {
    public readonly entityType = EntityType.DataSet

    @observable accessor type: DataSourceType
    @observable accessor sourceFileName: string
    @observable accessor text: string
    @observable accessor csvColumns: string[]
    @observable accessor csvRows: CsvRow[]
    @observable accessor editType: EditableDataSetType
    @observable accessor triggerFileLoad: boolean

    @observable accessor validationErrors: ValidationErrorList

    public constructor(entry: DataSet, workspace: EditableEntityContext, content?: DataSetContent) {
        super(workspace)
        this.id = entry.id
        this.name = entry.name ?? ''
        this.type = entry.type
        this.csvColumns = content?.csvColumns ?? []
        this.csvRows = content?.csvRows ?? []
        if (entry.type == DataSourceType.FileCSV || entry.type === DataSourceType.FileJSON) {
            this.text = content?.sourceText ?? ''
            this.sourceFileName = entry.source
            this.triggerFileLoad = (content?.sourceText === undefined && this.sourceFileName.length > 0)
        } else {
            this.text = entry.source
            this.sourceFileName = ''
            this.triggerFileLoad = false
        }
        this.editType = this.type === DataSourceType.FileCSV ? EditableDataSetType.CSV : EditableDataSetType.JSON
        this.validationErrors = entry.validationErrors ?? {}
    }

    protected async performUpdate(update: DataSetUpdate) {
        this.markAsDirty()
        const updates = await this.workspace.update(update)
        runInAction(() => {
            if (updates) {
                this.validationErrors = updates.validationErrors || {}
            }
        })
    }

    @action
    setName(value: string) {
        this.name = value
        return this.performUpdate({
            type: EntityTypeName.DataSet,
            entityType: EntityType.DataSet,
            id: this.id,
            name: value
        })
    }

    @action
    public async setSourceType(value: DataSourceType) {
        if (this.type === value) {
            return
        }
        if (this.type === DataSourceType.FileCSV) {
            const data = csvToObject({ columns: this.csvColumns, rows: this.csvRows })
            this.text = JSON.stringify(data, undefined, '   ')
            this.editType = EditableDataSetType.JSON
        } else if (value === DataSourceType.FileCSV) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const data = JSON.parse(this.text)
                const csv = csvFromObject(data)
                this.csvColumns = csv.columns
                this.csvRows = csv.rows.map(r => ({ ...r, _id: GenerateIdentifier() }))
            } catch {
                this.csvColumns = ['data']
                this.csvRows = []
            }
            this.editType = EditableDataSetType.CSV
        } else {
            this.editType = EditableDataSetType.JSON
        }

        this.sourceFileName = ''
        this.type = value

        await this.performUpdate({
            type: EntityTypeName.DataSet,
            entityType: EntityType.DataSet,
            id: this.id,
            sourceType: this.type,
            sourceText: this.text,
            sourceFileName: '',
            csvColumns: this.csvColumns,
            csvRows: this.csvRows,
        })
    }

    @action
    public async setFileName(value: string, sendUpdate: boolean) {
        this.sourceFileName = value
        if (sendUpdate) {
            this.triggerFileLoad = false
            await this.performUpdate({
                type: EntityTypeName.DataSet,
                entityType: EntityType.DataSet,
                id: this.id,
                sourceFileName: value
            })
        }
    }

    @action
    public clearDataSet() {
        this.triggerFileLoad = false
        this.text = ''
        this.sourceFileName = ''
        this.csvColumns = ['data']
        this.csvRows = []
        return this.performUpdate({
            type: EntityTypeName.DataSet,
            entityType: EntityType.DataSet,
            id: this.id,
            sourceType: DataSourceType.JSON,
            sourceFileName: '',
            sourceText: '',
            csvColumns: ['data'],
            csvRows: []
        })
    }

    @action
    public async setCsv(csvColumns: string[], csvRows: CsvRow[], triggerUpdate: boolean) {
        this.triggerFileLoad = false
        this.editType = EditableDataSetType.CSV
        this.csvColumns = csvColumns
        this.csvRows = csvRows
        if (triggerUpdate) {
            return await this.performUpdate({
                type: EntityTypeName.DataSet,
                entityType: EntityType.DataSet,
                id: this.id,
                csvColumns,
                csvRows,
            })
        }
    }

    @action
    public async setJson(value: string, triggerUpdate: boolean) {
        this.triggerFileLoad = false
        this.editType = EditableDataSetType.JSON
        this.text = value
        if (triggerUpdate) {
            return await this.performUpdate({
                type: EntityTypeName.DataSet,
                entityType: EntityType.DataSet,
                id: this.id,
                sourceText: value,
            })
        }
    }

    public getTextToSave() {
        switch (this.type) {
            case DataSourceType.JSON:
            case DataSourceType.FileJSON:
                return this.text
            case DataSourceType.FileCSV:
                return toCsvString({
                    columns: this.csvColumns,
                    rows: this.csvRows
                })
            default:
                throw new Error(`Unhandled data source type: ${this.type satisfies never}`)
        }
    }

    @action
    public addColumnAfter(afterColumnField: string, columnName: string) {
        // Find the index of the column to insert after
        const afterIndex = this.csvColumns.findIndex(c => c === afterColumnField)

        // Insert the column after the specified column
        if (afterIndex === -1) {
            // If column not found, add to the end
            this.csvColumns = [...this.csvColumns, columnName]
        } else {
            this.csvColumns = [
                ...this.csvColumns.slice(0, afterIndex + 1),
                columnName,
                ...this.csvColumns.slice(afterIndex + 1)
            ]
        }

        // Add empty value for this column to all existing rows
        this.csvRows = this.csvRows.map(row => ({
            ...row,
            [columnName]: ''
        }))

        return this.performUpdate({
            type: EntityTypeName.DataSet,
            entityType: EntityType.DataSet,
            id: this.id,
            csvColumns: this.csvColumns,
            csvRows: this.csvRows,
        })
    }

    @action
    public deleteColumn(columnField: string) {
        // Remove the column from the columns array
        this.csvColumns = this.csvColumns.filter(c => c !== columnField)

        // Remove the column data from all rows
        this.csvRows = this.csvRows.map(row => {
            const { [columnField]: removed, ...rest } = row
            return rest
        })

        return this.performUpdate({
            type: EntityTypeName.DataSet,
            entityType: EntityType.DataSet,
            id: this.id,
            csvColumns: this.csvColumns,
            csvRows: this.csvRows,
        })
    }

    public addRow() {
        const newRow = Object.fromEntries(this.csvColumns.map(c => [c, '']))
        newRow['_id'] = GenerateIdentifier()
        this.csvRows = [...this.csvRows, newRow]
        return this.performUpdate({
            type: EntityTypeName.DataSet,
            entityType: EntityType.DataSet,
            id: this.id,
            csvRows: this.csvRows,
        })
    }

    @action
    public deleteRow(rowId: string) {
        // Remove the row with the specified id
        this.csvRows = this.csvRows.filter(row => row._id !== rowId)
        return this.performUpdate({
            type: EntityTypeName.DataSet,
            entityType: EntityType.DataSet,
            id: this.id,
            csvRows: this.csvRows,
        })
    }

    @action
    public updateRow(row: CsvRow) {
        // Remove the row with the specified id
        const index = this.csvRows.findIndex(r => r._id == row._id)
        if (index === -1) {
            throw new Error(`Unable to locate row (ID = ${row._id})`)
        }
        this.csvRows[index] = row
        return this.performUpdate({
            type: EntityTypeName.DataSet,
            entityType: EntityType.DataSet,
            id: this.id,
            csvRows: this.csvRows,
        })
    }

    @action
    refreshFromExternalSpecificUpdate(notification: EntityUpdateNotification) {
        if (notification.update.entityType !== EntityType.DataSet) {
            return
        }
        if (notification.update.name !== undefined) {
            this.name = notification.update.name
        }
        if (notification.update.sourceType !== undefined) {
            this.type = notification.update.sourceType
            this.editType = notification.update.sourceType === DataSourceType.FileCSV
                ? EditableDataSetType.CSV : EditableDataSetType.JSON
        }
        if (notification.update.sourceFileName !== undefined) {
            this.sourceFileName = notification.update.sourceFileName
        }
        if (notification.update.sourceText !== undefined) {
            this.text = notification.update.sourceText
        }
        if (notification.update.csvColumns !== undefined) {
            this.csvColumns = notification.update.csvColumns
        }
        if (notification.update.csvRows !== undefined) {
            this.csvRows = notification.update.csvRows
        }
        this.validationErrors = notification.validationErrors ?? {}
    }

    @computed get nameError() {
        // return this.type === AuthorizationType.ApiKey && ((this.header?.length ?? 0) === 0)
        return this.validationErrors['name']
    }

    @computed get sourceError() {
        // return this.type === AuthorizationType.ApiKey && ((this.header?.length ?? 0) === 0)
        return this.validationErrors['source']
    }

    // @computed get sourceError(): string | null {
    //     switch (this.type) {
    //         case ExternalDataSourceType.JSON: {
    //             try {
    //                 JSON.parse(this.text)
    //             } catch (_) {
    //                 return 'Value must ve valid JSON'
    //             }
    //         }
    //             break
    //         case ExternalDataSourceType.FileJSON:
    //             if (/^(?:(?!.*\.\.)(?!.*[\\\/]{2})(?!.*\/\/)(?!.*\\\\.)(?:\.|\.|\.\\|[^\n"?:*<>|]+)[^\n"?:*<>|])+.json$/.exec(this.sourceFileName) === null) {
    //                 return 'Value must be a relative .json file name using forward slashes'
    //             }
    //             break
    //         case ExternalDataSourceType.FileCSV:
    //             if (/^(?:(?!.*\.\.)(?!.*[\\\/]{2})(?!.*\/\/)(?!.*\\\\.)(?:\.|\.|\.\\|[^\n"?:*<>|]+)[^\n"?:*<>|])+.csv$/.exec(this.sourceFileName) === null) {
    //                 return 'Value must be a relative .csv file name using forward slashes'
    //             }
    //             break
    //     }
    //     return null
    // }
}
