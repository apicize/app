import { browser, $, $$ } from '@wdio/globals'

/**
 * The data-set editor: a Name field, a Type select (#data-type) whose value is
 * the DataSourceType ('JSON' | 'FILE-JSON' | 'FILE-CSV'), and either a Monaco
 * JSON editor (JSON / FILE-JSON) or a MUI DataGrid (FILE-CSV).
 */
class DataSetPage {
  get nameInput() {
    return $('#data-name')
  }

  async setName(name: string): Promise<void> {
    const input = this.nameInput
    await input.waitForDisplayed({ timeout: 10_000 })
    await input.click()
    await browser.keys(['Control', 'a'])
    await browser.keys('Delete')
    await input.setValue(name)
  }

  /** Current DataSourceType value ('JSON' | 'FILE-JSON' | 'FILE-CSV'). */
  async getType(): Promise<string> {
    // MUI Select keeps the raw value in a hidden native input beside the combobox.
    return browser.execute(() => {
      const combo = document.querySelector('#data-type')
      const root = combo?.closest('.MuiInputBase-root') ?? combo?.parentElement
      const native = root?.querySelector(
        'input.MuiSelect-nativeInput, input[aria-hidden="true"]'
      ) as HTMLInputElement | null
      return native?.value ?? ''
    })
  }

  /** Change the data source type via the Type select. */
  async setType(dataValue: 'JSON' | 'FILE-JSON' | 'FILE-CSV'): Promise<void> {
    const select = $('#data-type')
    await select.waitForDisplayed({ timeout: 10_000 })
    await select.click()
    await browser.waitUntil(
      async () =>
        browser.execute((v: string) => {
          const o = document.querySelector(`li[data-value="${v}"]`) as HTMLElement | null
          return !!o && o.offsetParent !== null
        }, dataValue),
      { timeout: 5_000, interval: 100, timeoutMsg: `Type option "${dataValue}" not visible` }
    )
    await browser.execute((v: string) => {
      const o = document.querySelector(`li[data-value="${v}"]`) as HTMLElement | null
      o?.click()
    }, dataValue)
    await browser.pause(200)
  }

  // --- JSON (Monaco) ---
  private monacoSelector = '.editor.data .monaco-editor'

  async setJsonText(json: string): Promise<void> {
    const monaco = $(this.monacoSelector)
    await monaco.waitForExist({ timeout: 10_000 })
    await monaco.click()
    await browser.keys(['Control', 'a'])
    await browser.keys('Delete')
    // Monaco "types over" auto-inserted closing brackets/quotes, so a single-line
    // JSON string can be typed literally and comes out correct.
    await browser.keys(json)
    await browser.pause(200)
  }

  async getJsonText(): Promise<string> {
    return browser.execute((sel: string) => {
      const lines = document.querySelector(`${sel} .view-lines`)
      return lines ? (lines as HTMLElement).innerText : ''
    }, this.monacoSelector)
  }

  // --- CSV (DataGrid) ---
  async isCsvGridVisible(): Promise<boolean> {
    return $('.MuiDataGrid-root').isExisting()
  }

  /** Column field names shown in the grid (excludes the row-number and actions columns). */
  async csvColumnFields(): Promise<string[]> {
    return browser.execute(() => {
      const heads = Array.from(document.querySelectorAll('.MuiDataGrid-columnHeader'))
      return heads
        .map((h) => h.getAttribute('data-field') ?? '')
        .filter((f) => f && f !== 'rowNumber' && f !== 'actions' && f !== '__check__')
    })
  }

  async csvRowCount(): Promise<number> {
    const rows = await $$('.MuiDataGrid-row')
    return rows.length
  }

  async addCsvRow(): Promise<void> {
    const btn = $('#datasource-add-btn')
    await btn.waitForDisplayed({ timeout: 10_000 })
    await btn.click()
    await browser.pause(200)
  }

  /** Add a CSV column via the column header menu + dialog. */
  async addCsvColumn(afterField: string, name: string): Promise<void> {
    // Open the column header's 3-dot menu (the menu-icon button, shown on hover)
    await browser.execute((field: string) => {
      const header = document.querySelector(`.MuiDataGrid-columnHeader[data-field="${field}"]`)
      const btn = (header?.querySelector('.MuiDataGrid-menuIconButton') ??
        header?.querySelector('button')) as HTMLElement | null
      btn?.click()
    }, afterField)
    // Click "Add Column"
    const addItem = $('li.MuiMenuItem-root=Add Column')
    await addItem.waitForDisplayed({ timeout: 5_000 })
    await browser.execute(() => {
      const items = Array.from(document.querySelectorAll('li.MuiMenuItem-root'))
      const item = items.find((i) => (i.textContent ?? '').trim() === 'Add Column') as HTMLElement | undefined
      item?.click()
    })
    // Fill the dialog and confirm
    const input = $('.MuiDialog-root input')
    await input.waitForDisplayed({ timeout: 5_000 })
    await input.setValue(name)
    await browser.execute(() => {
      const buttons = Array.from(document.querySelectorAll('.MuiDialog-root .MuiDialogActions-root button'))
      const add = buttons.find((b) => (b.textContent ?? '').trim() === 'Add') as HTMLElement | undefined
      add?.click()
    })
    await browser.pause(300)
  }
}

export default new DataSetPage()
