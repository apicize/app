import { Proxy } from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable } from "mobx"
import { EntityType } from "./entity-type"
import { EntityProxy, EntityTypeName, WorkspaceStore } from "../../contexts/workspace.context"

export class EditableProxy extends Editable<Proxy> {
    public readonly entityType = EntityType.Proxy
    @observable accessor url = ''

    public constructor(entry: Proxy, workspace: WorkspaceStore) {
        super(workspace)
        this.id = entry.id
        this.name = entry.name ?? ''
        this.url = entry.url
    }

    protected onUpdate() {
        this.markAsDirty()
        this.workspace.updateProxy({
            entityTypeName: EntityTypeName.Proxy,
            id: this.id,
            name: this.name,
            url: this.url,
        })
    }

    @action
    setUrl(value: string) {
        this.url = value
        this.onUpdate()
    }

    @action
    refreshFromExternalUpdate(updatedItem: EntityProxy) {
        this.name = updatedItem.name ?? ''
        this.url = updatedItem.url
    }

    @computed get nameInvalid() {
        return ((this.name?.length ?? 0) === 0)
    }

    @computed get urlInvalid() {
        return ! /^(\{\{.+\}\}|https?:\/\/|socks5:\/\/)(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?$/.test(this.url)
    }

    @computed get validationErrors(): { [property: string]: string } | undefined {
        const results: { [property: string]: string } = {}
        if (this.nameInvalid) {
            results.name = 'Name is required'
        }
        if (this.urlInvalid) {
            results.url = 'The proxy URL is invalid'
        }
        return Object.keys(results).length > 0 ? results : undefined
    }
}
