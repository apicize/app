import { browser } from '@wdio/globals'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { getSessionId, invoke } from '../helpers/app'

/******************************************************************************
 * Chaos monkey for the Apicize UI.
 *
 * Performs a seeded, reproducible stream of random user actions against the
 * demo workbook and checks, after every action, that the UI behaved
 * predictably. A shadow model tracks what the UI *should* look like (tree
 * contents, Test/Setup script mode, requests the monkey created) and is
 * compared against both the rendered UI and the backend state.
 ******************************************************************************/

export const DEMO_DIR = path.resolve(__dirname, '../../../app/src-tauri/help/demo')
export const REPORT_DIR = path.resolve(__dirname, '../../chaos-reports')

/** Requests section header, the root of every request/group path */
const REQUESTS = 'Requests'
const SEP = ' / '

export interface ChaosOptions {
  seed: number
  steps: number
  checkpointEvery: number
}

export function optionsFromEnv(): ChaosOptions {
  const int = (name: string, dflt: number) => {
    const v = process.env[name]
    const n = v === undefined || v === '' ? dflt : parseInt(v, 10)
    if (!Number.isFinite(n)) throw new Error(`${name} must be an integer (got "${v}")`)
    return n
  }
  return {
    seed: int('CHAOS_SEED', Date.now() % 2_147_483_647),
    steps: int('CHAOS_STEPS', 150),
    checkpointEvery: int('CHAOS_CHECKPOINT_EVERY', 25),
  }
}

/******************************************************************************
 * Seeded randomness
 ******************************************************************************/

export class Rng {
  private state: number
  constructor(seed: number) {
    this.state = seed >>> 0
  }
  /** mulberry32: small, fast and good enough for test scheduling */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  int(min: number, maxInclusive: number): number {
    return min + Math.floor(this.next() * (maxInclusive - min + 1))
  }
  chance(p: number): boolean {
    return this.next() < p
  }
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick() from empty list')
    return items[Math.floor(this.next() * items.length)]
  }
}

/******************************************************************************
 * Violations: an observed behavior that differs from what the model predicts
 ******************************************************************************/

export class Violation extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'Violation'
  }
}

async function waitFor(cond: () => Promise<boolean>, timeout: number, message: string, interval = 100): Promise<void> {
  const until = Date.now() + timeout
  for (;;) {
    if (await cond()) return
    if (Date.now() > until) throw new Violation(`${message} (after ${timeout}ms)`)
    await browser.pause(interval)
  }
}

/**
 * browser.execute with a watchdog so a frozen webview fails fast instead of hanging.
 *
 * Note: scripts must not return an object with an `error` property; WebDriver
 * treats such a value as an error response ("unknown error").
 */
async function exec<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const watchdog = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Violation('Webview did not respond to a script call within 20s')), 20_000)
  })
  try {
    return (await Promise.race([browser.execute(fn as any, ...args), watchdog])) as T
  } finally {
    clearTimeout(timer)
  }
}

/******************************************************************************
 * Demo workbook: copy to a temp directory and point it at the local API
 ******************************************************************************/

export interface DemoEntry {
  id: string
  path: string
  name: string
  kind: 'request' | 'group'
}

export interface Workbook {
  fileName: string
  dir: string
  entries: DemoEntry[]
}

/**
 * Copy the demo workbook (and its external data files) to a temp directory,
 * with the workbook defaults switched to the "Local Development" scenario and
 * authorization so requests hit the dockerized sample API.
 */
export function prepareDemoWorkbook(seed: number): Workbook {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `apicize-chaos-${seed}-`))
  fs.cpSync(DEMO_DIR, dir, { recursive: true })
  const fileName = path.join(dir, 'demo.apicize')
  const workbook = JSON.parse(fs.readFileSync(fileName, 'utf-8'))

  const byName = (list: any[], name: string) => {
    const found = list.find((e) => e.name === name)
    if (!found) throw new Error(`Demo workbook has no "${name}" entry`)
    return { id: found.id, name: found.name }
  }
  workbook.defaults = {
    ...workbook.defaults,
    selectedScenario: byName(workbook.scenarios, 'Local Development'),
    selectedAuthorization: byName(workbook.authorizations, 'Local Development'),
  }
  fs.writeFileSync(fileName, JSON.stringify(workbook, null, 2))

  const entries: DemoEntry[] = []
  const walk = (list: any[], parent: string) => {
    for (const e of list) {
      const p = parent + SEP + e.name
      const kind = Array.isArray(e.children) ? 'group' : 'request'
      entries.push({ id: e.id, path: p, name: e.name, kind })
      if (kind === 'group') walk(e.children, p)
    }
  }
  walk(workbook.requests, REQUESTS)
  return { fileName, dir, entries }
}

/**
 * Entries whose outcome is deterministic against the sample API: standalone
 * requests, and groups whose children only depend on each other. Running
 * these must always pass every test.
 */
const DETERMINISTIC = new Set([
  'Requests / Math',
  'Requests / Math / Addition (using text)',
  'Requests / Math / Subtraction (using JSON)',
  'Requests / Image Rotation',
  'Requests / Image Rotation / Right',
  'Requests / Image Rotation / Flip',
  'Requests / Image Rotation / Left',
  'Requests / CRUD Operations (REST)',
  'Requests / CRUD Operations (GraphQL)',
])

/******************************************************************************
 * In-page instrumentation and DOM queries
 ******************************************************************************/

interface NavItem {
  name: string
  path: string
  visible: boolean
}

interface ToastRecord {
  severity: string
  text: string
}

