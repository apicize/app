import { ExecutionState, ValidationState } from "@apicize/lib-typescript"
import { EntityType } from "./workspace/entity-type"

export interface NavigationEntry {
    id: string
    name: string
    executionState?: ExecutionState
    validationState?: ValidationState
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
