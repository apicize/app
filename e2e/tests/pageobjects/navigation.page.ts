import { browser, $, $$ } from '@wdio/globals'

/**
 * Interactions with the left-hand navigation tree.
 *
 * Navigation leaf/branch names are exposed via `data-testid="nav-item"` with a
 * `data-name` attribute (see nav-tree-item.tsx). Section headers are plain
 * TreeItems rendered by the section components.
 */
class NavigationPage {
  itemSelector(name: string): string {
    return `[data-testid="nav-item"][data-name="${name}"]`
  }

  item(name: string) {
    return $(this.itemSelector(name))
  }

  /** All navigation item names currently rendered in the tree. */
  async itemNames(): Promise<string[]> {
    const els = await $$('[data-testid="nav-item"]')
    const names: string[] = []
    for (const e of els) {
      names.push((await e.getAttribute('data-name')) ?? '')
    }
    return names
  }

  async exists(name: string): Promise<boolean> {
    return (await this.item(name)).isExisting()
  }

  /** Titles of the section/subsection headers currently rendered (non-entity nav items). */
  async sectionHeaders(): Promise<string[]> {
    return browser.execute(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'))
      return items
        .filter((i) => !i.querySelector('[data-testid="nav-item"]'))
        .map((i) => (i.textContent ?? '').trim())
    })
  }

  /** Click a navigation item, selecting it as the active entity. */
  async select(name: string): Promise<void> {
    const el = this.item(name)
    await el.waitForExist({ timeout: 10_000 })
    // Scroll into view and dispatch the click via the DOM: deep tree nodes can
    // be outside the viewport where a native WebDriver click is "not interactable".
    await browser.execute((sel: string) => {
      const span = document.querySelector(sel) as HTMLElement | null
      span?.scrollIntoView({ block: 'center' })
      span?.click()
    }, this.itemSelector(name))
  }

  /**
   * Expand a group/section so its children render. Clicks the TreeItem's
   * expansion icon container directly (expansionTrigger='iconContainer').
   */
  async expand(name: string): Promise<void> {
    await this.item(name).waitForExist({ timeout: 10_000 })
    await browser.execute((sel: string) => {
      const span = document.querySelector(sel)
      const root = span?.closest('.MuiTreeItem-root') ?? span?.closest('li')
      const icon = root?.querySelector('.MuiTreeItem-iconContainer') as HTMLElement | null
      if (icon) icon.click()
    }, this.itemSelector(name))
  }

  /** Ensure a group is expanded such that the named child becomes visible. */
  async expandUntilVisible(groupName: string, childName: string): Promise<void> {
    if (await this.exists(childName)) return
    await this.expand(groupName)
    await browser.waitUntil(async () => this.exists(childName), {
      timeout: 8_000,
      interval: 250,
      timeoutMsg: `Child "${childName}" did not appear after expanding "${groupName}"`,
    })
  }

  /**
   * Expand every currently-collapsed section/subsection header whose title
   * matches (e.g. "Scenarios", or "Public" which may appear under several
   * parent sections). Idempotent: already-expanded headers are left alone.
   */
  async expandSectionByTitle(title: string): Promise<void> {
    await browser.execute((t: string) => {
      const items = Array.from(document.querySelectorAll('.nav-item'))
      const headers = items.filter(
        (i) => !i.querySelector('[data-testid="nav-item"]') && (i.textContent ?? '').trim().startsWith(t)
      )
      for (const header of headers) {
        const li = header.closest('li[role="treeitem"]')
        if (li && li.getAttribute('aria-expanded') !== 'true') {
          const icon = li.querySelector('.MuiTreeItem-iconContainer') as HTMLElement | null
          if (icon) icon.click()
        }
      }
    }, title)
  }

  /** Open the per-item context menu (hover to reveal the "more" button, then click it). */
  async openContextMenu(name: string): Promise<void> {
    const el = this.item(name)
    await el.moveTo()
    await browser.execute((sel: string) => {
      const span = document.querySelector(sel)
      const navItem = span?.closest('.nav-item')
      const btn = navItem?.querySelector('.nav-icon-context')?.closest('button') as HTMLElement | null
      if (btn) btn.click()
    }, this.itemSelector(name))
  }

  /** Click the "+" add button on a section header (e.g. Data Sets) by its title. */
  async clickSectionAddButton(title: string): Promise<void> {
    await browser.execute((t: string) => {
      const items = Array.from(document.querySelectorAll('.nav-item'))
      const header = items.find(
        (i) => !i.querySelector('[data-testid="nav-item"]') && (i.textContent ?? '').trim().startsWith(t)
      )
      const btn = header?.querySelector('button') as HTMLElement | null
      if (btn) btn.click()
      else throw new Error(`Add button for section "${t}" not found`)
    }, title)
  }

  /** Open a section header's context menu (Requests, Scenarios, ...) by its title. */
  async openSectionMenu(title: string): Promise<void> {
    await browser.execute((t: string) => {
      const items = Array.from(document.querySelectorAll('.nav-item'))
      const header = items.find(
        (i) => !i.querySelector('[data-testid="nav-item"]') && (i.textContent ?? '').trim().startsWith(t)
      )
      const btn = header?.querySelector('.nav-icon-context')?.closest('button') as HTMLElement | null
      if (btn) btn.click()
      else throw new Error(`Section header "${t}" menu button not found`)
    }, title)
  }

  /**
   * Drag a request/group navigation item onto another item.
   *  - mode 'into'   : drop into the target group (Under)
   *  - mode 'before' : drop just above the target (reposition Before)
   *  - mode 'after'  : drop just below the target (reposition After)
   * Drives the @dnd-kit MouseSensor (8px activation) with W3C pointer actions.
   */
  async dragItem(sourceName: string, targetName: string, mode: 'into' | 'before' | 'after'): Promise<void> {
    await this.item(sourceName).waitForExist({ timeout: 10_000 })
    await this.item(targetName).waitForExist({ timeout: 10_000 })
    const pts = await browser.execute(
      (srcSel: string, tgtSel: string, m: string) => {
        const navOf = (sel: string) =>
          (document.querySelector(sel)?.closest('.nav-item') as HTMLElement | null) ??
          (document.querySelector(sel) as HTMLElement | null)
        const src = navOf(srcSel)!.getBoundingClientRect()
        const tgt = navOf(tgtSel)!.getBoundingClientRect()
        const navEl = document.getElementById('navigation')
        const emPx = parseFloat(getComputedStyle(navEl ?? document.documentElement).fontSize) || 16
        let tx: number
        let ty: number
        if (m === 'into') {
          tx = tgt.left + 5
          ty = tgt.top + tgt.height / 2
        } else if (m === 'before') {
          tx = tgt.left + 4 * emPx
          ty = tgt.top + 3
        } else {
          tx = tgt.left + 4 * emPx
          ty = tgt.bottom - 3
        }
        return { sx: Math.round(src.left + src.width / 2), sy: Math.round(src.top + src.height / 2), tx: Math.round(tx), ty: Math.round(ty) }
      },
      this.itemSelector(sourceName),
      this.itemSelector(targetName),
      mode
    )
    await this.performDrag(pts)
  }

  /**
   * Drag a parameter item (scenario/authorization/certificate/proxy) onto a
   * persistence subsection header, changing where it is stored.
   * @param type EntityType numeric value (Scenario=6, Authorization=7, Certificate=8, Proxy=9)
   * @param persistence 'W' (Public/Workbook) | 'P' (Private) | 'V' (Vault)
   */
  async dragItemToPersistence(sourceName: string, type: number, persistence: 'W' | 'P' | 'V'): Promise<void> {
    await this.item(sourceName).waitForExist({ timeout: 10_000 })
    const pts = await browser.execute(
      (srcSel: string, hdrId: string, hdrIdAlt: string) => {
        const src = (document.querySelector(srcSel)?.closest('.nav-item') as HTMLElement).getBoundingClientRect()
        const headerLi = document.getElementById(hdrId) ?? document.getElementById(hdrIdAlt)
        const hdrRow = (headerLi?.querySelector(':scope > .MuiTreeItem-content') ?? headerLi) as HTMLElement
        const hdr = hdrRow.getBoundingClientRect()
        return {
          sx: Math.round(src.left + src.width / 2),
          sy: Math.round(src.top + src.height / 2),
          tx: Math.round(hdr.left + hdr.width / 2),
          ty: Math.round(hdr.top + hdr.height / 2),
        }
      },
      this.itemSelector(sourceName),
      `hdr-${type}-${persistence}`,
      `navigation-hdr-${type}-${persistence}`
    )
    await this.performDrag(pts)
  }

  private async performDrag(pts: { sx: number; sy: number; tx: number; ty: number }): Promise<void> {
    // One action chain (so the button stays pressed) with many small discrete
    // moves + pauses: @dnd-kit needs a stream of mousemove events to activate
    // (8px constraint) and to keep `over`/position updated through onDragMove.
    const steps = 12
    let chain = browser
      .action('pointer', { parameters: { pointerType: 'mouse' } })
      .move({ x: pts.sx, y: pts.sy, origin: 'viewport' })
      .down({ button: 0 })
      .pause(60)
      .move({ x: pts.sx + 12, y: pts.sy, origin: 'viewport' }) // pass 8px activation
      .pause(40)
    for (let i = 1; i <= steps; i++) {
      const x = Math.round(pts.sx + ((pts.tx - pts.sx) * i) / steps)
      const y = Math.round(pts.sy + ((pts.ty - pts.sy) * i) / steps)
      chain = chain.move({ x, y, origin: 'viewport' }).pause(25)
    }
    // Final nudges so onDragMove fires with the pointer settled over the target
    chain = chain
      .move({ x: pts.tx, y: pts.ty, origin: 'viewport' })
      .pause(60)
      .move({ x: pts.tx, y: pts.ty + 1, origin: 'viewport' })
      .pause(80)
      .up({ button: 0 })
    await chain.perform()
    await browser.pause(350) // allow the move + re-render to settle
  }

  /**
   * Whether `childName` is nested somewhere under the group `parentName` in the
   * rendered tree (parent must be expanded).
   */
  async isDescendantOf(childName: string, parentName: string): Promise<boolean> {
    return browser.execute(
      (childSel: string, parentSel: string) => {
        // Entity rows are li.MuiTreeItem-root (role="button"); children nest
        // inside the parent's MuiTreeItem-root via a group container.
        const parentLi = document.querySelector(parentSel)?.closest('.MuiTreeItem-root')
        const childLi = document.querySelector(childSel)?.closest('.MuiTreeItem-root')
        if (!parentLi || !childLi || parentLi === childLi) return false
        return parentLi.contains(childLi)
      },
      this.itemSelector(childName),
      this.itemSelector(parentName)
    )
  }

  /** Position of a navigation item among all rendered items (DOM order). */
  async orderIndex(name: string): Promise<number> {
    return browser.execute((sel: string) => {
      const rows = Array.from(document.querySelectorAll('[data-testid="nav-item"]'))
      return rows.findIndex((r) => r === document.querySelector(sel))
    }, this.itemSelector(name))
  }

  /**
   * Whether an item is nested under a persistence subsection (Public=W / Private=P / Vault=V)
   * of a given entity type.
   */
  async isUnderPersistence(name: string, type: number, persistence: 'W' | 'P' | 'V'): Promise<boolean> {
    return browser.execute(
      (sel: string, hdrId: string, hdrIdAlt: string) => {
        const header = (document.getElementById(hdrId) ?? document.getElementById(hdrIdAlt)) as HTMLElement | null
        const itemLi = document.querySelector(sel)?.closest('.MuiTreeItem-root')
        if (!header || !itemLi) return false
        return header.contains(itemLi)
      },
      this.itemSelector(name),
      `hdr-${type}-${persistence}`,
      `navigation-hdr-${type}-${persistence}`
    )
  }

  /** Depth of a navigation item in the tree (0 = section header level). */
  async depthOf(name: string): Promise<number> {
    return browser.execute((sel: string) => {
      const li = document.querySelector(sel)?.closest('.MuiTreeItem-root') as HTMLElement | null
      const d = li?.style.getPropertyValue('--TreeView-itemDepth')
      return d ? parseInt(d, 10) : -1
    }, this.itemSelector(name))
  }

  /** Click an open MUI menu item by its visible text. */
  async clickMenuItem(text: string): Promise<void> {
    // Wait for the item to be present and visible (offsetParent != null while the
    // MUI menu fade-in transition may still be running).
    await browser.waitUntil(
      async () =>
        browser.execute((t: string) => {
          const items = Array.from(document.querySelectorAll('li.MuiMenuItem-root'))
          return items.some(
            (i) => (i.textContent ?? '').trim() === t && (i as HTMLElement).offsetParent !== null
          )
        }, text),
      { timeout: 5_000, interval: 100, timeoutMsg: `Menu item "${text}" did not become visible` }
    )
    // Dispatch the click directly on the element. A native WebDriver click can be
    // intercepted by the MUI menu backdrop during the open transition, silently
    // closing the menu without firing the item's onClick.
    const clicked = await browser.execute((t: string) => {
      const items = Array.from(document.querySelectorAll('li.MuiMenuItem-root'))
      const item = items.find(
        (i) => (i.textContent ?? '').trim() === t && (i as HTMLElement).offsetParent !== null
      ) as HTMLElement | undefined
      if (!item) return false
      item.click()
      return true
    }, text)
    if (!clicked) throw new Error(`Menu item "${text}" not found for click`)
  }
}

export default new NavigationPage()
