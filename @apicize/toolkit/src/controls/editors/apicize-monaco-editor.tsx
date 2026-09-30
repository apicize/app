import { useRef } from 'react'
import MonacoEditor, { MonacoEditorProps, monaco } from 'react-monaco-editor'

/**
 * Wrapper around react-monaco-editor that disposes of the Monaco model the wrapper creates on mount.
 *
 * react-monaco-editor always calls monaco.editor.createModel on mount but never disposes of it.
 * When a model is supplied via options.model, the created model is never attached to the editor,
 * and otherwise it outlives the editor; either way it stays in Monaco's global model registry.
 * Models supplied via options.model are owned (and disposed) by the caller.
 */
export function ApicizeMonacoEditor(props: MonacoEditorProps) {
    const { editorWillMount, editorDidMount, editorWillUnmount, ...rest } = props
    const createdModel = useRef<monaco.editor.ITextModel | null>(null)
    const createListener = useRef<monaco.IDisposable | null>(null)

    const stopListening = () => {
        createListener.current?.dispose()
        createListener.current = null
    }

    return <MonacoEditor
        {...rest}
        editorWillMount={(m) => {
            // react-monaco-editor creates its model immediately after calling editorWillMount
            stopListening()
            createdModel.current = null
            createListener.current = m.editor.onDidCreateModel(model => {
                createdModel.current ??= model
            })
            return editorWillMount ? editorWillMount(m) : undefined
        }}
        editorDidMount={(e, m) => {
            stopListening()
            if (createdModel.current && e.getModel() !== createdModel.current) {
                // Editor is using a caller-supplied model, so the wrapper's model is an orphan
                createdModel.current.dispose()
                createdModel.current = null
            }
            editorDidMount?.(e, m)
        }}
        editorWillUnmount={(e, m) => {
            editorWillUnmount?.(e, m)
            stopListening()
            // Only dispose of the model if it is the one react-monaco-editor created
            const model = createdModel.current
            createdModel.current = null
            if (model && !model.isDisposed()) {
                e.setModel(null)
                model.dispose()
            }
        }}
    />
}
