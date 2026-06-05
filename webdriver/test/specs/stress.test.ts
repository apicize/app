import * as path from 'path'

const WORKBOOK_PATH = path.resolve(__dirname, '../fixtures/stress.apicize')

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
    // Wait for Tauri's page to finish loading so the IPC origin is valid
    await browser.waitUntil(
      () => browser.execute(() => document.readyState === 'complete'),
      { timeout: 15_000, interval: 500, timeoutMsg: 'Tauri app did not finish loading' }
    )

    const pageUrl: string = await browser.execute(() => window.location.href)
    console.log('[stress] page URL:', pageUrl)
    if (!pageUrl.startsWith('tauri://') && !pageUrl.startsWith('http://tauri.')) {
      throw new Error(
        `App is not serving from a Tauri custom-protocol origin (got: ${pageUrl}). ` +
        'Run "yarn build:prod" to build the release binary before running WebDriver tests.'
      )
    }

    const result: unknown = await browser.executeAsync(function (
      workbookPath: string,
      done: (r: unknown) => void
    ) {
      var win = window as any
      win.__TAURI_INTERNALS__
        .invoke('open_workspace', {
          fileName: workbookPath,
          sessionId: null,
          openInNewSession: false,
        })
        .then(function (r: unknown) {
          done(r)
        })
        .catch(function (e: unknown) {
          done({ error: String(e) })
        })
    }, WORKBOOK_PATH)

    if (typeof result !== 'string') throw new Error(`open_workspace failed: ${JSON.stringify(result)}`)
    sessionId = result
  })

  async function runAllConcurrently(): Promise<unknown[]> {
    return browser.executeAsync(function (
      sid: string,
      ids: string[],
      workbookPath: string,
      done: (r: unknown[]) => void
    ) {
      var invoke = (window as any).__TAURI_INTERNALS__.invoke
      Promise.all(
        ids.map(function (id) {
          return invoke('start_execution', {
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
    // Connection refused is expected — what matters is no crash or deadlock
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBe(REQUEST_IDS.length)
  })

  it('remains stable through a second wave immediately after the first', async () => {
    const results = await runAllConcurrently()
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBe(REQUEST_IDS.length)
  })

  it('is still responsive after concurrent load', async () => {
    // If the app crashed or deadlocked this will timeout
    const title = await browser.getTitle()
    expect(typeof title).toBe('string')
  })
})
