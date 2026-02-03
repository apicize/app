import Stack from "@mui/material/Stack";
import { observer } from "mobx-react-lite";
import { HelpPanel } from "./help";
import { RequestEditor } from "./editors/request-editor";
import { ScenarioEditor } from "./editors/scenario-editor";
import { AuthorizationEditor } from "./editors/authorization-editor";
import { CertificateEditor } from "./editors/certificate-editor";
import { ProxyEditor } from "./editors/proxy-editor";
import { SettingsEditor } from "./editors/settings-editor";
import { DefaultsEditor } from "./editors/defaults-editor";
import { useWorkspace, WorkspaceMode } from "../contexts/workspace.context";
import { EntityType } from "../models/workspace/entity-type";
import { LogViewer } from "./viewers/log-viewer";
import { RequestList } from "./navigation/lists/request-list";
import { ScenarioList } from "./navigation/lists/scenario-list";
import { AuthorizationList } from "./navigation/lists/authorization-list";
import { CertificateList } from "./navigation/lists/certificate-list";
import { ProxyList } from "./navigation/lists/proxy-list";
import { NavigationControl } from "./navigation/navigation";
import { RequestGroupEditor } from "./editors/request-group-editor";
import { when } from "mobx";
import { useApicizeSettings } from "../contexts/apicize-settings.context";
import { useFileOperations } from "../contexts/file-operations.context";
import useWindowSize from "../window-size";
import { useMemo } from "react";
import { DataSetEditor } from "./editors/data-set-editor";
import { DataSetList } from "./navigation/lists/data-set-list";

export const MainPanel = observer(() => {
    const workspace = useWorkspace()
    const settings = useApicizeSettings()
    const fileOps = useFileOperations()
    const windowSize = useWindowSize()

    const mode = workspace.mode
    const activeSelection = workspace.activeSelection

    when(
        () => settings.readyToSave === true,
        () => {
            settings.clearChangeCtr()
            fileOps.saveSettings()
        }
    )

    const Pane = useMemo(() => {
        switch (mode) {
            case WorkspaceMode.Help:
                return <HelpPanel sx={{ display: 'block', flexGrow: 1 }} />
            case WorkspaceMode.Settings:
                return <SettingsEditor sx={{ display: 'block', flexGrow: 1 }} />
            case WorkspaceMode.Console:
                return <LogViewer />
            // case WorkspaceMode.Warnings:
            //     return <WarningsEditor sx={{ display: 'block', flexGrow: 1 }} />
            case WorkspaceMode.Defaults:
                return <DefaultsEditor sx={{ display: 'block', flexGrow: 1 }} />
            case WorkspaceMode.RequestList:
                return <RequestList sx={{ display: 'block', flexGrow: 1 }} />
            case WorkspaceMode.ScenarioList:
                return <ScenarioList sx={{ display: 'block', flexGrow: 1 }} />
            case WorkspaceMode.DataSetList:
                return <DataSetList sx={{ display: 'block', flexGrow: 1 }} />
            case WorkspaceMode.AuthorizationList:
                return <AuthorizationList sx={{ display: 'block', flexGrow: 1 }} />
            case WorkspaceMode.CertificateList:
                return <CertificateList sx={{ display: 'block', flexGrow: 1 }} />
            case WorkspaceMode.ProxyList:
                return <ProxyList sx={{ display: 'block', flexGrow: 1 }} />
            default:
                if (activeSelection) {
                    switch (activeSelection.entityType) {
                        case EntityType.Request:
                            return <RequestEditor request={activeSelection} sx={{ display: 'block', flexGrow: 1 }} />
                        case EntityType.Group:
                            return <RequestGroupEditor group={activeSelection} sx={{ display: 'block', flexGrow: 1 }} />
                        case EntityType.Scenario:
                            return <ScenarioEditor scenario={activeSelection} sx={{ display: 'block', flexGrow: 1 }} />
                        case EntityType.DataSet:
                            return <DataSetEditor dataSet={activeSelection} sx={{ display: 'block', flexGrow: 1 }} />
                        case EntityType.Authorization:
                            return <AuthorizationEditor authorization={activeSelection} sx={{ display: 'block', flexGrow: 1 }} />
                        case EntityType.Certificate:
                            return <CertificateEditor certificate={activeSelection} sx={{ display: 'block', flexGrow: 1 }} />
                        case EntityType.Proxy:
                            return <ProxyEditor proxy={activeSelection} sx={{ display: 'block', flexGrow: 1 }} />
                        default:
                            return <></>
                    }
                } else {
                    return <></>
                }
        }
    }, [mode, activeSelection])

    return <Stack direction='row' sx={{ width: windowSize.width, height: windowSize.height, display: 'flex', padding: '0' }}>
        <NavigationControl />
        {Pane}
    </Stack>
})
