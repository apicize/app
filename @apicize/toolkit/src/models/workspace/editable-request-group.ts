import { RequestGroup, ExecutionConcurrency, ValidationErrorList, DEFAULT_SELECTION_ID, NO_SELECTION_ID, NO_SELECTION, DEFAULT_SELECTION } from "@apicize/lib-typescript"
import { observable, action, computed, runInAction } from "mobx"
import { EntityType } from "./entity-type"
import { EditableEntityContext } from "../editable"
import { EntityTypeName } from "../../contexts/workspace.context"
import { EditableRequestEntry } from "./editable-request-entry"
import { EditableWarnings } from "./editable-warnings"
import { RequestExecution } from "../request-execution"
import { ExecutionResultViewState } from "./execution"
import { RequestGroupUpdate } from "../updates/request-group-update"
import { EntityUpdate } from "../updates/entity-update"

export class EditableRequestGroup extends EditableRequestEntry {
    public readonly entityType = EntityType.Group

    @observable public accessor key = ''
    @observable accessor timeout = 0
    @observable accessor execution: ExecutionConcurrency = ExecutionConcurrency.Sequential
    @observable public accessor setup = ''

    @observable accessor validationWarnings = new EditableWarnings()
    @observable accessor validationErrors: ValidationErrorList = {}

    public constructor(entry: RequestGroup, workspace: EditableEntityContext, executionResultViewState: ExecutionResultViewState, requestExecution: RequestExecution) {
        super(
            entry.id,
            entry.name ?? '',
            workspace,
            executionResultViewState,
            requestExecution)

        this.id = entry.id
        this.name = entry.name ?? ''
        this.disabled = entry.disabled ?? false
        this.key = entry.key ?? ''
        this.runs = entry.runs
        this.multiRunExecution = entry.multiRunExecution
        this.execution = entry.execution
        this.setup = entry.setup ?? ''

        this.selectedScenario = entry.selectedScenario
        this.selectedAuthorization = entry.selectedAuthorization
        this.selectedCertificate = entry.selectedCertificate
        this.selectedProxy = entry.selectedProxy
        this.selectedDataSet = entry.selectedData

        this.validationWarnings.set(entry.validationWarnings)
        this.validationErrors = entry.validationErrors ?? {}
    }

    protected async performUpdate(update: RequestGroupUpdate) {
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
        return this.performUpdate({ type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id, name: value })
    }

    @action
    setDisabled(value: boolean) {
        this.disabled = value
        return this.performUpdate({ type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id, disabled: value })
    }

    @action
    setKey(value: string) {
        this.key = value
        return this.performUpdate({ type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id, key: value })
    }

    @action
    setRuns(value: number) {
        this.runs = value
        return this.performUpdate({ type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id, runs: value })
    }

    @action
    setMultiRunExecution(value: ExecutionConcurrency) {
        this.multiRunExecution = value
        return this.performUpdate({ type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id, multiRunExecution: value })
    }

    @action
    setGroupConcurrency(value: ExecutionConcurrency) {
        this.execution = value
        return this.performUpdate({ type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id, execution: value })
    }

    @action
    setSetup(value: string | undefined) {
        this.setup = value ?? ''
        return this.performUpdate({ type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id, setup: value })
    }

    @action
    setSelectedScenarioId(entityId: string) {
        this.selectedScenario = entityId === DEFAULT_SELECTION_ID
            ? DEFAULT_SELECTION
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({
            type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id,
            selectedScenario: this.selectedScenario ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedAuthorizationId(entityId: string) {
        this.selectedAuthorization = entityId === DEFAULT_SELECTION_ID
            ? DEFAULT_SELECTION
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({
            type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id,
            selectedAuthorization: this.selectedAuthorization ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedCertificateId(entityId: string) {
        this.selectedCertificate = entityId === DEFAULT_SELECTION_ID
            ? DEFAULT_SELECTION
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({
            type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id,
            selectedCertificate: this.selectedCertificate ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedProxyId(entityId: string) {
        this.selectedProxy = entityId === DEFAULT_SELECTION_ID
            ? DEFAULT_SELECTION
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({
            type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id,
            selectedProxy: this.selectedProxy ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedDataId(entityId: string) {
        this.selectedDataSet = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({
            type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id,
            selectedData: this.selectedDataSet ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    refreshFromExternalSpecificUpdate(update: EntityUpdate) {
        if (update.entityType !== EntityType.Group) {
            return
        }
        if (update.name !== undefined) {
            this.name = update.name
        }
        if (update.disabled !== undefined) {
            this.disabled = update.disabled
        }
        if (update.key !== undefined) {
            this.key = update.key
        }
        if (update.runs !== undefined) {
            this.runs = update.runs
        }
        if (update.execution !== undefined) {
            this.execution = update.execution
        }
        if (update.multiRunExecution !== undefined) {
            this.multiRunExecution = update.multiRunExecution
        }
        if (update.setup !== undefined) {
            this.setup = update.setup
        }
        if (update.selectedScenario !== undefined) {
            this.selectedScenario = update.selectedScenario
        }
        if (update.selectedAuthorization !== undefined) {
            this.selectedAuthorization = update.selectedAuthorization
        }
        if (update.selectedCertificate !== undefined) {
            this.selectedCertificate = update.selectedCertificate
        }
        if (update.selectedProxy !== undefined) {
            this.selectedProxy = update.selectedProxy
        }
        if (update.selectedData !== undefined) {
            this.selectedDataSet = update.selectedData
        }
    }

    @action
    deleteWarning(id: string) {
        this.validationWarnings.delete(id)
        return this.performUpdate({
            type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id,
            validationWarnings: [...this.validationWarnings.entries.values()]
        })
    }

    @computed get nameError() {
        return this.validationErrors['name']
    }
}