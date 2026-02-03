import { ReactNode, useEffect, useMemo } from "react";
import { hasImage, hasText, readText, readImageBase64, writeImageBase64, writeText, onClipboardUpdate, writeImageBinary, readImageBinary } from "tauri-plugin-clipboard-api"
import { ClipboardContext, ClipboardStore, ToastSeverity, useFeedback } from "@apicize/toolkit";
import { runInAction } from "mobx";

/**
 * Implementation of clipboard operations via Tauri
 */
export function ClipboardProvider({
    children
}: {
    children?: ReactNode
}) {
    const feedback = useFeedback()

    const store = useMemo(
        () => new ClipboardStore({
            onWriteText: async (text: string) => {
                try {
                    await writeText(text)
                    feedback.toast('Text copied to clipboard', ToastSeverity.Success)
                } catch (e) {
                    feedback.toast(`${e}`, ToastSeverity.Error)
                }
            },
            onWriteImage: async (data: Uint8Array) => {
                try {
                    await writeImageBinary([...data])
                    feedback.toast('Image copied to clipboard', ToastSeverity.Success)
                } catch (e) {
                    feedback.toast(`${e}`, ToastSeverity.Error)
                }
            },
            onGetText: () => {
                return readText()
            },
            onGetImage: async () => {
                return (await readImageBinary("Uint8Array")) as Uint8Array
            },
        }),
        [feedback]
    )

    useEffect(() => {
        const updateClipboardState = async (state: {
            text: boolean,
            image: boolean
        }) => {
            if (store.hasText !== state.text) {
                runInAction(() => {
                    store.updateClipboardTextStatus(state.text)
                })
            }
            if (store.hasImage !== state.image) {
                if (state.image) {
                    const tryReadImage = (attempt: number) => {
                        readImageBase64()
                            .then(() => runInAction(() => {
                                store.updateClipboardImageStatus(true)
                            }))
                            .catch(() => {
                                if (attempt < 10) setTimeout(() => tryReadImage(attempt + 1), 100)
                                else store.updateClipboardImageStatus(false)
                            })
                    }
                    tryReadImage(0)
                } else {
                    runInAction(() => {
                        store.updateClipboardImageStatus(false)
                    })
                }
            }
        }

        const unlisten = onClipboardUpdate(updateClipboardState)
        // Promise.all([hasText(), hasImage()]).then(([text, image]) => {
        //     updateClipboardState({
        //         text, image
        //     })
        // })
        return () => {
            unlisten.then(() => { })
        }
    }, [store])

    return (
        <ClipboardContext.Provider value={store}>
            {children}
        </ClipboardContext.Provider>
    )
}
