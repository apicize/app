/**
 * Payload type to serialize to file or clipboard
 */
export type ClipboardPaylodRequest = ClipboardPayloadRequestBody | ClipboardPayloadRequestTest | ClipboardPayloadResponseSummaryJson
    | ClipboardPayloadResponseSummaryCsv | ClipboardPayloadResponseBodyRaw | ClipboardPayloadResponseBodyPreview | ClipboardPayloadResponseDetail

export interface ClipboardPayloadRequestBody {
    payloadType: 'RequestBody'
    requestId: string
}

export interface ClipboardPayloadRequestTest {
    payloadType: 'RequestTest'
    requestId: string
}

export interface ClipboardPayloadResponseSummaryJson {
    payloadType: 'ResponseSummaryJson'
    execCtr: number
}

export interface ClipboardPayloadResponseSummaryCsv {
    payloadType: 'ResponseSummaryCsv'
    execCtr: number
}

export interface ClipboardPayloadResponseBodyRaw {
    payloadType: 'ResponseBodyRaw'
    execCtr: number
}

export interface ClipboardPayloadResponseBodyPreview {
    payloadType: 'ResponseBodyPreview'
    execCtr: number
}

export interface ClipboardPayloadResponseDetail {
    payloadType: 'ResponseDetail'
    execCtr: number
}
