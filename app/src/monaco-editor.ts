// Selective Monaco Editor entry point — replaces the full 'monaco-editor' barrel
// to avoid bundling all 80+ built-in language grammars.
//
// editor.all.js provides every editor feature (editing, find/replace, folding,
// diff, etc.) without language contributions.
import 'monaco-editor/esm/vs/editor/editor.all.js'

// Language services: each provides IntelliSense + worker support
import 'monaco-editor/esm/vs/language/json/monaco.contribution'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution'
import 'monaco-editor/esm/vs/language/css/monaco.contribution'
import 'monaco-editor/esm/vs/language/html/monaco.contribution'

// Basic syntax highlighting for languages used in this app
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution'
import 'monaco-editor/esm/vs/basic-languages/graphql/graphql.contribution'

// Re-export Monaco API (provides named 'editor', 'languages', etc.)
export * from 'monaco-editor/esm/vs/editor/editor.api'
