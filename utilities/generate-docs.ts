/**
 * Static HTML documentation generator for Apicize.
 *
 * Reads Markdown help files from app/src-tauri/help/ and converts them
 * to standalone HTML pages in the /docs directory using the same
 * remark/rehype pipeline used by the in-app help panel.
 *
 * Usage:  npx tsx generate-docs.ts
 */

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'fs'
import { join, dirname, relative } from 'path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeExternalLinks from 'rehype-external-links'
import { visit } from 'unist-util-visit'
import { Element } from 'hast'
import { createRemarkApicizeDirectives, HelpFormatConfig } from '../@apicize/toolkit/src/services/help-formatter'
import { ICON_COLOR_MAP } from '../@apicize/toolkit/src/models/icon-color-map'
import { CUSTOM_ICON_FILES, MUI_ICON_FILES } from '../@apicize/toolkit/src/services/help-icon-map'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT = join(__dirname, '..')
const HELP_DIR = join(ROOT, 'app', 'src-tauri', 'help')
const DOCS_DIR = join(ROOT, 'site', 'src', 'pages', 'docs')
const STYLES_DIR = join(ROOT, 'site', 'src', 'docs')
const IMAGES_SRC = join(HELP_DIR, 'images')
const IMAGES_DST = join(ROOT, 'site', 'src', 'assets', 'docs')

// ---------------------------------------------------------------------------
// Read version from root package.json
// ---------------------------------------------------------------------------
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
const APP_VERSION = pkg.version ?? '0.0.0'

// ---------------------------------------------------------------------------
// Read index.md and extract topic list and navigation structure
// ---------------------------------------------------------------------------
const indexMd = readFileSync(join(HELP_DIR, 'index.md'), 'utf-8')

/** Extract all help: link targets from index.md */
function extractTopics(markdown: string): string[] {
  const topics: string[] = []
  const regex = /\]\(help:([^)]+)\)/g
  let match
  while ((match = regex.exec(markdown)) !== null) {
    topics.push(match[1])
  }
  return topics
}

const allTopics = extractTopics(indexMd)

/**
 * Parse index.md into sidebar navigation HTML.
 * Recognizes:
 *   ## [Text](help:topic)  → nav link
 *   ## Text                 → section header
 *   ### [Text](help:topic) → nav link
 *   ### Text               → section header (sub)
 *   - [Text](help:topic)   → nav link
 */
