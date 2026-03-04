import AuthorizationIcon from "../../../icons/auth-icon"
import { EntityType } from "../../../models/workspace/entity-type"
import { useWorkspace } from "../../../contexts/workspace.context"
import { observer } from "mobx-react-lite"
import { ClipboardDataType } from "../../../contexts/clipboard.context"
import { ResourceSection } from "./resource-section"

export const AuthorizationSection = observer(({ includeHeader }: { includeHeader: boolean }) => {
    const workspace = useWorkspace()

    return <ResourceSection
        includeHeader={includeHeader}
        entityType={EntityType.Authorization}
        title='Authorizations'
        singularName='Authorization'
        icon={<AuthorizationIcon />}
        iconColor='authorization'
        helpTopic='workspace/authorizations'
        clipboardDataType={ClipboardDataType.Authorization}
        parameters={workspace.navigation.authorizations}
        addEntity={workspace.addAuthorization.bind(workspace)}
        deleteEntity={workspace.deleteAuthorization.bind(workspace)}
        moveEntity={workspace.moveAuthorization.bind(workspace)}
        buildClipboardPayload={(id) => ({ payloadType: 'Authorization', authorizationId: id })}
    />
})
