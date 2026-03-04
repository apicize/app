import ProxyIcon from "../../../icons/proxy-icon"
import { EntityType } from "../../../models/workspace/entity-type"
import { useWorkspace } from "../../../contexts/workspace.context"
import { observer } from "mobx-react-lite"
import { ClipboardDataType } from "../../../contexts/clipboard.context"
import { ResourceSection } from "./resource-section"

export const ProxySection = observer(({ includeHeader }: { includeHeader: boolean }) => {
    const workspace = useWorkspace()

    return <ResourceSection
        includeHeader={includeHeader}
        entityType={EntityType.Proxy}
        title='Proxies'
        singularName='Proxy'
        icon={<ProxyIcon />}
        iconColor='proxy'
        helpTopic='workspace/proxies'
        clipboardDataType={ClipboardDataType.Proxy}
        parameters={workspace.navigation.proxies}
        addEntity={workspace.addProxy.bind(workspace)}
        deleteEntity={workspace.deleteProxy.bind(workspace)}
        moveEntity={workspace.moveProxy.bind(workspace)}
        buildClipboardPayload={(id) => ({ payloadType: 'Proxy', proxyId: id })}
    />
})
