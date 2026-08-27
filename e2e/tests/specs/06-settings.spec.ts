import { browser, $, $$, expect } from '@wdio/globals'
import { waitForAppReady, openWorkbook } from '../helpers/app'

/**
 * Settings panel: opened from the nav-ops toolbar (title='Settings'). Panels
 * are a vertical ToggleButtonGroup (Workspace Defaults / Application / Locks).
 */
describe('Settings', () => {
  before(async () => {
    await waitForAppReady()
    await openWorkbook('e2e-sample.apicize')
  })

  // Ensure the settings editor is open (the Settings button toggles).
  async function openSettings() {
    const alreadyOpen = await $('button[aria-label="workspace defaults"]').isDisplayed().catch(() => false)
    if (alreadyOpen) return
    const btn = $('button[title="Settings"]')
    await btn.waitForDisplayed({ timeout: 10_000 })
    await btn.click()
    await $('button[aria-label="workspace defaults"]').waitForDisplayed({ timeout: 10_000 })
  }

  // Close the settings editor if open.
  async function closeSettings() {
    const alreadyOpen = await $('button[aria-label="workspace defaults"]').isDisplayed().catch(() => false)
    if (!alreadyOpen) return
    await $('button[title="Settings"]').click()
  }

  it('opens the settings editor', async () => {
    await openSettings()
    const title = $('.editor-title')
    await title.waitForExist({ timeout: 10_000 })
    const label = await title.getAttribute('aria-label')
    expect(label).toContain('Settings')
  })

  it('shows the Workspace Defaults panel with parameter selectors', async () => {
    await openSettings()
    const defaultsTab = $('button[aria-label="workspace defaults"]')
    await defaultsTab.waitForDisplayed({ timeout: 10_000 })
    await defaultsTab.click()
    // The defaults panel contains the scenario default selector
    const scenarioSelect = $('.settings-panel #cred-scenario')
    await scenarioSelect.waitForExist({ timeout: 10_000 })
    expect(await scenarioSelect.isExisting()).toBe(true)
  })

  it('switches to the Application settings panel', async () => {
    await openSettings()
    const appTab = $('button[aria-label="app settings"]')
    await appTab.waitForDisplayed({ timeout: 10_000 })
    await appTab.click()
    // "Reset to Defaults" button is unique to the application settings panel
    const reset = $('button[aria-label="defaults"]')
    await reset.waitForDisplayed({ timeout: 10_000 })
    expect(await reset.isDisplayed()).toBe(true)
  })

  it('toggles the settings panel closed when the Settings button is pressed again', async () => {
    await openSettings()
    await closeSettings()
    // Back to normal mode: the workspace-defaults tab is gone and nav is present
    await browser.waitUntil(
      async () =>
        !(await $('button[aria-label="workspace defaults"]').isDisplayed().catch(() => false)) &&
        (await $$('[data-testid="nav-item"]').length) > 0,
      { timeout: 8_000, timeoutMsg: 'Navigation did not return after closing settings' }
    )
  })
})
