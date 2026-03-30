import { Identifiable } from "./identifiable"
import { Named } from "./named"
import { ParameterCipher } from "./parameter-cipher"
import { ValidationErrors } from "./validation"


/**
 * Request certificate configuration
 */
export type Certificate = ParameterCipher | CertificatePlain

/**
 * Request certificate configuration (unencrypted)
 */
export type CertificatePlain = Pkcs12Certificate | Pkcs8PemCertificate | PemCertificate

/**
 * Specifies the type of certificate used for a request
 */
export enum CertificateType {
    PKCS12 = 'PKCS12',
    PKCS8_PEM = 'PKCS8_PEM',
    PEM = 'PEM',
}

/**
 * Information required for PFX certificate
 */
export interface Pkcs12Certificate extends Identifiable, Named, ValidationErrors {
    type: CertificateType.PKCS12
    /**
     * Base 64 representation of PFX
     */
    pfx: string
    password: string
}

/**
 * Information required for PEM certificate / key
 */
export interface Pkcs8PemCertificate extends Identifiable, Named, ValidationErrors {
    type: CertificateType.PKCS8_PEM
    /**
     * Base 64 representation of PEM
     */
    pem: string
    /**
     * Base 64 representation of key
     */
    key?: string
}

/**
 * Information required for PEM certificate / key
 */
export interface PemCertificate extends Identifiable, Named, ValidationErrors {
    type: CertificateType.PEM
    /**
     * Base 64 representation of PEM
     */
    pem: string
}

