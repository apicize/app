import { ChildProcess, spawn } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

let tauriDriver: ChildProcess

const APP_BINARY = path.resolve(__dirname, '../app/src-tauri/target/release/apicize')

export const config = {
  hostname: '127.0.0.1',
  port: 4444,
  specs: ['./tests/specs/**/*.ts'],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: APP_BINARY,
      },
      browserName: 'wry',
    },
  ],
  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 15_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 120_000,
  },

  onPrepare: () => {
    if (!fs.existsSync(APP_BINARY)) {
      throw new Error(
        `Release binary not found at ${APP_BINARY}.\n` +
          'Build it first from the repo root with:  yarn build:prod'
      )
    }
    const driverBin = path.join(os.homedir(), '.cargo', 'bin', 'tauri-driver')
    if (!fs.existsSync(driverBin)) {
      throw new Error(
        `tauri-driver not found at ${driverBin}.\n` +
          'Install it with:  cargo install tauri-driver --locked'
      )
    }
    tauriDriver = spawn(driverBin, [], { stdio: [null, process.stdout, process.stderr] })
    tauriDriver.on('error', (err) => {
      console.error('tauri-driver failed to start:', err)
      process.exit(1)
    })
  },

  onComplete: () => {
    if (tauriDriver) tauriDriver.kill()
  },
}
