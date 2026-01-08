import { action, makeObservable, observable, runInAction } from "mobx";
import { createContext, useContext } from "react";

/**
 * Manages state for Toast and Confirmation dialogs
 */
export class FeedbackStore {
    @observable accessor toastOpen = false
    @observable accessor toastMessage = ''
    @observable accessor toastSeverity = ToastSeverity.Info

    @observable accessor confirmOpen = false
    @observable accessor confirmOptions: ConfirmationOptions = {}

    @observable accessor modalInProgress = false

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

    @action
    confirm(options: ConfirmationOptions): Promise<boolean> {
        // Trigger a click event on the document body to close any open select
        console.log('Closing selects')
        // Find all MUI popover backdrops and click them
        const backdrops = document.querySelectorAll('.MuiBackdrop-root');
        backdrops.forEach(backdrop => {
            if (backdrop instanceof HTMLElement) {
                backdrop.click();
            }
        });

        return new Promise((resolve) => {
            this.confirmResolve = resolve
            this.confirmOptions = options
            this.confirmOpen = true
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