function buildNavFromMarkdown(markdown: string, prefix: string, iconSvgs: Record<string, string>): string {
  const lines = markdown.split('\n')
  let html = '<ul>'
  html += `<li><a href="${prefix}contents.html"><strong>Contents</strong></a></li>`
  let inH2Section = false
  let inH3Section = false

  /** Replace :icon[name] directives with inline SVG wrapped in a help-icon span */
  const renderIcons = (text: string): string => {
    return text.replace(/:icon\[([^\]]+)\]/g, (_match, name: string) => {
      const color = ICON_COLOR_MAP[name]
      const style = color ? ` style="color: ${color};"` : ''
      const svg = iconSvgs[name]
      if (svg) {
        return `<span class="help-icon"${style}>${svg}</span>`
      }
      return ''
    })
  }

  const closeH3 = () => { if (inH3Section) { html += '</ul></li>'; inH3Section = false } }
  const closeH2 = () => { closeH3(); if (inH2Section) { html += '</ul></li>'; inH2Section = false } }

  for (const line of lines) {
    // Skip directives, blank lines, and the top-level title
    if (/^#{1}\s/.test(line) && !/^##/.test(line)) continue
    if (/^[:#]/.test(line) && !/^##/.test(line)) continue

    // ## heading with link
    const h2Link = line.match(/^##\s+\[([^\]]+)\]\(help:([^)]+)\)/)
    if (h2Link) {
      closeH2()
      html += `<li><a href="${prefix}${h2Link[2]}.html">${escapeHtml(h2Link[1])}</a></li>`
      continue
    }

    // ## heading without link (section header, may contain :icon directives)
    const h2Section = line.match(/^##\s+(.+)/)
    if (h2Section) {
      closeH2()
      html += `<li><span class="nav-section">${renderIcons(escapeHtml(h2Section[1]))}</span><ul>`
      inH2Section = true
      continue
    }

    // ### heading with link
    const h3Link = line.match(/^###\s+\[([^\]]+)\]\(help:([^)]+)\)/)
    if (h3Link) {
      closeH3()
      html += `<li><a href="${prefix}${h3Link[2]}.html">${escapeHtml(h3Link[1])}</a></li>`
      continue
    }

    // ### heading without link (sub-section header, may contain :icon directives)
    const h3Section = line.match(/^###\s+(.+)/)
    if (h3Section) {
      closeH3()
      html += `<li><span class="nav-section">${renderIcons(escapeHtml(h3Section[1]))}</span><ul>`
      inH3Section = true
      continue
    }

    // List item with link
    const listLink = line.match(/^-\s+\[([^\]]+)\]\(help:([^)]+)\)/)
    if (listLink) {
      html += `<li><a href="${prefix}${listLink[2]}.html">${escapeHtml(listLink[1])}</a></li>`
      continue
    }
  }

  closeH2()
  html += '</ul>'
  return html
}

// ---------------------------------------------------------------------------
// Icon SVG extraction from .tsx source files
// ---------------------------------------------------------------------------
const ICONS_DIR = join(ROOT, '@apicize', 'toolkit', 'src', 'icons')

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
function rehypeStaticTransforms(prefix: string, imagePrefix: string, iconSvgs: Record<string, string>) {
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
            value: `<img src="${imagePrefix}logo.svg" alt="Apicize" class="icon-apicize" />`,
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
              value: `<img src="${imagePrefix}logo.svg" alt="Apicize" width="200" height="200" />`,
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

      // Transform <columns> to a grid container div
      if (node.tagName === 'columns') {
        node.tagName = 'div'
        node.properties = { className: ['help-columns'] }
      }

      // Transform <column> to a column div
      if (node.tagName === 'column') {
        node.tagName = 'div'
        node.properties = { className: ['help-column'] }
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
          node.properties.src = `${imagePrefix}${src.substring('images/'.length)}`
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

async function convertMarkdown(markdown: string, prefix: string, imagePrefix: string, iconSvgs: Record<string, string>): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(createRemarkApicizeDirectives(config))
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStaticTransforms(prefix, imagePrefix, iconSvgs))
    .use(rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown)
  return String(result)
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------
function htmlTemplate(title: string, body: string, depth: number, iconSvgs: Record<string, string>): string {
  const prefix = depth > 0 ? '../'.repeat(depth) : './'
  const imagePrefix = '../'.repeat(depth + 1) + 'assets/docs/'
  const sitePrefix = '../'.repeat(depth + 1)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - Apicize Documentation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet" />
  <link rel="apple-touch-icon" sizes="180x180" href="${sitePrefix}assets/icons/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="${sitePrefix}assets/icons/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="${sitePrefix}assets/icons/favicon-16x16.png" />
  <link rel="stylesheet" href="${sitePrefix}styles/global.css" />
</head>
<body>
  <nav class="site-nav">
    <div class="container site-nav-inner">
      <a href="${sitePrefix}index.html" class="site-nav-brand">
        <img src="${sitePrefix}assets/apicize-icon.png" alt="Apicize" class="site-nav-logo" />
        <span class="site-nav-name">Apicize</span>
      </a>
      <div class="site-nav-links">
        <a href="${sitePrefix}index.html" class="site-nav-link">Home</a>
        <a href="${sitePrefix}overview.html" class="site-nav-link">Overview</a>
        <a href="${sitePrefix}cli.html" class="site-nav-link">CLI</a>
        <a href="${sitePrefix}security.html" class="site-nav-link">Security</a>
        <a href="${prefix}contents.html" class="site-nav-link active">Documentation</a>
        <a href="https://www.github.com/apicize" target="_blank" class="site-nav-link site-nav-github" aria-label="GitHub">
          <svg height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
            <path d="M12.5.75C6.146.75 1 5.896 1 12.25c0 5.089 3.292 9.387 7.863 10.91.575.101.79-.244.79-.546 0-.273-.014-1.178-.014-2.142-2.889.532-3.636-.704-3.866-1.35-.13-.331-.69-1.352-1.18-1.625-.402-.216-.977-.748-.014-.762.906-.014 1.553.834 1.769 1.179 1.035 1.74 2.688 1.25 3.349.948.1-.747.402-1.25.733-1.538-2.559-.287-5.232-1.279-5.232-5.678 0-1.25.445-2.285 1.178-3.09-.115-.288-.517-1.467.115-3.048 0 0 .963-.302 3.163 1.179.92-.259 1.897-.388 2.875-.388.977 0 1.955.13 2.875.388 2.2-1.495 3.162-1.179 3.162-1.179.633 1.581.23 2.76.115 3.048.733.805 1.179 1.825 1.179 3.09 0 4.413-2.688 5.39-5.247 5.678.417.36.776 1.05.776 2.128 0 1.538-.014 2.774-.014 3.162 0 .302.216.662.79.547C20.709 21.637 24 17.324 24 12.25 24 5.896 18.854.75 12.5.75Z" />
          </svg>
        </a>
      </div>
    </div>
  </nav>
  <div class="doc-layout container">
    <nav class="doc-nav">
      ${buildNavFromMarkdown(indexMd, prefix, iconSvgs)}
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
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Generating documentation...')

  // Clear and recreate output directory
  if (existsSync(DOCS_DIR)) {
    rmSync(DOCS_DIR, { recursive: true })
    console.log('  Cleared site/src/pages/docs/')
  }
  mkdirSync(DOCS_DIR, { recursive: true })

  // Clear and recreate styles directory (copied to /docs/ via publicDir)
  if (existsSync(STYLES_DIR)) {
    rmSync(STYLES_DIR, { recursive: true })
  }
  mkdirSync(STYLES_DIR, { recursive: true })

  // Copy images to site/src/assets/docs
  if (existsSync(IMAGES_DST)) {
    rmSync(IMAGES_DST, { recursive: true })
  }
  if (existsSync(IMAGES_SRC)) {
    cpSync(IMAGES_SRC, IMAGES_DST, { recursive: true })
    console.log('  Copied images to site/src/assets/docs/')
  }

  // Copy the proper artwork logo (the one in help/images is an Inkscape source file
  // with mm units that doesn't render well in browsers)
  const artworkLogo = join(ROOT, 'app', 'artwork', 'apicize-logo.svg')
  if (existsSync(artworkLogo)) {
    cpSync(artworkLogo, join(IMAGES_DST, 'logo.svg'))
    console.log('  Replaced logo.svg with artwork version')
  }

  // Load icon SVGs (extract from .tsx source files + MUI icons)
  const iconSvgs = loadIconSvgs()
  console.log(`  Loaded ${Object.keys(iconSvgs).length} icon SVGs (${Object.keys(CUSTOM_ICON_FILES).length} custom, ${Object.keys(MUI_ICON_FILES).length} MUI)`)

  // Validate all :icon[name] references across help .md files
  const iconRegex = /:icon\[([^\]]+)\]/g
  let invalidIconCount = 0
  const mdFilesToCheck = ['index.md', ...allTopics.map(t => `${t}.md`)]
  for (const mdFile of mdFilesToCheck) {
    const mdPath = join(HELP_DIR, mdFile)
    if (!existsSync(mdPath)) continue
    const mdContent = readFileSync(mdPath, 'utf-8')
    let iconMatch: RegExpExecArray | null
    while ((iconMatch = iconRegex.exec(mdContent)) !== null) {
      const iconName = iconMatch[1]
      if (!iconSvgs[iconName] && iconName !== 'apicize') {
        console.warn(`  WARNING: Unknown icon ":icon[${iconName}]" in ${mdFile}`)
        invalidIconCount++
      }
    }
  }
  if (invalidIconCount > 0) {
    console.warn(`  ${invalidIconCount} invalid icon reference(s) found`)
  }

  // Generate index.html from manually-maintained index.md
  const indexMdPath = join(HELP_DIR, 'index.md')
  if (existsSync(indexMdPath)) {
    const indexMarkdown = readFileSync(indexMdPath, 'utf-8')
    const indexHtml = await convertMarkdown(indexMarkdown, './', '../assets/docs/', iconSvgs)
    writeFileSync(join(DOCS_DIR, 'contents.html'), htmlTemplate('Contents', indexHtml, 0, iconSvgs))
    console.log('  Generated contents.html')
  }

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
    const imagePrefix = '../'.repeat(depth + 1) + 'assets/docs/'
    const htmlBody = await convertMarkdown(markdown, prefix, imagePrefix, iconSvgs)
    const outPath = join(DOCS_DIR, `${topic}.html`)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, htmlTemplate(title, htmlBody, depth, iconSvgs))
    console.log(`  Generated ${topic}.html`)
  }

  console.log('Documentation generation complete!')
  console.log(`Output: ${relative(ROOT, DOCS_DIR)}/`)
}

main().catch(err => {
  console.error('Error generating documentation:', err)
  process.exit(1)
})
