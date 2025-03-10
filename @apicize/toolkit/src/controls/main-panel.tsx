import { Stack } from "@mui/material";
import { observer } from "mobx-react-lite";
import { Navigation } from "./navigation/navigation";
import { HelpPanel } from "./help";
import { RequestEditor } from "./editors/request-editor";
import { ScenarioEditor } from "./editors/scenario-editor";
import { AuthorizationEditor } from "./editors/authorization-editor";
import { CertificateEditor } from "./editors/certificate-editor";
import { ProxyEditor } from "./editors/proxy-editor";
import { SettingsEditor } from "./editors/settings-editor";
import { DefaultsEditor } from "./editors/defaults-editor";
import { WarningsEditor } from "./editors/warnings-editor";
import { useWorkspace, WorkspaceMode } from "../contexts/workspace.context";
import { EditableEntityType } from "../models/workspace/editable-entity-type";
import { LogViewer } from "./viewers/log-viewer";
import { RequestList } from "./navigation/lists/request-list";
import { ScenarioList } from "./navigation/lists/scenario-list";
import { AuthorizationList } from "./navigation/lists/authorization-list";
import { CertificateList } from "./navigation/lists/certificate-list";
import { ProxyList } from "./navigation/lists/proxy-list";

const PREFERRED_WIDTH = 1200

export const MainPanel = observer(() => {
    const workspace = useWorkspace()

    let mainPane
    switch (workspace.mode) {
        case WorkspaceMode.Help:
            mainPane = <HelpPanel sx={{ display: 'block', flexGrow: 1 }} />
            break
        case WorkspaceMode.Settings:
            mainPane = <SettingsEditor sx={{ display: 'block', flexGrow: 1 }} />
            break
        case WorkspaceMode.Console:
            mainPane = <LogViewer sx={{ display: 'block', flexGrow: 1 }} />
            break
        case WorkspaceMode.Defaults:
        case WorkspaceMode.Seed:
            mainPane = <DefaultsEditor sx={{ display: 'block', flexGrow: 1 }} />
            break
        case WorkspaceMode.RequestList:
            mainPane = <RequestList sx={{ display: 'block', flexGrow: 1 }} />
            break
        case WorkspaceMode.ScenarioList:
            mainPane = <ScenarioList sx={{ display: 'block', flexGrow: 1 }} />
            break
        case WorkspaceMode.AuthorizationList:
            mainPane = <AuthorizationList sx={{ display: 'block', flexGrow: 1 }} />
            break
        case WorkspaceMode.CertificateList:
            mainPane = <CertificateList sx={{ display: 'block', flexGrow: 1 }} />
            break
        case WorkspaceMode.ProxyList:
            mainPane = <ProxyList sx={{ display: 'block', flexGrow: 1 }} />
            break
        default:
            switch (workspace.active?.entityType) {
                case EditableEntityType.Request:
                case EditableEntityType.Group:
                    mainPane = <RequestEditor sx={{ display: 'block', flexGrow: 1 }} />
                    break
                case EditableEntityType.Scenario:
                    mainPane = <ScenarioEditor sx={{ display: 'block', flexGrow: 1 }} />
                    break
                case EditableEntityType.Authorization:
                    mainPane = <AuthorizationEditor sx={{ display: 'block', flexGrow: 1 }} />
                    break
                case EditableEntityType.Certificate:
                    mainPane = <CertificateEditor sx={{ display: 'block', flexGrow: 1 }} />
                    break
                case EditableEntityType.Proxy:
                    mainPane = <ProxyEditor sx={{ display: 'block', flexGrow: 1 }} />
                    break
                case EditableEntityType.Warnings:
                    mainPane = <WarningsEditor sx={{ display: 'block', flexGrow: 1 }} />
                    break
                default:
                    mainPane = <></>
            }
    }


    return <Stack direction='row' sx={{ width: '100%', height: '100vh', display: 'flex', padding: '0' }}>
        <Navigation />
        {mainPane}
    </Stack>
})
