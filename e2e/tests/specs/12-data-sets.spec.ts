import { browser, expect } from '@wdio/globals'
import { waitForAppReady, openWorkbook } from '../helpers/app'
import nav from '../pageobjects/navigation.page'
import ds from '../pageobjects/dataset.page'

/**
 * Data sets: creating each type (internal JSON, external JSON, external CSV)
 * and converting between them. External types are created/converted in-memory
 * via the Type select; writing them to disk (native file dialog) is out of
 * scope for automated UI testing.
 */
describe('Data sets', () => {
  before(async () => {
    await waitForAppReady()
    await openWorkbook('e2e-datasets.apicize')
  })

  it('creates an internal JSON data set', async () => {
    await nav.clickSectionAddButton('Data Sets')
    await ds.nameInput.waitForDisplayed({ timeout: 10_000 })
    await ds.setName('People JSON')
    expect(await ds.getType()).toBe('JSON')
    await ds.setJsonText('[{"name":"Ada","age":36}]')
    expect(await ds.getJsonText()).toContain('Ada')
    await browser.waitUntil(async () => nav.exists('People JSON'), {
      timeout: 8_000,
      timeoutMsg: 'Data set did not appear in navigation',
    })
    expect(await nav.exists('People JSON')).toBe(true)
  })

  it('converts internal JSON to external CSV (grid with columns and a row)', async () => {
    await nav.select('People JSON')
    await ds.setType('FILE-CSV')
    expect(await ds.getType()).toBe('FILE-CSV')
    await browser.waitUntil(async () => ds.isCsvGridVisible(), {
      timeout: 8_000,
      timeoutMsg: 'CSV grid did not appear after converting to CSV',
    })
    const cols = await ds.csvColumnFields()
    expect(cols).toContain('name')
    expect(cols).toContain('age')
    expect(await ds.csvRowCount()).toBe(1)
  })

  it('converts external CSV back to internal JSON (content preserved)', async () => {
    await nav.select('People JSON')
    await ds.setType('JSON')
    expect(await ds.getType()).toBe('JSON')
    const text = await ds.getJsonText()
    expect(text).toContain('name')
    expect(text).toContain('age')
    expect(text).toContain('Ada')
    expect(text).toContain('36')
  })

  it('converts internal JSON to external JSON keeping the JSON editor and content', async () => {
    await nav.select('People JSON')
    await ds.setType('FILE-JSON')
    expect(await ds.getType()).toBe('FILE-JSON')
    // Still the JSON (Monaco) editor, not the CSV grid, and content is retained
    expect(await ds.isCsvGridVisible()).toBe(false)
    expect(await ds.getJsonText()).toContain('Ada')
  })

  it('creates an external CSV data set from scratch', async () => {
    await nav.clickSectionAddButton('Data Sets')
    await ds.nameInput.waitForDisplayed({ timeout: 10_000 })
    await ds.setName('Grid CSV')
    await ds.setType('FILE-CSV')
    await browser.waitUntil(async () => ds.isCsvGridVisible(), { timeout: 8_000 })

    // A fresh CSV starts with a single "data" column
    expect(await ds.csvColumnFields()).toContain('data')

    // Add a column and a row
    await ds.addCsvColumn('data', 'author')
    await browser.waitUntil(async () => (await ds.csvColumnFields()).includes('author'), {
      timeout: 8_000,
      timeoutMsg: 'New column "author" was not added',
    })
    await ds.addCsvRow()
    expect(await ds.csvRowCount()).toBe(1)
  })
})
