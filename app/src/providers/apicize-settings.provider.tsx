import * as app from '@tauri-apps/api/app'
import * as core from '@tauri-apps/api/core'
import * as os from '@tauri-apps/plugin-os'
import { ReactNode, useEffect } from "react";
import { ApicizeSettingsContext, EditableSettings, StorageInformation } from "@apicize/toolkit";

export function ApicizeSettingsProvider({
    settings, children
}: {
    settings: EditableSettings
    children?: ReactNode | null
}) {

    useEffect(() => {
        if (!settings) return

        let contextMenuHandler: ((event: Event) => void) | null = null;
        let keydownHandler: ((event: KeyboardEvent) => void) | null = null;

        // Cmd/Ctrl + '+' / '-' adjust both the main and navigation font sizes together (clamped 1-99).
        // Use the platform accelerator: Cmd on macOS, Ctrl elsewhere.
        const clampFontSize = (value: number) => Math.min(99, Math.max(1, value))
        const fontSizeHandler = (event: KeyboardEvent) => {
            const accelerator = settings.ctrlKey === 'Cmd' ? event.metaKey : event.ctrlKey
            if (!accelerator) return
            let delta: number
            if (event.key === '+' || event.key === '=') {
                delta = 1
            } else if (event.key === '-' || event.key === '_') {
                delta = -1
            } else {
                return
            }
            event.preventDefault()
            settings.setFontSize(clampFontSize(settings.fontSize + delta))
            settings.setNavigationFontSize(clampFontSize(settings.navigationFontSize + delta))
        }
        document.addEventListener('keydown', fontSizeHandler);

        (async () => {
            const [name, version, isReleaseMode, storage] = await Promise.all([
                app.getName(),
                app.getVersion(),
                core.invoke<boolean>('is_release_mode'),
                core.invoke<StorageInformation>('get_storage_information'),
            ])

            if (isReleaseMode) {
                contextMenuHandler = (event: Event) => event.preventDefault()
                document.addEventListener('contextmenu', contextMenuHandler)
            } else {
                // Debug mode: Ctrl+Shift+R resizes window to 1200x800
                keydownHandler = (event: KeyboardEvent) => {
                    if (event.ctrlKey && event.shiftKey && event.key === 'R') {
                        event.preventDefault()
                        core.invoke('set_debug_window_size').catch(console.error)
                    }
                }
                document.addEventListener('keydown', keydownHandler)
            }

            settings.changeApp(
                name,
                version,
                storage,
            )
            try {
                settings.setOs(os.type())
            } catch (e) {
                console.error("Unable to detect OS", e)
            }
        })().catch(console.error)

        return () => {
            document.removeEventListener('keydown', fontSizeHandler)
            if (contextMenuHandler) {
                document.removeEventListener('contextmenu', contextMenuHandler)
            }
            if (keydownHandler) {
                document.removeEventListener('keydown', keydownHandler)
            }
        }
    }, [settings])

    return (
        <ApicizeSettingsContext.Provider value={settings}>
            {children}
        </ApicizeSettingsContext.Provider>
    )
}
