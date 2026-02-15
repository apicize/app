import { Selection } from "./selection";
import { ValidationState, ValidationWarnings } from "./validation";

export interface SelectedParameters {
    selectedScenario?: Selection,
    selectedAuthorization?: Selection,
    selectedCertificate?: Selection,
    selectedProxy?: Selection,
    selectedData?: Selection,
}

export interface WorkspaceDefaultParameters extends SelectedParameters, ValidationWarnings {
    validationState?: ValidationState
}
