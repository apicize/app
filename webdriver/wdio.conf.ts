import { ChildProcess, spawn } from 'child_process'
import * as os from 'os'
import * as path from 'path'

let tauriDriver: ChildProcess

export const config = {
  hostname: '127.0.0.1',
  port: 4444,
  specs: ['./test/specs/**/*.ts'],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: path.resolve(__dirname, '../app/src-tauri/target/release/apicize'),
      },
      browserName: 'wry',
    },
  ],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 120_000,
  },
  onPrepare: () => {
    tauriDriver = spawn(
      path.join(os.homedir(), '.cargo', 'bin', 'tauri-driver'),
      [],
      { stdio: [null, process.stdout, process.stderr] }
    )
  },
  onComplete: () => {
    tauriDriver.kill()
  },
}
