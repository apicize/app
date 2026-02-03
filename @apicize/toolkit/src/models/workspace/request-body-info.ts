import { Body } from '@apicize/lib-typescript'

export interface RequestBodyInfo {
    id: string
    body?: Body
    bodyMimeType?: string | null
    bodyLength?: number | null
}

export interface RequestBodyMimeInfo {
    bodyMimeType: string | null
    bodyLength: number | null
}

