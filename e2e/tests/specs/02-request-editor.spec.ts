import { browser, expect } from '@wdio/globals'
import { waitForAppReady, openWorkbook } from '../helpers/app'
import nav from '../pageobjects/navigation.page'
import editor from '../pageobjects/request-editor.page'

describe('Request editor', () => {
  before(async () => {
    await waitForAppReady()
    await openWorkbook('e2e-sample.apicize')
  })

  it('shows the correct method, URL and name for a selected request', async () => {
    await nav.select('Add Numbers (text)')
    await editor.clickTab('Info')
    expect(await editor.getName()).toBe('Add Numbers (text)')
    expect(await editor.getUrl()).toBe('{{url}}/calc')
    expect(await editor.getMethod()).toBe('POST')
  })

  it('shows the request body text on the Body tab', async () => {
    await nav.select('Add Numbers (text)')
    const body = await editor.getBodyText()
    expect(body.replace(/\s/g, '')).toContain('1+2*3')
  })

  it('shows the test script on the Test Script tab', async () => {
    await nav.select('Add Numbers (text)')
    const test = await editor.getTestText()
    expect(test).toContain('describe')
    expect(test).toContain('status')
  })

  it('reflects a different request when selection changes', async () => {
    await nav.select('Subtract (JSON)')
    await editor.clickTab('Info')
    expect(await editor.getName()).toBe('Subtract (JSON)')
    expect(await editor.getMethod()).toBe('POST')
  })

  it('allows editing the request name and reflects it in the navigation tree', async () => {
    await nav.select('Subtract (JSON)')
    await editor.setName('Subtract Renamed')
    // The navigation tree label updates to the new name
    await browser.waitUntil(async () => nav.exists('Subtract Renamed'), {
      timeout: 8_000,
      timeoutMsg: 'Renamed request did not appear in navigation',
    })
    expect(await nav.exists('Subtract Renamed')).toBe(true)
    // Restore the original name so the fixture stays consistent for later specs
    await nav.select('Subtract Renamed')
    await editor.setName('Subtract (JSON)')
    await browser.waitUntil(async () => nav.exists('Subtract (JSON)'), { timeout: 8_000 })
  })
})
