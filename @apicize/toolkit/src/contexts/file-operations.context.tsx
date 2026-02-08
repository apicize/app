import { createContext, useContext } from "react";
import { SshFileType } from "../models/workspace/ssh-file-type";
import { HelpContents } from "../models/help-contents";
import { EditableSettings } from "../models/editable-settings";
import { OpenDataSetFileResponse, UpdateResponse } from "./workspace.context";
import { DataSet, DataSourceType } from "@apicize/lib-typescript";

export class FileOperationsStore {
    public readonly newWorkbook: (openInNewWindow: boolean) => Promise<void>
    public readonly openWorkbook: (openInNewWindow: boolean, fileName?: string, doUpdateSettings?: boolean) => Promise<void>
    public readonly saveWorkbook: () => Promise<void>
    public readonly saveWorkbookAs: () => Promise<void>
    public readonly cloneWorkspace: () => Promise<void>
    public readonly openSshFile: (fileType: SshFileType) => Promise<string | null>
    public readonly openFile: () => Promise<Uint8Array | null>
    public readonly saveSettings: () => void
    public readonly retrieveHelpTopic: (showTopic: string) => Promise<string>
    public readonly retrieveHelpContents: () => Promise<HelpContents>
    public readonly selectWorkbookDirectory: () => Promise<string | null>
    public readonly generateDefaultSettings: () => Promise<EditableSettings>
    public readonly openDataSetFile: (dataSetId: string) => Promise<OpenDataSetFileResponse>
    public readonly openDataSetFileFrom: (dataSetId: string, sourceType: DataSourceType) => Promise<OpenDataSetFileResponse | null>
    public readonly saveDataSetAs: (dataSetId: string, sourceType: DataSourceType) => Promise<string | null>

    constructor(callbacks: {
        onNewWorkbook: (openInNewWindow: boolean) => Promise<void>,
        onOpenWorkbook: (openInNewWindow: boolean, fileName?: string, doUpdateSettings?: boolean) => Promise<void>,
        onSaveWorkbook: () => Promise<void>,
        onSaveWorkbookAs: () => Promise<void>,
        onCloneWorkspace: () => Promise<void>,
        onOpenSshFile: (fileType: SshFileType) => Promise<string | null>,
        onOpenFile: () => Promise<Uint8Array | null>,
        onSaveSettings: () => void,
        onRetrieveHelpTopic: (showTopic: string) => Promise<string>,
        onRetrieveHelpContents: () => Promise<HelpContents>,
        onSelectWorkbookDirectory: () => Promise<string | null>,
        onGenerateDefaultSettings: () => Promise<EditableSettings>,
        onOpenDataSetFile: (dataSetId: string) => Promise<OpenDataSetFileResponse>,
        onOpenDataSetFileFrom: (dataSetId: string, sourceType: DataSourceType) => Promise<OpenDataSetFileResponse | null>,
        onSaveDataSetAs: (dataSetId: string, sourceType: DataSourceType) => Promise<string | null>,
    }) {
        this.newWorkbook = callbacks.onNewWorkbook
        this.openWorkbook = callbacks.onOpenWorkbook
        this.saveWorkbook = callbacks.onSaveWorkbook
        this.saveWorkbookAs = callbacks.onSaveWorkbookAs
        this.cloneWorkspace = callbacks.onCloneWorkspace
        this.openSshFile = callbacks.onOpenSshFile
        this.openFile = callbacks.onOpenFile
        this.saveSettings = callbacks.onSaveSettings
        this.retrieveHelpTopic = callbacks.onRetrieveHelpTopic
        this.retrieveHelpContents = callbacks.onRetrieveHelpContents
        this.selectWorkbookDirectory = callbacks.onSelectWorkbookDirectory
        this.generateDefaultSettings = callbacks.onGenerateDefaultSettings
        this.openDataSetFile = callbacks.onOpenDataSetFile
        this.openDataSetFileFrom = callbacks.onOpenDataSetFileFrom
        this.saveDataSetAs = callbacks.onSaveDataSetAs
    }
}

export const FileOperationsContext = createContext<FileOperationsStore | null>(null)

export function useFileOperations() {
    const context = useContext(FileOperationsContext);
    if (!context) {
        throw new Error('useFileOperations must be used within a FileOperationsContext.Provider');
    }
    return context;
}

