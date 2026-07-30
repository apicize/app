/**
 * Supported code-generation targets for reproducing a dispatched request.
 *
 * The numeric values (other than None) MUST match the CodeGenLanguage enum
 * in the Rust backend (app/src-tauri/src/codegeneration.rs), since the value
 * is passed directly to the `generate_request_code` Tauri command.
 *
 * None is a front-end only value indicating no language is selected; it is
 * never sent to the backend.
 */
export enum CodeGenLanguage {
    None = -1,
    NodeJs = 0,
    Python = 1,
    Go = 2,
    CSharp = 3,
    Java = 4,
}
