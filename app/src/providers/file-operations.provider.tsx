import { ReactNode, useEffect, useRef } from "react";
import * as core from '@tauri-apps/api/core'
import * as dialog from '@tauri-apps/plugin-dialog'
import * as path from '@tauri-apps/api/path'
import { exists, readFile, readTextFile } from "@tauri-apps/plugin-fs"
import { base64Encode, DataSetContent, FileOperationsContext, FileOperationsStore, HelpContents, OpenDataSetFileResponse, SshFileType, ToastSeverity, UpdateResponse, useApicizeSettings, useFeedback, WorkspaceStore } from "@apicize/toolkit";
import { ApicizeSettings, DataSet, DataSourceType } from "@apicize/lib-typescript";
import { extname, join, resourceDir } from '@tauri-apps/api/path';
import { EditableSettings } from "@apicize/toolkit/dist/models/editable-settings";
import { EditableDataSet } from "@apicize/toolkit/dist/models/workspace/editable-data-set";


/**
 * Implementation of file opeartions via Tauri
 */
export function FileOperationsProvider(
    { activeSessionId, workspaceStore, children }:
        { activeSessionId: string, workspaceStore: WorkspaceStore, children?: ReactNode }
) {
    const EXT = 'apicize';

    const feedback = useFeedback()
    const apicizeSettings = useApicizeSettings()

    const _sshPath = useRef('')
    const _bodyDataPath = useRef('')

    /**
     * Generate default settings
     * @returns set of default settings
     */
    const generateDefaultSettings = async (): Promise<EditableSettings> => {
        const returnedSettings = await core.invoke<ApicizeSettings>('generate_settings_defaults', {})
        return new EditableSettings(returnedSettings)
    }

    /**
     * Updates specified settings and saves
     * @param updates 
     */
    const saveSettings = () => {
        const updatedSettings: ApicizeSettings = {
            workbookDirectory: apicizeSettings.workbookDirectory,
            lastWorkbookFileName: apicizeSettings.lastWorkbookFileName,
            fontSize: apicizeSettings.fontSize,
            navigationFontSize: apicizeSettings.navigationFontSize,
            colorScheme: apicizeSettings.colorScheme,
            editorPanels: apicizeSettings.editorPanels,
            recentWorkbookFileNames: apicizeSettings.recentWorkbookFileNames.length > 0
                ? apicizeSettings.recentWorkbookFileNames
                : undefined,
            pkceListenerPort: apicizeSettings.pkceListenerPort,
            alwaysHideNavTree: apicizeSettings.alwaysHideNavTree,
            showDiagnosticInfo: apicizeSettings.showDiagnosticInfo,
            reportFormat: apicizeSettings.reportFormat,
            editorIndentSize: apicizeSettings.editorIndentSize,
            editorDetectExistingIndent: apicizeSettings.editorDetectExistingIndent,
            editorCheckJsSyntax: apicizeSettings.editorCheckJsSyntax,
        }
        core.invoke<ApicizeSettings>('save_settings', { updatedSettings })
            .catch(e => {
                feedback.toast(`Unable to save settings: ${e}`, ToastSeverity.Error)
            })
    }

    /**
     * Return SSH path if available, otherwise, fall back to settings
     * @returns 
     */
    const getSshPath = async () => {
        if (_sshPath.current.length > 0) {
            if (await exists(_sshPath.current)) {
                return _sshPath.current
            }
        }
        const home = await path.homeDir()
        const openSshPath = await path.join(home, '.ssh')
        if (await exists(openSshPath)) {
            _sshPath.current = openSshPath
        } else {
            _sshPath.current = apicizeSettings.workbookDirectory
        }
        return _sshPath.current
    }

    /**
     * Returns the last path a file was retrieved from, defaulting to default workbook directory
     * @returns 
     */
    const getBodyDataPath = async () => {
        if (_bodyDataPath.current.length > 0) {
            if (await exists(_bodyDataPath.current)) {
                return _bodyDataPath.current
            }
        }

        const fileName = workspaceStore.fileName
        if (fileName && fileName.length > 0) {
            const base = await path.basename(fileName)
            let i = fileName.indexOf(base)
            if (i != -1) {
                _bodyDataPath.current = fileName.substring(0, i)
                return _bodyDataPath.current
            }
        }
        _bodyDataPath.current = apicizeSettings.workbookDirectory
        return _bodyDataPath.current
    }

    /**
     * Launches a new workspace
     * @returns 
     */
    const newWorkbook = async (openInNewWindow: boolean) => {
        if (!openInNewWindow && workspaceStore.dirty) {
            if (! await feedback.confirm({
                title: 'New Workbook',
                message: 'Are you sure you want to create a new workbook without saving changes?',
                okButton: 'Yes',
                cancelButton: 'No',
                defaultToCancel: true
            })) {
                return
            }
        }

        await core.invoke('new_workspace', { currentSessionId: activeSessionId, openInNewSession: openInNewWindow })
        feedback.toast('Created New Workbook', ToastSeverity.Success)
    }

    /**
     * Loads the specified workbook (if named), otherwise, prompts for workbook
     * @param defaultFileName 
     * @param doUpdateSettings 
     * @returns 
     */
    const openWorkbook = async (openInNewWindow: boolean, defaultFileName?: string) => {
        try {
            if (!openInNewWindow && workspaceStore.dirty && workspaceStore.editorCount < 2) {
                if (! await feedback.confirm({
                    title: 'Open Workbook',
                    message: 'Are you sure you want to open a workbook without saving changes?',
                    okButton: 'Yes',
                    cancelButton: 'No',
                    defaultToCancel: true
                })) {
                    return
                }
            }
            let fileName = defaultFileName ?? null

            if ((fileName?.length ?? 0) === 0) {
                feedback.setModal(true)
                fileName = await dialog.open({
                    multiple: false,
                    title: 'Open Apicize Workbook',
                    defaultPath: apicizeSettings.workbookDirectory,
                    directory: false,
                    filters: [{
                        name: 'Apicize Files',
                        extensions: [EXT]
                    }]
                })
                feedback.setModal(false)
            }

            if (!fileName) return

            await core.invoke('open_workspace', { fileName, sessionId: activeSessionId, openInNewSession: openInNewWindow })
        } catch (e) {
            feedback.toastError(e)
        }
    }

    const checkWorkspaceStatus = async () => {
        const saveStatus = await core.invoke<WorkspaceSaveStatus>('get_workspace_save_status', {
            sessionId: activeSessionId
        })
        if (saveStatus.anyInvalid) {
            if (! await feedback.confirm({
                title: 'Save Workbook',
                message: 'Your workspace has one or more errors, are you sure you want to save?',
                okButton: 'Yes',
                cancelButton: 'No',
                defaultToCancel: true
            })) {
                return null
            }
        }

        if (saveStatus.warnOnWorkspaceCreds) {
            if (! await feedback.confirm({
                title: 'Save Workbook',
                message: 'Your workspace has authorizations or certifiations stored publicly in the workbook, which will be included if you share the workbook; are you sure you want to save?',
                okButton: 'Yes',
                cancelButton: 'No',
                defaultToCancel: true
            })) {
                return null
            }
        }
        return saveStatus
    }

    /**
     * Saves the current worspake under its current name
     * @returns 
     */
    const saveWorkbook = async () => {
        try {
            if (! await checkWorkspaceStatus()) {
                return
            }
            await core.invoke('save_workspace', {
                sessionId: activeSessionId
            })
            feedback.toast('Workbook saved', ToastSeverity.Success)
        } catch (e) {
            feedback.toastError(e)
        }
    }

    /**
     * Saves the current workbook after prompting for a file name
     * @returns 
     */
    const saveWorkbookAs = async () => {
        try {
            const saveStatus = await checkWorkspaceStatus()
            if (!saveStatus) {
                return
            }

            feedback.setModal(true)
            let fileName = await dialog.save({
                title: 'Save Apicize Workbook',
                defaultPath: saveStatus.fileName.length > 0
                    ? saveStatus.fileName : apicizeSettings.workbookDirectory,
                filters: [{
                    name: 'Apicize Files',
                    extensions: [EXT]
                }]
            })
            feedback.setModal(false)

            if ((typeof fileName !== 'string') || ((fileName?.length ?? 0) === 0)) {
                return
            }

            if (!fileName.endsWith(`.${EXT}`)) {
                fileName += `.${EXT}`
            }

            await core.invoke('save_workspace', {
                sessionId: activeSessionId,
                fileName,
            })
            feedback.toast('Workbook saved', ToastSeverity.Success)
        } catch (e) {
            feedback.toastError(e)
        }
    }

    const cloneWorkspace = async () => {
        try {
            await core.invoke('clone_workspace', {
                sessionId: activeSessionId,
            })
        } catch (e) {
            feedback.toastError(e)
        }
    }

    /**
     * Open SSH PEM, key or PFX file
     * @param fileType 
     * @returns base64 encoded string or null if no result
     */
    const openSsshFile = async (fileType: SshFileType) => {
        let defaultPath: string
        let title: string
        let extensions: string[]
        let extensionName: string

        switch (fileType) {
            case SshFileType.PEM:
                defaultPath = await getSshPath()
                title = 'SSL Certificate'
                extensions = ['cer', 'crt', 'pem']
                extensionName = 'Privacy Enhanced Mail Format (.pem)'
                break
            case SshFileType.Key:
                defaultPath = await getSshPath()
                title = 'Open Private Key'
                extensions = ['key', 'pem']
                extensionName = 'Private Key Files (*.key)'
                break
            case SshFileType.PFX:
                defaultPath = await getSshPath()
                title = 'Open PFX Key (.pfx, .p12)'
                extensions = ['pfx', 'p12']
                extensionName = 'Personal Information Exchange Format (*.pfx, *.pfx)'
                break
            default:
                throw new Error(`Invalid SSH file type: ${fileType}`)
        }

        feedback.setModal(true)
        const fileName = await dialog.open({
            multiple: false,
            title,
            defaultPath,
            directory: false,
            filters: [{
                name: extensionName,
                extensions
            }, {
                name: 'All Files',
                extensions: ['*']
            }]
        })
        feedback.setModal(false)

        if (!fileName) return null

        const baseName = await path.basename(fileName)
        let pathName = ''
        let i = fileName.indexOf(baseName)
        if (i !== -1) {
            pathName = (await path.dirname(fileName)).substring(0, i)
        }

        const data = base64Encode(await readFile(fileName))
        return data
    }

    /**
     * Open a data file and return its results
     * @returns base64 encoded string or null if no result
     */
    const openFile = async (): Promise<Uint8Array | null> => {
        feedback.setModal(true)
        const fileName = await dialog.open({
            multiple: false,
            title: 'Open File',
            defaultPath: await getBodyDataPath(),
            directory: false,

            filters: [{
                name: 'All Files',
                extensions: ['*']
            }]
        })
        feedback.setModal(false)

        if (!fileName) return null

        const baseName = await path.basename(fileName)
        let pathName = ''
        let i = fileName.indexOf(baseName)
        if (i !== -1) {
            pathName = (await path.dirname(fileName)).substring(0, i)
        }

        return await readFile(fileName)
    }

    const retriveHelpContents = async (): Promise<HelpContents> => {
        const helpContents = await join(await resourceDir(), 'help', 'contents.json')
        const contents = await readTextFile(helpContents)
        try {
            const result = JSON.parse(contents)
            if (typeof result !== 'object') {
                throw new Error('Help contents not in expected format')
            }
            return result
        } catch (e) {
            throw new Error(`Unable to read contents - ${e}`)
        }
    }

    const selectWorkbookDirectory = async (): Promise<string | null> => {
        try {
            feedback.setModal(true)
            return await dialog.open({
                multiple: false,
                title: 'Select Apicize Workbook Directory',
                defaultPath: apicizeSettings.workbookDirectory,
                directory: true
            })
        } finally {
            feedback.setModal(false)
        }
    }


    /**
     * Prompt for a file and retrieve the contents into the workspace
     * @returns relative file name and retrieved contents
     */
    const openDataSetFileFrom = async (dataSetId: string, sourceType: DataSourceType): Promise<OpenDataSetFileResponse | null> => {
        try {
            feedback.setModal(true)
            if (workspaceStore.directory.length === 0) {
                feedback.toast("Data Set cannot be opened until Workspace is saved", ToastSeverity.Warning)
                return null
            }
            let filters: dialog.DialogFilter[]
            let ext: string
            if (sourceType === DataSourceType.FileCSV) {
                ext = 'csv'
                filters = [{ name: 'CSV Files (*.csv)', extensions: [ext] }, { name: 'All Files', extensions: ['*'] }]
            } else {
                ext = 'json'
                filters = [{ name: 'JSON Files (*.json)', extensions: [ext, 'jsonc'] }, { name: 'All Files', extensions: ['*'] }]
            }

            let fileName = await dialog.open({
                title: 'Open Data Set',
                defaultPath: workspaceStore.directory,
                filters,
                canCreateDirectories: true,
                multiple: false,
                directory: false,
            })

            if ((typeof fileName !== 'string') || ((fileName?.length ?? 0) === 0)) {
                return null
            }

            return await core.invoke<OpenDataSetFileResponse>('open_data_set_file_from', {
                sessionId: activeSessionId,
                dataSetId,
                fileName,
            })
        } finally {
            feedback.setModal(false)
        }
    }

    /**
     * Retrieve data set's contents into the workspace
     * @returns relative file name and retrieved contents
     */
    const openDataSetFile = (dataSetId: string): Promise<OpenDataSetFileResponse> => {
        return core.invoke<OpenDataSetFileResponse>(
            'open_data_set_file',
            {
                sessionId: activeSessionId,
                dataSetId,
            }
        )
    }

    /**
     * Saves a data set after prompting for a file name
     * @returns file name of the saved data file relative to the workbook
     */
    const saveDataSetAs = async (dataSetId: string, sourceType: DataSourceType): Promise<string | null> => {
        try {
            feedback.setModal(true)
            if (workspaceStore.directory.length === 0) {
                feedback.toast("Data Set cannot be saved until Workspace is saved", ToastSeverity.Warning)
                return null
            }
            let filters: dialog.DialogFilter[]
            let ext: string
            if (sourceType === DataSourceType.FileCSV) {
                ext = 'csv'
                filters = [{ name: 'CSV Files (*.csv)', extensions: [ext] }, { name: 'All Files', extensions: ['*'] }]
            } else {
                ext = 'json'
                filters = [{ name: 'JSON Files (*.json)', extensions: [ext, 'jsonc'] }, { name: 'All Files', extensions: ['*'] }]
            }

            let fileName = await dialog.save({
                title: 'Save Data Set',
                defaultPath: workspaceStore.directory,
                filters,
            })

            if ((typeof fileName !== 'string') || ((fileName?.length ?? 0) === 0)) {
                return null
            }

            let lastDot = fileName.lastIndexOf('.')
            let lastSlash = fileName.lastIndexOf('/')

            if (lastDot < lastSlash) {
                fileName += `.${ext}`
            }

            return await core.invoke<string>('save_data_set_file', {
                sessionId: activeSessionId,
                dataSetId,
                fileName,
            })
        } finally {
            feedback.setModal(false)
        }
    }

    /**
     * Open up the specified help topic
     * @param showTopic 
     * @returns Markdown help text loaded from file
     */
    const retrieveHelpTopic = async (showTopic: string): Promise<string> => {
        const helpFile = await join(await resourceDir(), 'help', `${showTopic}.md`)
        if (await exists(helpFile)) {
            let text = await readTextFile(helpFile)

            const helpDir = await join(await resourceDir(), 'help', 'images')

            // This is cheesy, but I can't think of another way to inject images from the React client
            let imageLink
            do {
                imageLink = text.match(/\:image\[(.*)\]/)
                if (imageLink && imageLink.length > 0 && imageLink.index) {
                    const imageFile = await join(helpDir, imageLink[1])
                    let replaceWith = ''
                    try {
                        const data = await readFile(imageFile)
                        const ext = await extname(imageFile)
                        replaceWith = `![](data:image/${ext};base64,${base64Encode(data)})`
                    } catch (e) {
                        throw new Error(`Unable to load ${imageFile} - ${e}`)
                    }
                    text = `${text.substring(0, imageLink.index)}${replaceWith}${text.substring(imageLink.index + imageLink[0].length)}`
                }
            } while (imageLink && imageLink.length > 0)
            return text
        } else {
            throw new Error(`Help topic "${showTopic}" not found at ${helpFile}`)
        }
    }

    const fileOpsStore = new FileOperationsStore({
        onNewWorkbook: newWorkbook,
        onOpenWorkbook: openWorkbook,
        onSaveWorkbook: saveWorkbook,
        onSaveWorkbookAs: saveWorkbookAs,
        onCloneWorkspace: cloneWorkspace,
        onOpenSshFile: openSsshFile,
        onOpenFile: openFile,
        onSaveSettings: saveSettings,
        onRetrieveHelpTopic: retrieveHelpTopic,
        onRetrieveHelpContents: retriveHelpContents,
        onSelectWorkbookDirectory: selectWorkbookDirectory,
        onGenerateDefaultSettings: generateDefaultSettings,
        onOpenDataSetFile: openDataSetFile,
        onOpenDataSetFileFrom: openDataSetFileFrom,
        onSaveDataSetAs: saveDataSetAs,
    })

    return (
        <FileOperationsContext.Provider value={fileOpsStore}>
            {children}
        </FileOperationsContext.Provider>
    )
}


export interface WorkspaceSaveStatus {
    dirty: boolean
    warnOnWorkspaceCreds: boolean
    anyInvalid: boolean
    fileName: string
    displayName: string
}