interface PageState {
  installed: boolean
  errors: string[]
  toasts: ToastRecord[]
}

/** Install error/toast capture in the webview (idempotent) */
async function installInstrumentation(): Promise<void> {
  await exec(() => {
    const w = window as any
    if (w.__chaos) return
    const chaos = { errors: [] as string[], toasts: [] as { severity: string; text: string }[] }
    w.__chaos = chaos
    // Registered after the app's own handler, which swallows Monaco cancellation noise
    window.addEventListener('error', (e) => chaos.errors.push(`error: ${e.message}`))
    window.addEventListener('unhandledrejection', (e) =>
      chaos.errors.push(`unhandledrejection: ${String((e as PromiseRejectionEvent).reason?.stack ?? (e as PromiseRejectionEvent).reason)}`)
    )
    const seen = new WeakMap<Element, string>()
    const scan = () => {
      for (const t of Array.from(document.querySelectorAll('[data-testid="toast"]'))) {
        const severity = t.getAttribute('data-severity') ?? ''
        const text = (t.textContent ?? '').trim()
        const sig = `${severity}|${text}`
        if (seen.get(t) !== sig) {
          seen.set(t, sig)
          chaos.toasts.push({ severity, text })
        }
      }
    }
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true })
    scan()
  })
}

/** Drain captured errors/toasts since the last call */
async function drainPageState(): Promise<PageState> {
  return exec(() => {
    const chaos = (window as any).__chaos
    if (!chaos) return { installed: false, errors: [], toasts: [] }
    const result = { installed: true, errors: chaos.errors.splice(0), toasts: chaos.toasts.splice(0) }
    return result
  })
}

/** All rendered navigation entities with their tree paths (section / groups / name) */
async function navItems(): Promise<NavItem[]> {
  return exec(() => {
    const rowText = (li: Element) => {
      const row = li.querySelector(':scope > .MuiTreeItem-content')
      const own = row?.querySelector('[data-testid="nav-item"]')
      return own ? own.getAttribute('data-name') ?? '' : (row?.textContent ?? '').trim()
    }
    return Array.from(document.querySelectorAll('#navigation [data-testid="nav-item"]')).map((span) => {
      const names = [span.getAttribute('data-name') ?? '']
      let li = span.closest('.MuiTreeItem-root')?.parentElement?.closest('.MuiTreeItem-root') ?? null
      while (li) {
        names.unshift(rowText(li))
        li = li.parentElement?.closest('.MuiTreeItem-root') ?? null
      }
      const el = span as HTMLElement
      let visible = el.offsetParent !== null && el.getClientRects().length > 0
      for (let p: HTMLElement | null = el; visible && p; p = p.parentElement) {
        if (getComputedStyle(p).visibility === 'hidden') visible = false
      }
      return { name: names[names.length - 1], path: names.join(' / '), visible }
    })
  })
}

/** Click the nav entity at the given tree path (first match) */
async function clickNav(itemPath: string): Promise<boolean> {
  return exec((p: string) => {
    const rowText = (li: Element) => {
      const row = li.querySelector(':scope > .MuiTreeItem-content')
      const own = row?.querySelector('[data-testid="nav-item"]')
      return own ? own.getAttribute('data-name') ?? '' : (row?.textContent ?? '').trim()
    }
    for (const span of Array.from(document.querySelectorAll('#navigation [data-testid="nav-item"]'))) {
      const names = [span.getAttribute('data-name') ?? '']
      let li = span.closest('.MuiTreeItem-root')?.parentElement?.closest('.MuiTreeItem-root') ?? null
      while (li) {
        names.unshift(rowText(li))
        li = li.parentElement?.closest('.MuiTreeItem-root') ?? null
      }
      if (names.join(' / ') === p) {
        ;(span as HTMLElement).scrollIntoView({ block: 'center' })
        ;(span as HTMLElement).click()
        return true
      }
    }
    return false
  }, itemPath)
}

/** Toggle expansion of a group (by path) or a top-level section header (by title) */
async function toggleExpansion(target: { groupPath?: string; section?: string }): Promise<boolean> {
  return exec(
    (groupPath: string | null, section: string | null) => {
      let li: Element | null | undefined = null
      if (section) {
        li = Array.from(document.querySelectorAll('#navigation .MuiTreeItem-root')).find((l) => {
          const row = l.querySelector(':scope > .MuiTreeItem-content')
          return !row?.querySelector('[data-testid="nav-item"]') && (row?.textContent ?? '').trim() === section
        })
      } else if (groupPath) {
        const name = groupPath.split(' / ').pop()
        const spans = Array.from(document.querySelectorAll('#navigation [data-testid="nav-item"]')).filter(
          (s) => s.getAttribute('data-name') === name
        )
        li = spans[0]?.closest('.MuiTreeItem-root')
      }
      const icon = li?.querySelector(':scope > .MuiTreeItem-content .MuiTreeItem-iconContainer') as HTMLElement | null
      if (!icon) return false
      icon.click()
      return true
    },
    target.groupPath ?? null,
    target.section ?? null
  )
}

/**
 * Wait until the set of visible tree items stops changing (MUI collapse
 * animations), so random picks are made from a stable tree and seeded runs
 * replay identically
 */
async function settleTree(): Promise<NavItem[]> {
  let last = ''
  let items: NavItem[] = []
  for (let i = 0; i < 30; i++) {
    items = await navItems()
    const sig = items.map((it) => `${it.path}:${it.visible}`).join('|')
    if (sig === last) return items
    last = sig
    await browser.pause(150)
  }
  return items
}

