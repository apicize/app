import { RequestGroup, MultiRunExecution, ExecutionResultDetail } from "@apicize/lib-typescript"
import { observable, action, computed } from "mobx"
import { EntityType } from "./entity-type"
import { EntityGroup, EntityTypeName, WorkspaceStore } from "../../contexts/workspace.context"
import { EditableRequestEntry } from "./editable-request-entry"
import { EditableWarnings } from "./editable-warnings"
import { RequestExecution } from "../request-execution"
import { ExecutionResultViewState } from "./execution"

export class EditableRequestGroup extends EditableRequestEntry {
    public readonly entityType = EntityType.Group

    @observable public accessor key = ''
    @observable accessor timeout = 0
    @observable accessor warnings = new EditableWarnings()
    @observable accessor execution: MultiRunExecution = MultiRunExecution.Sequential

    public constructor(entry: RequestGroup, workspace: WorkspaceStore, executionResultViewState: ExecutionResultViewState, requestExecution: RequestExecution) {
        super(workspace, executionResultViewState, requestExecution)

        this.id = entry.id
        this.name = entry.name ?? ''
        this.key = entry.key ?? ''
        this.runs = entry.runs
        this.multiRunExecution = entry.multiRunExecution
        this.execution = entry.execution

        this.selectedScenario = entry.selectedScenario ?? undefined
        this.selectedAuthorization = entry.selectedAuthorization ?? undefined
        this.selectedCertificate = entry.selectedCertificate ?? undefined
        this.selectedProxy = entry.selectedProxy ?? undefined
        this.selectedData = entry.selectedData ?? undefined
        this.warnings.set(entry.validationWarnings)
    }

    protected onUpdate() {
        this.markAsDirty()
        this.workspace.updateGroup({
            entityTypeName: EntityTypeName.Group,
            id: this.id,
            name: this.name,
            key: this.key.length > 0 ? this.key : undefined,
            runs: this.runs,
            execution: this.execution,
            multiRunExecution: this.multiRunExecution,
            selectedScenario: this.selectedScenario ?? undefined,
            selectedAuthorization: this.selectedAuthorization ?? undefined,
            selectedCertificate: this.selectedCertificate ?? undefined,
            selectedProxy: this.selectedProxy ?? undefined,
            selectedData: this.selectedData ?? undefined,
            validationWarnings: this.warnings.hasEntries ? [...this.warnings.entries.values()] : undefined,
            validationErrors: this.validationErrors
        })
    }

    @action
    setKey(value: string) {
        this.key = value
        this.onUpdate()
    }

    @action
    setGroupConcurrency(value: MultiRunExecution) {
        this.execution = value
        this.onUpdate()
    }

    @action
    refreshFromExternalUpdate(entity: EntityGroup) {
        this.name = entity.name ?? ''
        this.key = entity.key ?? ''
        this.runs = entity.runs
        this.execution = entity.execution
        this.multiRunExecution = entity.multiRunExecution
        this.selectedScenario = entity.selectedScenario
        this.selectedAuthorization = entity.selectedAuthorization
        this.selectedCertificate = entity.selectedCertificate
        this.selectedProxy = entity.selectedProxy
        this.selectedData = entity.selectedData
        this.warnings.set(entity.validationWarnings)
    }

    @action
    deleteWarning(id: string) {
        this.warnings.delete(id)
        this.onUpdate()
    }

    @computed get nameInvalid() {
        return ((this.name?.length ?? 0) === 0)
    }

    @computed get validationErrors(): { [property: string]: string } | undefined {
        const results: { [property: string]: string } = {}
        if (this.nameInvalid) {
            results.name = 'Name is required'
        }
        return Object.keys(results).length > 0 ? results : undefined
    }
}