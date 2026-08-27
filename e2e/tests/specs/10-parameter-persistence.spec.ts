import { browser, expect } from '@wdio/globals'
import { waitForAppReady, openWorkbook } from '../helpers/app'
import nav from '../pageobjects/navigation.page'

/**
 * Moving parameters (scenarios, authorizations, certificates, proxies) between
 * the Public / Private / Vault persistence subsections via drag-and-drop.
 *
 * EntityType numeric values: Scenario=6, Authorization=7, Certificate=8, Proxy=9.
 */
const PERSISTENCE_TITLE: Record<'W' | 'P' | 'V', string> = { W: 'Public', P: 'Private', V: 'Vault' }

const ENTITIES = [
  { label: 'Scenario', name: 'Scn A', type: 6, section: 'Scenarios' },
  { label: 'Authorization', name: 'Auth A', type: 7, section: 'Authorizations' },
  { label: 'Certificate', name: 'Cert A', type: 8, section: 'Certificates' },
  { label: 'Proxy', name: 'Proxy A', type: 9, section: 'Proxies' },
] as const

async function moveAndVerify(name: string, type: number, persistence: 'W' | 'P' | 'V') {
  await nav.dragItemToPersistence(name, type, persistence)
  // Make sure the destination subsection is expanded so the moved item renders
  await nav.expandSectionByTitle(PERSISTENCE_TITLE[persistence])
  await browser.waitUntil(async () => nav.isUnderPersistence(name, type, persistence), {
    timeout: 8_000,
    interval: 250,
    timeoutMsg: `${name} did not move into ${PERSISTENCE_TITLE[persistence]}`,
  })
  expect(await nav.isUnderPersistence(name, type, persistence)).toBe(true)
  expect(await nav.exists(name)).toBe(true)
}

for (const entity of ENTITIES) {
  describe(`${entity.label} persistence moves`, () => {
    before(async () => {
      await waitForAppReady()
      await openWorkbook('e2e-params.apicize')
      await nav.expandSectionByTitle(entity.section)
      await nav.expandSectionByTitle('Public')
      await browser.pause(200)
    })

    it('starts in the Public subsection', async () => {
      expect(await nav.isUnderPersistence(entity.name, entity.type, 'W')).toBe(true)
    })

    it('moves Public -> Private -> Vault -> Public', async () => {
      await moveAndVerify(entity.name, entity.type, 'P')
      expect(await nav.isUnderPersistence(entity.name, entity.type, 'W')).toBe(false)

      await moveAndVerify(entity.name, entity.type, 'V')
      expect(await nav.isUnderPersistence(entity.name, entity.type, 'P')).toBe(false)

      await moveAndVerify(entity.name, entity.type, 'W')
      expect(await nav.isUnderPersistence(entity.name, entity.type, 'V')).toBe(false)
    })
  })
}
