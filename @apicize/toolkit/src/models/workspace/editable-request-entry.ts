import { Selection, MultiRunExecution, Request, RequestGroup, ExecutionResultSummary } from "@apicize/lib-typescript"
import { Editable } from "../editable"
import { action, computed, observable, reaction, runInAction, toJS } from "mobx"
import { DEFAULT_SELECTION_ID, NO_SELECTION_ID, NO_SELECTION } from "../store"
import { WorkspaceParameters } from "./workspace-parameters"
import { ResultsPanel, WorkspaceStore } from "../../contexts/workspace.context"
import { ExecutionEvent, ExecutionMenuItem, ExecutionResultViewState } from "./execution"
import { RequestExecution } from "../request-execution"

export abstract class EditableRequestEntry extends Editable<Request | RequestGroup> {
    @observable accessor runs = 0
    @observable public accessor multiRunExecution = MultiRunExecution.Sequential

    @observable public accessor resultMenuItems: ExecutionMenuItem[] = []
    @observable public accessor selectedResultMenuItem: ExecutionMenuItem | null = null
    @observable public accessor isRunning: boolean = false
    @observable public accessor resultsPanel: ResultsPanel = 'Info'

    @observable accessor selectedScenario: Selection | undefined = undefined
    @observable accessor selectedAuthorization: Selection | undefined = undefined
    @observable accessor selectedCertificate: Selection | undefined = undefined
    @observable accessor selectedProxy: Selection | undefined = undefined
    @observable accessor selectedData: Selection | undefined = undefined

    @observable public accessor parameters: WorkspaceParameters | undefined = undefined

    @observable public accessor hideSuccess = false
    @observable public accessor hideFailure = false
    @observable public accessor hideError = false

    private summaries = new Map<number, ExecutionResultSummary>

    constructor(
        workspace: WorkspaceStore,
        executionResultViewState: ExecutionResultViewState,
        requestExecution: RequestExecution
    ) {
        super(workspace)

        this.hideSuccess = executionResultViewState.hideSuccess
        this.hideFailure = executionResultViewState.hideFailure
        this.hideError = executionResultViewState.hideError

        reaction(
            () => workspace.data,
            () => runInAction(() => {
                this.parameters = undefined
            })
        )

        this.applyExecution(requestExecution)

        if (executionResultViewState.execCtr !== undefined) {
            const m = requestExecution.menu.find(m => m.execCtr === executionResultViewState.execCtr)
            if (m) {
                this.selectedResultMenuItem = m
            }
        }
    }

    @action
    public changeExecCtr(execCtr: number) {
        const match = this.resultMenuItems.find(m => m.execCtr === execCtr)
        if (!match) {
            throw new Error(`Invalid execCtr: ${execCtr}`)
        }

        this.workspace.updateExecutionDetail(execCtr)
        this.selectedResultMenuItem = match
        this.updateExecutionResulltViewState()
    }

    @action
    setRuns(value: number) {
        this.runs = value
        this.onUpdate()
    }

    @action
    setMultiRunExecution(value: MultiRunExecution) {
        this.multiRunExecution = value
        this.onUpdate()
    }

    @action
    setSelectedScenarioId(entityId: string) {
        this.selectedScenario = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.onUpdate()
    }

    @action
    setSelectedAuthorizationId(entityId: string) {
        this.selectedAuthorization = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.onUpdate()
    }

    @action
    setSelectedCertificateId(entityId: string) {
        this.selectedCertificate = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.onUpdate()
    }

    @action
    setSelectedProxyId(entityId: string) {
        this.selectedProxy = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : entityId == NO_SELECTION_ID
                ? NO_SELECTION
                : { id: entityId, name: this.workspace.getNavigationName(entityId) }
        this.onUpdate()
    }

    @action
    setSelectedDataId(entityId: string) {
        this.selectedData = entityId === DEFAULT_SELECTION_ID
            ? undefined
            : { id: entityId, name: this.workspace.data?.find(d => d.id === entityId)?.name ?? "Unnamed" }
        this.onUpdate()
    }

