'use client'

import * as core from '@tauri-apps/api/core'
import { EditableSettings, DragDropProvider, Entity, EntityType, FeedbackStore, IndexedEntityPosition, LogStore, MainPanel, Navigation, ReqwestEvent, SessionInitialization, SessionSaveState, ToastSeverity, UpdatedNavigationEntry, WorkspaceStore } from '@apicize/toolkit'
import React, { useEffect, useState } from 'react'
import "@fontsource/roboto-mono/latin.css"
import '@fontsource/roboto-flex'
import { ClipboardProvider } from './providers/clipboard.provider';
import { FeedbackProvider } from './providers/feedback.provider';
import { FileOperationsProvider } from './providers/file-operations.provider';
import { WorkspaceProvider } from './providers/workspace.provider';
import { ExecutionResultSummary, ExecutionStatus } from '@apicize/lib-typescript';
import { ApicizeSettingsProvider } from './providers/apicize-settings.provider';
import { ConfigurableTheme } from './controls/configurable-theme';
import { PkceProvider } from './providers/pkce.provider';
import { emit } from '@tauri-apps/api/event';
import { LogProvider } from './providers/log.provider';
import { CssBaseline } from '@mui/material'
import { FileDragDropProvider } from './providers/file-dragdrop.provider'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

// This is defined externally via Tauri main or other boostrap application
const sessionId = (window as any).__TAURI_INTERNALS__.metadata.currentWindow.label

const feedbackStore = new FeedbackStore()
const logStore = new LogStore()

const workspaceStore = new WorkspaceStore(
  feedbackStore,
  {
    close: () => {
      return core.invoke('close_workspace', {
        sessionId
      })
    },
    get: (entityType: EntityType, entityId: string) => core.invoke('get', {
      sessionId,
      entityType,
      entityId
    }),
    getTitle: (entityType: EntityType, entityId: string) => core.invoke('get_title', {
      sessionId,
      entityType,
      entityId
    }),
    getDirty: () => core.invoke('get_dirty', {
      sessionId,
    }),
    list: (entityType: EntityType, requestId?: string) => core.invoke('list', {
      sessionId,
      entityType,
      requestId
    }),
    getRequestActiveAuthorization: (requestId: string) => core.invoke('get_request_active_authorization', {
      sessionId,
      requestId
    }),
    getRequestActiveData: (requestId: string) => core.invoke('get_request_active_data', {
      sessionId,
      requestId
    }),
    add: (entityType: EntityType, relativeToId: string | null, relativePosition: IndexedEntityPosition | null, cloneFromId: string | null) =>
      core.invoke<string>('add', {
        sessionId,
        entityType,
        relativeToId,
        relativePosition,
        cloneFromId,
      }),
    delete: (entityType: EntityType, entityId: string) => core.invoke('delete', {
      sessionId,
      entityType,
      entityId
    }),
    update: async (entity: Entity) => core.invoke('update', {
      sessionId,
      entity,
    }),
    move: async (entityType: EntityType, entityId: string, relativeToId: string, relativePosition: IndexedEntityPosition) => core.invoke('move_entity', {
      sessionId,
      entityType,
      entityId,
      relativeToId,
      relativePosition,
    }),
    listLogs: () => core.invoke('list_logs'),
    clearLogs: () => core.invoke('clear_logs'),
    storeToken: (authorizationId, tokenInfo) => core.invoke('store_token', {
      authorizationId,
      tokenInfo
    }),
    clearToken: (authorizationId) => core.invoke(
      'clear_cached_authorization', { authorizationId }),
    clearAllTokens: () => core.invoke(
      'clear_all_cached_authorizations'),
    executeRequest: async (requestOrGroupId: string, workbookFullName: string, singleRun: boolean) =>
      core.invoke<ExecutionResultSummary[]>('run_request', { sessionId, requestOrGroupId, workbookFullName, singleRun }),
    cancelRequest: (requestId) => core.invoke(
      'cancel_request', { sessionId, requestId }),
    getResultDetail: (requestId, index) => core.invoke(
      'get_result_detail', { sessionId, requestId, index }
    ),
    generateReport: (requestId, index, format) => core.invoke(
      'generate_report', { sessionId, requestId, index, format }
    ),
    getEntityType: (entityId) => core.invoke(
      'get_entity_type', { sessionId, entityId }
    ),
    findDescendantGroups: (groupId) => core.invoke(
      'find_descendant_groups', { sessionId, groupId }
    ),
    initializePkce: (data: { authorizationId: string }) =>
      emit('oauth2-pkce-init', data),
    closePkce: (data: { authorizationId: string }) =>
      emit('oauth2-pkce-close', data),
    refreshToken: (data: { authorizationId: string }) =>
      emit('oauth2-refresh-token', data),
  },
)

