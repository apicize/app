import { browser, $, expect } from '@wdio/globals'
import { waitForAppReady, openWorkbook } from '../helpers/app'
import nav from '../pageobjects/navigation.page'
import editor from '../pageobjects/request-editor.page'
import results from '../pageobjects/results.page'

/**
 * Creating, editing, running and deleting a request entirely through the UI
 * (context menus, editor fields, confirmation dialog).
 */
describe('Entity CRUD through the UI', () => {
  const NEW_NAME = 'Created By E2E'

  before(async () => {
    await waitForAppReady()
    await openWorkbook('e2e-sample.apicize')
  })

  it('adds a new request via the Requests section menu', async () => {
    await nav.openSectionMenu('Requests')
    await nav.clickMenuItem('Append Request')
    // The new request becomes the active selection; name it via the editor
    await editor.clickTab('Info')
    await editor.nameInput.waitForDisplayed({ timeout: 10_000 })
    await editor.setName(NEW_NAME)
    await browser.waitUntil(async () => nav.exists(NEW_NAME), {
      timeout: 8_000,
      timeoutMsg: 'Newly created request did not appear in navigation',
    })
    expect(await nav.exists(NEW_NAME)).toBe(true)
  })

  it('configures the new request to hit the sample API and runs it', async () => {
    await nav.select(NEW_NAME)
    await editor.setUrl('{{url}}/calc')
    await editor.setMethod('POST')

    // Add a text body via the Body tab
    await editor.setBodyType('Text')

    // Type into the Monaco body editor
    const monaco = $('#request-body-container .monaco-editor')
    await monaco.waitForExist({ timeout: 10_000 })
    await monaco.click()
    await browser.keys('9*9')

    await results.runAndWait()
    expect(await results.getStatusCode()).toBe(200)
  })

  it('deletes the request and confirms via the dialog', async () => {
    await nav.select(NEW_NAME)
    await nav.openContextMenu(NEW_NAME)
    await nav.clickMenuItem('Delete Request')

    // Confirmation dialog appears; accept it
    const ok = $('[data-testid="confirm-ok"]')
    await ok.waitForDisplayed({ timeout: 8_000 })
    await ok.click()

    await browser.waitUntil(async () => !(await nav.exists(NEW_NAME)), {
      timeout: 8_000,
      timeoutMsg: 'Request was not removed from navigation after delete',
    })
    expect(await nav.exists(NEW_NAME)).toBe(false)
  })
})
