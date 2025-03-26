export type JsonValue = string | number | boolean | [] | Object

export type ApicizeGroupItem = ApicizeGroup | ApicizeRequest

export type ApicizeGroupChildren = ApicizeGroupItemList | ApicizeGroupRunList

export type ApicizeGroupItemChildren = ApicizeGroupItemList | ApicizeGroupRunList

export type ApicizeExecutionType = ApicizeExecutionSingle | ApicizeExecutionRuns

export type ApicizeResult = ApicizeGroupItemList | ApicizeRowSummary

export interface ApicizeRowSummary {
    type: 'Rows'
    rows: ApicizeRow[]

    executedAt: number
    duration: number

    success: boolean
    requestSuccessCount: number
    requestFailureCount: number
    requestErrorCount: number
    testPassCount: number
    testFailCount: number
}

export interface ApicizeRow {
    rowNumber: number,

    items: ApicizeGroupItem[]

    executedAt: number
    duration: number

    success: boolean
    requestSuccessCount: number
    requestFailureCount: number
    requestErrorCount: number
    testPassCount: number
    testFailCount: number
}
export interface ApicizeGroupItemList {
    type: 'Items',
    items: ApicizeGroupItem[]
}

export interface ApicizeGroupRunList {
    type: 'Runs',
    items: ApicizeGroupRun[]
}

export interface ApicizeExecutionSingle extends ApicizeExecution {
    type: 'Single'
}

export interface ApicizeExecutionRuns {
    type: 'Runs'
    items: ApicizeExecution[]
}

export interface ApicizeExecutionSummary {
    executedAt: number
    duration: number
    success: boolean
    requestSuccessCount: number
    requestFailureCount: number
    requestErrorCount: number
    testPassCount: number
    testFailCount: number
}

export interface ApicizeGroup extends ApicizeExecutionSummary {
    type: 'Group'

    id: string
    name: string

    executedAt: number
    duration: number
    variables?: Map<string, JsonValue>
    outputVariables?: Map<string, JsonValue>
    children?: ApicizeGroupChildren

    success: boolean
    requestSuccessCount: number
    requestFailureCount: number
    requestErrorCount: number
    testPassCount: number
    testFailCount: number
}

export interface ApicizeGroupRun extends ApicizeExecutionSummary {
    type: 'GroupRun',
    runNumber: number

    executedAt: number
    duration: number

    children?: ApicizeGroupItem[]

    variables?: Map<string, JsonValue>
    outputVariables?: Map<string, JsonValue>

    success: boolean
    requestSuccessCount: number
    requestFailureCount: number
    requestErrorCount: number
    testPassCount: number
    testFailCount: number
}

export interface ApicizeRequest extends ApicizeExecutionSummary {
    type: 'Request'

    id: string
    name: string

    executedAt: number
    duration: number
    variables?: Map<string, JsonValue>
    outputVariables?: Map<string, JsonValue>

    execution?: ApicizeExecutionType

    success: boolean
    requestSuccessCount: number
    requestFailureCount: number
    requestErrorCount: number
    testPassCount: number
    testFailCount: number
}

export interface ApicizeExecution {
    rowNumber?: number
    runNumber?: number

    executedAt: number
    duration: number

    data?: Map<string, JsonValue>[]
    inputVariables?: Map<string, JsonValue>
    outputVariables?: Map<string, JsonValue>

    request?: ApicizeHttpRequest
    response?: ApicizeHttpResponse
    tests?: ApicizeTestResult[]
    error?: ApicizeError

    success: boolean
    testPassCount: number
    testFailCount: number
}

export interface ApicizeBodyText {
    type: 'Text'
    data: string
}

export interface ApicizeBodyJSON {
    type: 'JSON'
    data: object
    text: string
}

export interface ApicizeBodyBinary {
    type: 'Binary'
    data: Uint8Array
}

export type ApicizeBody = ApicizeBodyText | ApicizeBodyJSON | ApicizeBodyBinary

export interface ApicizeHttpRequest {
    url: string,
    method: string
    headers: Map<string, string>
    body?: ApicizeBody
    variables?: Map<string, string | number | boolean>
}

export interface ApicizeHttpResponse {
    status: number
    statusText: string
    headers?: Map<string, string>
    body?: ApicizeBody,
    oauth2Token?: TokenResult
}

export interface TokenResult {
    token: string
    cached: boolean
    url?: string
    certificate?: string
    proxy?: string
}

export interface ApicizeTestResult {
    testName: string[]
    success: boolean,
    error?: string
    logs?: string[]
}

export interface ApicizeError {
    type: string
    description: string
    url?: string
    source?: ApicizeError
}