export default function Home() {

  const [settings, setSettings] = useState<EditableSettings | null>(null)

  useEffect(() => {
    const w = getCurrentWebviewWindow()
    // Notification sent for when initialization data is available
    let unlistenInitialize = w.listen<SessionInitialization>('initialize', () => {
      // Clear settings to trigger a reload
      setSettings(null)
    })
    // Notification sent on entire navigation tree update
    let unlistenNavigation = w.listen<Navigation>('navigation', (data) => {
      workspaceStore.setNavigation(data.payload)
    })
    // Notification sent on individual navigation entry update
    let unlistenNavigationEntry = w.listen<UpdatedNavigationEntry>('navigation_entry', (data) => {
      workspaceStore.updateNavigationEntry(data.payload)
    })
    // Notification sent when the save state changes (file name change, dirty status change)
    let unlistenSaveState = w.listen<SessionSaveState>('save_state', (data) => {
      workspaceStore.updateSaveState(data.payload)
    })
    // Notification on record changes (not sent to window/session initiating the update)
    let unlistenUpdate = w.listen<Entity>('update', (data) => {
      workspaceStore.dirty = true
      workspaceStore.refreshFromExternalUpdate(data.payload)
    })
    // Notification on request execution starts or stops
    let unlistenExecution = w.listen<ExecutionStatus>('update_execution', (data) => {
      workspaceStore.updateExecutionStatus(data.payload)
    })
    // Notification on settings update
    let unlistenSettingsUpdate = w.listen<EditableSettings>('update_settings', (data) => {
      setSettings(new EditableSettings(data.payload))
    })
    let unlistenListLogs = w.listen<ReqwestEvent[]>('list_logs', () => {
      workspaceStore.listLogs()
    })
    return () => {
      unlistenInitialize.then(() => { })
      unlistenNavigation.then(() => { })
      unlistenNavigationEntry.then(() => { })
      unlistenSaveState.then(() => { })
      unlistenUpdate.then(() => { })
      unlistenExecution.then(() => { })
      unlistenSettingsUpdate.then(() => { })
      unlistenListLogs.then(() => { })
    }
  }, [settings])

  if (!settings) {
    const newSettings = new EditableSettings()
    core.invoke<SessionInitialization>('initialize_session', {
      sessionId,
    }).then((info) => {
      setSettings(new EditableSettings(info.settings))
      workspaceStore.initialize(info)
    }).catch((e) => {
      feedbackStore.toast(`${e}`, ToastSeverity.Error)
    })
    return <ApicizeSettingsProvider settings={newSettings}>
      <ConfigurableTheme>
        <CssBaseline />
        <FeedbackProvider store={feedbackStore} />
      </ConfigurableTheme>
    </ApicizeSettingsProvider>
  }

  return (
    <LogProvider store={logStore}>
      <ApicizeSettingsProvider settings={settings}>
        <ConfigurableTheme>
          <CssBaseline />
          <FeedbackProvider store={feedbackStore}>
            <FileOperationsProvider activeSessionId={sessionId} workspaceStore={workspaceStore}>
              <WorkspaceProvider store={workspaceStore}>
                <DragDropProvider>
                  <FileDragDropProvider>
                    <PkceProvider store={workspaceStore}>
                      <ClipboardProvider>
                        <MainPanel />
                      </ClipboardProvider>
                    </PkceProvider>
                  </FileDragDropProvider>
                </DragDropProvider>
              </WorkspaceProvider>
            </FileOperationsProvider>
          </FeedbackProvider>
        </ConfigurableTheme >
      </ApicizeSettingsProvider >
    </LogProvider>
  )
}