import { ReactNode, useEffect, useRef } from "react";
import * as core from '@tauri-apps/api/core'
import * as dialog from '@tauri-apps/plugin-dialog'
import * as path from '@tauri-apps/api/path'
import { exists, readFile, readTextFile } from "@tauri-apps/plugin-fs"
import { base64Encode, FileOperationsContext, FileOperationsStore, HelpContents, SshFileType, ToastSeverity, useApicizeSettings, useFeedback, WorkspaceStore } from "@apicize/toolkit";
import { ApicizeSettings, DataSourceType } from "@apicize/lib-typescript";
import { extname, join, resourceDir } from '@tauri-apps/api/path';
import { EditableSettings } from "@apicize/toolkit/dist/models/editable-settings";

export type FileOperationsProviderCallbacks = {
    openDataSetFile: (fileName: string) => Promise<[string, string]>
    saveDataSetFile: (fileName: string, data: string) => Promise<string>
}

/**
 * Implementation of file opeartions via Tauri
 */
export function FileOperationsProvider(
    { activeSessionId, workspaceStore, children, callbacks }:
        { activeSessionId: string, workspaceStore: WorkspaceStore, children?: ReactNode, callbacks: FileOperationsProviderCallbacks }
) {

    const EXT = 'apicize';

    const feedback = useFeedback()
    const apicizeSettings = useApicizeSettings()

    const _sshPath = useRef('')
    const _bodyDataPath = useRef('')

    // Saves that are pending
    const pendingDataSetSaves = new Map<string, string>()

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

    /**
     * Prompt for a file with the specified type, open a data file and return its results
     * @returns tuple of data and fully qualified file name
     */
    const promptAndOpenDataSetFile = async (type: DataSourceType): Promise<[string, string] | null> => {
        let defaultFilter: dialog.DialogFilter[]

        switch (type) {
            case DataSourceType.FileJSON:
                defaultFilter = [{
                    name: 'JSON Files (*.json)', extensions: ['json'],
                }]
                break
            case DataSourceType.FileCSV:
                defaultFilter = [{
                    name: 'CSV Files (*.csv)', extensions: ['csv'],
                }]
                break
            default:
                defaultFilter = []
        }

        try {
            feedback.setModal(true)
            const fileName = await dialog.open({
                multiple: false,
                title: 'Open Data Set File',
                defaultPath: await getBodyDataPath(),
                directory: false,
                filters: [
                    ...defaultFilter,
                    {
                        name: 'All Files',
                        extensions: ['*']
                    }]
            })
            return fileName ? await callbacks.openDataSetFile(fileName) : null
        } catch (e) {
            feedback.toastError(e)
            return null
        } finally {
            feedback.setModal(false)
        }
    }

    /*
     * Open the speicfied data set file
     * @returns tuple of data and fully qualified file name
     */
    const openDataSetFile = async (fileName: string): Promise<[string, string] | null> => {
        try {
            if (fileName) {
                return await callbacks.openDataSetFile(fileName)
            } else {
                return null
            }
        } catch (e) {
            feedback.toastError(e)
            return null
        } finally {
            feedback.setModal(false)
        }
    }

    /**
     * Prompt for a file with the specified type and save a data file
     * @returns fully qualified file name
     */
    const promptAndSaveDataSetFile = async (type: DataSourceType, data: string): Promise<string | null> => {
        let defaultFilter: dialog.DialogFilter[]

        switch (type) {
            case DataSourceType.FileJSON:
                defaultFilter = [{
                    name: 'JSON Files (*.json)', extensions: ['json'],
                }]
                break
            case DataSourceType.FileCSV:
                defaultFilter = [{
                    name: 'CSV Files (*.csv)', extensions: ['csv'],
                }]
                break
            default:
                defaultFilter = []
        }

        try {
            feedback.setModal(true)
            let fileName = await dialog.save({
                title: 'Save Data Set File',
                defaultPath: await getBodyDataPath(),
                canCreateDirectories: true,
                filters: [
                    ...defaultFilter,
                    {
                        name: 'All Files',
                        extensions: ['*']
                    }]
            })
            
            if (! fileName) {
                return null
            }
            
            // Tauri save dialog doesn't force extensions from save dialog, even if filter is set.
            // So, if file name doesn't have extension, add one
            let idxPeriod = fileName.lastIndexOf('.')
            let idxSlash = fileName.lastIndexOf('/')
            if (idxPeriod === -1 === idxPeriod < idxSlash) {
                const ext = type === DataSourceType.FileCSV ? '.csv' : '.json'
                fileName += ext
            }

            return await callbacks.saveDataSetFile(fileName, data)
        } catch (e) {
            feedback.toastError(e)
            return null
        } finally {
            feedback.setModal(false)
        }
    }

    /*
     * Save the speicfied data set file
     * @returns fully qualified file name
     */
    const saveDataSetFile = async (fileName: string, data: string): Promise<string | null> => {
        try {
            return await callbacks.saveDataSetFile(fileName, data)
        } catch (e) {
            feedback.toastError(e)
            return null
        } finally {
            feedback.setModal(false)
        }
    }

    /**
     * Queue the specified data set file for saving
     * @param fileName 
     * @param data 
     */
    const queueSaveDataSetFile = (fileName: string, data: string) => {
        pendingDataSetSaves.set(fileName, data)
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
        onPromptAndOpenDataSetFile: promptAndOpenDataSetFile,
        onOpenDataSetFile: openDataSetFile,
        onPromptAndSaveDataSetFile: promptAndSaveDataSetFile,
        onSaveDataSetFile: saveDataSetFile,
        onQueueSaveDataSetFile: queueSaveDataSetFile,
    })

    useEffect(() => {
        const saveDataSetQueue = setInterval(async () => {
            const iter = pendingDataSetSaves.entries().next().value
            if (iter !== undefined) {
                const [fileName, data] = iter
                pendingDataSetSaves.delete(fileName)
                await saveDataSetFile(fileName, data)
            }
        }, 1000)
        return () => {
            clearInterval(saveDataSetQueue)
        }
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