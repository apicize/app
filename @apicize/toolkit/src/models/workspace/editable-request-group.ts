import { RequestGroup, ExecutionConcurrency, ValidationErrorList } from "@apicize/lib-typescript"
import { observable, action, computed, runInAction, toJS } from "mobx"
import { EntityType } from "./entity-type"
import { EntityTypeName, EntityUpdateNotification, WorkspaceStore } from "../../contexts/workspace.context"
import { EditableRequestEntry } from "./editable-request-entry"
import { EditableWarnings } from "./editable-warnings"
import { RequestExecution } from "../request-execution"
import { ExecutionResultViewState } from "./execution"
import { RequestGroupUpdate } from "../updates/request-group-update"
import { DEFAULT_SELECTION_ID, NO_SELECTION_ID, NO_SELECTION } from "../store"
import { GenerateIdentifier } from "../../services/random-identifier-generator"

export class EditableRequestGroup extends EditableRequestEntry {
    public readonly entityType = EntityType.Group

    @observable public accessor key = ''
    @observable accessor timeout = 0
    @observable accessor execution: ExecutionConcurrency = ExecutionConcurrency.Sequential

    @observable accessor validationWarnings = new EditableWarnings()
    @observable accessor validationErrors: ValidationErrorList = {}

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
        this.selectedDataSet = entry.selectedData ?? undefined
        this.validationWarnings.set(entry.validationWarnings)
        this.validationErrors = entry.validationErrors ?? {}
    }

    protected performUpdate(update: RequestGroupUpdate) {
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
        this.performUpdate({ type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id, name: value })
    }

    @action
    setKey(value: string) {
        this.key = value
        this.performUpdate({ type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id, key: value })
    }

    @action
    setRuns(value: number) {
        this.runs = value
        this.performUpdate({ type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id, runs: value })
    }

    @action
    setMultiRunExecution(value: ExecutionConcurrency) {
        this.multiRunExecution = value
        this.performUpdate({ type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id, multiRunExecution: value })
    }

    @action
    setGroupConcurrency(value: ExecutionConcurrency) {
        this.execution = value
        this.performUpdate({ type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id, execution: value })
    }

    @action
    setSelectedScenarioId(entityId: string) {
        this.selectedScenario = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({
            type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id,
            selectedScenario: this.selectedScenario ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedAuthorizationId(entityId: string) {
        this.selectedAuthorization = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({
            type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id,
            selectedAuthorization: this.selectedAuthorization ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedCertificateId(entityId: string) {
        this.selectedCertificate = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({
            type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id,
            selectedCertificate: this.selectedCertificate ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedProxyId(entityId: string) {
        this.selectedProxy = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({
            type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id,
            selectedProxy: this.selectedProxy ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    setSelectedDataId(entityId: string) {
        this.selectedDataSet = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({
            type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id,
            selectedData: this.selectedDataSet ?? { id: DEFAULT_SELECTION_ID, name: '(Default)' }
        })
    }

    @action
    refreshFromExternalSpecificUpdate(notification: EntityUpdateNotification) {
        if (notification.update.entityType !== EntityType.Group) {
            return
        }
        if (notification.update.name !== undefined) {
            this.name = notification.update.name
        }
        if (notification.update.key !== undefined) {
            this.key = notification.update.key
        }
        if (notification.update.runs !== undefined) {
            this.runs = notification.update.runs
        }
        if (notification.update.execution !== undefined) {
            this.execution = notification.update.execution
        }
        if (notification.update.multiRunExecution !== undefined) {
            this.multiRunExecution = notification.update.multiRunExecution
        }

        let clearParameters = false
        if (notification.update.selectedScenario !== undefined) {
            this.selectedScenario = notification.update.selectedScenario.id === DEFAULT_SELECTION_ID
                ? undefined : notification.update.selectedScenario
            clearParameters = true
        }
        if (notification.update.selectedAuthorization !== undefined) {
            this.selectedAuthorization = notification.update.selectedAuthorization.id === DEFAULT_SELECTION_ID
                ? undefined : notification.update.selectedAuthorization
            clearParameters = true
        }
        if (notification.update.selectedCertificate !== undefined) {
            this.selectedCertificate = notification.update.selectedCertificate.id === DEFAULT_SELECTION_ID
                ? undefined : notification.update.selectedCertificate
            clearParameters = true
        }
        if (notification.update.selectedProxy !== undefined) {
            this.selectedProxy = notification.update.selectedProxy.id === DEFAULT_SELECTION_ID
                ? undefined : notification.update.selectedProxy
            clearParameters = true
        }
        if (notification.update.selectedData !== undefined) {
            this.selectedDataSet = notification.update.selectedData.id === DEFAULT_SELECTION_ID
                ? undefined : notification.update.selectedData
            clearParameters = true
        }
        if (clearParameters) {
            // If any selections were updated, clear parameters so that they get re-rendered
            this.parameters = undefined
        }

        this.validationWarnings.set(notification.validationWarnings)
        this.validationErrors = notification.validationErrors ?? {}
    }

    @action
    deleteWarning(id: string) {
        this.validationWarnings.delete(id)
        this.performUpdate({
            type: EntityTypeName.Group, entityType: EntityType.Group, id: this.id,
            validationWarnings: [...this.validationWarnings.entries.values()]
        })
    }

    @computed get nameError() {
        return this.validationErrors['name']
    }
}