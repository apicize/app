import { ApicizeSettings, ExecutionReportFormat } from '@apicize/lib-typescript';
import { SupportedColorScheme } from '@mui/material';
import { action, observable, runInAction } from 'mobx';

export class EditableSettings {
    private pendingChangeCtr = 0
    private lastChangeCtrCheck = 0
    private lastChangeTimeout: NodeJS.Timeout | null = null
    private settlingTimeout = 100

    @observable accessor appName = 'Apicize'
    @observable accessor appVersion = ''
    @observable accessor storage: StorageInformation | null = null

    @observable accessor workbookDirectory: string = ''
    @observable accessor lastWorkbookFileName: string | undefined
    @observable accessor fontSize = 12
    @observable accessor navigationFontSize = 12
    @observable accessor colorScheme: SupportedColorScheme = 'dark'
    @observable accessor editorPanels = ''
    @observable accessor recentWorkbookFileNames: string[] = []
    @observable accessor pkceListenerPort = 8080
    @observable accessor alwaysHideNavTree = false
    @observable accessor showDiagnosticInfo = false
    @observable accessor reportFormat = ExecutionReportFormat.JSON

    @observable accessor editorIndentSize = 3
    @observable accessor editorDetectExistingIndent = true
    @observable accessor editorCheckJsSyntax = true
    @observable accessor readyToSave = true

    constructor(settings?: ApicizeSettings) {
        if (settings) {
            this.setValues(settings)
        }
    }

    public ctrlKey: string = 'Ctrl'

    private setValues(settings: ApicizeSettings) {
        this.workbookDirectory = settings.workbookDirectory
        this.lastWorkbookFileName = settings.lastWorkbookFileName
        this.fontSize = settings.fontSize
        this.navigationFontSize = settings.navigationFontSize
        this.colorScheme = settings.colorScheme
        this.editorPanels = settings.editorPanels
        this.recentWorkbookFileNames = settings.recentWorkbookFileNames?.slice(0, 10) ?? []
        this.pkceListenerPort = settings.pkceListenerPort ?? 8080
        this.alwaysHideNavTree = settings.alwaysHideNavTree
        this.showDiagnosticInfo = settings.showDiagnosticInfo
        this.reportFormat = settings.reportFormat
        this.editorIndentSize = settings.editorIndentSize
        this.editorDetectExistingIndent = settings.editorDetectExistingIndent
        this.editorCheckJsSyntax = settings.editorCheckJsSyntax
        this.readyToSave = false
        this.lastChangeCtrCheck = 0
        this.pendingChangeCtr = 0
    }

    @action
    public update(settings: ApicizeSettings) {
        this.incrementChangeCtr()
        this.setValues(settings)
    }

    private checkChangeCtr() {
        if (this.lastChangeCtrCheck === this.pendingChangeCtr) {
            runInAction(() => {
                this.readyToSave = true
            })
        } else {
            this.lastChangeCtrCheck = this.pendingChangeCtr
            this.lastChangeTimeout = setTimeout(() => this.checkChangeCtr(), this.settlingTimeout)
        }
    }

    @action
    public clearChangeCtr() {
        this.pendingChangeCtr = 0
        this.lastChangeCtrCheck = 0
        this.readyToSave = false
    }

    private incrementChangeCtr(settlingTimeout = 100) {
        this.pendingChangeCtr++
        this.settlingTimeout = settlingTimeout
        if (this.lastChangeTimeout) {
            clearTimeout(this.lastChangeTimeout)
        }
        this.lastChangeTimeout = setTimeout(() => this.checkChangeCtr(), settlingTimeout)
    }

    @action
    changeApp(name: string, version: string, storage: StorageInformation) {
        this.appName = name
        this.appVersion = version
        this.storage = storage
    }

    setOs(os: string) {
        this.ctrlKey = os === 'macos' ? 'Cmd' : 'Ctrl'
    }

    @action
    public setWorkbookDirectory(newDirectory: string) {
        if (this.workbookDirectory !== newDirectory) {
            this.workbookDirectory = newDirectory
            this.incrementChangeCtr()
        }
    }

    @action
    public setLastWorkbookFileName(newLastWorkbookFileName: string | undefined) {
        if (this.lastWorkbookFileName != newLastWorkbookFileName) {
            this.lastWorkbookFileName = newLastWorkbookFileName
            this.incrementChangeCtr()
        }
    }

    @action
    public setRecentWorkbookFileNames(newRecentWorkbookFileNames: string[]) {
        if (this.recentWorkbookFileNames.join(';') != newRecentWorkbookFileNames.join(';')) {
            this.recentWorkbookFileNames = newRecentWorkbookFileNames.slice(0, 10)
            this.incrementChangeCtr()
        }
    }

    @action
    public setPkceListenerPort(value: number) {
        if (this.pkceListenerPort !== value) {
            this.pkceListenerPort = value
            this.incrementChangeCtr(2000)
        }
    }

    @action setAlwaysHideNavTree(value: boolean) {
        if (this.alwaysHideNavTree !== value) {
            this.alwaysHideNavTree = value
            this.incrementChangeCtr()
        }
    }

    @action
    public addRecentWorkbookFileName(fileName: string) {
        const i = this.recentWorkbookFileNames.indexOf(fileName)
        if (i !== 0) {
            if (i !== -1) {
                this.recentWorkbookFileNames.splice(i, 1)
            }
            this.recentWorkbookFileNames = [fileName, ...this.recentWorkbookFileNames.slice(0, 10)]
            this.incrementChangeCtr()
        }
    }

    @action
    public removeRecentWorkbookFileName(fileName: string) {
        const i = this.recentWorkbookFileNames.indexOf(fileName)
        if (i !== 0) {
            if (i !== -1) {
                this.recentWorkbookFileNames.splice(i, 1)
                this.incrementChangeCtr()
            }
        }
    }

    @action
    public setFontSize(newFontSize: number) {
        if (this.fontSize != newFontSize) {
            this.fontSize = newFontSize
            this.incrementChangeCtr()
        }
    }

    @action
    public setNavigationFontSize(newFontSize: number) {
        if (this.navigationFontSize != newFontSize) {
            this.navigationFontSize = newFontSize
            this.incrementChangeCtr()
        }
    }

    @action
    public setColorScheme(newColorScheme: SupportedColorScheme) {
        if (this.colorScheme != newColorScheme) {
            this.colorScheme = newColorScheme
            this.incrementChangeCtr()
        }
    }

    @action
    public setEditorPanels(value: string) {
        this.editorPanels = value
        this.incrementChangeCtr()
    }

    @action
    public setShowDiagnosticInfo(value: boolean) {
        this.showDiagnosticInfo = value
        this.incrementChangeCtr()
    }

    @action setReportFormat(value: ExecutionReportFormat) {
        this.reportFormat = value
        this.incrementChangeCtr()
    }

    @action setEditorIndentSize(value: number) {
        this.editorIndentSize = value
        this.incrementChangeCtr()
    }

    @action setEditorDetectExistingIndent(value: boolean) {
        this.editorDetectExistingIndent = value
        this.incrementChangeCtr()
    }

    @action setEditorCheckJsSyntax(value: boolean) {
        this.editorCheckJsSyntax = value
        this.incrementChangeCtr()
    }
}

export interface StorageInformation {
    globalsFileName: string
    settingsFileName: string
    homeDirectory: string
    homeEnvironmentVariable: string
    settingsDirectory: string
}
