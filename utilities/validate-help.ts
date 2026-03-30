/**
 * Validates help links and icon references across the Apicize codebase.
 *
 * 1. Scans Markdown help files in app/src-tauri/help/ for:
 *    - help: links (e.g. help:workspace/requests) — checks target .md file exists
 *    - :icon[name] directives — checks name is handled in help.tsx
 *    - :image[path] directives — checks image file exists in help/images/
 *
 * 2. Scans .tsx files in @apicize/toolkit/src/ for:
 *    - nextHelpTopic = 'topic' assignments — checks target .md file exists
 *    - showHelp('topic') calls — checks target .md file exists
 *    - helpTopic='topic' props — checks target .md file exists
 *
 * Usage:  npx tsx utilities/validate-help.ts
 * Exit code: 0 if valid, 1 if errors found.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { globSync } from 'glob'

const ROOT = join(__dirname, '..')
const HELP_DIR = join(ROOT, 'app', 'src-tauri', 'help')
const TOOLKIT_SRC = join(ROOT, '@apicize', 'toolkit', 'src')
const HELP_IMAGES_DIR = join(HELP_DIR, 'images')
const HELP_TSX = join(TOOLKIT_SRC, 'controls', 'help.tsx')

// ---------------------------------------------------------------------------
// Extract valid icon names from the rehypeTransformIcon switch in help.tsx
// ---------------------------------------------------------------------------
function loadValidIcons(): Set<string> {
    const source = readFileSync(HELP_TSX, 'utf-8')

    // Find the switch block inside rehypeTransformIcon
    const switchMatch = source.match(/const rehypeTransformIcon[\s\S]*?switch\s*\(name\)\s*\{([\s\S]*?)\n    \}/)
    if (!switchMatch) {
        console.error('ERROR: Could not locate rehypeTransformIcon switch statement in help.tsx')
        process.exit(2)
    }

    const switchBody = switchMatch[1]
    const icons = new Set<string>()
    const caseRe = /case\s+'([^']+)'/g
    let m
    while ((m = caseRe.exec(switchBody)) !== null) {
        icons.add(m[1])
    }

    if (icons.size === 0) {
        console.error('ERROR: No icon case values found in help.tsx')
        process.exit(2)
    }

    console.log(`Loaded ${icons.size} valid icon names from help.tsx`)
    return icons
}

const VALID_ICONS = loadValidIcons()

let errorCount = 0

function error(file: string, line: number, message: string) {
    console.error(`  ERROR: ${file}:${line} - ${message}`)
    errorCount++
}

function helpFileExists(topic: string): boolean {
    const cleaned = topic.replace(/\/+$/, '')
    return existsSync(join(HELP_DIR, `${cleaned}.md`))
}

// ---------------------------------------------------------------------------
// 1. Validate help Markdown files
// ---------------------------------------------------------------------------
console.log('Checking help Markdown files...')

const mdFiles = globSync('**/*.md', { cwd: HELP_DIR })
for (const mdFile of mdFiles) {
    const fullPath = join(HELP_DIR, mdFile)
    const content = readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineNum = i + 1

        // Check help: links
        const helpLinkRe = /help:([a-zA-Z0-9/_-]+)/g
        let match
        while ((match = helpLinkRe.exec(line)) !== null) {
            const topic = match[1]
            if (!helpFileExists(topic)) {
                error(mdFile, lineNum, `help link "help:${topic}" targets non-existent file`)
            }
        }

        // Check :icon[name] directives
        const iconRe = /:icon\[([^\]]+)\]/g
        while ((match = iconRe.exec(line)) !== null) {
            const iconName = match[1]
            if (!VALID_ICONS.has(iconName)) {
                error(mdFile, lineNum, `icon ":icon[${iconName}]" is not a recognized icon name`)
            }
        }

        // Check :image[path] directives
        const imageRe = /:image\[([^\]]+)\]/g
        while ((match = imageRe.exec(line)) !== null) {
            const imagePath = match[1]
            if (!existsSync(join(HELP_IMAGES_DIR, imagePath))) {
                error(mdFile, lineNum, `image ":image[${imagePath}]" targets non-existent file in help/images/`)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 2. Validate .tsx files for help topic references
// ---------------------------------------------------------------------------
console.log('Checking .tsx files for help topic references...')

const tsxFiles = globSync('**/*.tsx', { cwd: TOOLKIT_SRC })
for (const tsxFile of tsxFiles) {
    const fullPath = join(TOOLKIT_SRC, tsxFile)
    const content = readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineNum = i + 1

        // Skip commented-out lines
        if (line.trimStart().startsWith('//')) continue

        let match

        // Check nextHelpTopic = 'topic'
        const nextHelpTopicRe = /nextHelpTopic\s*=\s*['"]([^'"]+)['"]/g
        while ((match = nextHelpTopicRe.exec(line)) !== null) {
            const topic = match[1]
            if (!helpFileExists(topic)) {
                error(tsxFile, lineNum, `nextHelpTopic = "${topic}" targets non-existent help file`)
            }
        }

        // Check showHelp('topic')
        const showHelpRe = /showHelp\(\s*['"]([^'"]+)['"]/g
        while ((match = showHelpRe.exec(line)) !== null) {
            const topic = match[1]
            if (!helpFileExists(topic)) {
                error(tsxFile, lineNum, `showHelp("${topic}") targets non-existent help file`)
            }
        }

        // Check helpTopic='topic'
        const helpTopicRe = /helpTopic\s*=\s*['"]([^'"]+)['"]/g
        while ((match = helpTopicRe.exec(line)) !== null) {
            const topic = match[1]
            if (!helpFileExists(topic)) {
                error(tsxFile, lineNum, `helpTopic="${topic}" targets non-existent help file`)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
if (errorCount > 0) {
    console.error(`\nValidation failed with ${errorCount} error(s).`)
    process.exit(1)
} else {
    console.log('\nAll help links, images and icons are valid.')
    process.exit(0)
}
