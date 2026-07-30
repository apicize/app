import { ApicizeError, ApicizeTestBehavior } from "./execution"
import { ExecutionResultSuccess } from "./execution-result-success"

/**
 * Summary information about a request or group execution used for menus and summaries
 */
export interface ExecutionResultSummary {
    requestOrGroupId: string
    execCtr: number
    parentExecCtr?: number
    childExecCtrs?: number[]
    level: number
    name: string
    key?: string
    executedAt: number
    duration: number
    method?: string
    url?: string
    logs?: string[]
    status?: number
    statusText: string
    hasResponseHeaders: boolean
    responseBodyLength?: number
    success: ExecutionResultSuccess
    error?: ApicizeError
    requestSuccessCount: number
    requestFailureCount: number
    requestErrorCount: number
    testResults?: ApicizeTestBehavior[]
    runNumber?: number
    runCount?: number
    rowNumber?: number
    rowCount?: number
}
