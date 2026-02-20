/**
 * Static HTML documentation generator for Apicize.
 *
 * Reads Markdown help files from app/src-tauri/help/ and converts them
 * to standalone HTML pages in the /docs directory using the same
 * remark/rehype pipeline used by the in-app help panel.
 *
 * Usage:  npx tsx generate-docs.ts
 */

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'fs'
import { join, dirname, relative } from 'path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import { Element } from 'hast'
import { createRemarkApicizeDirectives, HelpFormatConfig } from './@apicize/toolkit/src/services/help-formatter'
import { ICON_COLOR_MAP } from './@apicize/toolkit/src/models/icon-color-map'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT = __dirname
const HELP_DIR = join(ROOT, 'app', 'src-tauri', 'help')
const DOCS_DIR = join(ROOT, 'docs')
const IMAGES_SRC = join(HELP_DIR, 'images')
const IMAGES_DST = join(DOCS_DIR, 'images')

// ---------------------------------------------------------------------------
// Read version from root package.json
// ---------------------------------------------------------------------------
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
const APP_VERSION = pkg.version ?? '0.0.0'

// ---------------------------------------------------------------------------
// Read contents.json for table of contents / navigation
// ---------------------------------------------------------------------------
type HelpContents = { [name: string]: string | HelpContents }
const contents: HelpContents = JSON.parse(readFileSync(join(HELP_DIR, 'contents.json'), 'utf-8'))

// ---------------------------------------------------------------------------
// Collect all topic paths from contents.json
// ---------------------------------------------------------------------------
function collectTopics(obj: HelpContents): string[] {
  const result: string[] = []
  for (const value of Object.values(obj)) {
    if (typeof value === 'string') {
      result.push(value)
    } else {
      result.push(...collectTopics(value))
    }
  }
  return result
}
const allTopics = collectTopics(contents)

// ---------------------------------------------------------------------------
// Icon SVG extraction from .tsx source files
// ---------------------------------------------------------------------------
const ICONS_DIR = join(ROOT, '@apicize', 'toolkit', 'src', 'icons')

/** Map of icon names used in docs to their custom .tsx source filenames */
const CUSTOM_ICON_FILES: Record<string, string> = {
  request: 'request-icon.tsx',
  group: 'folder-icon.tsx',
  scenario: 'scenario-icon.tsx',
  authorization: 'auth-icon.tsx',
  certificate: 'certificate-icon.tsx',
  proxy: 'proxy-icon.tsx',
  defaults: 'defaults-icon.tsx',
  logs: 'log-icon.tsx',
  public: 'public-icon.tsx',
  private: 'private-icon.tsx',
  vault: 'vault-icon.tsx',
  seed: 'seed-icon.tsx',
  apicize: 'apicize-icon.tsx',
}

/** Map of icon names used in docs to their @mui/icons-material module names */
const MUI_ICON_FILES: Record<string, string> = {
  info: 'DisplaySettings',
  query: 'ViewList',
  headers: 'ViewListOutlined',
  body: 'ArticleOutlined',
  parameters: 'AltRoute',
  test: 'Science',
  dataset: 'Dataset',
  settings: 'Settings',
  display: 'DisplaySettings',
  runonce: 'PlayCircleOutline',
  run: 'PlayCircleFilled',
  data: 'Dataset',
  'workbook-new': 'PostAdd',
  'workbook-open': 'FileOpen',
  'workbook-save': 'Save',
  'workbook-save-as': 'SaveAs',
  setup: 'Settings',
}
const MUI_ICONS_DIR = join(ROOT, 'node_modules', '@mui', 'icons-material')

/** JSX camelCase attribute names → HTML kebab-case equivalents */
const JSX_ATTR_MAP: Record<string, string> = {
  strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeMiterlimit: 'stroke-miterlimit',
  fillRule: 'fill-rule',
  clipRule: 'clip-rule',
  clipPath: 'clip-path',
  xmlSpace: 'xml:space',
  xmlLang: 'xml:lang',
  xmlnsXlink: 'xmlns:xlink',
  xlinkHref: 'xlink:href',
}

