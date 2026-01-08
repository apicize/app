/**
 * Indicates whether multiple execution occur sequentially or concurrently
 */
export enum MultiRunExecution {
    Sequential = "SEQUENTIAL",
    Concurrent = "CONCURRENT",
}

/**
 * Interface that expresses we can run something
 */
export interface Executable {
    runs: number
    multiRunExecution: MultiRunExecution
}
