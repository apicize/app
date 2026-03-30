import { Scenario, ValidationErrorList, Variable, VariableSourceType } from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable, runInAction } from "mobx"
import { GenerateIdentifier } from "../../services/random-identifier-generator"
import { EntityType } from "./entity-type"
import { EditableEntityContext } from "../editable"
import { EntityTypeName } from "../../contexts/workspace.context"
import { ScenarioUpdate } from "../updates/scenario-update"
import { EntityUpdate } from "../updates/entity-update"

export class EditableScenario extends Editable {
    public readonly entityType = EntityType.Scenario
    @observable accessor encrypted: boolean

    @observable accessor variables: EditableVariable[] = []

    @observable accessor validationErrors: ValidationErrorList = {}

    public constructor(scenario: Scenario, workspace: EditableEntityContext) {
        super(scenario.id, scenario.name ?? '', workspace)
        if ('data' in scenario) {
            this.encrypted = true
        } else {
            this.encrypted = false
            this.validationErrors = scenario.validationErrors ?? {}

            this.variables = scenario.variables?.map(v => new EditableVariable(
                GenerateIdentifier(),
                v.name,
                v.type ?? VariableSourceType.Text,
                v.value,
                v.disabled
            )) ?? []
        }
    }

    protected async performUpdate(update: ScenarioUpdate) {
        this.markAsDirty()
        const updates = await this.workspace.update(update)
        if (updates) {
            runInAction(() => {
                this.validationErrors = updates.validationErrors || {}
            })
        }
    }

    @action
    setName(value: string) {
        this.name = value
        return this.performUpdate({ type: EntityTypeName.Scenario, entityType: EntityType.Scenario, id: this.id, name: value })
    }

    @action
    setVariables(value: EditableVariable[]) {
        this.variables = value
        return this.performUpdate({ type: EntityTypeName.Scenario, entityType: EntityType.Scenario, id: this.id, variables: this.variables.map(v => v.toWorkspace()) })
    }

    @action
    refreshFromExternalSpecificUpdate(update: EntityUpdate) {
        if (update.entityType !== EntityType.Scenario) {
            return
        }
        if (update.encrypted !== undefined) {
            this.encrypted = update.encrypted
        }
        if (update.name !== undefined) {
            this.name = update.name
        }
        if (update.variables !== undefined) {
            this.variables = update.variables.map(
                v => new EditableVariable(
                    GenerateIdentifier(),
                    v.name ?? '',
                    v.type ?? VariableSourceType.Text,
                    v.value,
                    v.disabled
                )
            )
        }
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
                } catch {
                    return 'Value must ve valid JSON'
                }
            }
                break
            case VariableSourceType.FileJSON:
                if (/^(?!\/\\)(?!.*\.\.)(?!.*\/\/)(?!.*\/\.)[.\w/ ]{1,200}\.json$/.exec(this.value) === null) {
                    return 'Value must be a relative .json file name using forward slashes'
                }
                break
            case VariableSourceType.FileCSV:
                if (/^(?!\/\\)(?!.*\.\.)(?!.*\/\/)(?!.*\/\.)[.\w/ ]{1,200}\.csv$/.exec(this.value) === null) {
                    return 'Value must be a relative .csv file name using forward slashes'
                }
                break
        }
        return null
    }
}
