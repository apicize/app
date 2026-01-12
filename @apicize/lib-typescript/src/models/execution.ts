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

    name: string

    testContext: ApicizeExecutionTestContext,
    outputVariables?: Map<string, JsonValue>

    tests?: ApicizeTestResult[]
    error?: ApicizeError

    success: boolean
    testPassCount: number
    testFailCount: number
}

export interface ApicizeExecutionTestContext {
    request?: ApicizeHttpRequest
    response?: ApicizeHttpResponse
    merged?: Map<string, JsonValue>
    scenario?: Map<string, JsonValue>
    data?: Map<string, JsonValue>
}

export interface ApicizeBodyText {
    type: 'Text'
    text: string
}

export interface ApicizeBodyJSON {
    type: 'JSON'
    data: object
    text: string
}

export interface ApicizeBodyForm {
    type: 'Form'
    data: { [name: string]: string }
    text: string
}

export interface ApicizeBodyXML {
    type: 'XML'
    data: object
    text: string
}

export interface ApicizeBodyBinary {
    type: 'Binary'
    data: string
}

export type ApicizeBody = ApicizeBodyText | ApicizeBodyJSON | ApicizeBodyJSON | ApicizeBodyForm | ApicizeBodyBinary

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
    headers?: { [header: string]: string }
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

export type ApicizeTestResult = ApicizeTestScenario | ApicizeTestBehavior

export interface ApicizeTestScenario {
    type: 'Scenario'
    name: string
    success: boolean,
    children: ApicizeTestResult[]
}

export interface ApicizeTestBehavior {
    type: 'Behavior'
    name: string
    tag?: string,
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

export enum ExecutionState {
    running = 1,
    success = 2,
    failure = 4,
    error = 8,
}