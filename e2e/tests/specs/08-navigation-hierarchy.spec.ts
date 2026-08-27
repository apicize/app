import { browser, $, expect } from '@wdio/globals'
import { waitForAppReady, openWorkbook } from '../helpers/app'
import nav from '../pageobjects/navigation.page'
import editors from '../pageobjects/editors.page'

/**
 * Request/group hierarchy: adding groups and subgroups, moving requests between
 * groups via drag-and-drop, reordering, and the guard against moving a group
 * into one of its own descendants.
 */
describe('Navigation hierarchy and drag-and-drop', () => {
  before(async () => {
    await waitForAppReady()
    await openWorkbook('e2e-hierarchy.apicize')
  })

  it('adds a top-level group via the Requests section menu', async () => {
    await nav.openSectionMenu('Requests')
    await nav.clickMenuItem('Append Group')
    // New group is active in the group editor; name it
    await $('#group-name').waitForDisplayed({ timeout: 10_000 })
    await editors.setInput('group-name', 'New Group')
    await browser.waitUntil(async () => nav.exists('New Group'), {
      timeout: 8_000,
      timeoutMsg: 'New group did not appear',
    })
    expect(await nav.depthOf('New Group')).toBe(1)
  })

  it('adds a subgroup nested under an existing group', async () => {
    await nav.select('Group One')
    await nav.openContextMenu('Group One')
    await nav.clickMenuItem('Add Request Group')
    await $('#group-name').waitForDisplayed({ timeout: 10_000 })
    await editors.setInput('group-name', 'Sub Group')
    await browser.waitUntil(async () => nav.isDescendantOf('Sub Group', 'Group One'), {
      timeout: 8_000,
      timeoutMsg: 'Sub Group was not nested under Group One',
    })
    expect(await nav.isDescendantOf('Sub Group', 'Group One')).toBe(true)
    expect(await nav.depthOf('Sub Group')).toBe(2)
  })

  it('reorders two top-level requests', async () => {
    // Initial order: Alpha before Beta
    expect(await nav.orderIndex('Alpha')).toBeLessThan(await nav.orderIndex('Beta'))
    await nav.dragItem('Alpha', 'Beta', 'after')
    await browser.waitUntil(async () => (await nav.orderIndex('Alpha')) > (await nav.orderIndex('Beta')), {
      timeout: 8_000,
      timeoutMsg: 'Alpha was not reordered after Beta',
    })
    expect(await nav.orderIndex('Alpha')).toBeGreaterThan(await nav.orderIndex('Beta'))
  })

  it('moves a request into a group', async () => {
    await nav.dragItem('Alpha', 'Group Two', 'into')
    await browser.waitUntil(async () => nav.isDescendantOf('Alpha', 'Group Two'), {
      timeout: 8_000,
      timeoutMsg: 'Alpha was not moved into Group Two',
    })
    expect(await nav.isDescendantOf('Alpha', 'Group Two')).toBe(true)
  })

  it('moves a request from one group into another', async () => {
    await nav.dragItem('Alpha', 'Group One', 'into')
    await browser.waitUntil(
      async () => (await nav.isDescendantOf('Alpha', 'Group One')) && !(await nav.isDescendantOf('Alpha', 'Group Two')),
      { timeout: 8_000, timeoutMsg: 'Alpha was not moved from Group Two into Group One' }
    )
    expect(await nav.isDescendantOf('Alpha', 'Group One')).toBe(true)
    expect(await nav.isDescendantOf('Alpha', 'Group Two')).toBe(false)
  })

  it('prevents moving a group into one of its own descendants', async () => {
    // Ensure Parent > Child are both visible
    await nav.expandUntilVisible('Parent', 'Child')
    expect(await nav.isDescendantOf('Child', 'Parent')).toBe(true)

    // Attempt the invalid move: Parent into its child Child
    await nav.dragItem('Parent', 'Child', 'into')
    await browser.pause(500)

    // Structure must be unchanged: Parent stays top-level, Child stays under Parent,
    // and Parent must NOT have become a descendant of Child.
    expect(await nav.depthOf('Parent')).toBe(1)
    expect(await nav.isDescendantOf('Child', 'Parent')).toBe(true)
    expect(await nav.isDescendantOf('Parent', 'Child')).toBe(false)
  })
})
