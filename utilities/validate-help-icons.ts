/**
 * Validates that all icon references in help-icon-renderer.tsx are mapped in help-icon-map.ts
 */

import { getAllIconNames } from '../@apicize/toolkit/src/services/help-icon-map'
import { getRenderedIconNames } from '../@apicize/toolkit/src/services/help-icon-renderer'

// Get icons from both sources
const helpTsxIcons = new Set(getRenderedIconNames())
const mappedIcons = new Set(getAllIconNames())

// Aliases that are only used in markdown files, not rendered by help.tsx
const MARKDOWN_ONLY_ALIASES = new Set(['data', 'setup'])

// Find icons in help.tsx that aren't in the map
const unmappedInHelp = Array.from(helpTsxIcons).filter(icon => !mappedIcons.has(icon))

// Find icons in the map that aren't in help.tsx (excluding markdown-only aliases)
const unmappedInMap = Array.from(mappedIcons).filter(icon =>
  !helpTsxIcons.has(icon) && !MARKDOWN_ONLY_ALIASES.has(icon)
)

console.log('Validating help icon mappings...')
console.log(`  help-icon-renderer.tsx has ${helpTsxIcons.size} icon cases`)
console.log(`  help-icon-map.ts has ${mappedIcons.size} mapped icons`)

if (unmappedInHelp.length > 0) {
  console.error('\n❌ Icons in help-icon-renderer.tsx NOT in help-icon-map.ts:')
  unmappedInHelp.forEach((icon: string) => console.error(`  - ${icon}`))
}

if (unmappedInMap.length > 0) {
  console.warn('\n⚠️  Icons in help-icon-map.ts NOT in help-icon-renderer.tsx:')
  unmappedInMap.forEach((icon: string) => console.warn(`  - ${icon}`))
}

if (unmappedInHelp.length === 0 && unmappedInMap.length === 0) {
  console.log('\n✅ All icons are in sync!')
  process.exit(0)
} else {
  console.log('\n⚠️  Icon mappings need attention')
  process.exit(unmappedInHelp.length > 0 ? 1 : 0)
}
