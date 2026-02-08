'use client'

import * as core from '@tauri-apps/api/core'
import {
  EditableSettings, DragDropProvider, EntityType, FeedbackStore, IndexedEntityPosition, LogStore, MainPanel, Navigation, ReqwestEvent,
  SessionSaveState, DataSetContent, UpdatedNavigationEntry, WorkspaceStore, ClipboardPaylodRequest, ExecutionEvent, SessionEntity, WorkspaceInitialization,
  WorkspaceMode,
  UpdateResponse,
  EntityUpdate,
  EntityUpdateNotification,
  RequestBodyInfo,
  RequestBodyMimeInfo,
  OpenDataSetFileResponse,
  ToastSeverity,
} from '@apicize/toolkit'
import { useEffect, useState } from 'react'
import "@fontsource/roboto-mono/latin.css"
import '@fontsource/roboto-flex'
import { ClipboardProvider } from './providers/clipboard.provider';
import { FeedbackProvider } from './providers/feedback.provider';
import { FileOperationsProvider } from './providers/file-operations.provider';
import { WorkspaceProvider } from './providers/workspace.provider';
import { ApicizeSettingsProvider } from './providers/apicize-settings.provider';
import { ConfigurableTheme } from './controls/configurable-theme';
import { OAuth2Provider } from './providers/oauth2.provider';
import { emit } from '@tauri-apps/api/event';
import { LogProvider } from './providers/log.provider';
import { CssBaseline } from '@mui/material'
import { FileDragDropProvider } from './providers/file-dragdrop.provider'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { DataSourceType, TokenResult } from '@apicize/lib-typescript'
import { openUrl } from '@tauri-apps/plugin-opener';
import { runInAction, toJS } from 'mobx'

// This is defined externally via Tauri main or other boostrap application
const sessionId: string = (window as any).__TAURI_INTERNALS__.metadata.currentWindow.label
const initData: WorkspaceInitialization = (window as any).__INIT_DATA__;

const feedbackStore = new FeedbackStore()
const logStore = new LogStore()

const workspaceStore = new WorkspaceStore(
  initData,
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
      entityId,
    }),
    updateActiveEntity: (entity?: SessionEntity) => core.invoke('update_active_entity', {
      sessionId,
      entity,
    }),
    updateExpandedItems: (ids?: string[]) => core.invoke('update_expanded_items', {
      sessionId,
      ids,
    }),
    updateMode: (mode: WorkspaceMode) => core.invoke('update_mode', {
      sessionId,
      mode
    }),
    getTitle: (entityType: EntityType, entityId: string) => core.invoke('get_title', {
      sessionId,
      entityType,
      entityId
    }),
    getExecution: (requestOrGroupId: string) => core.invoke('get_execution', {
      sessionId,
      requestOrGroupId,
    }),
    getDirty: () => core.invoke('get_dirty', {
      sessionId,
    }),
    getDataSetContent: (dataSetId: string) => core.invoke<DataSetContent>('get_data_set_content', {
      sessionId,
      dataSetId,
    }),
    listParameters: (requestId?: string) => core.invoke('list_parameters', {
      sessionId,
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
    update: async (entityUpdate: EntityUpdate) => {
      return core.invoke<UpdateResponse>('update', {
        sessionId,
        entityUpdate,
      })
    },
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
      core.invoke<{ [executingRequestOrGroupId: string]: undefined }>('execute_request', { sessionId, requestOrGroupId, workbookFullName, singleRun }),
    cancelRequest: (requestId) => core.invoke(
      'cancel_request', { sessionId, requestId }),
    getResultDetail: (execCtr) => core.invoke(
      'get_result_detail', { sessionId, execCtr }
    ),
    getExecutionResultViewState: (requestId) => core.invoke(
      'get_execution_result_view_state', { sessionId, requestId }
    ),
    updateExecutionResultViewState: (requestId, executionResultViewState) => core.invoke(
      'update_execution_result_view_state', { sessionId, requestId, executionResultViewState }
    ),
    getEntityType: (entityId) => core.invoke(
      'get_entity_type', { sessionId, entityId }
    ),
    findDescendantGroups: (groupId) => core.invoke(
      'find_descendant_groups', { sessionId, groupId }
    ),
    getOAuth2ClientToken: (data: { authorizationId: string }) =>
      core.invoke<TokenResult>('retrieve_oauth2_client_token', { sessionId, authorizationId: data.authorizationId }),
    initializePkce: (data: { authorizationId: string }) =>
      emit('oauth2-pkce-init', data),
    closePkce: (data: { authorizationId: string }) =>
      emit('oauth2-pkce-close', data),
    refreshToken: (data: { authorizationId: string }) =>
      emit('oauth2-refresh-token', data),
    copyToClipboard: (payloadRequest: ClipboardPaylodRequest) => core.invoke<void>(
      'copy_to_clipboard', { sessionId, payloadRequest }
    ),
    getRequestBody: (requestId) => core.invoke<RequestBodyInfo>(
      'get_request_body', { sessionId, requestId }
    ),
    updateRequestBody: (requestId, body) => core.invoke<RequestBodyMimeInfo>(
      'update_request_body', { sessionId, requestId, body }
    ),
    updateRequestBodyFromClipboard: (requestId) => core.invoke<RequestBodyInfo>(
      'update_request_body_from_clipboard', { sessionId, requestId }
    ),
    openUrl: (url: string) => openUrl(url),
  },
)

