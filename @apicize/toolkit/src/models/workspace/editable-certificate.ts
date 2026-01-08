import { CertificateType, Certificate } from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable } from "mobx"
import { EntityType } from "./entity-type"
import { EntityCertificate, EntityTypeName, WorkspaceStore } from "../../contexts/workspace.context"

export class EditableCertificate extends Editable<Certificate> {
    public readonly entityType = EntityType.Certificate

    @observable accessor type = CertificateType.PKCS8_PEM
    @observable accessor pem = ''
    @observable accessor key = ''
    @observable accessor pfx = ''
    @observable accessor password = ''


    public constructor(certificate: Certificate, workspace: WorkspaceStore) {
        super(workspace)
        this.id = certificate.id
        this.name = certificate.name ?? ''

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

    protected onUpdate() {
        this.markAsDirty()
        let result: EntityCertificate

        switch (this.type) {
            case CertificateType.PKCS8_PEM:
                result = {
                    entityTypeName: EntityTypeName.Certificate,
                    type: this.type,
                    id: this.id,
                    name: this.name,
                    pem: this.pem,
                    key: this.key,
                }
                break
            case CertificateType.PEM:
                result = {
                    entityTypeName: EntityTypeName.Certificate,
                    type: this.type,
                    id: this.id,
                    name: this.name,
                    pem: this.pem,
                }
                break
            case CertificateType.PKCS12:
                result = {
                    entityTypeName: EntityTypeName.Certificate,
                    type: this.type,
                    id: this.id,
                    name: this.name,
                    pfx: this.pfx,
                    password: this.password,
                }
                break
        }

        this.workspace.updateCertificate(result)
    }

    @action
    setType(value: CertificateType) {
        this.type = value
        this.onUpdate()
    }

    @action
    setPem(value: string) {
        this.pem = value
        this.onUpdate()
    }

    @action
    setKey(value: string | undefined) {
        this.key = value || ''
        this.onUpdate()
    }

    @action
    setCertificatePfx(value: string) {
        this.pfx = value
        this.onUpdate()
    }

    @action
    setPassword(value: string) {
        this.password = value
        this.onUpdate()
    }

    @action
    refreshFromExternalUpdate(updatedItem: EntityCertificate) {
        this.name = updatedItem.name ?? ''
        switch (updatedItem.type) {
            case CertificateType.PEM:
                this.pem = updatedItem.pem
                break
            case CertificateType.PKCS8_PEM:
                this.pem = updatedItem.pem
                this.key = updatedItem.key ?? ''
                break
            case CertificateType.PKCS12:
                this.pfx = updatedItem.pfx
                this.password = updatedItem.password
                break
        }
    }

    @computed get pemInvalid() {
        return (this.type === CertificateType.PKCS8_PEM || this.type === CertificateType.PEM)
            ? ((this.pem?.length ?? 0) === 0) : false
    }

    @computed get keyInvalid() {
        return this.type === CertificateType.PKCS8_PEM
            ? ((this.key?.length ?? 0) === 0) : false
    }

    @computed get pfxInvalid() {
        return ((this.pfx?.length ?? 0) === 0)
    }

    @computed get validationErrors(): { [property: string]: string } | undefined {
        const results: { [property: string]: string } = {}
        if (this.nameInvalid) {
            results.name = 'Name is required'
        }
        if (this.pemInvalid) {
            results.pem = 'PEM is invalid'
        }
        if (this.keyInvalid) {
            results.key = 'Key is invalid'
        }
        if (this.pfx) {
            results.pfx = 'PFX is invalid'
        }
        return Object.keys(results).length > 0 ? results : undefined
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