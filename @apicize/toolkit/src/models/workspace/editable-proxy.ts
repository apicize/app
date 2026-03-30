import { Proxy, ValidationErrorList } from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable, runInAction } from "mobx"
import { EntityType } from "./entity-type"
import { EditableEntityContext } from "../editable"
import { EntityTypeName } from "../../contexts/workspace.context"
import { ProxyUpdate } from "../updates/proxy-update"
import { EntityUpdate } from "../updates/entity-update"

export class EditableProxy extends Editable {
    public readonly entityType = EntityType.Proxy
    @observable accessor encrypted: boolean

    @observable accessor url = ''

    @observable accessor validationErrors: ValidationErrorList = {}

    public constructor(proxy: Proxy, workspace: EditableEntityContext) {
        super(proxy.id, proxy.name ?? '', workspace)
        if ('data' in proxy) {
            this.encrypted = true
        } else {
            this.encrypted = false
            this.url = proxy.url
            this.validationErrors = proxy.validationErrors ?? {}
        }
    }

    protected async performUpdate(update: ProxyUpdate) {
        this.markAsDirty()
        const updates = await this.workspace.update(update)
        runInAction(() => {
            if (updates) {
                this.validationErrors = updates.validationErrors || {}
            }
        })
    }

    @action
    setName(value: string) {
        this.name = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Proxy, entityType: EntityType.Proxy, name: value })
    }

    @action
    setUrl(value: string) {
        this.url = value
        return this.performUpdate({ id: this.id, type: EntityTypeName.Proxy, entityType: EntityType.Proxy, url: value })
    }

    @action
    refreshFromExternalSpecificUpdate(update: EntityUpdate) {
        if (update.entityType !== EntityType.Proxy) {
            return
        }
        if (update.encrypted !== undefined) {
            this.encrypted = update.encrypted
        }
        if (update.name !== undefined) {
            this.name = update.name
        }
        if (update.url !== undefined) {
            this.name = update.url
        }
    }

    @computed get nameError() {
        return this.validationErrors['name']
    }

    @computed get urlError() {
        return this.validationErrors['url']
    }

}
