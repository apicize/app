'use client'

import * as core from '@tauri-apps/api/core'
import { ApicizeSettings, DragDropProvider, FeedbackStore, MainPanel, WorkspaceStore } from '@apicize/toolkit'
import React from 'react'
import "@fontsource/open-sans/latin.css"
import "@fontsource/roboto-mono/latin.css"
import { ClipboardProvider } from './providers/clipboard.provider';
import { FeedbackProvider } from './providers/feedback.provider';
import { FileOperationsProvider } from './providers/file-operations.provider';
import { WorkspaceProvider } from './providers/workspace.provider';
import { ApicizeResult, ApplicationSettings } from '@apicize/lib-typescript';
import { ApicizeProvider } from './providers/apicize.provider';
import { ConfigurableTheme } from './controls/configurable-theme';
import { PkceProvider } from './providers/pkce.provider';
import { emit } from '@tauri-apps/api/event';
import { LogProvider } from './providers/log.provider';
import { CssBaseline } from '@mui/material'
import { FileDragDropProvider } from './providers/file-dragdrop.provider'

// This is defined externally via Tauri main or other boostrap application
declare var loadedSettings: ApplicationSettings
const settings = new ApicizeSettings(loadedSettings)

// const dragDropStore = new DragDropStore()
const feedbackStore = new FeedbackStore()
const workspaceStore = new WorkspaceStore(
  {
    onExecuteRequest: async (workspace, requestId, workbookFullName: string) =>
      core.invoke<ApicizeResult>('run_request', { workspace, requestId, workbookFullName }),
    onCancelRequest: (requestId) => core.invoke(
      'cancel_request', { requestId }),
    onClearToken: (authorizationId) => core.invoke(
      'clear_cached_authorization', { authorizationId }),
    onInitializePkce: (data: { authorizationId: string }) =>
      emit('oauth2-pkce-init', data),
    onClosePkce: (data: { authorizationId: string }) =>
      emit('oauth2-pkce-close', data),
    onRefreshToken: (data: { authorizationId: string }) =>
      emit('oauth2-refresh-token', data),
  },
)

export default function Home() {
  return (
    <ApicizeProvider settings={settings}>
      <ConfigurableTheme>
        <CssBaseline />
        <FeedbackProvider store={feedbackStore}>
          <FileOperationsProvider store={workspaceStore}>
            <LogProvider>
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
            </LogProvider>
          </FileOperationsProvider>
        </FeedbackProvider>
      </ConfigurableTheme>
    </ApicizeProvider >
  )
}
