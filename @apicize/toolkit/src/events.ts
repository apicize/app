export enum uiEvents {
    new = 'new',
    open = 'open',
    save = 'save',
    saveAs = 'saveAs'
}

export function subscribeUIEvent(event: uiEvents, listener: EventListenerOrEventListenerObject) {
    document.addEventListener(event, listener)
}

export function unsubscribeUIEvent(event: uiEvents, listener: EventListenerOrEventListenerObject) {
    document.removeEventListener(event, listener)
}

export function triggerUINew() {
    document.dispatchEvent(
        new CustomEvent(uiEvents.new)
    ) 
}

export function triggerUIOpen() {
    document.dispatchEvent(
        new CustomEvent(uiEvents.open)
    ) 
}

export function triggerUISave() {
    document.dispatchEvent(
        new CustomEvent(uiEvents.save)
    ) 
}

export function triggerUISaveAs() {
    document.dispatchEvent(
        new CustomEvent(uiEvents.saveAs)
    ) 
}