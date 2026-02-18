import { ExecutionState, ValidationState } from "@apicize/lib-typescript"

export interface NavigationEntry {
    id: string
    name: string
    executionState?: ExecutionState
    validationState?: ValidationState
    disabled: boolean
}

export interface NavigationRequestEntry extends NavigationEntry {
    children?: NavigationRequestEntry[]
}

export interface ParamNavigationSection {
    public: NavigationEntry[]
    private: NavigationEntry[]
    vault: NavigationEntry[]
}

export interface Navigation {
    requests: NavigationRequestEntry[]
    scenarios: ParamNavigationSection
    dataSets: NavigationEntry[]
    authorizations: ParamNavigationSection
    certificates: ParamNavigationSection
    proxies: ParamNavigationSection
}
