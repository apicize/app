import { browser, expect } from '@wdio/globals'
import { waitForAppReady, invoke, getSessionId, fixturePath } from '../helpers/app'

// Chaos/stability test: fire many concurrent executions at unreachable
// endpoints and confirm the app neither crashes nor deadlocks. The requests
// target 127.0.0.1:9998 (nothing listening) so connection-refused is expected;
// what matters is that the app stays responsive.
const WORKBOOK_PATH = fixturePath('stress.apicize')

const REQUEST_IDS = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
]

describe('Chaos stress test', () => {
  let sessionId: string

  before(async () => {
    await waitForAppReady()
    sessionId = await getSessionId()
    await invoke('open_workspace', {
      fileName: WORKBOOK_PATH,
      sessionId,
      openInNewSession: false,
    })
  })

  async function runAllConcurrently(): Promise<unknown[]> {
    return browser.executeAsync(function (
      sid: string,
      ids: string[],
      workbookPath: string,
      done: (r: unknown[]) => void
    ) {
      var invokeFn = (window as any).__TAURI_INTERNALS__.invoke
      Promise.all(
        ids.map(function (id) {
          return invokeFn('start_execution', {
            sessionId: sid,
            requestOrGroupId: id,
            workbookFullName: workbookPath,
            singleRun: true,
          }).catch(function (e: unknown) {
            return { error: String(e) }
          })
        })
      ).then(done)
    }, sessionId, REQUEST_IDS, WORKBOOK_PATH)
  }

  it('handles an initial wave of concurrent executions', async () => {
    const results = await runAllConcurrently()
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBe(REQUEST_IDS.length)
  })

  it('remains stable through a second wave immediately after the first', async () => {
    const results = await runAllConcurrently()
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBe(REQUEST_IDS.length)
  })

  it('is still responsive after concurrent load', async () => {
    const title = await browser.getTitle()
    expect(typeof title).toBe('string')
  })
})
