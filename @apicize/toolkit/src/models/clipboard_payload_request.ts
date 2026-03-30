/**
 * Payload type to serialize to file or clipboard
 */
export type ClipboardPaylodRequest = ClipboardPayloadRequest | ClipboardPayloadScenario | ClipboardPayloadAuthorization
    | ClipboardPayloadCertificate | ClipboardPayloadProxy | ClipboardPayloadRequestBody
    | ClipboardPayloadRequestTest | ClipboardPayloadGroupSetup
    | ClipboardPayloadResponseSummaryJson | ClipboardPayloadResponseSummaryCsv
    | ClipboardPayloadResponseBodyRaw | ClipboardPayloadResponseBodyPreview | ClipboardPayloadResponseDetail
    | ClipboardPayloadResponseCurl

export interface ClipboardPayloadRequest {
    payloadType: 'Request'
    requestId: string
}

export interface ClipboardPayloadScenario {
    payloadType: 'Scenario'
    scenarioId: string
}

export interface ClipboardPayloadAuthorization {
    payloadType: 'Authorization'
    authorizationId: string
}

export interface ClipboardPayloadCertificate {
    payloadType: 'Certificate'
    certificateId: string
}

export interface ClipboardPayloadProxy {
    payloadType: 'Proxy'
    proxyId: string
}

export interface ClipboardPayloadRequestBody {
    payloadType: 'RequestBody'
    requestId: string
}

export interface ClipboardPayloadRequestTest {
    payloadType: 'RequestTest'
    requestId: string
}

export interface ClipboardPayloadGroupSetup {
    payloadType: 'GroupSetup'
    groupId: string
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

export interface ClipboardPayloadResponseCurl {
    payloadType: 'ResponseCurl'
    execCtr: number
}