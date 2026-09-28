import { browser, $ } from '@wdio/globals'

/**
 * The request editor. Plain fields (name/url/method) are MUI TextField/Select;
 * body and test script are Monaco editors.
 *
 * The request tab strip and the results viewer tab strip both use MUI
 * ToggleButtons with overlapping `value`s (Info/Headers). We disambiguate by
 * scoping to the `.button-column` that contains the request-only "Test Script"
 * tab (which hosts both the test and setup scripts, see setScriptMode).
 */
class RequestEditorPage {
  /** Click a request-editor tab by its ToggleButton value (Info, Query String, Headers, Body, Test Script, Execution Parameters). */
  async clickTab(value: string): Promise<void> {
    await browser.execute((v: string) => {
      const columns = Array.from(document.querySelectorAll('.button-column'))
      const requestColumn = columns.find((c) => c.querySelector('button[value="Test Script"]'))
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
    // The menu's (invisible) backdrop lingers during the close transition and
    // intercepts native clicks on whatever is underneath it
    await browser.waitUntil(
      async () => browser.execute(() => !document.querySelector('.MuiMenu-root .MuiBackdrop-root, .MuiPopover-root .MuiBackdrop-root')),
      { timeout: 5_000, interval: 100, timeoutMsg: `Select menu did not close after choosing "${dataValue}"` }
    )
  }

  /** Read the current Body Monaco editor text (visible lines). */
  async getBodyText(): Promise<string> {
    await this.clickTab('Body')
    return this.readMonaco('#request-body-container')
  }

  /**
   * Choose which script the Test Script tab edits: the test (after execution)
   * or setup (before execution) script. The mode is shared across requests.
   */
  async setScriptMode(mode: 'test' | 'setup'): Promise<void> {
    await this.clickTab('Test Script')
    const container = mode === 'test' ? '#request-test-container' : '#request-setup-container'
    if (await $(container).isExisting()) return
    await browser.waitUntil(
      async () =>
        browser.execute(() => !!document.querySelector('#request-test-container, #request-setup-container')),
      { timeout: 10_000, interval: 100, timeoutMsg: 'Script editor did not render' }
    )
    await browser.execute((m: string) => {
      const btn = document.querySelector(
        `#request-test-container button[aria-label="${m}"], #request-setup-container button[aria-label="${m}"]`
      ) as HTMLElement | null
      if (!btn) throw new Error(`Script mode button "${m}" not found`)
      btn.click()
    }, mode)
    await $(container).waitForExist({ timeout: 10_000 })
  }

  /** Read the current Test Script Monaco editor text (visible lines). */
  async getTestText(): Promise<string> {
    await this.setScriptMode('test')
    return this.readMonaco('#request-test-container')
  }

  /** Read the current Setup Script Monaco editor text (visible lines). */
  async getSetupText(): Promise<string> {
    await this.setScriptMode('setup')
    return this.readMonaco('#request-setup-container')
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
