import { useEffect } from 'react';
import { editor } from 'monaco-editor';
import * as core from '@tauri-apps/api/core';

/**
 * Hook to integrate Monaco editor clipboard operations with Tauri's native clipboard
 *
 * This overrides Monaco's built-in clipboard actions (copy, cut, paste) that are triggered
 * from both keyboard shortcuts and context menu, redirecting them to Tauri's native clipboard.
 *
 * @param editorRef - Reference to the Monaco editor instance
 * @param readOnly - Whether the editor is read-only (disables cut/paste)
 */
export function useMonacoClipboard(
    editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>,
    readOnly: boolean = false
) {
    useEffect(() => {
        const currentEditor = editorRef.current;
        if (!currentEditor) return;

        // Override Monaco's copy action
        const copyAction = currentEditor.addAction({
            id: 'editor.action.clipboardCopyAction',
            label: 'Copy',
            keybindings: [],  // Don't add keybindings, Monaco already has them
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1,
            run: async (ed) => {
                const selection = ed.getSelection();
                if (!selection) return;

                const model = ed.getModel();
                if (!model) return;

                const selectedText = model.getValueInRange(selection);
                if (selectedText) {
                    try {
                        await core.invoke('clipboard_write_text', { text: selectedText });
                    } catch (error) {
                        console.error('Failed to write to clipboard:', error);
                    }
                }
            }
        });

        // Override Monaco's cut action
        const cutAction = currentEditor.addAction({
            id: 'editor.action.clipboardCutAction',
            label: 'Cut',
            keybindings: [],
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 2,
            run: async (ed) => {
                if (readOnly || ed.getOption(editor.EditorOption.readOnly)) return;

                const selection = ed.getSelection();
                if (!selection) return;

                const model = ed.getModel();
                if (!model) return;

                const selectedText = model.getValueInRange(selection);
                if (selectedText) {
                    try {
                        await core.invoke('clipboard_write_text', { text: selectedText });
                        ed.executeEdits('', [{
                            range: selection,
                            text: ''
                        }]);
                    } catch (error) {
                        console.error('Failed to cut to clipboard:', error);
                    }
                }
            }
        });

        // Override Monaco's paste action
        const pasteAction = currentEditor.addAction({
            id: 'editor.action.clipboardPasteAction',
            label: 'Paste',
            keybindings: [],
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 3,
            run: async (ed) => {
                if (readOnly || ed.getOption(editor.EditorOption.readOnly)) return;

                try {
                    const text = await core.invoke<string>('clipboard_read_text');
                    if (text) {
                        ed.trigger('keyboard', 'type', { text });
                    }
                } catch (error) {
                    console.error('Failed to read from clipboard:', error);
                }
            }
        });

        // Cleanup - dispose the action overrides
        return () => {
            copyAction.dispose();
            cutAction.dispose();
            pasteAction.dispose();
        };
    }, [editorRef, readOnly]);
}
