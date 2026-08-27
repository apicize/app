import { expect } from '@wdio/globals'
import { waitForAppReady, openWorkbook } from '../helpers/app'
import nav from '../pageobjects/navigation.page'
import results from '../pageobjects/results.page'

describe('Request execution and test results', () => {
  before(async () => {
    await waitForAppReady()
    await openWorkbook('e2e-sample.apicize')
  })

  it('runs a request against the sample API and shows a 200 status with passing tests', async () => {
    await nav.select('Add Numbers (text)')
    await results.runAndWait()

    expect(await results.getStatusCode()).toBe(200)

    const counts = await results.summaryCounts()
    expect(counts.error).toBe(0)
    expect(counts.failure).toBe(0)
    expect(counts.success).toBeGreaterThan(0)

    const tests = await results.testResults()
    expect(tests.length).toBeGreaterThan(0)
    expect(tests.every((t) => t.status === 'pass')).toBe(true)
  })

  it('runs a JSON calc request and passes its assertion', async () => {
    await nav.select('Subtract (JSON)')
    await results.runAndWait()
    expect(await results.getStatusCode()).toBe(200)
    const counts = await results.summaryCounts()
    expect(counts.failure).toBe(0)
    expect(counts.error).toBe(0)
    expect(counts.success).toBeGreaterThan(0)
  })

  it('surfaces a failing test with a 200 response (mixed result)', async () => {
    await nav.select('Intentional Failure')
    await results.runAndWait()

    // The request itself succeeds (200) but the body assertion fails
    expect(await results.getStatusCode()).toBe(200)
    const counts = await results.summaryCounts()
    expect(counts.failure).toBeGreaterThan(0)

    const tests = await results.testResults()
    const failing = tests.filter((t) => t.status === 'fail')
    expect(failing.length).toBeGreaterThan(0)
  })

  it('runs a group and executes all child requests in sequence', async () => {
    await nav.select('Quote Lifecycle')
    await results.runAndWait(90_000)

    const counts = await results.summaryCounts()
    expect(counts.error).toBe(0)
    expect(counts.failure).toBe(0)
    expect(counts.success).toBeGreaterThan(0)

    // Each of the four child requests contributes at least one passing test
    const tests = await results.testResults()
    expect(tests.length).toBeGreaterThanOrEqual(4)
    expect(tests.every((t) => t.status === 'pass')).toBe(true)
  })

  it('clears execution results', async () => {
    await nav.select('Add Numbers (text)')
    await results.runAndWait()
    await results.clear()
    // After clearing, no result sections remain for this request
    expect(await results.getStatusCode()).toBe(null)
  })
})
