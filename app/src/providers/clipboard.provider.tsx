import * as core from '@tauri-apps/api/core'
import { ReactNode, useEffect, useMemo } from "react";
import { ClipboardContext, ClipboardData, ClipboardDataType, ClipboardStore, ToastSeverity, useFeedback } from "@apicize/toolkit";
import { runInAction } from "mobx";
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

/**
 * Implementation of clipboard operations via Tauri
 */
export function ClipboardProvider({
    dataType,
    children,
}: {
    dataType: ClipboardDataType,
    children?: ReactNode
}) {
    const feedback = useFeedback()
    const store = useMemo(
        () => new ClipboardStore(dataType, {
            onWriteText: async (text: string) => {
                try {
                    await core.invoke('clipboard_write_text', { text });
                    feedback.toast('Text copied to clipboard', ToastSeverity.Success)
                } catch (e) {
                    feedback.toast(`${e}`, ToastSeverity.Error)
                }
            },
            onWriteImage: async (data: Uint8Array) => {
                try {
                    await core.invoke('clipboard_write_image', { data: [...data] });
                    feedback.toast('Image copied to clipboard', ToastSeverity.Success)
                } catch (e) {
                    feedback.toast(`${e}`, ToastSeverity.Error)
                }
            },
            onGetData: () => {
                return core.invoke<ClipboardData>('clipboard_read_data')
            },
            onGetImage: () => {
                return core.invoke<Uint8Array>('clipboard_read_image')
            },
        }),
        [dataType, feedback]
    )

    useEffect(() => {
        const w = getCurrentWebviewWindow()
        const unlistenClipboardChanged = w.listen<ClipboardDataType>('clipboard_changed', (event) => {
            runInAction(() => {
                store.updateClipboardDataType(event.payload)
            })
        })
        return () => {
            unlistenClipboardChanged.then(() => { }).catch(console.error)
        }
    }, [store, feedback])

    return (
        <ClipboardContext.Provider value={store}>
            {children}
        </ClipboardContext.Provider>
    )
}
