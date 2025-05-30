/**
 * Format of application settings
 */
export interface ApicizeSettings {
    workbookDirectory: string
    lastWorkbookFileName?: string
    fontSize: number
    navigationFontSize: number,
    colorScheme: 'dark' | 'light'
    editorPanels: string
    recentWorkbookFileNames?: string[]
    pkceListenerPort: number | undefined
    alwaysHideNavTree: boolean
    showDiagnosticInfo: boolean
}
