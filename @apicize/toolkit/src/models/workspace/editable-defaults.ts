import { Selection, WorkspaceDefaultParameters, GetTitle, ExecutionState, ValidationState } from "@apicize/lib-typescript"
import { action, makeObservable, observable, toJS } from "mobx"
import { NO_SELECTION, NO_SELECTION_ID } from "../store"
import { EntityDefaults, EntityTypeName, EntityUpdateNotification, WorkspaceStore } from "../../contexts/workspace.context"
import { EditableWarnings } from "./editable-warnings"
import { EntityType } from "./entity-type"
import { DefaultsUpdate } from "../updates/defaults-update"

export class EditableDefaults {
    public readonly entityType = EntityType.Defaults

    @observable accessor selectedScenario: Selection = NO_SELECTION
    @observable accessor selectedAuthorization: Selection = NO_SELECTION
    @observable accessor selectedCertificate: Selection = NO_SELECTION
    @observable accessor selectedProxy: Selection = NO_SELECTION
    @observable accessor selectedData: Selection = NO_SELECTION
    @observable accessor validationWarnings = new EditableWarnings()

    @observable accessor validationState: ValidationState | undefined
    @observable accessor executionState: ExecutionState | undefined

    @observable accessor id = 'Defaults'
    @observable accessor name = 'Defaults'

    public disabled = false
    
    public dirty = false;

    public constructor(defaults: WorkspaceDefaultParameters, private readonly workspace: WorkspaceStore) {
        this.selectedScenario = defaults.selectedScenario ?? NO_SELECTION
        this.selectedAuthorization = defaults.selectedAuthorization ?? NO_SELECTION
        this.selectedCertificate = defaults.selectedCertificate ?? NO_SELECTION
        this.selectedProxy = defaults.selectedProxy ?? NO_SELECTION
        this.selectedData = defaults.selectedData ?? NO_SELECTION
        this.validationWarnings.set(defaults.validationWarnings)
        this.validationState = defaults.validationState
        makeObservable(this)
    }

    protected performUpdate(update: DefaultsUpdate) {
        this.dirty = true
        this.workspace.update(update)
    }

    @action
    deleteWarning(warningId: string) {
        this.validationWarnings.delete(warningId)
        this.performUpdate({
            type: EntityTypeName.Defaults, entityType: EntityType.Defaults,
            validationWarnings: [...this.validationWarnings.entries.values()]
        })

    }

    @action
    setScenarioId(entityId: string) {
        this.selectedScenario = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({ type: EntityTypeName.Defaults, entityType: EntityType.Defaults, selectedScenario: this.selectedScenario })
    }

    @action
    setAuthorizationId(entityId: string) {
        this.selectedAuthorization = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({ type: EntityTypeName.Defaults, entityType: EntityType.Defaults, selectedAuthorization: this.selectedAuthorization })
    }

    @action
    setCertificateId(entityId: string) {
        this.selectedCertificate = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({ type: EntityTypeName.Defaults, entityType: EntityType.Defaults, selectedCertificate: this.selectedCertificate })
    }

    @action
    setProxyId(entityId: string) {
        this.selectedProxy = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({ type: EntityTypeName.Defaults, entityType: EntityType.Defaults, selectedProxy: this.selectedProxy })
    }

    @action
    setDataId(entityId: string) {
        this.selectedData = entityId === NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.performUpdate({ type: EntityTypeName.Defaults, entityType: EntityType.Defaults, selectedData: this.selectedData })
    }

    @action
    refreshFromExternalSpecificUpdate(notification: EntityUpdateNotification) {
        if (notification.update.entityType !== EntityType.Defaults) {
            return
        }
        const updatedDefaults = notification.update;
        if (updatedDefaults.selectedScenario !== undefined) {
            this.selectedScenario = updatedDefaults.selectedScenario
        }
        if (updatedDefaults.selectedAuthorization !== undefined) {
            this.selectedAuthorization = updatedDefaults.selectedAuthorization
        }
        if (updatedDefaults.selectedCertificate !== undefined) {
            this.selectedCertificate = updatedDefaults.selectedCertificate
        }
        if (updatedDefaults.selectedProxy !== undefined) {
            this.selectedProxy = updatedDefaults.selectedProxy
        }
        if (updatedDefaults.selectedData !== undefined) {
            this.selectedData = updatedDefaults.selectedData
        }
        this.validationWarnings.set(notification.validationWarnings)
    }
}
