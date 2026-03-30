import { Selection, WorkspaceDefaultParameters, ExecutionState, ValidationState, NO_SELECTION, NO_SELECTION_ID } from "@apicize/lib-typescript"
import { action, makeObservable, observable } from "mobx"
import { EditableEntityContext } from "../editable"
import { EntityTypeName } from "../../contexts/workspace.context"
import { EditableWarnings } from "./editable-warnings"
import { EntityType } from "./entity-type"
import { DefaultsUpdate } from "../updates/defaults-update"
import { EntityUpdate } from "../updates/entity-update"

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

    public constructor(defaults: WorkspaceDefaultParameters, private readonly workspace: EditableEntityContext) {
        this.selectedScenario = defaults.selectedScenario ?? NO_SELECTION
        this.selectedAuthorization = defaults.selectedAuthorization ?? NO_SELECTION
        this.selectedCertificate = defaults.selectedCertificate ?? NO_SELECTION
        this.selectedProxy = defaults.selectedProxy ?? NO_SELECTION
        this.selectedData = defaults.selectedData ?? NO_SELECTION
        this.validationWarnings.set(defaults.validationWarnings)
        this.validationState = defaults.validationState
        makeObservable(this)
    }

    protected async performUpdate(update: DefaultsUpdate) {
        this.dirty = true
        await this.workspace.update(update)
    }

    @action
    deleteWarning(warningId: string) {
        this.validationWarnings.delete(warningId)
        return this.performUpdate({
            type: EntityTypeName.Defaults, entityType: EntityType.Defaults,
            validationWarnings: [...this.validationWarnings.entries.values()]
        })

    }

    @action
    setScenarioId(entityId: string) {
        this.selectedScenario = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({ type: EntityTypeName.Defaults, entityType: EntityType.Defaults, selectedScenario: this.selectedScenario })
    }

    @action
    setAuthorizationId(entityId: string) {
        this.selectedAuthorization = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({ type: EntityTypeName.Defaults, entityType: EntityType.Defaults, selectedAuthorization: this.selectedAuthorization })
    }

    @action
    setCertificateId(entityId: string) {
        this.selectedCertificate = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({ type: EntityTypeName.Defaults, entityType: EntityType.Defaults, selectedCertificate: this.selectedCertificate })
    }

    @action
    setProxyId(entityId: string) {
        this.selectedProxy = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({ type: EntityTypeName.Defaults, entityType: EntityType.Defaults, selectedProxy: this.selectedProxy })
    }

    @action
    setDataId(entityId: string) {
        this.selectedData = entityId === NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        return this.performUpdate({ type: EntityTypeName.Defaults, entityType: EntityType.Defaults, selectedData: this.selectedData })
    }

    @action
    refreshFromExternalSpecificUpdate(update: EntityUpdate) {
        if (update.entityType !== EntityType.Defaults) {
            return
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
            this.selectedData = update.selectedData
        }
    }
}
