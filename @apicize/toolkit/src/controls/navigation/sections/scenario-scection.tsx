import ScenarioIcon from "../../../icons/scenario-icon"
import { EntityType } from "../../../models/workspace/entity-type"
import { useWorkspace } from "../../../contexts/workspace.context"
import { observer } from "mobx-react-lite"
import { ClipboardDataType } from "../../../contexts/clipboard.context"
import { ResourceSection } from "./resource-section"

export const ScenarioSection = observer(({ includeHeader }: { includeHeader: boolean }) => {
    const workspace = useWorkspace()

    return <ResourceSection
        includeHeader={includeHeader}
        entityType={EntityType.Scenario}
        title='Scenarios'
        singularName='Scenario'
        icon={<ScenarioIcon />}
        iconColor='scenario'
        helpTopic='workspace/scenarios'
        clipboardDataType={ClipboardDataType.Scenario}
        parameters={workspace.navigation.scenarios}
        addEntity={workspace.addScenario.bind(workspace)}
        deleteEntity={workspace.deleteScenario.bind(workspace)}
        moveEntity={workspace.moveScenario.bind(workspace)}
        buildClipboardPayload={(id) => ({ payloadType: 'Scenario', scenarioId: id })}
    />
})