/** Expand every collapsed section and group so the whole tree renders */
async function expandAll(): Promise<void> {
  for (let pass = 0; pass < 6; pass++) {
    const clicked = await exec(() => {
      let n = 0
      for (const li of Array.from(document.querySelectorAll('#navigation li'))) {
        if (li.getAttribute('aria-expanded') === 'false') {
          const icon = li.querySelector(':scope > .MuiTreeItem-content .MuiTreeItem-iconContainer') as HTMLElement | null
          if (icon) {
            icon.click()
            n++
          }
        }
      }
      return n
    })
    if (clicked === 0) break
    await browser.pause(300)
  }
  await settleTree()
}

async function editorTitle(): Promise<string> {
  return exec(() => document.querySelector('.editor-title')?.getAttribute('aria-label') ?? '')
}

async function isShown(selector: string): Promise<boolean> {
  return exec((sel: string) => {
    const el = document.querySelector(sel) as HTMLElement | null
    return !!el && el.offsetParent !== null
  }, selector)
}

async function clickSelector(selector: string): Promise<boolean> {
  return exec((sel: string) => {
    const el = document.querySelector(sel) as HTMLElement | null
    if (!el) return false
    el.click()
    return true
  }, selector)
}

/** Click a ToggleButton in the entity editor's vertical tab column */
async function clickEditorTab(value: string): Promise<boolean> {
  return exec((v: string) => {
    for (const column of Array.from(document.querySelectorAll('.editor-panel .button-column'))) {
      const btn = column.querySelector(`button[value="${v}"]`) as HTMLElement | null
      if (btn) {
        btn.click()
        return true
      }
    }
    return false
  }, value)
}

async function isTabPressed(value: string): Promise<boolean> {
  return exec(
    (v: string) =>
      document.querySelector(`.editor-panel .button-column button[value="${v}"]`)?.getAttribute('aria-pressed') === 'true',
    value
  )
}

/** Heading text shown above the test/setup script editor */
async function scriptHeading(): Promise<string> {
  return exec(() => {
    const container = document.querySelector('#request-test-container, #request-setup-container')
    return (container?.querySelector('.MuiTypography-h2')?.textContent ?? '').trim()
  })
}

async function confirmDialogOpen(): Promise<boolean> {
  return isShown('[data-testid="confirm-ok"]')
}

/**
 * Type text one character at a time: WebKitWebDriver drops repeated characters
 * (ex. "//" arrives as "/") when a string is sent in a single keys() call
 */
async function typeText(text: string): Promise<void> {
  for (const ch of text) await browser.keys(ch)
}

async function setInputValue(id: string, value: string): Promise<void> {
  const input = await browser.$(`#${id}`)
  await input.waitForDisplayed({ timeout: 5_000 })
  await input.click()
  await browser.keys(['Control', 'a'])
  await browser.keys('Delete')
  await typeText(value)
  const actual = await input.getValue()
  if (actual !== value) throw new Error(`Typing into #${id} produced "${actual}" instead of "${value}" (input automation issue)`)
}

/** Whether a nav item showing "running" (PlayArrow / DirectionsRun) is rendered */
async function anythingRunning(): Promise<boolean> {
  return exec(
    () =>
      !!document.querySelector(
        '#navigation .nav-node-text-state [data-testid="PlayArrowIcon"], #navigation .nav-node-text-state [data-testid="DirectionsRunIcon"]'
      ) || !!(document.querySelector('button[value="Cancel"]') as HTMLElement | null)?.offsetParent
  )
}

interface Summary {
  sections: number
  success: number
  failure: number
  errors: number
}

async function resultSummary(): Promise<Summary> {
  return exec(() => {
    const count = (id: string) => parseInt(document.querySelector(`[data-testid="${id}"]`)?.getAttribute('data-count') ?? '0', 10)
    return {
      sections: document.querySelectorAll('[data-testid="result-section"]').length,
      success: count('result-summary-success'),
      failure: count('result-summary-failure'),
      errors: count('result-summary-error'),
    }
  })
}

/******************************************************************************
 * The monkey
 ******************************************************************************/

type Kind = 'request' | 'group' | 'other'

interface Selection {
  path: string
  name: string
  kind: Kind
  id?: string
}

interface Model {
  /** Expected paths in the Requests section (multiset: duplicates allowed) */
  requestPaths: string[]
  selected?: Selection
  /** Test Script tab mode, shared across requests */
  scriptMode: 'test' | 'setup'
  /** Names of requests the monkey created (at the top level of Requests) */
  created: string[]
  /** Counter used for unique names/markers */
  counter: number
}

interface Action {
  name: string
  weight: number
  /** Whether the action applies to the current model state */
  when?: (m: Model) => boolean
  /** Perform the action and verify its specific expectations; returns a short description */
  run: () => Promise<string>
}

export interface StepRecord {
  step: number
  action: string
  detail: string
  ms: number
}

export interface ChaosReport {
  seed: number
  steps: number
  workbook: string
  completedSteps: number
  actionCounts: Record<string, number>
  verifiedRuns: number
  toasts: ToastRecord[]
  history: StepRecord[]
  violation?: { step: number; action: string; message: string; screenshot?: string }
}

export class ChaosMonkey {
  readonly rng: Rng
  private sessionId = ''
  private model: Model
  private readonly entriesByPath = new Map<string, DemoEntry>()
  private readonly report: ChaosReport
  private readonly actions: Action[]

