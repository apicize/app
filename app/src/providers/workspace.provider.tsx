import * as app from '@tauri-apps/api/app'
import * as core from '@tauri-apps/api/core'
import * as os from '@tauri-apps/plugin-os'
import { Window } from "@tauri-apps/api/window"
import { useFeedback, useFileOperations, WorkspaceContext, WorkspaceStore } from "@apicize/toolkit";
import { ReactNode, useEffect, useRef } from "react";
import { reaction } from 'mobx';

/**
 * Implementation of window management via Tauri
 */
export function WorkspaceProvider({ store, children }: { store: WorkspaceStore, children?: ReactNode }) {
    const feedback = useFeedback()
    const fileOps = useFileOperations()

    // Update window title
    reaction(
        () => ({ dirty: store.dirty, displayName: store.workbookDisplayName }),
        async ({ dirty, displayName }) => {
            const showDirty = dirty ? ' *' : ''
            const currentWindow = Window.getCurrent()
            currentWindow.setTitle(((displayName?.length ?? 0) > 0)
                ? `Apicize - ${displayName}${showDirty}`
                : `Apicize (New Workbook)${showDirty}`)
        }
    )

    const _forceClose = useRef(false);

    (async () => {
        const [name, version, isReleaseMode] = await Promise.all([
            app.getName(),
            app.getVersion(),
            core.invoke<boolean>('is_release_mode')
        ])

        if (isReleaseMode) {
            document.addEventListener('contextmenu', event => event.preventDefault())
        }

        store.changeApp(name, version)
        try {
            store.setOs(os.type())
        } catch (e) {
            console.error("Uanble to detect OS type", e)
        }
    })()

    useEffect(() => {
        // Set up close event hook, warn user if "dirty"
        const currentWindow = Window.getCurrent()
        const unlistenClose = currentWindow.onCloseRequested((e) => {
            if (store.dirty && (!_forceClose.current)) {
                e.preventDefault();
                (async () => {
                    if (await feedback.confirm({
                        title: 'Close Apicize?',
                        message: 'You have unsaved changes, are you sure you want to close Apicize?',
                        okButton: 'Yes',
                        cancelButton: 'No',
                        defaultToCancel: true
                    })) {
                        _forceClose.current = true
                        store.dirty = false
                        currentWindow.close()
                    }
                })()
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
}
