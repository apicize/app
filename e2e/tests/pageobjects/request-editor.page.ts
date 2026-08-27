import { browser, $ } from '@wdio/globals'

/**
 * The request editor. Plain fields (name/url/method) are MUI TextField/Select;
 * body and test script are Monaco editors.
 *
 * The request tab strip and the results viewer tab strip both use MUI
 * ToggleButtons with overlapping `value`s (Info/Headers). We disambiguate by
 * scoping to the `.button-column` that contains the request-only "show test"
 * tab.
 */
class RequestEditorPage {
  /** Click a request-editor tab by its ToggleButton value (Info, Query String, Headers, Body, Test Script, Execution Parameters). */
  async clickTab(value: string): Promise<void> {
    await browser.execute((v: string) => {
      const columns = Array.from(document.querySelectorAll('.button-column'))
      const requestColumn = columns.find((c) => c.querySelector('button[aria-label="show test"]'))
      const btn = requestColumn?.querySelector(`button[value="${v}"]`) as HTMLElement | null
      if (!btn) throw new Error(`Request tab "${v}" not found`)
      btn.click()
    }, value)
  }

  get nameInput() {
    return $('#request-name')
  }
  get urlInput() {
    return $('#request-url')
  }
  get methodSelect() {
    return $('#request-method')
  }

  async getName(): Promise<string> {
    return this.nameInput.getValue()
  }
  async getUrl(): Promise<string> {
    return this.urlInput.getValue()
  }
  async getMethod(): Promise<string> {
    // MUI Select places the id on the combobox div; its text is the selected method
    return browser.execute(() => {
      const el = document.querySelector('#request-method') as HTMLElement | null
      return (el?.textContent ?? '').trim()
    })
  }

  async setName(name: string): Promise<void> {
    await this.clickTab('Info')
    const input = this.nameInput
    await input.waitForDisplayed({ timeout: 10_000 })
    await input.click()
    // Select-all + delete works cross-platform in the webview
    await browser.keys(['Control', 'a'])
    await browser.keys('Delete')
    await input.setValue(name)
  }

  async setUrl(url: string): Promise<void> {
    await this.clickTab('Info')
    const input = this.urlInput
    await input.waitForDisplayed({ timeout: 10_000 })
    await input.click()
    await browser.keys(['Control', 'a'])
    await browser.keys('Delete')
    await input.setValue(url)
  }

  async setMethod(method: string): Promise<void> {
    await this.clickTab('Info')
    await this.methodSelect.waitForDisplayed({ timeout: 10_000 })
    // A real click is required for MUI Select to open its menu
    await this.methodSelect.click()
    await this.chooseOption(method)
  }

  /** Choose the body content type (e.g. Text, JSON, GraphQL, Form) on the Body tab. */
  async setBodyType(type: string): Promise<void> {
    await this.clickTab('Body')
    const bodyType = $('#request-body-type')
    await bodyType.waitForDisplayed({ timeout: 10_000 })
    await bodyType.click()
    await this.chooseOption(type)
  }

  /**
   * Select an open MUI Select option by its data-value. Dispatches the click via
   * the DOM so the menu backdrop can't swallow it during the open transition.
   */
  private async chooseOption(dataValue: string): Promise<void> {
    await browser.waitUntil(
      async () =>
        browser.execute((v: string) => {
          const opt = document.querySelector(`li[data-value="${v}"]`) as HTMLElement | null
          return !!opt && opt.offsetParent !== null
        }, dataValue),
      { timeout: 5_000, interval: 100, timeoutMsg: `Select option "${dataValue}" did not become visible` }
    )
    const ok = await browser.execute((v: string) => {
      const opt = document.querySelector(`li[data-value="${v}"]`) as HTMLElement | null
      if (!opt) return false
      opt.click()
      return true
    }, dataValue)
    if (!ok) throw new Error(`Select option "${dataValue}" not found`)
  }

  /** Read the current Body Monaco editor text (visible lines). */
  async getBodyText(): Promise<string> {
    await this.clickTab('Body')
    return this.readMonaco('#request-body-container')
  }

  /** Read the current Test Script Monaco editor text (visible lines). */
  async getTestText(): Promise<string> {
    await this.clickTab('Test Script')
    return this.readMonaco('#request-test-container')
  }

  private async readMonaco(containerSelector: string): Promise<string> {
    const container = $(`${containerSelector} .monaco-editor`)
    await container.waitForExist({ timeout: 10_000 })
    return browser.execute((sel: string) => {
      const lines = document.querySelector(`${sel} .view-lines`)
      return lines ? (lines as HTMLElement).innerText : ''
    }, containerSelector)
  }
}

export default new RequestEditorPage()