/**
 * Extract the SVG markup from a .tsx icon component file.
 * Reads the file as text, finds the first uncommented <svg>...</svg> block,
 * and converts JSX camelCase attributes to HTML kebab-case.
 */
function extractSvgFromTsx(filePath: string): string | null {
  const source = readFileSync(filePath, 'utf-8')

  // Strip single-line comments (// ...) to avoid matching commented-out SVGs
  const uncommented = source.replace(/^\s*\/\/.*$/gm, '')

  // Match the first <svg ...>...</svg> block (single-line or multi-line)
  const svgMatch = uncommented.match(/<svg[\s\S]*?<\/svg>/i)
  if (!svgMatch) return null

  let svg = svgMatch[0]

  // Convert JSX camelCase attributes to HTML kebab-case
  for (const [jsx, html] of Object.entries(JSX_ATTR_MAP)) {
    svg = svg.replace(new RegExp(jsx, 'g'), html)
  }

  // Remove xmlns attributes (not needed for inline SVG)
  svg = svg.replace(/\s+xmlns="[^"]*"/g, '')

  // Normalize width/height to 24x24 if not already set
  if (!svg.includes('width=')) {
    svg = svg.replace('<svg', '<svg width="24" height="24"')
  }

  return svg
}

/**
 * Extract SVG path data from a @mui/icons-material .js file.
 * MUI icons use createSvgIcon() with JSX path elements containing a `d` property.
 * Returns a complete <svg> element with the extracted path(s).
 */
function extractSvgFromMui(filePath: string): string | null {
  const source = readFileSync(filePath, 'utf-8')

  // MUI icon files contain: (0, _jsxRuntime.jsx)("path", { d: "..." })
  // or for multi-path icons: (0, _jsxRuntime.jsxs)(_jsxRuntime.Fragment, { children: [...] })
  const pathMatches = Array.from(source.matchAll(/d:\s*"([^"]+)"/g))
  if (pathMatches.length === 0) return null

  const paths = pathMatches.map(m => `<path d="${m[1]}"/>`).join('')
  return `<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">${paths}</svg>`
}

/**
 * Load all icon SVGs by extracting from source files:
 * - Custom app icons from @apicize/toolkit/src/icons/*.tsx
 * - MUI Material Design icons from node_modules/@mui/icons-material/*.js
 */
function loadIconSvgs(): Record<string, string> {
  const icons: Record<string, string> = {}

  // Extract MUI icons from node_modules
  for (const [name, moduleName] of Object.entries(MUI_ICON_FILES)) {
    const filePath = join(MUI_ICONS_DIR, `${moduleName}.js`)
    if (!existsSync(filePath)) {
      console.warn(`  WARNING: MUI icon ${moduleName}.js not found, skipping ${name}`)
      continue
    }
    const svg = extractSvgFromMui(filePath)
    if (svg) {
      icons[name] = svg
    } else {
      console.warn(`  WARNING: Could not extract SVG from ${moduleName}.js for ${name}`)
    }
  }

  // Extract custom icons from .tsx source files (overrides MUI if same name)
  for (const [name, filename] of Object.entries(CUSTOM_ICON_FILES)) {
    const filePath = join(ICONS_DIR, filename)
    if (!existsSync(filePath)) {
      console.warn(`  WARNING: Icon source ${filename} not found, skipping ${name}`)
      continue
    }
    const svg = extractSvgFromTsx(filePath)
    if (svg) {
      icons[name] = svg
    } else {
      console.warn(`  WARNING: Could not extract SVG from ${filename} for ${name}`)
    }
  }

  return icons
}

