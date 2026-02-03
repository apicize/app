import { action, computed, observable } from "mobx"
import { EntityType } from "./workspace/entity-type"
import { EditableProxy } from "./workspace/editable-proxy"
import { EditableRequest } from "./workspace/editable-request"
import { EditableRequestGroup } from "./workspace/editable-request-group"
import { EditableAuthorization } from "./workspace/editable-authorization"
import { EditableScenario } from "./workspace/editable-scenario"
import { EditableCertificate } from "./workspace/editable-certificate"
import { WorkspaceStore } from "../contexts/workspace.context"
import { EditableDefaults } from "./workspace/editable-defaults"

export type EditableEntity = EditableRequest | EditableRequestGroup | EditableScenario | EditableAuthorization
    | EditableCertificate | EditableProxy | EditableDefaults

/**
 * Interface to track state of editable entity
 */
export abstract class Editable<T> {
    @observable accessor id: string = ''
    @observable accessor name: string = ''
    @observable accessor dirty: boolean = false

    public abstract readonly entityType: EntityType

    constructor(protected workspace: WorkspaceStore) { }

    markAsDirty() {
        this.dirty = true
    }
}
