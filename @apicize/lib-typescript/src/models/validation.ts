/**
 * Mapping of validation error to property names
 */
export type ValidationErrorList = { [property: string]: string }

/**
 * List of validation errors, by property
 */
export interface ValidationErrors {
    validationErrors?: ValidationErrorList
}

/**
 * List of validation errors, by property
 */
export interface ValidationWarnings {
    validationWarnings?: string[]
        validationState?: ValidationState

}

/**
 * Interface reflecting of any validation issues
 */
export enum ValidationState {
    warning = 1,
    error = 2
}