    @action
    setParameters(parameters: WorkspaceParameters) {
        this.parameters = parameters
    }

    @action
    public startExecution() {
        this.isRunning = true
    }

    @action
    public setResultsPanel(value: ResultsPanel) {
        this.resultsPanel = value
    }

    applyExecution(execution: RequestExecution) {
        if (execution.menu.length < 1) {
            this.selectedResultMenuItem = null
            this.summaries = new Map()
            return
        }

        let newSelected: ExecutionMenuItem | undefined
        if (this.selectedResultMenuItem) {
            const current = this.selectedResultMenuItem
            if (this.resultMenuItems.length === execution.menu.length) {
                newSelected = execution.menu.find(m =>
                    m.executingRequestOrGroupId === current.executingRequestOrGroupId
                    && m.executingOffset === current.executingOffset
                )
            }
        }
        if (!newSelected) {
            newSelected = execution.menu[0]
        }

        this.resultMenuItems = execution.menu
        this.summaries = new Map(Object.entries(execution.activeSummaries).map(
            ([id, s]) => [parseInt(id), s]
        ))
        this.selectedResultMenuItem = newSelected
    }

    @action
    public processExecutionEvent(event: ExecutionEvent) {
        switch (event.eventType) {
            case 'start':
                this.isRunning = true
                break
            case 'cancel':
                this.isRunning = false
                break
            case 'complete':
                this.applyExecution(event)
                this.isRunning = false
                break
        }
    }

    @action
    public stopExecution() {
        this.isRunning = false
    }

    public getSummary(execCtr: number): ExecutionResultSummary {
        const summary = this.summaries.get(execCtr)
        if (!summary) {
            throw new Error(`Invalid retrieving summary result counter: ${execCtr}`)
        }
        return summary
    }

    public getSelectedSummaries(): Map<number, ExecutionResultSummary> {
        if (!this.selectedResultMenuItem) {
            throw new Error('No selected execution summary')
        }
        return this.summaries
    }

    private updateExecutionResulltViewState() {
        this.workspace.updateExecutionResultViewState(this.id, {
            hideSuccess: this.hideSuccess,
            hideFailure: this.hideFailure,
            hideError: this.hideError,
            execCtr: this.selectedResultMenuItem?.execCtr,
        })
    }

    @action toggleSuccess() {
        this.hideSuccess = !this.hideSuccess
        this.updateExecutionResulltViewState()
    }

    @action toggleFailure() {
        this.hideFailure = !this.hideFailure
        this.updateExecutionResulltViewState()
    }

    @action toggleError() {
        this.hideError = !this.hideError
        this.updateExecutionResulltViewState()
    }

    @computed get nameInvalid() {
        return this.dirty && ((this.name?.length ?? 0) === 0)
    }

    // Computed values for performance optimization
    @computed get hasResults(): boolean {
        return this.resultMenuItems.length > 0
    }

    @computed get visibleResults(): ExecutionMenuItem[] {
        if (!this.hideSuccess && !this.hideFailure && !this.hideError) {
            return this.resultMenuItems
        }

        return this.resultMenuItems.filter(item => {
            const state = item.executionState
            // If hideSuccess is true and the item is only success, filter it out
            if (this.hideSuccess && state === 1 /* ExecutionState.success */) {
                return false
            }
            // If hideFailure is true and the item is only failure, filter it out
            if (this.hideFailure && state === 2 /* ExecutionState.failure */) {
                return false
            }
            // If hideError is true and the item is only error, filter it out
            if (this.hideError && state === 4 /* ExecutionState.error */) {
                return false
            }
            return true
        })
    }

    @computed get currentResultIndex(): number {
        if (!this.selectedResultMenuItem) {
            return -1
        }
        return this.resultMenuItems.findIndex(
            item => item.execCtr === this.selectedResultMenuItem?.execCtr
        )
    }

    @computed get hasSelectedResult(): boolean {
        return this.selectedResultMenuItem !== null
    }

    @computed get resultCount(): number {
        return this.resultMenuItems.length
    }
}
