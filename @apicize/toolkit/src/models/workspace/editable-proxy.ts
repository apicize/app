import { Proxy, ValidationErrorList } from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable, runInAction } from "mobx"
import { EntityType } from "./entity-type"
import { EditableEntityContext } from "../editable"
import { EntityTypeName, EntityUpdateNotification } from "../../contexts/workspace.context"
import { ProxyUpdate } from "../updates/proxy-update"

export class EditableProxy extends Editable {
    public readonly entityType = EntityType.Proxy
    @observable accessor url = ''

    @observable accessor validationErrors: ValidationErrorList

    public constructor(entry: Proxy, workspace: EditableEntityContext) {
        super(workspace)
        this.id = entry.id
        this.name = entry.name ?? ''
        this.url = entry.url
        this.validationErrors = entry.validationErrors ?? {}
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
    refreshFromExternalSpecificUpdate(notification: EntityUpdateNotification) {
        if (notification.update.entityType !== EntityType.Proxy) {
            return
        }
        if (notification.update.name !== undefined) {
            this.name = notification.update.name
        }
        if (notification.update.url !== undefined) {
            this.name = notification.update.url
        }
        this.validationErrors = notification.validationErrors ?? {}
    }

    @computed get nameError() {
        return this.validationErrors['name']
    }

    @computed get urlError() {
        return this.validationErrors['url']
    }

}