  constructor(private readonly options: ChaosOptions, private readonly workbook: Workbook) {
    this.rng = new Rng(options.seed)
    for (const e of workbook.entries) {
      // First entry wins, matching how clickNav resolves duplicate paths
      if (!this.entriesByPath.has(e.path)) this.entriesByPath.set(e.path, e)
    }
    this.model = { requestPaths: [], scriptMode: 'test', created: [], counter: 0 }
    this.report = {
      seed: options.seed,
      steps: options.steps,
      workbook: workbook.fileName,
      completedSteps: 0,
      actionCounts: {},
      verifiedRuns: 0,
      toasts: [],
      history: [],
    }
    this.actions = this.defineActions()
  }

  get reproduceHint(): string {
    return `CHAOS_SEED=${this.options.seed} CHAOS_STEPS=${this.options.steps} CHAOS_CHECKPOINT_EVERY=${this.options.checkpointEvery}`
  }

  /** Open the workbook and capture the baseline tree */
  async start(): Promise<void> {
    this.sessionId = await getSessionId()
    await invoke('open_workspace', { fileName: this.workbook.fileName, sessionId: this.sessionId, openInNewSession: false })
    await waitFor(async () => exec(() => !!document.querySelector('#navigation')), 20_000, 'Navigation tree did not render')
    await installInstrumentation()
    await expandAll()
    await waitFor(async () => (await navItems()).some((i) => i.path.startsWith(REQUESTS + SEP)), 15_000, 'Requests did not render')

    const expected = this.workbook.entries.map((e) => e.path).sort()
    const actual = await this.renderedRequestPaths()
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      throw new Violation(`Demo workbook tree does not match the file.\nExpected: ${expected.join(', ')}\nRendered: ${actual.join(', ')}`)
    }
    this.model.requestPaths = expected
    await drainPageState()
  }

  /** Run the configured number of random steps, checkpointing periodically */
  async run(): Promise<void> {
    for (let step = 1; step <= this.options.steps; step++) {
      const available = this.actions.filter((a) => !a.when || a.when(this.model))
      const action = this.weightedPick(available)
      const started = Date.now()
      let detail = ''
      try {
        detail = await action.run()
        await this.checkGlobalInvariants()
        if (step % this.options.checkpointEvery === 0) {
          detail += ' | checkpoint ok'
          await this.checkpoint()
        }
      } catch (e) {
        await this.fail(step, action.name, e)
      }
      this.report.history.push({ step, action: action.name, detail, ms: Date.now() - started })
      this.report.actionCounts[action.name] = (this.report.actionCounts[action.name] ?? 0) + 1
      this.report.completedSteps = step
    }
    try {
      await this.checkpoint()
      await this.finalVerification()
    } catch (e) {
      await this.fail(this.options.steps + 1, 'final checks', e)
    }
  }

  writeReport(): string {
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    const file = path.join(REPORT_DIR, `chaos-${this.options.seed}.json`)
    fs.writeFileSync(file, JSON.stringify(this.report, null, 2))
    return file
  }

  get summary(): ChaosReport {
    return this.report
  }

  /****************************************************************************
   * Invariants
   ****************************************************************************/

  /** Checked after every action */
  private async checkGlobalInvariants(): Promise<void> {
    const page = await drainPageState()
    if (!page.installed) {
      throw new Violation('Webview reloaded unexpectedly (instrumentation lost)')
    }
    this.report.toasts.push(...page.toasts)
    if (page.errors.length > 0) {
      throw new Violation(`Uncaught error(s) in the webview:\n  ${page.errors.join('\n  ')}`)
    }
    const errorToasts = page.toasts.filter((t) => t.severity === 'error')
    if (errorToasts.length > 0) {
      throw new Violation(`Error toast(s) shown: ${errorToasts.map((t) => `"${t.text}"`).join(', ')}`)
    }
    if (!(await exec(() => !!document.querySelector('#navigation')))) {
      throw new Violation('Navigation tree is no longer rendered')
    }
    if (await confirmDialogOpen()) {
      throw new Violation('A confirmation dialog is open that no action asked for')
    }
  }

  /** Heavier consistency checks between the model, the rendered tree and the backend */
  private async checkpoint(): Promise<void> {
    await waitFor(async () => {
      await expandAll()
      return !(await anythingRunning())
    }, 120_000, 'Executions did not finish (app appears stuck running)', 500)

    const actual = await this.renderedRequestPaths()
    const expected = [...this.model.requestPaths].sort()
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      const missing = expected.filter((p) => !actual.includes(p))
      const extra = actual.filter((p) => !expected.includes(p))
      throw new Violation(`Request tree diverged from the model. Missing: [${missing.join(', ')}] Unexpected: [${extra.join(', ')}]`)
    }

    // The backend must agree with the tree about every demo entity's name
    for (const entry of this.workbook.entries) {
      const name = await this.backendName(entry)
      if (name !== entry.name) {
        throw new Violation(`Backend name for "${entry.path}" is "${name}", expected "${entry.name}"`)
      }
    }
  }

  /** At the end, every deterministic request/group must still pass */
  private async finalVerification(): Promise<void> {
    for (const p of ['Requests / Math', 'Requests / Image Rotation', 'Requests / CRUD Operations (REST)']) {
      await this.selectPath(p)
      await this.runSelectedAndVerify(true)
    }
    await this.checkGlobalInvariants()
  }

  private async renderedRequestPaths(): Promise<string[]> {
    await expandAll()
    return (await navItems())
      .filter((i) => i.path.startsWith(REQUESTS + SEP))
      .map((i) => i.path)
      .sort()
  }

  private async backendEntity(entry: { id: string; kind: 'request' | 'group' }): Promise<any> {
    const result: any = await invoke('get', {
      sessionId: this.sessionId,
      entityType: entry.kind === 'request' ? 2 : 3,
      entityId: entry.id,
    })
    // Entity is serialized as a tagged union ({ Request: {...} } or { entityType, ... })
    return result?.Request ?? result?.Group ?? result?.request ?? result?.group ?? result
  }

  private async backendName(entry: DemoEntry): Promise<string> {
    return (await this.backendEntity(entry))?.name ?? ''
  }

  /****************************************************************************
   * Action helpers
   ****************************************************************************/

  private weightedPick(actions: Action[]): Action {
    const total = actions.reduce((sum, a) => sum + a.weight, 0)
    let r = this.rng.next() * total
    for (const a of actions) {
      r -= a.weight
      if (r < 0) return a
    }
    return actions[actions.length - 1]
  }

  private kindOf(itemPath: string): Kind {
    const entry = this.entriesByPath.get(itemPath)
    if (entry) return entry.kind
    if (itemPath.startsWith(REQUESTS + SEP)) return 'request' // monkey-created
    return 'other'
  }

  /** Select an entity and verify the editor switches to it */
  private async selectPath(itemPath: string): Promise<void> {
    const name = itemPath.split(SEP).pop() ?? ''
    if (!(await clickNav(itemPath))) throw new Violation(`Could not find "${itemPath}" in the tree to select`)
    const kind = this.kindOf(itemPath)
    const expected = name.length > 0 ? name : '(Unnamed)'
    await waitFor(async () => (await editorTitle()).startsWith(expected), 5_000, `Editor did not switch to "${itemPath}" (title "${await editorTitle()}")`)
    this.model.selected = { path: itemPath, name, kind, id: this.entriesByPath.get(itemPath)?.id }
  }

  private async currentRequestPanelTitle(): Promise<string> {
    return (await editorTitle()).split(' - ').pop() ?? ''
  }

  /** Run the selected request/group and, if deterministic, require all tests to pass */
  private async runSelectedAndVerify(requireOracle = false): Promise<string> {
    const sel = this.model.selected!
    if (await isShown('button[value="Clear"]')) {
      await clickSelector('button[value="Clear"]')
      await waitFor(async () => !(await isShown('button[value="Clear"]')), 5_000, 'Clear did not remove results')
    }
    const button = (await isShown('button[value="Multi"]')) ? 'button[value="Multi"]' : 'button[value="Run"]'
    if (!(await clickSelector(button))) throw new Violation('No run button available for the selected entry')
    // Result sections (and summary counts) render on the results viewer's Info panel,
    // which may not be the panel last chosen
    await waitFor(
      async () => {
        if (await isShown('button[value="Cancel"]')) return false
        await clickSelector('#results-viewer button[aria-label="show info"]')
        return (await resultSummary()).sections > 0
      },
      120_000,
      `Run of "${sel.path}" did not complete`,
      250
    )
    const summary = await resultSummary()
    if (DETERMINISTIC.has(sel.path)) {
      if (summary.failure > 0 || summary.errors > 0 || summary.success === 0) {
        throw new Violation(
          `Deterministic run of "${sel.path}" did not pass (success ${summary.success}, failure ${summary.failure}, error ${summary.errors})`
        )
      }
      this.report.verifiedRuns++
      return `ran ${sel.path}: ${summary.success} passed (verified)`
    }
    if (requireOracle) throw new Violation(`"${sel.path}" is not a deterministic entry`)
    return `ran ${sel.path}: success ${summary.success}, failure ${summary.failure}, error ${summary.errors}`
  }

  /** Answer the confirmation dialog; returns true if OK was chosen */
  private async answerDialog(okProbability: number): Promise<boolean> {
    const ok = this.rng.chance(okProbability)
    await clickSelector(ok ? '[data-testid="confirm-ok"]' : '[data-testid="confirm-cancel"]')
    await waitFor(async () => !(await confirmDialogOpen()), 5_000, 'Confirmation dialog did not close')
    return ok
  }

  private isRequest = (m: Model) => m.selected?.kind === 'request'
  private isGroup = (m: Model) => m.selected?.kind === 'group'
  private isRequestOrGroup = (m: Model) => m.selected?.kind === 'request' || m.selected?.kind === 'group'
  private isDemoRequest = (m: Model) => m.selected?.kind === 'request' && !!m.selected.id

  /****************************************************************************
   * Actions
   ****************************************************************************/

  private defineActions(): Action[] {
    const REQUEST_PANELS = ['Info', 'Query String', 'Headers', 'Body', 'Test Script', 'Execution Parameters']
    const GROUP_PANELS = ['Info', 'Setup Script', 'Execution Parameters']
    const RESULT_PANELS = ['show info', 'show headers', 'show body text', 'show body preview', 'generate code', 'show details']

    return [
      {
        name: 'select item',
        weight: 20,
        run: async () => {
          const visible = (await settleTree()).filter((i) => i.visible)
          if (visible.length === 0) {
            await expandAll()
            return 'nothing visible, expanded tree'
          }
          const item = this.rng.pick(visible)
          await this.selectPath(item.path)
          return item.path
        },
      },
      {
        name: 'toggle expansion',
        weight: 5,
        run: async () => {
          const groups = this.workbook.entries.filter((e) => e.kind === 'group').map((e) => e.path)
          const sections = ['Requests', 'Scenarios', 'Authorizations', 'Data Sets']
          if (this.rng.chance(0.7)) {
            const g = this.rng.pick(groups)
            const before = (await settleTree()).filter((i) => i.visible && i.path.startsWith(g + SEP)).length
            if (!(await toggleExpansion({ groupPath: g }))) return `group ${g} not rendered`
            // Expanding shows children; collapsing hides them
            await waitFor(
              async () => {
                const after = (await navItems()).filter((i) => i.visible && i.path.startsWith(g + SEP)).length
                return before === 0 ? after > 0 : after === 0
              },
              3_000,
              `Toggling "${g}" did not ${before === 0 ? 'show' : 'hide'} its children`
            )
            await settleTree()
            return `${before === 0 ? 'expanded' : 'collapsed'} ${g}`
          }
          const s = this.rng.pick(sections)
          await toggleExpansion({ section: s })
          await settleTree()
          return `toggled section ${s}`
        },
      },
      {
        name: 'request panel',
        weight: 14,
        when: this.isRequest,
        run: async () => {
          const panel = this.rng.pick(REQUEST_PANELS)
          if (!(await clickEditorTab(panel))) throw new Violation(`Request panel "${panel}" button not found`)
          await waitFor(async () => isTabPressed(panel), 3_000, `Request panel "${panel}" was not selected`)
          if (panel === 'Test Script') {
            // The Test Script tab must reopen in whichever mode was last chosen
            await this.expectScriptMode(this.model.scriptMode)
          } else {
            await waitFor(async () => (await this.currentRequestPanelTitle()) === panel, 3_000, `Editor title does not show panel "${panel}"`)
          }
          return panel
        },
      },
      {
        name: 'toggle script mode',
        weight: 8,
        when: this.isRequest,
        run: async () => {
          await clickEditorTab('Test Script')
          await this.expectScriptMode(this.model.scriptMode)
          const mode = this.rng.pick(['test', 'setup'] as const)
          await clickSelector(`#request-test-container button[aria-label="${mode}"], #request-setup-container button[aria-label="${mode}"]`)
          this.model.scriptMode = mode
          await this.expectScriptMode(mode)
          return mode
        },
      },
      {
        name: 'group panel',
        weight: 7,
        when: this.isGroup,
        run: async () => {
          const panel = this.rng.pick(GROUP_PANELS)
          if (!(await clickEditorTab(panel))) throw new Violation(`Group panel "${panel}" button not found`)
          await waitFor(async () => isTabPressed(panel), 3_000, `Group panel "${panel}" was not selected`)
          if (panel === 'Setup Script') {
            await waitFor(
              async () => (await scriptHeading()) === 'Setup Script (Before Requests)' && !(await exec(() => !!document.querySelector('#request-setup-container button[aria-label="test"]'))),
              3_000,
              `Group setup editor heading is "${await scriptHeading()}" or shows the request Test/Setup toggle`
            )
          }
          return panel
        },
      },
      {
        name: 'run and verify',
        weight: 8,
        when: this.isRequestOrGroup,
        run: async () => this.runSelectedAndVerify(),
      },
      {
        name: 'run and wander',
        weight: 3,
        when: this.isRequestOrGroup,
        run: async () => {
          const from = this.model.selected!.path
          const button = (await isShown('button[value="Multi"]')) ? 'button[value="Multi"]' : 'button[value="Run"]'
          await clickSelector(button)
          const visible = (await settleTree()).filter((i) => i.visible && i.path !== from)
          if (visible.length > 0) {
            const next = this.rng.pick(visible)
            await this.selectPath(next.path)
            return `started ${from}, moved to ${next.path}`
          }
          return `started ${from}`
        },
      },
      {
        name: 'run and cancel',
        weight: 3,
        when: this.isGroup,
        run: async () => {
          const sel = this.model.selected!
          const button = (await isShown('button[value="Multi"]')) ? 'button[value="Multi"]' : 'button[value="Run"]'
          await clickSelector(button)
          await browser.pause(this.rng.int(0, 400))
          const cancelled = await clickSelector('button[value="Cancel"]')
          await waitFor(async () => !(await isShown('button[value="Cancel"]')), 30_000, `"${sel.path}" still running after cancel`)
          return cancelled ? `cancelled ${sel.path}` : `${sel.path} finished before cancel`
        },
      },
      {
        name: 'clear results',
        weight: 3,
        when: this.isRequestOrGroup,
        run: async () => {
          if (!(await isShown('button[value="Clear"]'))) return 'no results to clear'
          if (await isShown('button[value="Cancel"]')) return 'running, not clearing'
          await clickSelector('button[value="Clear"]')
          await waitFor(async () => !(await isShown('button[value="Clear"]')), 5_000, 'Clear did not remove the results')
          return `cleared ${this.model.selected!.path}`
        },
      },
      {
        name: 'result panel',
        weight: 6,
        when: this.isRequestOrGroup,
        run: async () => {
          const label = this.rng.pick(RESULT_PANELS)
          const clicked = await exec((l: string) => {
            const btn = document.querySelector(`#results-viewer button[aria-label="${l}"]`) as HTMLButtonElement | null
            if (!btn || btn.disabled) return false
            btn.click()
            return true
          }, label)
          if (!clicked) return `${label} unavailable`
          await waitFor(
            async () => exec((l: string) => document.querySelector(`#results-viewer button[aria-label="${l}"]`)?.getAttribute('aria-pressed') === 'true', label),
            3_000,
            `Result panel "${label}" was not selected`
          )
          // Flip between request/response where the viewer offers it
          if (this.rng.chance(0.5)) {
            await exec(() => {
              const btns = Array.from(document.querySelectorAll('#results-viewer button[aria-label="request"], #results-viewer button[aria-label="response"]')) as HTMLButtonElement[]
              const enabled = btns.filter((b) => !b.disabled && b.getAttribute('aria-pressed') !== 'true')
              enabled[0]?.click()
            })
          }
          return label
        },
      },
      {
        name: 'append script comment',
        weight: 4,
        when: this.isDemoRequest,
        run: async () => {
          const sel = this.model.selected!
          await clickEditorTab('Test Script')
          await this.expectScriptMode(this.model.scriptMode)
          const mode = this.model.scriptMode
          const marker = `chaos-${this.options.seed}-${++this.model.counter}`
          const container = mode === 'test' ? '#request-test-container' : '#request-setup-container'
          const scriptOf = async () => {
            const entity = await this.backendEntity({ id: sel.id!, kind: 'request' })
            return String((mode === 'test' ? entity?.test : entity?.setup) ?? '')
          }
          const before = await scriptOf()
          const editorEl = await browser.$(`${container} .monaco-editor .view-lines`)
          await editorEl.waitForDisplayed({ timeout: 5_000 })
          await editorEl.click()
          // Escape dismisses autocomplete so Enter inserts a newline rather than accepting a suggestion
          await browser.keys(['Control', 'End'])
          await browser.keys('Escape')
          await browser.keys('Enter')
          await typeText(`// ${marker}`)
          await browser.keys('Escape')
          // The backend must hold exactly the original script plus the new comment line
          let after = ''
          await waitFor(
            async () => {
              after = await scriptOf()
              return after.includes(marker)
            },
            5_000,
            `${mode} script edit "${marker}" did not reach the backend for "${sel.path}"`
          )
          if (!after.startsWith(before.trimEnd()) || after.slice(before.trimEnd().length).trim() !== `// ${marker}`) {
            throw new Violation(`${mode} script of "${sel.path}" was not updated as typed: ...${JSON.stringify(after.slice(-80))}`)
          }
          return `${mode} script of ${sel.path} += ${marker}`
        },
      },
      {
        name: 'rename and restore',
        weight: 3,
        when: this.isDemoRequest,
        run: async () => {
          const sel = this.model.selected!
          const entry = { id: sel.id!, kind: 'request' as const }
          const tempName = `${sel.name} ~${++this.model.counter}`
          const tempPath = sel.path.split(SEP).slice(0, -1).concat(tempName).join(SEP)
          // The row is only rendered while its parent group is expanded; checkpoints verify the rest.
          // A collapse may still be animating (rows unmount once it completes), so a row that is
          // no longer rendered under either name also passes
          const rendered = (await navItems()).some((i) => i.path === sel.path)
          const inTree = async (p: string) => {
            if (!rendered) return true
            const items = await navItems()
            return items.some((i) => i.path === p) || !items.some((i) => i.path === sel.path || i.path === tempPath)
          }
          await clickEditorTab('Info')
          await setInputValue('request-name', tempName)
          await waitFor(async () => inTree(tempPath), 5_000, `Tree did not show renamed "${tempPath}"`)
          await waitFor(async () => (await this.backendEntity(entry))?.name === tempName, 5_000, `Backend did not receive rename to "${tempName}"`)
          await setInputValue('request-name', sel.name)
          await waitFor(async () => inTree(sel.path), 5_000, `Tree did not show restored "${sel.path}"`)
          await waitFor(async () => (await this.backendEntity(entry))?.name === sel.name, 5_000, `Backend did not receive restored name "${sel.name}"`)
          return `renamed ${sel.path} to "${tempName}" and back`
        },
      },
      {
        name: 'add request',
        weight: 2,
        when: (m) => m.created.length < 4,
        run: async () => {
          const name = `Chaos Request ${++this.model.counter}`
          await exec(() => {
            const header = Array.from(document.querySelectorAll('#navigation .nav-item')).find(
              (i) => !i.querySelector('[data-testid="nav-item"]') && (i.textContent ?? '').trim().startsWith('Requests')
            )
            ;(header?.querySelector('.nav-icon-context')?.closest('button') as HTMLElement | null)?.click()
          })
          await this.clickMenuItem('Append Request')
          // New requests open on whichever request panel was last used
          await waitFor(async () => (await editorTitle()).startsWith('(Unnamed)'), 5_000, 'New (unnamed) request editor did not open')
          await clickEditorTab('Info')
          await waitFor(async () => isShown('#request-name'), 5_000, 'Info panel of the new request did not open')
          await setInputValue('request-name', name)
          const p = REQUESTS + SEP + name
          await waitFor(async () => (await navItems()).some((i) => i.path === p), 5_000, `New request "${p}" did not appear in the tree`)
          this.model.created.push(name)
          this.model.requestPaths.push(p)
          this.model.selected = { path: p, name, kind: 'request' }
          return `added ${p}`
        },
      },
      {
        name: 'delete created request',
        weight: 2,
        when: (m) => m.created.length > 0,
        run: async () => {
          const name = this.rng.pick(this.model.created)
          const p = REQUESTS + SEP + name
          await expandAll()
          await this.selectPath(p)
          await exec((n: string) => {
            const span = Array.from(document.querySelectorAll('#navigation [data-testid="nav-item"]')).find((s) => s.getAttribute('data-name') === n)
            const btn = span?.closest('.nav-item')?.querySelector('.nav-icon-context')?.closest('button') as HTMLElement | null
            btn?.click()
          }, name)
          await this.clickMenuItem('Delete Request')
          await waitFor(async () => confirmDialogOpen(), 5_000, 'Delete did not ask for confirmation')
          const ok = await this.answerDialog(0.8)
          if (ok) {
            await waitFor(async () => !(await navItems()).some((i) => i.path === p), 5_000, `Deleted "${p}" is still in the tree`)
            this.model.created = this.model.created.filter((c) => c !== name)
            this.model.requestPaths.splice(this.model.requestPaths.indexOf(p), 1)
            this.model.selected = undefined
            return `deleted ${p}`
          }
          await browser.pause(300)
          if (!(await navItems()).some((i) => i.path === p)) throw new Violation(`Cancelled delete still removed "${p}"`)
          return `cancelled delete of ${p}`
        },
      },
      {
        name: 'open and close settings',
        weight: 3,
        run: async () => {
          await clickSelector('button[title="Settings"]')
          await waitFor(async () => isShown('button[aria-label="workspace defaults"]'), 5_000, 'Settings did not open')
          if (this.rng.chance(0.5)) await clickSelector('button[aria-label="app settings"]')
          await clickSelector('button[title="Settings"]')
          await waitFor(async () => !(await isShown('button[aria-label="workspace defaults"]')), 5_000, 'Settings did not close')
          // Closing settings returns to the previously selected entity's editor
          if (this.model.selected) {
            const expected = this.model.selected.name || '(Unnamed)'
            await waitFor(async () => (await editorTitle()).startsWith(expected), 5_000, `Closing settings did not return to "${this.model.selected.path}"`)
          }
          return 'settings'
        },
      },
      {
        name: 'open and close help',
        weight: 2,
        run: async () => {
          await clickSelector('button[title="Help"]')
          await browser.pause(300)
          await clickSelector('button[title="Help"]')
          if (this.model.selected) {
            const expected = this.model.selected.name || '(Unnamed)'
            await waitFor(async () => (await editorTitle()).startsWith(expected), 5_000, `Closing help did not return to "${this.model.selected.path}"`)
          }
          return 'help'
        },
      },
      {
        name: 'keyboard noise',
        weight: 3,
        run: async () => {
          const keys: string[] = []
          for (let i = this.rng.int(1, 4); i > 0; i--) keys.push(this.rng.pick(['Escape', 'Tab']))
          for (const k of keys) await browser.keys(k)
          return keys.join(' ')
        },
      },
      {
        name: 'save shortcut',
        weight: 2,
        run: async () => {
          await browser.keys(['Control', 's'])
          // Saving may ask for confirmation (e.g. credentials stored in the workbook)
          let declined = false
          for (let i = 0; i < 3; i++) {
            const asked = await waitFor(async () => confirmDialogOpen(), 1_000, '').then(() => true, () => false)
            if (!asked) break
            if (!(await this.answerDialog(0.8))) {
              declined = true
              break
            }
          }
          if (declined) return 'save declined at confirmation'
          await waitFor(
            async () => !(await invoke<boolean>('get_dirty', { sessionId: this.sessionId })),
            5_000,
            'Workbook still dirty after Ctrl+S'
          )
          return 'saved'
        },
      },
    ]
  }

  private async expectScriptMode(mode: 'test' | 'setup'): Promise<void> {
    const container = mode === 'test' ? '#request-test-container' : '#request-setup-container'
    const heading = mode === 'test' ? 'Test Script (After Execution)' : 'Setup Script (Before Execution)'
    await waitFor(
      async () => (await isShown(container)) && (await scriptHeading()) === heading,
      3_000,
      `Expected the ${mode} script editor ("${heading}"), found "${await scriptHeading()}"`
    )
    const pressed = await exec(
      (m: string) => document.querySelector(`#request-test-container button[aria-label="${m}"], #request-setup-container button[aria-label="${m}"]`)?.getAttribute('aria-pressed') === 'true',
      mode
    )
    if (!pressed) throw new Violation(`The "${mode}" toggle button is not pressed while its editor is shown`)
  }

  private async clickMenuItem(text: string): Promise<void> {
    await waitFor(
      async () =>
        exec((t: string) => {
          const item = Array.from(document.querySelectorAll('li.MuiMenuItem-root')).find(
            (i) => (i.textContent ?? '').trim() === t && (i as HTMLElement).offsetParent !== null
          ) as HTMLElement | undefined
          if (!item) return false
          item.click()
          return true
        }, text),
      5_000,
      `Menu item "${text}" did not appear`
    )
  }

  private async fail(step: number, action: string, e: unknown): Promise<never> {
    // Violations are self-explanatory; anything else (WebDriver/IPC failures) needs its stack
    let message = e instanceof Violation ? e.message : e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e)
    if (!(e instanceof Violation)) {
      // Distinguish "this script failed" from "the webview no longer runs scripts at all"
      const probe = async (label: string, fn: () => unknown) => {
        try {
          return `${label}: ${JSON.stringify(await browser.execute(fn))}`
        } catch (err) {
          return `${label}: FAILED (${(err as Error)?.message})`
        }
      }
      message += '\nDiagnostics:\n  ' + [
        await probe('trivial script', () => 1),
        await probe('document.readyState', () => document.readyState),
      ].join('\n  ')
    }
    let screenshot: string | undefined
    try {
      fs.mkdirSync(REPORT_DIR, { recursive: true })
      screenshot = path.join(REPORT_DIR, `chaos-${this.options.seed}-step-${step}.png`)
      await browser.saveScreenshot(screenshot)
    } catch {
      screenshot = undefined
    }
    this.report.violation = { step, action, message, screenshot }
    const recent = this.report.history
      .slice(-10)
      .map((h) => `  #${h.step} ${h.action}: ${h.detail}`)
      .join('\n')
    throw new Error(
      `Chaos violation at step ${step} (${action}): ${message}\n` +
        `Recent actions:\n${recent}\n` +
        `Reproduce with: ${this.reproduceHint} yarn test:chaos`
    )
  }
}
