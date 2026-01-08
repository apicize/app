import { ExecutionResultSummary, ExecutionState } from "@apicize/lib-typescript"
import { ExecutionMenuItem } from "./workspace/execution"

export interface RequestExecution {
    executionState: ExecutionState
    menu: ExecutionMenuItem[]
    activeSummaries: { [execCtr: number]: ExecutionResultSummary }
    selectedExecCtr?: number
}