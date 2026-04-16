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

    const _closeDispatched = useRef(false);

    useEffect(() => {
        // Set up close event hook, warn user if "dirty"
        const currentWindow = Window.getCurrent()
        const unlistenClose = currentWindow.onCloseRequested((e) => {
            // If we've already kicked off the close sequence, don't re-run it.
            // destroy() shouldn't re-fire this, but this is a belt-and-suspenders guard.
            if (_closeDispatched.current) {
                return
            }

            if (store.dirty && store.editorCount < 2) {
                e.preventDefault();
                feedback.confirm({
                    title: `Close ${store.displayName.length === 0 ? 'New Workspace' : store.displayName}?`,
                    message: 'You have unsaved changes, are you sure you want to close Apicize?',
                    okButton: 'Yes',
                    cancelButton: 'No',
                    defaultToCancel: true
                }).then((ok) => {
                    if (ok) {
                        _closeDispatched.current = true
                        // Fire-and-forget the backend cleanup; the user chose to
                        // close without saving, so there is nothing to await.
                        store.close().catch((err) => feedback.toastError(err))
                        // destroy() bypasses onCloseRequested, so no re-entry.
                        currentWindow.destroy().catch((err) => feedback.toastError(err))
                    }
                }).catch(e => feedback.toastError(e))
            } else {
                // Not dirty or multiple editors still open — let the window close
                // normally and fire-and-forget the backend session cleanup.
                store.close().catch((err) => feedback.toastError(err))
            }
        })
        return (() => {
            unlistenClose.then(f => f()).catch(console.error)
        })
    }, [fileOps, feedback, store])

    return (
        <WorkspaceContext.Provider value={store}>
            {children}
        </WorkspaceContext.Provider>
    )
})
