import { EntityType } from "../../models/workspace/entity-type";
import { useWorkspace } from "../../contexts/workspace.context";
import { ParameterLockStatus, ParameterStore } from "@apicize/lib-typescript";
import { ParamNavigationSection } from "../../models/navigation";
import { LockEditor } from "../editors/settings/lock-editor";

export function EncyrptedViewer({ id, entityType }: { id: string, entityType: EntityType }) {
    const workspace = useWorkspace()

    let section: ParamNavigationSection | null = null

    switch (entityType) {
        case EntityType.Scenario:
            section = workspace.navigation.scenarios
            break
        case EntityType.Authorization:
            section = workspace.navigation.authorizations
            break
        case EntityType.Certificate:
            section = workspace.navigation.certificates
            break
        case EntityType.Proxy:
            section = workspace.navigation.proxies
            break
    }

    let store: ParameterStore | null = null
    let status: ParameterLockStatus | null = null
    let envVarSet = false
    if (section) {
        if (section.vault.find(n => n.id === id)) {
            store = ParameterStore.Vault
            status = workspace.vaultLockStatus
            envVarSet = workspace.vaultEnvVarSet
        } else if (section.private.find(n => n.id === id)) {
            store = ParameterStore.Private
            status = workspace.privateLockStatus
            envVarSet = workspace.privateEnvVarSet
        }
    }

    return (store && status)
        ? <LockEditor store={store} status={status} envVarSet={envVarSet} />
        : <h2>Encrypted</h2>
}