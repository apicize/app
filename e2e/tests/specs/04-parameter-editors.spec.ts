import { browser, expect } from '@wdio/globals'
import { waitForAppReady, openWorkbook } from '../helpers/app'
import nav from '../pageobjects/navigation.page'
import editors from '../pageobjects/editors.page'

describe('Parameter editors (scenario, authorization)', () => {
  before(async () => {
    await waitForAppReady()
    await openWorkbook('e2e-sample.apicize')
    await nav.expandSectionByTitle('Scenarios')
    await nav.expandSectionByTitle('Authorizations')
    // Expand the Public subsections so the workbook entities are reachable
    await nav.expandSectionByTitle('Public')
  })

  it('shows the scenario editor with the workbook scenario name', async () => {
    await nav.select('Local Vars')
    await editors.scenarioName.waitForDisplayed({ timeout: 10_000 })
    expect(await editors.scenarioName.getValue()).toBe('Local Vars')
    const title = await editors.editorTitle()
    expect(title).toContain('Local Vars')
  })

  it('allows renaming a scenario and reflects it in the tree', async () => {
    await nav.select('Local Vars')
    await editors.setInput('scenario-name', 'Renamed Vars')
    await browser.waitUntil(async () => nav.exists('Renamed Vars'), {
      timeout: 8_000,
      timeoutMsg: 'Renamed scenario did not appear in navigation',
    })
    expect(await nav.exists('Renamed Vars')).toBe(true)
    // Restore
    await nav.select('Renamed Vars')
    await editors.setInput('scenario-name', 'Local Vars')
    await browser.waitUntil(async () => nav.exists('Local Vars'), { timeout: 8_000 })
  })

  it('shows the authorization editor with type OAuth2 Client', async () => {
    await nav.select('Local Auth')
    await editors.authName.waitForDisplayed({ timeout: 10_000 })
    expect(await editors.authName.getValue()).toBe('Local Auth')
    // The OAuth2 client editor exposes the access token url field
    const tokenUrl = await browser.execute(
      () => (document.querySelector('#auth-oauth2-access-token-url') as HTMLInputElement | null)?.value ?? ''
    )
    expect(tokenUrl).toContain('localhost:3000/token')
  })
})
