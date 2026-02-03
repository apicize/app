import { CertificateType, Certificate, ValidationErrorList } from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable, runInAction } from "mobx"
import { EntityType } from "./entity-type"
import { EntityTypeName, EntityUpdateNotification, WorkspaceStore } from "../../contexts/workspace.context"
import { CertificateUpdate } from "../updates/certificate-update"

export class EditableCertificate extends Editable<Certificate> {
    public readonly entityType = EntityType.Certificate

    @observable accessor type = CertificateType.PKCS8_PEM
    @observable accessor pem = ''
    @observable accessor key = ''
    @observable accessor pfx = ''
    @observable accessor password = ''

    @observable accessor validationErrors: ValidationErrorList

    public constructor(certificate: Certificate, workspace: WorkspaceStore) {
        super(workspace)
        this.id = certificate.id
        this.name = certificate.name ?? ''
        this.validationErrors = certificate.validationErrors ?? {}

        switch (certificate.type) {
            case CertificateType.PKCS8_PEM:
                this.pem = certificate.pem
                this.key = certificate.key ?? ''
                break
            case CertificateType.PEM:
                this.pem = certificate.pem
                break
            case CertificateType.PKCS12:
                this.pfx = certificate.pfx
                this.password = certificate.password
                break
            default:
                throw new Error('Invalid certificate type')
        }
    }

    protected performUpdate(update: CertificateUpdate) {
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
        this.performUpdate({ type: EntityTypeName.Certificate, entityType: EntityType.Certificate, id: this.id, name: value })
    }

    @action
    setType(value: CertificateType) {
        this.type = value
        this.performUpdate({ type: EntityTypeName.Certificate, entityType: EntityType.Certificate, id: this.id, certType: value })
    }

    @action
    setPem(value: string) {
        this.pem = value
        this.performUpdate({ type: EntityTypeName.Certificate, entityType: EntityType.Certificate, id: this.id, pem: value })
    }

    @action
    setKey(value: string | undefined) {
        this.key = value || ''
        this.performUpdate({ type: EntityTypeName.Certificate, entityType: EntityType.Certificate, id: this.id, key: value ?? null })
    }

    @action
    setCertificatePfx(value: string) {
        this.pfx = value
        this.performUpdate({ type: EntityTypeName.Certificate, entityType: EntityType.Certificate, id: this.id, pfx: value })
    }

    @action
    setPassword(value: string) {
        this.password = value
        this.performUpdate({ type: EntityTypeName.Certificate, entityType: EntityType.Certificate, id: this.password, pfx: value })
    }

    @action
    refreshFromExternalSpecificUpdate(notification: EntityUpdateNotification) {
        if (notification.update.entityType !== EntityType.Certificate) {
            return
        }
        if (notification.update.name !== undefined) {
            this.name = notification.update.name
        }
        if (notification.update.certType !== undefined) {
            this.type = notification.update.certType
        }
        if (notification.update.pem !== undefined) {
            this.pem = notification.update.pem
        }
        if (notification.update.key !== undefined) {
            this.key = notification.update.key ?? ''
        }
        if (notification.update.pfx !== undefined) {
            this.pfx = notification.update.pfx
        }
        if (notification.update.password !== undefined) {
            this.password = notification.update.password
        }
        this.validationErrors = notification.validationErrors ?? {}
    }

    @computed get nameError() {
        // return this.type === AuthorizationType.ApiKey && ((this.header?.length ?? 0) === 0)
        return this.validationErrors['nameError']
    }

    @computed get pemError() {
        return this.validationErrors['pem']
        // return (this.type === CertificateType.PKCS8_PEM || this.type === CertificateType.PEM)
        //     ? ((this.pem?.length ?? 0) === 0) : false
    }

    @computed get keyError() {
        return this.validationErrors['key']
        // return this.type === CertificateType.PKCS8_PEM
        //     ? ((this.key?.length ?? 0) === 0) : false
    }

    @computed get pfxError() {
        return this.validationErrors['pfx']
        // return ((this.pfx?.length ?? 0) === 0)
    }
}


/**
 * Type of certificate file to open
 */
export enum CertificateFileType {
    PEM,
    Key,
    PFX
}