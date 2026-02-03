import { Scenario, ValidationErrorList, Variable, VariableSourceType } from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable, runInAction, toJS } from "mobx"
import { GenerateIdentifier } from "../../services/random-identifier-generator"
import { EntityType } from "./entity-type"
import { EntityScenario, EntityTypeName, EntityUpdateNotification, WorkspaceStore } from "../../contexts/workspace.context"
import { ScenarioUpdate } from "../updates/scenario-update"

export class EditableScenario extends Editable<Scenario> {
    public readonly entityType = EntityType.Scenario
    @observable accessor variables: EditableVariable[] = []
    @observable accessor validationErrors: ValidationErrorList = {}

    public constructor(entry: Scenario, workspace: WorkspaceStore) {
        super(workspace)
        this.id = entry.id
        this.name = entry.name ?? ''
        this.validationErrors = entry.validationErrors ?? {}
        this.variables = entry.variables?.map(v => new EditableVariable(
            GenerateIdentifier(),
            v.name,
            v.type ?? VariableSourceType.Text,
            v.value,
            v.disabled
        )) ?? []
    }

    protected performUpdate(update: ScenarioUpdate) {
        this.markAsDirty()
        this.workspace.update(update)
            .then(updates => runInAction(() => {
                if (updates) {
                    this.validationErrors = updates.validationErrors || {}
                }
            }))
    }

    @action
    setName(value: string) {
        this.name = value
        this.performUpdate({ type: EntityTypeName.Scenario, entityType: EntityType.Scenario, id: this.id, name: value })
    }

    @action
    setVariables(value: EditableVariable[]) {
        this.variables = value
        this.performUpdate({ type: EntityTypeName.Scenario, entityType: EntityType.Scenario, id: this.id, variables: this.variables.map(v => v.toWorkspace()) })
    }

    @action
    refreshFromExternalSpecificUpdate(notification: EntityUpdateNotification) {
        if (notification.update.entityType !== EntityType.Scenario) {
            return
        }
        if (notification.update.name !== undefined) {
            this.name = notification.update.name
        }
        if (notification.update.variables !== undefined) {
            this.variables = notification.update.variables.map(
                v => new EditableVariable(
                    GenerateIdentifier(),
                    v.name ?? '',
                    v.type ?? VariableSourceType.Text,
                    v.value,
                    v.disabled
                )
            )
        }
        this.validationErrors = notification.validationErrors ?? {}
    }

    @computed get nameError() {
        return this.validationErrors['name']
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
