import { browser, $ } from '@wdio/globals'
import { expect } from '@wdio/globals'
import { waitForAppReady, openWorkbook } from '../helpers/app'
import nav from '../pageobjects/navigation.page'

describe('Application launch and navigation', () => {
  before(async () => {
    await waitForAppReady()
    await openWorkbook('e2e-sample.apicize')
  })

  it('launches and serves the UI from the Tauri binary', async () => {
    const title = await browser.getTitle()
    expect(typeof title).toBe('string')
  })

  it('renders the top-level requests and group from the workbook', async () => {
    const names = await nav.itemNames()
    expect(names).toContain('Add Numbers (text)')
    expect(names).toContain('Subtract (JSON)')
    expect(names).toContain('Intentional Failure')
    expect(names).toContain('Quote Lifecycle')
  })

  it('expands a group to reveal its child requests', async () => {
    await nav.expandUntilVisible('Quote Lifecycle', 'Create Quote')
    expect(await nav.exists('Create Quote')).toBe(true)
    expect(await nav.exists('Get Quote')).toBe(true)
    expect(await nav.exists('Delete Quote')).toBe(true)
    expect(await nav.exists('Verify Deleted')).toBe(true)
  })

  it('selecting a request shows its editor with the request name in the title', async () => {
    await nav.select('Add Numbers (text)')
    const titleEl = $('.editor-title')
    await titleEl.waitForExist({ timeout: 10_000 })
    const label = await titleEl.getAttribute('aria-label')
    expect(label).toContain('Add Numbers (text)')
  })

  it('renders all resource section headers in the tree', async () => {
    const headers = await nav.sectionHeaders()
    for (const title of ['Requests', 'Data Sets', 'Scenarios', 'Authorizations', 'Certificates', 'Proxies']) {
      expect(headers).toContain(title)
    }
  })

  it('reveals the workbook scenario when drilling into Scenarios > Public', async () => {
    await nav.expandSectionByTitle('Scenarios')
    await nav.expandSectionByTitle('Public')
    await browser.waitUntil(async () => nav.exists('Local Vars'), {
      timeout: 8_000,
      timeoutMsg: 'Expected the "Local Vars" scenario to be visible under Scenarios > Public',
    })
    expect(await nav.exists('Local Vars')).toBe(true)
  })
})
