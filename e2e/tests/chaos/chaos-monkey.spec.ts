import { waitForAppReady } from '../helpers/app'
import { ChaosMonkey, optionsFromEnv, prepareDemoWorkbook } from './monkey'

/**
 * Chaos monkey: drives a seeded random sequence of user actions against a copy
 * of the demo workbook and verifies the UI stays predictable (see monkey.ts).
 *
 * Not part of the default suite; run with `yarn test:chaos` (see README). Set
 * CHAOS_SEED to replay a run, CHAOS_STEPS to change its length.
 */
describe('Chaos monkey (demo workbook)', function () {
  const options = optionsFromEnv()
  const workbook = prepareDemoWorkbook(options.seed)
  const monkey = new ChaosMonkey(options, workbook)

  // Each step can include a full group run, so size the timeout by step count
  this.timeout(120_000 + options.steps * 60_000)

  before(async () => {
    console.log(`[chaos] seed ${options.seed}, ${options.steps} steps, workbook ${workbook.fileName}`)
    console.log(`[chaos] reproduce with: ${monkey.reproduceHint} yarn test:chaos`)
    await waitForAppReady()
    await monkey.start()
  })

  after(() => {
    const file = monkey.writeReport()
    const r = monkey.summary
    console.log(`[chaos] ${r.completedSteps}/${r.steps} steps, ${r.verifiedRuns} verified runs, report: ${file}`)
    console.log(`[chaos] actions: ${Object.entries(r.actionCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`)
  })

  it(`survives ${options.steps} random actions with predictable behavior`, async () => {
    await monkey.run()
  })
})
