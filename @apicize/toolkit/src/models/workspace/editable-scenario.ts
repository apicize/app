import { Scenario, Variable, VariableSourceType } from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable, toJS } from "mobx"
import { GenerateIdentifier } from "../../services/random-identifier-generator"
import { EntityType } from "./entity-type"
import { EntityScenario, EntityTypeName, WorkspaceStore } from "../../contexts/workspace.context"

export class EditableScenario extends Editable<Scenario> {
    public readonly entityType = EntityType.Scenario
    @observable accessor variables: EditableVariable[] = []

    public constructor(entry: Scenario, workspace: WorkspaceStore) {
        super(workspace)
        this.id = entry.id
        this.name = entry.name ?? ''
        this.variables = entry.variables?.map(v => new EditableVariable(
            GenerateIdentifier(),
            v.name,
            v.type ?? VariableSourceType.Text,
            v.value,
            v.disabled
        )) ?? []
    }

    protected onUpdate() {
        this.markAsDirty()
        this.workspace.updateScenario({
            entityTypeName: EntityTypeName.Scenario,
            id: this.id,
            name: this.name,
            variables: this.variables.map(v => v.toWorkspace()),
        })
    }

    @action
    setVariables(value: EditableVariable[] | undefined) {
        this.variables = value || []
        this.onUpdate()
    }

    @action
    notifyVariableUpdates() {
        this.onUpdate()
    }

    @action
    refreshFromExternalUpdate(updatedItem: EntityScenario) {
        this.name = updatedItem.name ?? ''
        this.variables = updatedItem.variables?.map(v => new EditableVariable(
            GenerateIdentifier(),
            v.name ?? '',
            v.type ?? VariableSourceType.Text,
            v.value,
            v.disabled
        )) ?? []
    }

    @computed get nameInvalid() {
        return ((this.name?.length ?? 0) === 0)
    }

    @computed get validationErrors(): { [property: string]: string } | undefined {
        const results: { [property: string]: string } = {}
        if (this.nameInvalid) {
            results.name = 'Name is required'
        }
        if (this.variables?.findIndex(v => v.nameInvalid || v.valueError !== null) !== -1) {
            results.variables = 'One ore more variables are incorrectly defined'
        }
        return Object.keys(results).length > 0 ? results : undefined
    }
}


export class EditableVariable implements Variable {

    @observable accessor id: string
    @observable accessor name: string
    @observable accessor type: VariableSourceType
    @observable accessor value: string
    @observable accessor disabled: boolean | undefined

    public constructor(
        id: string,
        name: string,
        type: VariableSourceType,
        value: string,
        disabled?: boolean) {
        this.id = id
        this.name = name
        this.type = type
        this.value = value
        this.disabled = disabled
    }

    toWorkspace(): Variable {
        return {
            name: this.name,
            type: this.type,
            value: this.value,
            disabled: this.disabled
        }
    }

    @action
    public updateName(value: string) {
        this.name = value
    }

    @action
    public updateSourceType(value: VariableSourceType) {
        this.type = value
    }

    @action
    public updateValue(value: string) {
        this.value = value
    }

    @computed get nameInvalid() {
        return ((this.name?.length ?? 0) === 0)
    }

    @computed get valueError(): string | null {
        switch (this.type) {
            case VariableSourceType.JSON: {
                try {
                    JSON.parse(this.value)
                } catch (_) {
                    return 'Value must ve valid JSON'
                }
            }
                break
            case VariableSourceType.FileJSON:
                if (/^(?!\/\\)(?!.*\.\.)(?!.*\/\/)(?!.*\/\.)[\.\w\/ ]{1,200}\.json$/.exec(this.value) === null) {
                    return 'Value must be a relative .json file name using forward slashes'
                }
                break
            case VariableSourceType.FileCSV:
                if (/^(?!\/\\)(?!.*\.\.)(?!.*\/\/)(?!.*\/\.)[\.\w\/ ]{1,200}\.csv$/.exec(this.value) === null) {
                    return 'Value must be a relative .csv file name using forward slashes'
                }
                break
        }
        return null
    }
}
