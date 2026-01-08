/**
 * List of validation errors, by property
 */
export interface ValidationErrors {
    validationErrors?: { [property: string] : string }
}

/**
 * List of validation errors, by property
 */
export interface ValidationWarnings {
    validationWarnings?: string[]
}

/**
 * Interface reflecting of any validation issues
 */
export enum ValidationState {
    warning = 1,
    error = 2
}