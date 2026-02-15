// Brute force mechanism to setting version numbers until we split the monorepo

import { spawnSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const targets = [
    { name: 'root', file: 'package.json', patterns: ['"version": "__VERSION__"'] },
    { name: '@apicize/lib-typescript', file: join('@apicize', 'lib-typescript', 'package.json'), patterns: ['"version": "__VERSION__"'] },
    { name: '@apicize/toolkit', file: join('@apicize', 'toolkit', 'package.json'), patterns: ['"version": "__VERSION__",'] },
    { name: 'app/src-tauri/Cargo.toml', file: join('app', 'src-tauri', 'Cargo.toml'), patterns: ['version = "__VERSION__"'] },
    { name: 'app/src-tauri/tauri.conf.json', file: join('app', 'src-tauri', 'tauri.conf.json'), patterns: ['"version": "__VERSION__",'] },
    { name: 'app', file: join('app', 'package.json'), patterns: ['"version": "__VERSION__",', '"@apicize/toolkit": "^__VERSION__",'] },
]

const versionRegex = /\d+\.\d+\.\d+/

const buildSearchRegex = (pattern) => {
    // Escape special regex characters first, then replace the placeholder
    const escaped = pattern.replace(/\./g, '\\.').replace(/\^/g, '\\^').replace(/:/g, '\\:')
    return new RegExp(escaped.replace('__VERSION__', '\\d+\\.\\d+\\.\\d+'))
}

const extractVersion = (data, pattern) => {
    const regex = buildSearchRegex(pattern)
    const match = regex.exec(data)
    if (!match) return null
    const versionMatch = versionRegex.exec(match[0])
    return versionMatch ? versionMatch[0] : null
}

const replaceVersionNumber = (fileName, version, patterns) => {
    let data = readFileSync(fileName).toString()
    for (const search of patterns) {
        let i = search.indexOf('__VERSION__')
        if (i == -1) {
            throw new Error(`"${search}" does not contain "__VERSION__"`)
        }
        let s = buildSearchRegex(search)
        let j = s.exec(data)
        if (!j) {
            throw new Error(`"${s} not found in ${fileName}`)
        }

        let r = search.replace('__VERSION__', version)
        data = data.replace(s, r)
    }

    console.log(`Writing updates to ${fileName}`)
    writeFileSync(fileName, data)
}

const checkVersions = (expectedVersion) => {
    console.log(`Expected version: ${expectedVersion}`)

    const mismatches = []

    for (const target of targets) {
        const data = readFileSync(target.file).toString()
        for (const pattern of target.patterns) {
            const found = extractVersion(data, pattern)
            if (found === null) {
                mismatches.push(`${target.name}: pattern not found (${pattern.replace('__VERSION__', '<version>')})`)
            } else if (found !== expectedVersion) {
                mismatches.push(`${target.name}: expected ${expectedVersion}, found ${found}`)
            }
        }
    }

    if (mismatches.length > 0) {
        console.error('Version mismatches found:')
        for (const m of mismatches) {
            console.error(`  - ${m}`)
        }
        process.exit(-1)
    }

    console.log('All versions match.')
    process.exit(0)
}

try {
    if (process.argv.length < 3) {
        throw new Error('Requires an argument specifying version number, or --check <version>')
    }

    if (process.argv[2] === '--check') {
        let expectedVersion = process.argv[3]
        if (!expectedVersion) {
            const rootPkg = JSON.parse(readFileSync('package.json').toString())
            expectedVersion = rootPkg.version
        }
        checkVersions(expectedVersion)
    }

    let version = process.argv[2]
    console.log(`Set version to ${version}`)

    for (const target of targets) {
        replaceVersionNumber(target.file, version, target.patterns)
    }

    console.log('Running yarn')
    spawnSync('yarn')

    process.exit(0)
} catch (e) {
    console.error(`${e}`)
    process.exit(-1);
}
