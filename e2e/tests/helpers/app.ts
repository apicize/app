import { browser } from '@wdio/globals'
import * as path from 'path'

/** Base URL of the dockerized sample API (matches the fixture scenario). */
export const API_BASE_URL = 'http://localhost:3000'

export const FIXTURES_DIR = path.resolve(__dirname, '../fixtures')

export function fixturePath(name: string): string {
  return path.join(FIXTURES_DIR, name)
}

/**
 * Wait for the Tauri webview to finish loading and confirm it is served from a
 * Tauri custom-protocol origin (i.e. the release binary, not the dev server).
 */
export async function waitForAppReady(): Promise<void> {
  await browser.waitUntil(
    () => browser.execute(() => document.readyState === 'complete'),
    { timeout: 20_000, interval: 500, timeoutMsg: 'Tauri app did not finish loading' }
  )

  const pageUrl: string = await browser.execute(() => window.location.href)
  if (!pageUrl.startsWith('tauri://') && !pageUrl.startsWith('http://tauri.')) {
    throw new Error(
      `App is not serving from a Tauri custom-protocol origin (got: ${pageUrl}). ` +
        'Run "yarn build:prod" from the repo root to build the release binary before running e2e tests.'
    )
  }
}

/** The current window's session id (used as the sessionId for IPC commands). */
export async function getSessionId(): Promise<string> {
  return browser.execute(() => (window as any).__TAURI_INTERNALS__.metadata.currentWindow.label)
}

/** Invoke a Tauri IPC command from inside the webview. */
export async function invoke<T = unknown>(command: string, args: Record<string, unknown>): Promise<T> {
  const result = await browser.executeAsync(
    function (cmd: string, cmdArgs: Record<string, unknown>, done: (r: unknown) => void) {
      ;(window as any).__TAURI_INTERNALS__
        .invoke(cmd, cmdArgs)
        .then((r: unknown) => done({ ok: r }))
        .catch((e: unknown) => done({ error: String(e) }))
    },
    command,
    args
  )
  const r = result as { ok?: T; error?: string }
  if (r.error !== undefined) {
    throw new Error(`IPC command "${command}" failed: ${r.error}`)
  }
  return r.ok as T
}

/**
 * Open a workbook in the current window. The backend emits an "initialize"
 * event which the frontend uses to rebuild the workspace, so after this
 * resolves the navigation tree reflects the opened workbook.
 */
export async function openWorkbook(fixtureFileName: string): Promise<void> {
  const sessionId = await getSessionId()
  await invoke('open_workspace', {
    fileName: fixturePath(fixtureFileName),
    sessionId,
    openInNewSession: false,
  })
  // Wait for the tree to render at least one navigation item from the workbook
  await browser.waitUntil(
    async () => (await $$('[data-testid="nav-item"]').length) > 0,
    { timeout: 15_000, interval: 300, timeoutMsg: 'Workbook navigation did not render after open' }
  )
}