export default function Home() {

  const [settings, setSettings] = useState(new EditableSettings(initData.settings))

  useEffect(() => {
    const w = getCurrentWebviewWindow()
    // Notification sent for when initialization data is available
    let unlistenInitialize = w.listen<WorkspaceInitialization>('initialize', (data) => {
      workspaceStore.initialize(data.payload)
    })
    // Notification sent on entire navigation tree update
    let unlistenNavigation = w.listen<Navigation>('navigation', (data) => {
      workspaceStore.setNavigation(data.payload)
    })
    // Notification sent on entire navigation tree update
    let unlistenToast = w.listen<{ message: string, severity: ToastSeverity }>('toast', (data) => {
      feedbackStore.toast(data.payload.message, data.payload.severity)
    })
    // Notification sent on individual navigation entry update
    let unlistenNavigationEntry = w.listen<UpdatedNavigationEntry>('navigation_entry', (data) => {
      workspaceStore.updateNavigationState(data.payload)
    })
    // Notification sent when the save state changes (file name change, dirty status change)
    let unlistenSaveState = w.listen<SessionSaveState>('save_state', (data) => {
      workspaceStore.updateSaveState(data.payload)
    })
    // Notification on record changes (not sent to window/session initiating the update)
    let unlistenUpdate = w.listen<EntityUpdateNotification>('update', (data) => {
      runInAction(() => {
        workspaceStore.refreshFromExternalUpdate(data.payload)
      })
    })
    // // Notification on request execution starts or stops
    // let unlistenExecution = w.listen<ExecutionStatus>('update_execution', (data) => {
    //   workspaceStore.updateExecutionStatus(data.payload)
    // })
    // Notification on request execution results
    let unlistenExecutionResults = w.listen<{ [requestOrGroupId: string]: ExecutionEvent }>('execution_event', (data) => {
      workspaceStore.processExecutionEvents(data.payload)
    })
    // Notification on settings update
    let unlistenSettingsUpdate = w.listen<EditableSettings>('update_settings', (data) => {
      setSettings(new EditableSettings(data.payload))
    })
    let unlistenListLogs = w.listen<ReqwestEvent[]>('list_logs', () => {
      workspaceStore.listLogs()
    })

    // Show the winodow once everything is mostly set up
    setTimeout(() => {
      core.invoke('show_session', { sessionId })
    }, 100)

    return () => {
      unlistenInitialize.then(() => { })
      unlistenNavigation.then(() => { })
      unlistenToast.then(() => { })
      unlistenNavigationEntry.then(() => { })
      unlistenSaveState.then(() => { })
      unlistenUpdate.then(() => { })
      unlistenExecutionResults.then(() => { })
      unlistenSettingsUpdate.then(() => { })
      unlistenListLogs.then(() => { })
    }
  })

  return (
    <LogProvider store={logStore}>
      <ApicizeSettingsProvider settings={settings}>
        <ConfigurableTheme>
          <CssBaseline />
          <FeedbackProvider store={feedbackStore}>
            <FileOperationsProvider
              activeSessionId={sessionId}
              workspaceStore={workspaceStore}
            >
              <WorkspaceProvider store={workspaceStore}>
                <DragDropProvider>
                  <FileDragDropProvider>
                    <OAuth2Provider store={workspaceStore}>
                      <ClipboardProvider>
                        <MainPanel />
                      </ClipboardProvider>
                    </OAuth2Provider>
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