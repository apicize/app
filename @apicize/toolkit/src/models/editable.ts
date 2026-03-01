import { Body } from "@apicize/lib-typescript"
import { action, computed, observable } from "mobx"
import { EntityType } from "./workspace/entity-type"
import { EditableProxy } from "./workspace/editable-proxy"
import { EditableRequest } from "./workspace/editable-request"
import { EditableRequestGroup } from "./workspace/editable-request-group"
import { EditableAuthorization } from "./workspace/editable-authorization"
import { EditableScenario } from "./workspace/editable-scenario"
import { EditableCertificate } from "./workspace/editable-certificate"
import { EditableDefaults } from "./workspace/editable-defaults"
import { EntityUpdate } from "./updates/entity-update"
import { ExecutionResultViewState } from "./workspace/execution"
import { RequestBodyMimeInfo } from "./workspace/request-body-info"

export type EditableEntity = EditableRequest | EditableRequestGroup | EditableScenario | EditableAuthorization
    | EditableCertificate | EditableProxy | EditableDefaults

/**
 * Interface representing the workspace operations needed by editable model classes
 */
export interface EditableEntityContext {
    update(entity: EntityUpdate): Promise<UpdateResponse>
    getNavigationName(id: string): string
    updateExecutionDetail(execCtr: number): void
    updateExecutionResultViewState(requestOrGroupId: string, executionResultViewState: ExecutionResultViewState): void
    updateRequestBody(requestId: string, body: Body | undefined): Promise<RequestBodyMimeInfo | null>
}

export interface UpdateResponse {
    validationWarnings?: string[]
    validationErrors?: { [name: string]: string },
}

/**
 * Interface to track state of editable entity
 */
export abstract class Editable<T> {
    @observable accessor id: string = ''
    @observable accessor name: string = ''
    @observable accessor dirty: boolean = false

    public abstract readonly entityType: EntityType

    constructor(protected workspace: EditableEntityContext) { }

    markAsDirty() {
        this.dirty = true
    }
}
