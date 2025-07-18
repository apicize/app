export { RequestEditor } from './controls/editors/request-editor'
export { AuthorizationEditor } from './controls/editors/authorization-editor'
export { ScenarioEditor } from './controls/editors/scenario-editor'
export { CertificateEditor } from './controls/editors/certificate-editor'
export { ProxyEditor } from './controls/editors/proxy-editor'
export { SettingsEditor } from './controls/editors/settings-editor'
export { DefaultsEditor } from './controls/editors/defaults-editor'
export { WarningsEditor } from './controls/editors/warnings-editor'
export { EditableAuthorization } from './models/workspace/editable-authorization'
export { CertificateFileType } from './models/workspace/editable-certificate'
export { NavigationControl } from './controls/navigation/navigation'
export { HelpPanel } from './controls/help'
export { MainPanel } from './controls/main-panel'
export { HelpContents } from './models/help-contents'

export * from './theme'
export * from './services/base64'
export * from './models/workspace/indexed-entity-position'
export * from './models/workspace/cached-token-info'
export * from './models/workspace/entity-type'
export * from './models/workspace/ssh-file-type'
export * from './models/navigation'
export * from './contexts/workspace.context'

export { useFeedback, FeedbackContext, FeedbackStore, ToastSeverity, ConfirmationOptions } from './contexts/feedback.context'
export { useClipboard, ClipboardContext, ClipboardStore } from './contexts/clipboard.context'
export * from './contexts/file-operations.context'
export { usePkce, PkceContext } from './contexts/pkce.context'
export { useWorkspace, WorkspaceContext, WorkspaceStore } from './contexts/workspace.context'
export { useApicize, ApicizeContext } from './contexts/apicize.context'
export { useLog, LogContext, LogStore } from './contexts/log.context'
export { ReqwestEvent, ReqwestEventConnect, ReqwestEventRead, ReqwestEventWrite } from './models/trace';
export { DragDropContext, DragDropProvider, useDragDrop } from './contexts/dragdrop.context'
export { FileDragDropContext, FileDragDropStore, useFileDragDrop } from './contexts/file-dragdrop.context'
export { EditableSettings as ApicizeSettings } from './models/editable-settings'

import { monaco } from 'react-monaco-editor'
import "./toolkit.css"

monaco.editor.addKeybindingRules([
    {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        command: null
    },
    {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
        command: null
    },
    {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN,
        command: null
    },
    {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO,
        command: null
    },
    {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        command: null
    },
    {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
        command: null
    },
])

// This needs to be here because Monaco is prone to throwing cancellation errors when it goes out of context
window.addEventListener('unhandledrejection', (evt) => {
    console.log(`unhandledrejection`, evt?.reason?.stack)
    if (evt?.reason?.stack?.includes?.('CancellationError@')) {
        evt.stopImmediatePropagation()
    }
})
