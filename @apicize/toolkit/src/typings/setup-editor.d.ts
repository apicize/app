// @ts-nocheck

/** @deprecated describe() is not available in Group Setup scripts */
declare function describe(...args: never[]): never

/** @deprecated it() is not available in Group Setup scripts */
declare function it(...args: never[]): never

/** @deprecated tag() is not available in Group Setup scripts */
declare function tag(...args: never[]): never

/**
 * Makes the specified value available to subsequent requests
 * @param name Name of the value
 * @param value JSON serializable value
 */
declare function output(name: string, value: any): void

/**
 * Key value pairs
 */
declare interface KeyValuePairs {
    [key: string]: any
}

/**
 * Name string pairs
 */
declare interface NameStringPairs {
    [key: string]: string
}

/**
 * Merged scenario and output variables used for populating handlebar values
 */
declare const $: KeyValuePairs

/**
 * Scenario variables specified in request or parent
 */
declare const scenario: KeyValuePairs

/**
 * @deprecated Apicize requests are not available in Group Setup scripts
 */
declare const request: never

/**
 * @deprecated Apicize response are not available in Group Setup scripts
 */
declare const response: never

/**
 * Console commands to log output from tests
 */
declare const console: ApicizeConsole

/**
 * Variables (alias)
 */
declare const variables: KeyValuePairs

/**
 * Subset of console used to log output
 */
interface ApicizeConsole {
    /**
     * Log console information as info
     * @param data 
     */
    info(...data: any[]): void;
    /**
     * Log console information
     * @param data 
     */
    log(...data: any[]): void;
    /**
     * Log console information as trace data
     * @param data 
     */
    trace(...data: any[]): void;
    /**
     * Log console information as a warning
     * @param data 
     */
    warn(...data: any[]): void;
    /**
     * Log console information as an error
     * @param data 
     */
    error(...data: any[]): void;
    /**
     * Log console information as a debug message
     * @param data 
     */
    debug(...data: any[]): void;
}
