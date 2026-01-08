import { ExternalData, ExternalDataSourceType } from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable, toJS } from "mobx"
import { EntityType } from "./entity-type"
import { EntityTypeName, WorkspaceStore } from "../../contexts/workspace.context"

export class EditableExternalDataEntry extends Editable<ExternalData> {
    public readonly entityType = EntityType.Data

    @observable accessor type: ExternalDataSourceType = ExternalDataSourceType.FileJSON
    @observable accessor source: string = ''

    public constructor(entry: ExternalData, workspace: WorkspaceStore) {
        super(workspace)
        this.id = entry.id
        this.name = entry.name ?? ''
        this.type = entry.type
        this.source = entry.source
    }

    protected onUpdate() {
        this.markAsDirty()
        this.workspace.updateData({
            entityTypeName: EntityTypeName.Data,
            id: this.id,
            name: this.name,
            type: this.type,
            source: this.source
        })
    }

    @action
    refreshFromExternalUpdate(updatedItem: ExternalData) {
        this.name = updatedItem.name ?? ''
        this.type = updatedItem.type
        this.source = updatedItem.source ?? ''
    }

    @action
    public setSourceType(value: ExternalDataSourceType) {
        this.type = value
        this.onUpdate()
    }

    @action
    public setSource(value: string) {
        this.source = value
        this.onUpdate()
    }

    @computed get sourceError(): string | null {
        switch (this.type) {
            case ExternalDataSourceType.JSON: {
                try {
                    JSON.parse(this.source)
                } catch (_) {
                    return 'Value must ve valid JSON'
                }
            }
                break
            case ExternalDataSourceType.FileJSON:
                if (/^(?:(?!.*\.\.)(?!.*[\\\/]{2})(?!.*\/\/)(?!.*\\\\.)(?:\.|\.|\.\\|[^\n"?:*<>|]+)[^\n"?:*<>|])+.json$/.exec(this.source) === null) {
                    return 'Value must be a relative .json file name using forward slashes'
                }
                break
            case ExternalDataSourceType.FileCSV:
                if (/^(?:(?!.*\.\.)(?!.*[\\\/]{2})(?!.*\/\/)(?!.*\\\\.)(?:\.|\.|\.\\|[^\n"?:*<>|]+)[^\n"?:*<>|])+.csv$/.exec(this.source) === null) {
                    return 'Value must be a relative .csv file name using forward slashes'
                }
                break
        }
        return null
    }
}
