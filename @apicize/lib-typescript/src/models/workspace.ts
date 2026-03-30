import { IndexedEntities } from './indexed-entities'
import { RequestEntry } from './request'
import { WorkspaceDefaultParameters } from './selected-parameters'
import { Scenario } from './scenario'
import { Authorization } from './authorization'
import { Certificate } from './certificate'
import { Proxy } from './proxy'
import { DataSet } from './data-set'

/**
 * A workspace is an indexed view of an Apicize workbook,
 * as well as any associated workbook private information file 
 * and global credentials
 */
export interface Workspace {
    version: number
    requests: IndexedEntities<RequestEntry>,
    scenarios: IndexedEntities<Scenario>,
    authorizations: IndexedEntities<Authorization>,
    certificates: IndexedEntities<Certificate>,
    proxies: IndexedEntities<Proxy>,
    defaults: WorkspaceDefaultParameters,
    data: DataSet[],
    privateLockStatus: ParameterLockStatus,
    vaultLockStatus: ParameterLockStatus,
}

/**
 * Lock status of workbook opened in workspace, indicating whether entries can be accessed
 */
export enum ParameterLockStatus {
    UnlockedNoPassword = 0,
    UnlockedWithEnvVar = 1,
    UnlockedWithPassword = 2,
    Locked = 3,
    LockedInvalidEnvVar = 4,
    LockedInvalidPassword = 5,    
}

export function getLockStatusColor(lockStatus: ParameterLockStatus | null): 'warning' | 'error' | 'success' | null {
    switch (lockStatus) {
        case ParameterLockStatus.Locked:
            return 'warning'
        case ParameterLockStatus.LockedInvalidEnvVar:
        case ParameterLockStatus.LockedInvalidPassword:
            return 'error'
        case ParameterLockStatus.UnlockedWithEnvVar:
        case ParameterLockStatus.UnlockedWithPassword:
            return 'success'
        default:
            return null
    }
}

export function isLocked(lockStatus: ParameterLockStatus | null) {
    switch (lockStatus) {
        case ParameterLockStatus.Locked:
        case ParameterLockStatus.LockedInvalidEnvVar:
        case ParameterLockStatus.LockedInvalidPassword:
            return true
        default:
            return false
    }
}

export enum ParameterStore {
    Vault = 1,
    Private = 2
}