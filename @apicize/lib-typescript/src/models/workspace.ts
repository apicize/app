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
}
