import { action, makeObservable, observable } from 'mobx';
import { createContext, useContext } from 'react'
import { Authorization, Certificate, Proxy, RequestEntry, Scenario } from '@apicize/lib-typescript';

export enum ClipboardDataType {
    None = 0,
    Text = 1,
    Image = 2,
    Files = 3,
    RequestEntry = 4,
    Scenario = 5,
    Authorization = 6,
    Certificate = 7,
    Proxy = 8
}


export type ClipboardData = ClipboardRequestEntry | ClipboardScenario | ClipboardAuthorization
    | ClipboardCertificate | ClipboardProxy | ClipboardText

export interface ClipboardText {
    type: 'text'
    text: string
}

export interface ClipboardRequestEntry {
    type: 'requestEntry'
    entry: RequestEntry
}

export interface ClipboardScenario {
    type: 'scenario'
    scenario: Scenario
}

export interface ClipboardAuthorization {
    type: 'authorization'
    authorization: Authorization
}

export interface ClipboardCertificate {
    type: 'certificate'
    certificate: Certificate
}

export interface ClipboardProxy {
    type: 'proxy'
    proxy: Proxy
}

export class ClipboardStore {
    @observable accessor type: ClipboardDataType = ClipboardDataType.None
    @observable accessor hasText = false
    @observable accessor hasImage = false

    constructor(dataType: ClipboardDataType, private readonly callbacks: {
        onWriteText: (text: string) => Promise<void>,
        onWriteImage: (data: Uint8Array) => Promise<void>,
        onGetData: () => Promise<ClipboardData>,
        onGetImage: () => Promise<Uint8Array>,
    }) {
        makeObservable(this)
        this.updateClipboardDataType(dataType)
    }

    writeTextToClipboard(text: string): Promise<void> {
        return this.callbacks.onWriteText(text)
    }

    writeImageToClipboard(data: Uint8Array): Promise<void> {
        return this.callbacks.onWriteImage(data)
    }

    getData() {
        return this.callbacks.onGetData()
    }

    getClipboardImage() {
        return this.callbacks.onGetImage()
    }

    @action
    updateClipboardDataType(type: ClipboardDataType) {
        this.type = type
        this.hasImage = type === ClipboardDataType.Image
        this.hasText = ![ClipboardDataType.Image, ClipboardDataType.Files, ClipboardDataType.None].includes(type)
    }
}

export const ClipboardContext = createContext<ClipboardStore | null>(null)

export function useClipboard() {
    const context = useContext(ClipboardContext);
    if (!context) {
        throw new Error('useClipboard must be used within a ClipboardContext.Provider');
    }
    return context;
}
