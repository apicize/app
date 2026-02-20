import { visit } from 'unist-util-visit'
import { LeafDirective } from 'mdast-util-directive'
import { Parent } from 'unist'

// Register `hName`, `hProperties` types, used when turning markdown to HTML:
/// <reference types="mdast-util-to-hast" />
// Register directive nodes in mdast:
/// <reference types="mdast-util-directive" />

/**
 * Configuration for help formatting, replacing React context values
 */
export interface HelpFormatConfig {
    appName: string
    appVersion: string
    ctrlKey: string
}

/**
 * Creates a remark plugin that transforms Apicize custom directives.
 * Extracted from help.tsx to be shared between the React help panel
 * and the static HTML doc generator.
 */
export function createRemarkApicizeDirectives(config: HelpFormatConfig) {
    const { appName, appVersion, ctrlKey } = config

    const handleLogo = (node: LeafDirective) => {
        if (node.name === 'logo') {
            const data: any = node.data || (node.data = {})
            data.hName = 'logo'
            return true
        } else {
            return false
        }
    }

    const handleToolbar = (node: LeafDirective) => {
        if (node.name === 'toolbar') {
            const data: any = node.data || (node.data = {})
            data.hName = 'toolbar'
            return true
        } else if (node.name === 'toolbar-top') {
            const data: any = node.data || (node.data = {})
            data.hName = 'toolbarTop'
            return true
        } else {
            return false
        }
    }

    const handleInfo = (node: LeafDirective) => {
        if (node.name !== 'info' || node.children.length === 0) return false
        const child = node.children[0]
        if (child.type !== 'text') return false

        const data: any = node.data || (node.data = {})

        let replaceWith
        switch (child.value) {
            case 'name':
                replaceWith = appName
                break
            case 'version':
                replaceWith = appVersion
                break
            case 'ctrlkey':
                replaceWith = ctrlKey
                break
            default:
                return false
        }
        data.hName = 'span'
        data.hChildren = [
            {
                type: 'text',
                value: replaceWith
            }
        ]
        return true
    }

    const handleIcon = (node: LeafDirective) => {
        if (node.name !== 'icon' || node.children.length === 0) return false
        const child = node.children[0]
        if (child.type !== 'text') return false

        const data: any = node.data || (node.data = {})

        data.hName = 'icon'
        data.hProperties = { name: child.value }
        data.hChildren = []
        return true
    }

    const handleImage = (node: LeafDirective) => {
        if (node.name !== 'image' || node.children.length === 0) return false
        const child = node.children[0]
        if (child.type !== 'text') return false

        const data: any = node.data || (node.data = {})
        data.hName = 'img'
        data.hProperties = { src: `images/${child.value}`, class: 'help-image' }
        data.hChildren = []
        return true
    }

    return () => (tree: Parent) => {
        visit(tree, 'leafDirective', function (node: LeafDirective) {
            handleLogo(node) || handleToolbar(node) || handleImage(node)
        })
        visit(tree, 'textDirective', function (node: LeafDirective) {
            handleLogo(node) || handleToolbar(node) || handleInfo(node) || handleIcon(node) || handleImage(node)
        })
    }
}
