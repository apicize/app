import { ApicizeExecutionType, ApicizeGroup, ApicizeGroupRun, ApicizeRequest, ExecutionResultDetailGroup, ExecutionResultDetailRequest, ExecutionResultSummary, ExecutionState } from "@apicize/lib-typescript";
import { OverridableStringUnion } from '@mui/types'
import { SvgIconPropsColorOverrides } from "@mui/material"
import { action, observable } from "mobx";

export type ExecutionData = ApicizeGroup | ApicizeGroupRun | ApicizeRequest | ApicizeExecutionType

export type InfoColorType = OverridableStringUnion<
     | 'inherit'
     | 'success'
     | 'warning'
     | 'error'
     | 'disabled'
     | 'private'
     | 'vault',
     SvgIconPropsColorOverrides>

/**
 * Payload that application back-end notifies front-end of execution results
 */
export type ExecutionEvent = ExecutionStartEvent | ExecutionCompleteEvent | ExecutionCancelEvent

export interface ExecutionStartEvent {
     eventType: 'start',
     executionState: ExecutionState
}

export interface ExecutionCompleteEvent {
     eventType: 'complete',
     executionState: ExecutionState
     menu: ExecutionMenuItem[]
     activeSummaries: { [execCtr: number]: ExecutionResultSummary }
}

export interface ExecutionCancelEvent {
     eventType: 'cancel',
     executionState: ExecutionState
}

export interface ExecutionMenuItem {
     name: string
     level: number
     
     executingName?: string
     executionState: ExecutionState

     executingRequestOrGroupId: string
     executingOffset: number
     execCtr: number
     nextExecCtr?: number
     prevExecCtr?: number
     parentExecCtr?: number
}


export type ExecutionResultDetailWithBase64 = ExecutionResultDetailRequestWithBase64 | ExecutionResultDetailGroup

export interface ExecutionResultDetailRequestWithBase64 extends ExecutionResultDetailRequest {
     requestBodyBase64?: string
     resultBodyBase64?: string
}

export interface ExecutionResultViewState {
     hideSuccess: boolean
     hideFailure: boolean
     hideError: boolean
     execCtr?: number
}
