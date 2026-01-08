import { Window } from "@tauri-apps/api/window"
import { useFeedback, useFileOperations, WorkspaceContext, WorkspaceStore } from "@apicize/toolkit";
import { ReactNode, useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";

/**
 * Implementation of window management via Tauri
 */
export const WorkspaceProvider = observer(({ store, children }: { store: WorkspaceStore, children?: ReactNode }) => {
    const feedback = useFeedback()
    const fileOps = useFileOperations()

    const _forceClose = useRef(false);

    useEffect(() => {
        // Set up close event hook, warn user if "dirty"
        const currentWindow = Window.getCurrent()
        const unlistenClose = currentWindow.onCloseRequested((e) => {
            if (store.dirty && store.editorCount < 2 && (!_forceClose.current)) {
                e.preventDefault();
                (async () => {
                    if (await feedback.confirm({
                        title: `Close ${store.displayName.length === 0 ? 'New Workspace' : store.displayName}?`,
                        message: 'You have unsaved changes, are you sure you want to close Apicize?',
                        okButton: 'Yes',
                        cancelButton: 'No',
                        defaultToCancel: true
                    })) {
                        _forceClose.current = true
                        store.dirty = false
                        currentWindow.close()
                        store.close().catch((e) => {
                            feedback.toastError(e)
                        })
                    }
                })()
            } else {
                store.close().catch((e) => {
                    feedback.toastError(e)
                })

            }
        })
        return (() => {
            unlistenClose.then(f => f())
        })
    }, [fileOps, feedback, store])

    return (
        <WorkspaceContext.Provider value={store}>
            {children}
        </WorkspaceContext.Provider>
    )
})
