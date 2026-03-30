import CertificateIcon from "../../../icons/certificate-icon"
import { EntityType } from "../../../models/workspace/entity-type"
import { useWorkspace } from "../../../contexts/workspace.context"
import { ClipboardDataType } from "../../../contexts/clipboard.context"
import { ResourceSection } from "./resource-section"

export const CertificateSection = ({ includeHeader }: { includeHeader: boolean }) => {
    const workspace = useWorkspace()

    return <ResourceSection
        includeHeader={includeHeader}
        entityType={EntityType.Certificate}
        title='Certificates'
        singularName='Certificate'
        icon={<CertificateIcon />}
        iconColor='certificate'
        helpTopic='workspace/certificates'
        clipboardDataType={ClipboardDataType.Certificate}
        parameters={workspace.navigation.certificates}
        addEntity={workspace.addCertificate.bind(workspace)}
        deleteEntity={workspace.deleteCertificate.bind(workspace)}
        moveEntity={workspace.moveCertificate.bind(workspace)}
        buildClipboardPayload={(id) => ({ payloadType: 'Certificate', certificateId: id })}
    />
}
