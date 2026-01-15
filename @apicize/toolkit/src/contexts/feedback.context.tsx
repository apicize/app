import { action, makeObservable, observable, runInAction } from "mobx";
import { createContext, useContext } from "react";

/**
 * Manages state for Toast and Confirmation dialogs
 * 
 * We also manage dropdown state in here because dropdowns have to be hidden
 * before showing modal dialogs (because of backdrop conflicts)
 */
export class FeedbackStore {
    @observable accessor toastOpen = false
    @observable accessor toastMessage = ''
    @observable accessor toastSeverity = ToastSeverity.Info

    @observable accessor confirmOpen = false
    @observable accessor confirmOptions: ConfirmationOptions = {}

    @observable accessor lastModalRequest = 0
    @observable accessor modalInProgress = false

    private registeredModalCounter = 0
    private registeredModalBlockers = new Map<number, () => void>()

    constructor() {
        makeObservable(this)
    }

    private confirmResolve: (ok: boolean) => void = () => { };

    @action
    toast(message: string, severity: ToastSeverity) {
        this.toastMessage = message
        this.toastSeverity = severity
        this.toastOpen = true
    }

    @action
    toastError(error: unknown) {
        this.toastMessage = `${error}`
        this.toastSeverity = ToastSeverity.Error
        this.toastOpen = true
    }

    @action
    closeToast() {
        this.toastOpen = false
    }

    registerModalBlocker(callback: () => void) {
        const counter = (this.registeredModalCounter === Number.MAX_SAFE_INTEGER)
            ? 0 : this.registeredModalCounter + 1
        this.registeredModalCounter = counter
        this.registeredModalBlockers.set(counter, callback)
        return (() => this.registeredModalBlockers.delete(counter))
    }

    /**
     * Calls any registered modal blocker callbacks, mainly to deal with MUI
     * bombing out if there are multiple backdrops called at the same time
     * @returns True if any modal blockers were registered and called
     */
    hideAllMenus() {
        if (this.registeredModalBlockers.size > 0) {
            for (const callback of this.registeredModalBlockers.values()) {
                runInAction(callback)
            }
            return true;
        } else {
            return false;
        }
    }

    @action
    confirm(options: ConfirmationOptions): Promise<boolean> {
        // Hide all dropdown menus so we don't get backdrop errors
        return new Promise((resolve) => {
            const visibleDropdowns = this.hideAllMenus()
            setTimeout(() => runInAction(() => {

                this.confirmResolve = resolve
                this.confirmOptions = options
                this.confirmOpen = true
            }), visibleDropdowns ? 10 : 0)
        })
    }

    @action
    closeConfirm(ok: boolean) {
        this.confirmOpen = false
        this.confirmResolve(ok)
    }

    @action
    setModal(onOff: boolean) {
        this.modalInProgress = onOff
    }
}

export const FeedbackContext = createContext<FeedbackStore | null>(null)

export function useFeedback() {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error('useFeedback must be used within a FeedbackContext.Provider');
    }
    return context;
}

export enum ToastSeverity {
    Error = 'error',
    Warning = 'warning',
    Info = 'info',
    Success = 'success'
}

export interface ConfirmationOptions {
    // catchOnCancel?: boolean,
    title?: string,
    message?: string,
    okButton?: string,
    defaultToCancel?: boolean,
    cancelButton?: string
}