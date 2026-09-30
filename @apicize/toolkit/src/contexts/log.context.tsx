import { action, observable, runInAction } from "mobx"
import { ReqwestEvent } from "../models/trace"
import { createContext, useContext } from "react"
import { WorkspaceStore } from "./workspace.context"

export class LogStore {
    @observable accessor initialized = false
    @observable accessor events: ReqwestEvent[] = []
    @observable accessor follow = true

    @action
    async checkInitialized(workspace: WorkspaceStore) {
        if (!this.initialized) {
            const new_events = await workspace.listLogs()
            this.initialized = true
            runInAction(() => {
                this.events = new_events
            })
        }
    }

    @action
    addEvent(event: ReqwestEvent) {
        if (this.initialized) {
            if (event.event === 'Clear') {
                this.events = []
            } else if (this.events.length >= 100) {
                // Drop the oldest events, matching the backend's stored log
                this.events = [...this.events.slice(-99), event]
            } else {
                this.events.push(event)
            }
        }
    }

    @action
    setFollow(value: boolean) {
        this.follow = value
    }
}

export const LogContext = createContext<LogStore | null>(null)

export function useLog() {
    const context = useContext(LogContext);
    if (!context) {
        throw new Error('useLog must be used within a LogContext.Provider');
    }
    return context;
}