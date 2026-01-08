import { Selection, WorkspaceDefaultParameters, GetTitle } from "@apicize/lib-typescript"
import { action, makeObservable, observable, toJS } from "mobx"
import { NO_SELECTION, NO_SELECTION_ID } from "../store"
import { EntityDefaults, WorkspaceStore } from "../../contexts/workspace.context"
import { EditableWarnings } from "./editable-warnings"

export class EditableDefaults {
    @observable accessor selectedScenario: Selection = NO_SELECTION
    @observable accessor selectedAuthorization: Selection = NO_SELECTION
    @observable accessor selectedCertificate: Selection = NO_SELECTION
    @observable accessor selectedProxy: Selection = NO_SELECTION
    @observable accessor selectedData: Selection = NO_SELECTION
    @observable accessor warnings = new EditableWarnings()

    @observable accessor id = 'Defaults'
    @observable accessor name = 'Defaults'
    public dirty = false;

    public constructor(defaults: WorkspaceDefaultParameters, private readonly workspace: WorkspaceStore) {
        this.selectedScenario = defaults.selectedScenario ?? NO_SELECTION
        this.selectedAuthorization = defaults.selectedAuthorization ?? NO_SELECTION
        this.selectedCertificate = defaults.selectedCertificate ?? NO_SELECTION
        this.selectedProxy = defaults.selectedProxy ?? NO_SELECTION
        this.selectedData = defaults.selectedData ?? NO_SELECTION
        this.warnings.set(defaults.validationWarnings)
        makeObservable(this)
    }

    private onUpdate() {
        this.dirty = true
        this.workspace.updateDefaults({
            selectedScenario: this.selectedScenario.id === NO_SELECTION_ID ? undefined : toJS(this.selectedScenario),
            selectedAuthorization: this.selectedAuthorization.id === NO_SELECTION_ID ? undefined : toJS(this.selectedAuthorization),
            selectedCertificate: this.selectedCertificate.id === NO_SELECTION_ID ? undefined : toJS(this.selectedCertificate),
            selectedProxy: this.selectedProxy.id === NO_SELECTION_ID ? undefined : toJS(this.selectedProxy),
            selectedData: this.selectedData.id === NO_SELECTION_ID ? undefined : toJS(this.selectedData),
            validationWarnings: this.warnings.hasEntries ? [...this.warnings.entries.values()] : undefined,
        })
    }

    @action
    deleteWarning(warningId: string) {
        this.warnings.delete(warningId)
        this.onUpdate()
    }

    @action
    setScenarioId(entityId: string) {
        this.selectedScenario = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.onUpdate()
    }

    @action
    setAuthorizationId(entityId: string) {
        this.selectedAuthorization = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.onUpdate()
    }

    @action
    setCertificateId(entityId: string) {
        this.selectedCertificate = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.onUpdate()
    }

    @action
    setProxyId(entityId: string) {
        this.selectedProxy = entityId == NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.onUpdate()
    }

    @action
    setDataId(entityId: string) {
        this.selectedData = entityId === NO_SELECTION_ID
            ? NO_SELECTION
            : { id: entityId, name: this.workspace.data?.find(d => d.id === entityId)?.name ?? "Unnamed" }
        this.onUpdate()
    }

    @action
    refreshFromExternalUpdate(updatedDefaults: EntityDefaults) {
        this.selectedScenario = updatedDefaults.selectedScenario ?? NO_SELECTION
        this.selectedAuthorization = updatedDefaults.selectedAuthorization ?? NO_SELECTION
        this.selectedCertificate = updatedDefaults.selectedCertificate ?? NO_SELECTION
        this.selectedProxy = updatedDefaults.selectedProxy ?? NO_SELECTION
        this.selectedData = updatedDefaults.selectedData ?? NO_SELECTION
        this.warnings.set(updatedDefaults.validationWarnings)
    }
}
