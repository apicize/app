import { expect } from '@wdio/globals'
import { waitForAppReady, openWorkbook } from '../helpers/app'
import nav from '../pageobjects/navigation.page'
import results from '../pageobjects/results.page'

describe('GraphQL execution and response viewers', () => {
  before(async () => {
    await waitForAppReady()
    await openWorkbook('e2e-sample.apicize')
  })

  it('runs a GraphQL mutation and passes its test', async () => {
    await nav.select('GraphQL Create')
    await results.runAndWait()
    expect(await results.getStatusCode()).toBe(200)
    const counts = await results.summaryCounts()
    expect(counts.error).toBe(0)
    expect(counts.failure).toBe(0)
    expect(counts.success).toBeGreaterThan(0)
  })

  it('shows the raw response body and headers in the results viewer', async () => {
    await nav.select('Add Numbers (text)')
    await results.runAndWait()

    // Raw body panel shows the calculated result
    await results.showResultsPanel('show body text')
    const body = await results.getResponseBodyText()
    expect(body.replace(/\s/g, '')).toContain('7')

    // Headers panel lists the response headers
    await results.showResultsPanel('show headers')
    expect(await results.hasResponseHeaders()).toBe(true)
  })
})
