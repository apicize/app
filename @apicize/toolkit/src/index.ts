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
export * from './models/updates/entity-update'
export * from './models/updates/defaults-update'
export * from './models/updates/request-update'
export * from './models/updates/request-group-update'
export * from './models/updates/scenario-update'
export * from './models/updates/authorization-update'
export * from './models/updates/certificate-update'
export * from './models/updates/proxy-update'
export * from './models/updates/data-set-update'
export * from './models/workspace/indexed-entity-position'
export * from './models/workspace/cached-token-info'
export * from './models/workspace/entity-type'
export * from './models/workspace/execution'
export * from './models/workspace/request-body-info'
export * from './models/workspace/ssh-file-type'
export * from './models/navigation'
export * from './contexts/workspace.context'
export * from './contexts/feedback.context'
export * from './contexts/clipboard.context'
export * from './contexts/file-operations.context'
export * from './contexts/oauth2.context'
export * from './contexts/workspace.context'
export * from './contexts/apicize-settings.context'
export * from './contexts/log.context'
export * from './models/trace';
export * from './contexts/dragdrop.context'
export * from './contexts/file-dragdrop.context'
export * from './models/editable-settings'
export * from './models/clipboard_payload_request'

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
    if (evt?.reason?.stack?.includes?.('CancellationError@')) {
        evt.stopImmediatePropagation()
        evt.stopPropagation()
        evt.preventDefault()
    }
})
