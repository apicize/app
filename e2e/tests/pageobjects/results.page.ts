import { browser, $, $$ } from '@wdio/globals'

export interface TestResult {
  name: string
  status: string // 'pass' | 'fail'
}

/**
 * Run toolbar + results viewer. The run toolbar uses ToggleButtons
 * value='Run'|'Multi'|'Cancel'|'Clear'|'Seed'; only these live in the run
 * toolbar ('Multi' is unique to it). Results test outcomes are exposed via
 * data-testid attributes added to result-info-viewer.tsx.
 */
class ResultsPage {
  get runButton() {
    return $('button[value="Multi"]')
  }
  get cancelButton() {
    return $('button[value="Cancel"]')
  }
  get clearButton() {
    return $('button[value="Clear"]')
  }

  /** Run the currently-selected request/group (multi-run honoring configured runs=1). */
  async run(): Promise<void> {
    const btn = this.runButton
    await btn.waitForExist({ timeout: 10_000 })
    await browser.waitUntil(async () => btn.isDisplayed(), {
      timeout: 10_000,
      timeoutMsg: 'Run button never became visible',
    })
    await btn.click()
  }

  /** Wait for execution to finish (run button returns, results render). */
  async waitForComplete(timeout = 60_000): Promise<void> {
    // Cancel is only visible while running; wait for it to disappear again
    await browser.waitUntil(
      async () => {
        const running = await this.cancelButton.isDisplayed().catch(() => false)
        if (running) return false
        return (await $$('[data-testid="result-section"]').length) > 0
      },
      { timeout, interval: 500, timeoutMsg: 'Execution did not complete / no results rendered' }
    )
  }

  async runAndWait(timeout = 60_000): Promise<void> {
    await this.run()
    await this.waitForComplete(timeout)
  }

  /** HTTP status code of the first (top-level) result section. */
  async getStatusCode(): Promise<number | null> {
    const el = $('[data-testid="result-status"]')
    if (!(await el.isExisting())) return null
    const code = await el.getAttribute('data-status-code')
    return code ? parseInt(code, 10) : null
  }

  async summaryCounts(): Promise<{ success: number; failure: number; error: number }> {
    const read = async (testid: string) => {
      const el = $(`[data-testid="${testid}"]`)
      if (!(await el.isExisting())) return 0
      const c = await el.getAttribute('data-count')
      return c ? parseInt(c, 10) : 0
    }
    return {
      success: await read('result-summary-success'),
      failure: await read('result-summary-failure'),
      error: await read('result-summary-error'),
    }
  }

  /** All individual test outcomes currently displayed. */
  async testResults(): Promise<TestResult[]> {
    const els = await $$('[data-testid="test-result"]')
    const out: TestResult[] = []
    for (const e of els) {
      out.push({
        name: (await e.getAttribute('data-name')) ?? '',
        status: (await e.getAttribute('data-status')) ?? '',
      })
    }
    return out
  }

  /** Click a results-viewer panel toggle by aria-label (scoped to the results pane). */
  async showResultsPanel(ariaLabel: string): Promise<void> {
    await browser.execute((label: string) => {
      const pane = document.querySelector('#results-viewer') ?? document
      const btn = pane.querySelector(`button[aria-label="${label}"]`) as HTMLElement | null
      if (!btn) throw new Error(`Results panel button "${label}" not found`)
      btn.click()
    }, ariaLabel)
  }

  /** Text of the response body shown in the results viewer's Monaco editor. */
  async getResponseBodyText(): Promise<string> {
    return browser.execute(() => {
      const lines = document.querySelector('#results-viewer .monaco-editor .view-lines')
      return lines ? (lines as HTMLElement).innerText : ''
    })
  }

  /** Whether the results viewer currently shows any response header rows. */
  async hasResponseHeaders(): Promise<boolean> {
    return browser.execute(() => {
      const pane = document.querySelector('#results-viewer')
      if (!pane) return false
      return (pane.textContent ?? '').includes('Response Headers')
    })
  }

  async clear(): Promise<void> {
    const btn = this.clearButton
    if (await btn.isDisplayed().catch(() => false)) {
      await btn.click()
    }
  }
}

export default new ResultsPage()
