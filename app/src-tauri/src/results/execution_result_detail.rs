use apicize_lib::{
    ApicizeError, ApicizeExecutionTestContext, ApicizeTestBehavior, DataContext,
    ExecutionResultSuccess,
};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase", tag = "entityType")]
pub enum ExecutionResultDetail {
    Request(Box<ExecutionResultDetailRequest>),
    Grouped(Box<ExecutionResultDetailGroup>),
}

/// Represents detailed execution information of a request
#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionResultDetailRequest {
    /// Execution counter/identifier (will be the same for summary and detail)
    pub exec_ctr: usize,

    /// Request ID
    pub request_id: String,

    /// Request name
    pub name: String,

    /// Method for request
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,

    /// Requested URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    /// Optional referential key
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,

    /// Associative tag name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag: Option<String>,

    /// Row number (if applicable)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub row_number: Option<usize>,

    // Run number (if applicable)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub run_number: Option<usize>,

    /// Execution start (millisecond offset from start)
    pub executed_at: u128,

    /// Duration of execution (milliseconds)
    pub duration: u128,

    /// Variables available within test context
    pub test_context: ApicizeExecutionTestContext,

    /// Output variables for use in next request or group
    pub output_variables: Option<Map<String, Value>>,

    /// Test results (if executed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tests: Option<Vec<ApicizeTestBehavior>>,

    /// Error on dispatch or error execution
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApicizeError>,

    /// Indicates level of call success
    pub success: ExecutionResultSuccess,

    /// Number of child requests/groups with successful requests and all tests passed
    pub request_success_count: usize,

    /// Number of child requests/groups with successful requests and some tests failed
    pub request_failure_count: usize,

    /// Number of child requests/groups with successful requests and some tests failed
    pub request_error_count: usize,

    /// Number of passed tests, if request and tests are succesfully run
    pub test_pass_count: usize,

    /// Number of failed tests, if request and tests are succesfully run
    pub test_fail_count: usize,
}

/// Represents detailed execution information of a request
#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionResultDetailGroup {
    /// Execution identifier (will be the same for summary and detail)
    pub exec_ctr: usize,

    /// Request group ID
    pub group_id: String,

    /// Request name
    pub name: String,

    /// Optional referential key
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,

    /// Associative tag
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag: Option<String>,

    /// Row number (if applicable)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub row_number: Option<usize>,

    // Run number (if applicable)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub run_number: Option<usize>,

    /// Execution start (millisecond offset from start)
    pub executed_at: u128,

    /// Duration of execution (milliseconds)
    pub duration: u128,

    /// Variables available within test context
    pub data_context: DataContext,

    /// Success is true if all runs are successful
    pub success: ExecutionResultSuccess,

    /// Number of child requests/groups with successful requests and all tests passed
    pub request_success_count: usize,

    /// Number of child requests/groups with successful requests and some tests failed
    pub request_failure_count: usize,

    /// Number of child requests/groups with successful requests and some tests failed
    pub request_error_count: usize,

    /// Number of passed tests, if request and tests are succesfully run
    pub test_pass_count: usize,

    /// Number of failed tests, if request and tests are succesfully run
    pub test_fail_count: usize,
}
