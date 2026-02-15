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
        })()

        return () => {
            if (contextMenuHandler) {
                document.removeEventListener('contextmenu', contextMenuHandler)
            }
        }
    }, [settings])

    return (
        <ApicizeSettingsContext.Provider value={settings}>
            {children}
        </ApicizeSettingsContext.Provider>
    )
}

