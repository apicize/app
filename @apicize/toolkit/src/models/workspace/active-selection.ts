import { action, makeObservable, observable, runInAction } from "mobx"
import { EditableRequest } from "../workspace/editable-request"
import { EditableRequestGroup } from "../workspace/editable-request-group"
import { EditableScenario } from "../workspace/editable-scenario"
import { EditableAuthorization } from "../workspace/editable-authorization"
import { EditableCertificate } from "../workspace/editable-certificate"
import { EditableProxy } from "../workspace/editable-proxy"
import {
    ExecutionResultDetail,
} from "@apicize/lib-typescript"
import { EntityType } from "../workspace/entity-type"

export type ActiveSelection = ISelectedRequest | ISelectedGroup | ISelectedScenario | ISelectedAuthorization |
    ISelectedCertificate | ISelectedProxy

export interface ISelectedRequest {
    entityType: EntityType.Request
    id: string
}

export interface ISelectedGroup {
    entityType: EntityType.Group
    id: string
    group: EditableRequestGroup
    executionDetail: ExecutionResultDetail | null
}

export interface ISelectedScenario {
    entityType: EntityType.Scenario
}

export interface ISelectedAuthorization {
    entityType: EntityType.Authorization
    id: string
    authorization: EditableAuthorization
}

export interface ISelectedCertificate {
    entityType: EntityType.Certificate
    id: string
    certificate: EditableCertificate
}

export interface ISelectedProxy {
    entityType: EntityType.Proxy
    id: string
    proxy: EditableProxy
}


export class SelectedRequest implements ISelectedRequest {
    public readonly id: string
    public readonly entityType = EntityType.Request
    @observable public accessor request: EditableRequest
    @observable public accessor executionDetail: ExecutionResultDetail | null
    public constructor(
        request: EditableRequest,
        executionDetail: ExecutionResultDetail | null,
    ) {
        makeObservable(this)
        this.id = request.id
        this.request = request
        this.executionDetail = executionDetail
    }
}

export class SelectedGroup implements ISelectedGroup {
    public readonly entityType = EntityType.Group
    public readonly id: string
    @observable public accessor group: EditableRequestGroup
    @observable public accessor executionDetail: ExecutionResultDetail | null = null
    public constructor(
        group: EditableRequestGroup,
        executionDetail: ExecutionResultDetail | null,
    ) {
        makeObservable(this)
        this.id = group.id
        this.group = group
        this.executionDetail = executionDetail
    }
}

export class SelectedScenario implements ISelectedScenario {
    public readonly entityType = EntityType.Scenario
    public readonly id: string
    @observable public accessor scenario: EditableScenario
    public constructor(
        scenario: EditableScenario
    ) {
        makeObservable(this)
        this.id = scenario.id
        this.scenario = scenario
    }
}

export class SelectedAuthorization implements ISelectedAuthorization {
    public readonly entityType = EntityType.Authorization
    public readonly id: string
    @observable public accessor authorization: EditableAuthorization
    public constructor(
        authorization: EditableAuthorization
    ) {
        makeObservable(this)
        this.id = authorization.id
        this.authorization = authorization
    }
}

export class SelectedCertificate implements ISelectedCertificate {
    public readonly entityType = EntityType.Certificate
    public readonly id: string
    @observable public accessor certificate: EditableCertificate
    public constructor(
        certificate: EditableCertificate
    ) {
        makeObservable(this)
        this.id = certificate.id
        this.certificate = certificate
    }
}

export class SelectedProxy implements ISelectedProxy {
    public readonly entityType = EntityType.Proxy
    public readonly id: string
    @observable public accessor proxy: EditableProxy
    public constructor(
        proxy: EditableProxy
    ) {
        makeObservable(this)
        this.id = proxy.id
        this.proxy = proxy
    }
}
