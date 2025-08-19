import * as app from '@tauri-apps/api/app'
import * as core from '@tauri-apps/api/core'
import * as os from '@tauri-apps/plugin-os'
import { ReactNode } from "react";
import { ApicizeSettingsContext, EditableSettings, StorageInformation } from "@apicize/toolkit";

export function ApicizeSettingsProvider({
    settings, children
}: {
    settings: EditableSettings
    children?: ReactNode | null
}) {

    (async () => {
        if (settings) {
            const [name, version, isReleaseMode, storage] = await Promise.all([
                app.getName(),
                app.getVersion(),
                core.invoke<boolean>('is_release_mode'),
                core.invoke<StorageInformation>('get_storage_information'),
            ])

            if (isReleaseMode) {
                document.addEventListener('contextmenu', event => event.preventDefault())
            }

            settings.changeApp(
                name,
                version,
                storage,
            )
            try {
                settings.setOs(os.type())
            } catch (e) {
                console.error("Uanble to detect OS", e)
            }
        }
    })()
    return (
        <ApicizeSettingsContext.Provider value={settings}>
            {children}
        </ApicizeSettingsContext.Provider>
    )
}