// ---------------------------------------------------------------------------
// Rehype plugin to transform custom elements for static HTML
// ---------------------------------------------------------------------------
function rehypeStaticTransforms(prefix: string, iconSvgs: Record<string, string>) {
  return () => (tree: any) => {
    visit(tree, 'element', (node: Element, index: number | undefined, parent: any) => {
      // Transform <icon name="..."> to inline SVG with theme color
      if (node.tagName === 'icon') {
        const name = (node.properties?.name as string) ?? ''
        const color = ICON_COLOR_MAP[name]
        const style = color ? `color: ${color};` : ''

        // The Apicize icon is a complex multi-gear logo; use the logo image
        if (name === 'apicize') {
          node.tagName = 'span'
          node.properties = { className: ['help-icon', 'help-icon-apicize'] }
          node.children = [{
            type: 'raw' as any,
            value: `<img src="${prefix}images/logo.svg" alt="Apicize" class="icon-apicize" />`,
          }]
        } else {
          const svg = iconSvgs[name]
          if (svg) {
            node.tagName = 'span'
            node.properties = { className: ['help-icon'], ...(style ? { style } : {}) }
            node.children = [{
              type: 'raw' as any,
              value: svg,
            }]
          } else {
            node.tagName = 'span'
            node.properties = { className: ['help-icon'], ...(style ? { style } : {}) }
            node.children = [{ type: 'text', value: `[${name}]` }]
          }
        }
      }

      // Transform <logo> to a simple heading with the app logo
      if (node.tagName === 'logo') {
        node.tagName = 'div'
        node.properties = { className: ['logo'] }
        node.children = [
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['logo-icon'] },
            children: [{
              type: 'raw' as any,
              value: `<img src="${prefix}images/logo.svg" alt="Apicize" width="200" height="200" />`,
            }],
          },
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['logo-header'] },
            children: [
              {
                type: 'element',
                tagName: 'h1',
                properties: { className: ['logo-title'] },
                children: [{ type: 'text', value: 'Apicize' }],
              },
              {
                type: 'element',
                tagName: 'h2',
                properties: { className: ['logo-version'] },
                children: [{ type: 'text', value: APP_VERSION }],
              },
            ],
          },
        ]
      }

      // Remove <toolbar> and <toolbarTop> elements (app-only UI)
      if (node.tagName === 'toolbar' || node.tagName === 'toolbarTop') {
        if (parent && typeof index === 'number') {
          parent.children.splice(index, 1)
          return index  // revisit this index
        }
      }

      // Transform help: links to relative HTML links
      if (node.tagName === 'a' && node.properties?.href) {
        const href = node.properties.href as string
        if (href.startsWith('help:')) {
          const topic = href.substring(5)
          node.properties.href = `${prefix}${topic}.html`
        }
      }

      // Fix image paths to be relative to the doc root
      if (node.tagName === 'img' && node.properties?.src) {
        const src = node.properties.src as string
        if (src.startsWith('images/')) {
          node.properties.src = `${prefix}${src}`
        }
      }
    })
  }
}

// ---------------------------------------------------------------------------
// Build the unified pipeline
// ---------------------------------------------------------------------------
const config: HelpFormatConfig = {
  appName: 'Apicize',
  appVersion: APP_VERSION,
  ctrlKey: 'Ctrl',
}

