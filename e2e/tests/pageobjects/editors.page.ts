import { browser, $ } from '@wdio/globals'

/**
 * Helpers for the parameter/entity editors (scenario, authorization,
 * certificate, proxy, data set) and settings, keyed off the stable field ids
 * present in the toolkit editors.
 */
class EditorsPage {
  // --- Scenario editor ---
  get scenarioName() {
    return $('#scenario-name')
  }

  // --- Authorization editor ---
  get authName() {
    return $('#auth-name')
  }
  async getAuthType(): Promise<string> {
    return browser.execute(() => (document.querySelector('#auth-type') as HTMLInputElement | null)?.value ?? '')
  }

  // --- Certificate / Proxy ---
  get certName() {
    return $('#cert-name')
  }
  get proxyName() {
    return $('#proxy-name')
  }
  get proxyUrl() {
    return $('#proxy-url')
  }

  // --- Data set ---
  get dataName() {
    return $('#data-name')
  }

  /** Read the title shown in the active editor header (aria-label of .editor-title). */
  async editorTitle(): Promise<string> {
    const el = $('.editor-title')
    await el.waitForExist({ timeout: 10_000 })
    return (await el.getAttribute('aria-label')) ?? ''
  }

  /** Set the value of a plain MUI TextField input by id (select-all + retype). */
  async setInput(id: string, value: string): Promise<void> {
    const input = $(`#${id}`)
    await input.waitForDisplayed({ timeout: 10_000 })
    await input.click()
    await browser.keys(['Control', 'a'])
    await browser.keys('Delete')
    await input.setValue(value)
  }
}

export default new EditorsPage()
