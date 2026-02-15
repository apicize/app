import { LogContext, LogStore, ReqwestEvent } from "@apicize/toolkit"
import React, { useEffect } from "react"
import { ReactNode } from "react"
import { listen } from "@tauri-apps/api/event"

export function LogProvider({ store, children }: { store: LogStore, children?: ReactNode }) {
    useEffect(() => {
        const unlistenLog = listen<ReqwestEvent>('log', (event) => {
            store.addEvent(event.payload)
        })
        return () => {
            unlistenLog.then(f => f())
        }
    }, [])

    return (
        <LogContext.Provider value={store}>
            {children}
        </LogContext.Provider>
    )
}