async function convertMarkdown(markdown: string, prefix: string, iconSvgs: Record<string, string>): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(createRemarkApicizeDirectives(config))
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStaticTransforms(prefix, iconSvgs))
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown)
  return String(result)
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------
function htmlTemplate(title: string, body: string, depth: number): string {
  const prefix = depth > 0 ? '../'.repeat(depth) : './'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - Apicize Documentation</title>
  <link rel="stylesheet" href="${prefix}styles.css" />
</head>
<body>
  <div class="doc-layout">
    <nav class="doc-nav">
      <div class="nav-header">
        <a href="${prefix}home.html"><img src="${prefix}images/logo.svg" alt="Apicize" /><span>Apicize Docs</span></a>
      </div>
      ${buildNavHtml(contents, prefix)}
    </nav>
    <main class="doc-main help">
      ${body}
    </main>
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// Navigation HTML builder
// ---------------------------------------------------------------------------
function buildNavHtml(obj: HelpContents, prefix: string): string {
  let html = '<ul>'
  for (const [name, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      html += `<li><a href="${prefix}${value}.html">${escapeHtml(name)}</a></li>`
    } else {
      html += `<li><span class="nav-section">${escapeHtml(name)}</span>`
      html += buildNavHtml(value, prefix)
      html += '</li>'
    }
  }
  html += '</ul>'
  return html
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Generating documentation...')

  // Create output directories
  mkdirSync(DOCS_DIR, { recursive: true })

  // Copy images
  if (existsSync(IMAGES_SRC)) {
    cpSync(IMAGES_SRC, IMAGES_DST, { recursive: true })
    console.log('  Copied images/')
  }

  // Copy the proper artwork logo (the one in help/images is an Inkscape source file
  // with mm units that doesn't render well in browsers)
  const artworkLogo = join(ROOT, 'app', 'artwork', 'apicize-logo.svg')
  if (existsSync(artworkLogo)) {
    cpSync(artworkLogo, join(IMAGES_DST, 'logo.svg'))
    console.log('  Replaced logo.svg with artwork version')
  }

  // Write CSS
  writeFileSync(join(DOCS_DIR, 'styles.css'), generateCss())
  console.log('  Generated styles.css')

  // Load icon SVGs (extract from .tsx source files + MUI icons)
  const iconSvgs = loadIconSvgs()
  console.log(`  Loaded ${Object.keys(iconSvgs).length} icon SVGs (${Object.keys(CUSTOM_ICON_FILES).length} custom, ${Object.keys(MUI_ICON_FILES).length} MUI)`)

  // Process each topic
  for (const topic of allTopics) {
    const mdPath = join(HELP_DIR, `${topic}.md`)
    if (!existsSync(mdPath)) {
      console.warn(`  WARNING: ${topic}.md not found, skipping`)
      continue
    }

    const markdown = readFileSync(mdPath, 'utf-8')

    // Extract title from first heading
    const titleMatch = markdown.match(/^#\s+(.+?)(?:\s+:toolbar(?:-top)?)?$/m)
    let title = titleMatch
      ? titleMatch[1].replace(/:icon\[\w[\w-]*\]/g, '').replace(/:logo/g, 'Apicize').trim()
      : topic

    const depth = topic.includes('/') ? topic.split('/').length - 1 : 0
    const prefix = depth > 0 ? '../'.repeat(depth) : './'
    const htmlBody = await convertMarkdown(markdown, prefix, iconSvgs)
    const outPath = join(DOCS_DIR, `${topic}.html`)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, htmlTemplate(title, htmlBody, depth))
    console.log(`  Generated ${topic}.html`)
  }

  console.log('Documentation generation complete!')
  console.log(`Output: ${relative(ROOT, DOCS_DIR)}/`)
}

// ---------------------------------------------------------------------------
// CSS for static docs
// ---------------------------------------------------------------------------
function generateCss(): string {
  return `
/* Apicize Documentation Styles */
* { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  color-scheme: light dark;
  --light-text: #000;
  --dark-text: #FFF;
  --light-bkgd: #FFF;
  --dark-bkgd: #000;
  --light-anchor: rgb(0, 0, 160);
  --dark-anchor: rgb(142, 142, 250);
  --quote-bkgd: #066;
  --quote-text: #FFF;
}

body {
  font-family: "Roboto Flex", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: light-dark(var(--light-text), var(--dark-text));
  background-color: light-dark(var(--light-bkgd), var(--dark-bkgd));
  line-height: 1.6;
}

.doc-layout {
  display: flex;
  min-height: 100vh;
}

/* Navigation sidebar */
.doc-nav {
  width: 280px;
  min-width: 280px;
  border-right: 1px solid #888;
  padding: 1em;
  overflow-y: auto;
  position: sticky;
  top: 0;
  height: 100vh;
}

.nav-header {
  margin-bottom: 1.5em;
  padding-bottom: 1em;
}

.nav-header a {
  color: light-dark(#000, #FFF);
  text-decoration: none;
  font-size: 1.1em;
  font-weight: 600;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.5em;
}

.nav-header a img {
  display: block;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  max-width: 32px;
  max-height: 32px;
}

.nav-header a span {
  flex: 1;
  white-space: nowrap;
}

.doc-nav ul {
  list-style: none;
  padding-left: 0;
  color: light-dark(#222, #888);
}

.doc-nav ul ul {
  padding-left: 1.2em;
  color: light-dark(#222, #888);
}

.doc-nav li {
  margin: 0.2em 0;
}

.doc-nav ul a {
  color: light-dark(var(--light-text), var(--dark-text));
  text-decoration: none;
  display: block;
  padding: 0.25em 0.5em;
  border-radius: 4px;
  font-size: 0.9em;
}

.doc-nav ul a:hover {
  color: light-dark(var(--light-bkgd), var(--dark-bkgd));
  background-color: light-dark(var(--light-anchor), var(--dark-anchor));
}

.nav-section {
  display: block;
  font-weight: 600;
  font-size: 0.9em;
  padding: 0.5em 0.5em 0.2em;
  margin-top: 0.5em;
}

/* Main content */
.doc-main {
  flex: 1;
  padding: 2em 3em;
  max-width: 900px;
  overflow-y: auto;
}

.help h1 {
  font-size: 1.8em;
  margin: 0 0 1.0em 0;
  display: flex;
  align-items: center;
  gap: 0.3em;
}

.help h1:first-child {
  margin-top: 0;
}

.help h2 {
  font-size: 1.4em;
  margin: 1.5rem 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.3em;
}

.help h3 {
  font-size: 1.15em;
  margin: 1.2rem 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.3em;
}

.help h4, .help h5, .help h6 {
  margin: 1rem 0 0.5rem 0;
}

.help p {
  margin: 0 0 0.75rem 0;
}

.help a {
  color: light-dark(var(--light-anchor), var(--dark-anchor));
  text-decoration: none;
}

.help a:hover {
  text-decoration: underline;
}

.help ul, .help ol {
  margin: 0 0 0.75rem 1.5em;
}

.help li {
  margin: 0.25em 0;
}

.help blockquote {
  margin: 1em 0;
  padding: 1em;
  color: var(--quote-text);
  background-color: var(--quote-bkgd);
  border-radius: 4px;
}

.help blockquote p {
  margin: 0;
}

.help pre {
  color: var(--code-text);
  background-color: var(--code-bkgd);
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0 0 0.75rem 0;
  font-family: "Roboto Mono", monospace;
  font-size: 0.9em;
}

.help code {
  font-family: "Roboto Mono", monospace;
  font-size: 0.9em;
  padding: 0.1em 0.3em;
  border-radius: 3px;
}

.help pre code {
  background: none;
  padding: 0;
}

.help table {
  border-collapse: collapse;
  margin: 0 0 0.75rem 0;
  width: 100%;
}

.help thead {
  border-bottom: 2px solid #4a4a7a;
}

.help td, .help th {
  padding: 0.5em 0.75em;
  text-align: left;
}

.help th {
  font-weight: 600;
}

.help img, .help .help-image {
  max-width: 80%;
  margin: 1em 0;
  border-radius: 4px;
}

/* Icon styles */
.help-icon {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin-right: 0.3em;
}

.help-icon svg {
  width: 1.2em;
  height: 1.2em;
  vertical-align: middle;
}

.help-icon .icon-apicize {
  width: 4em;
  height: 4em;
  margin: 0.1em 0;
  vertical-align: middle;
}

/* Logo styles - reset parent h1 margin when it wraps .logo */
h1:has(.logo) {
  margin: 0;
}

.logo {
  display: flex;
  align-items: center;
  margin: 0 0 1em 0;
  gap: 1.5em;
}

.logo-icon img {
  display: block;
}

.logo-header .logo-title {
  font-size: 3em;
  margin: 0;
  line-height: 1.2;
}

.logo-header .logo-version {
  font-size: 1.2em;
  margin: 0;
  color: #a0a0d0;
  font-weight: normal;
}

/* Responsive */
@media (max-width: 768px) {
  .doc-layout { flex-direction: column; }
  .doc-nav {
    width: 100%;
    min-width: 100%;
    height: auto;
    position: static;
    border-right: none;
    border-bottom: 1px solid #2a2a4a;
  }
  .doc-main { padding: 1.5em; }
}
`
}

main().catch(err => {
  console.error('Error generating documentation:', err)
  process.exit(1)
})
