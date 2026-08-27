import { expect } from '@wdio/globals'
import { waitForAppReady, openWorkbook } from '../helpers/app'
import nav from '../pageobjects/navigation.page'
import results from '../pageobjects/results.page'

/**
 * SOCKS5 proxy support. The docker harness runs a SOCKS5 proxy (172.28.5.20)
 * alongside the API (172.28.5.10). The API's /whoami endpoint reports the
 * observed client address, so routing through the proxy is provable: a proxied
 * request is seen coming from the proxy's IP, a direct request from the docker
 * gateway. Each request's own test script asserts the expected client address,
 * so a passing test proves the routing.
 */
describe('SOCKS5 proxy', () => {
  before(async () => {
    await waitForAppReady()
    await openWorkbook('e2e-proxy.apicize')
  })

  it('routes a request through the SOCKS5 proxy (client IP is the proxy)', async () => {
    await nav.select('Proxied Whoami')
    await results.runAndWait()
    expect(await results.getStatusCode()).toBe(200)
    const counts = await results.summaryCounts()
    expect(counts.error).toBe(0)
    expect(counts.failure).toBe(0)
    expect(counts.success).toBeGreaterThan(0)
    // The test script asserted the client address equals the proxy's IP
    const tests = await results.testResults()
    expect(tests.every((t) => t.status === 'pass')).toBe(true)
  })

  it('sends a request directly when no proxy is selected (client IP is the gateway)', async () => {
    await nav.select('Direct Whoami')
    await results.runAndWait()
    expect(await results.getStatusCode()).toBe(200)
    const counts = await results.summaryCounts()
    expect(counts.error).toBe(0)
    expect(counts.failure).toBe(0)
    expect(counts.success).toBeGreaterThan(0)
  })
})
