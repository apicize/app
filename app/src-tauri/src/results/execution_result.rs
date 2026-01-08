use indexmap::{IndexMap, IndexSet};
use std::collections::HashMap;

use super::{ExecutionResultDetail, ExecutionResultDetailGroup, ExecutionResultDetailRequest};

use apicize_lib::{
    ApicizeBody, ApicizeError, ApicizeExecution, ApicizeGroupResult, ApicizeGroupResultContent,
    ApicizeGroupResultRow, ApicizeGroupResultRowContent, ApicizeGroupResultRun,
    ApicizeRequestResult, ApicizeRequestResultContent, ApicizeRequestResultRow,
    ApicizeRequestResultRowContent, ApicizeRequestResultRun, ApicizeResult, ExecutionResultSuccess,
    ExecutionResultSummary, Identifiable, Tally, TestRunnerContext,
};

pub type ExecutionResult = (ExecutionResultSummary, ExecutionResultDetail);

#[derive(Default)]
pub struct ExecutionResultBuilder {
    /// Next execution identifier
    exec_ctr: usize,
    /// All execution results indexed by execution identifer
    results: HashMap<usize, ExecutionResult>,
    /// Executions indexed first based upon the requests are executed are for, and then based
    /// up which parent request/group executed them
    executing_request_index: HashMap<String, IndexMap<String, Vec<usize>>>,
}
struct EntryIdentifiers {
    pub id: String,
    pub title: String,
    pub key: Option<String>,
    pub tag: Option<String>,
    pub parent_exec_ctr: usize,
}

struct ResultContext<'a> {
    level: usize,
    active_request_ids: &'a IndexSet<String>,
    identifiers: &'a EntryIdentifiers,
    updated_request_ids: &'a mut IndexSet<String>,
}

impl ExecutionResultBuilder {
    /// Process the result generated when executing request_or_group_id,
    /// return the list of request IDs that have updaed executions
    pub fn process_result(
        &mut self,
        context: &TestRunnerContext,
        result: ApicizeResult,
    ) -> IndexSet<String> {
        let mut updated_request_ids = IndexSet::<String>::new();
        self.delete_indexed_request_results(context.get_executing_request_or_group_id());
        self.append_result(
            context,
            result,
            0,
            &IndexSet::new(),
            None,
            &mut updated_request_ids,
        );
        updated_request_ids
    }

    // pub fn dump_current_indexes(&self) {
    //     println!("*** Executed Indexes ***");
    //     for (request_or_group_id, executed_results) in &self.executing_request_index {
    //         println!("Request {request_or_group_id}");
    //         for (executing_request_id, exec_ctrs) in executed_results {
    //             println!(
    //                 "  - Executed by {executing_request_id}: {}",
    //                 exec_ctrs
    //                     .iter()
    //                     .map(|exec_ctr| exec_ctr.to_string())
    //                     .collect::<Vec<String>>()
    //                     .join(", ")
    //             );
    //         }
    //     }
    //     println!("************************");
    // }

    fn append_result(
        &mut self,
        context: &TestRunnerContext,
        result: ApicizeResult,
        level: usize,
        active_request_ids: &IndexSet<String>,
        parent_exec_ctr: Option<usize>,
        updated_request_ids: &mut IndexSet<String>,
    ) -> usize {
        match result {
            ApicizeResult::Request(request) => self.append_request_result(
                context,
                *request,
                level,
                parent_exec_ctr,
                active_request_ids,
                updated_request_ids,
            ),
            ApicizeResult::Group(group) => self.append_group_result(
                context,
                *group,
                level,
                parent_exec_ctr,
                active_request_ids,
                updated_request_ids,
            ),
        }
    }

    fn append_request_result(
        &mut self,
        context: &TestRunnerContext,
        result: ApicizeRequestResult,
        level: usize,
        parent_exec_ctr: Option<usize>,
        active_request_ids: &IndexSet<String>,
        updated_request_ids: &mut IndexSet<String>,
    ) -> usize {
        let success = success_from_tallies(&result);

        let request_id = result.get_id();
        let executing_request_or_group_id = context.get_executing_request_or_group_id();
        let exec_ctr = self.next_counter();

        // Add the counter to list of requests/groups that we are collecting for
        let mut active_request_ids = active_request_ids.clone();
        active_request_ids.insert(request_id.to_string());
        for active_request_id in &active_request_ids {
            self.add_index_entries(active_request_id, executing_request_or_group_id, exec_ctr);
        }

        // Track that this result's request was updated
        updated_request_ids.insert(request_id.to_string());

        let key = context.get_request_key(request_id).unwrap_or_default();
        let identifiers = EntryIdentifiers {
            id: request_id.to_string(),
            title: result.get_title(),
            key,
            tag: result.tag,
            parent_exec_ctr: exec_ctr,
        };

        let mut result_context = ResultContext {
            level: level + 1,
            active_request_ids: &active_request_ids,
            identifiers: &identifiers,
            updated_request_ids,
        };

        let mut summary = ExecutionResultSummary {
            exec_ctr,
            request_or_group_id: identifiers.id.clone(),
            parent_exec_ctr,
            child_exec_ctrs: Some(vec![]),
            level,
            name: identifiers.title.clone(),
            key: identifiers.key.clone(),
            tag: identifiers.tag.clone(),
            method: None,
            url: None,
            executed_at: result.executed_at,
            duration: result.duration,
            status: None,
            status_text: None,
            has_response_headers: false,
            response_body_length: None,
            success: success.clone(),
            error: None,
            request_success_count: 0,
            request_failure_count: 0,
            request_error_count: 0,
            test_results: None,
            run_number: None,
            run_count: None,
            row_number: None,
            row_count: None,
        };

        let detail: ExecutionResultDetail;

        match result.content {
            ApicizeRequestResultContent::Rows { rows } => {
                let child_exec_ctrs =
                    self.append_request_result_rows(&result.id, context, rows, &mut result_context);
                if !child_exec_ctrs.is_empty() {
                    summary.child_exec_ctrs = Some(child_exec_ctrs);
                }
                summary.request_success_count = result.request_success_count;
                summary.request_failure_count = result.request_failure_count;
                summary.request_error_count = result.request_error_count;
                detail = ExecutionResultDetail::Grouped(Box::new(ExecutionResultDetailGroup {
                    exec_ctr,
                    group_id: identifiers.id.clone(),
                    name: identifiers.title.clone(),
                    key: identifiers.key.clone(),
                    tag: identifiers.tag.clone(),
                    row_number: None,
                    run_number: None,
                    executed_at: result.executed_at,
                    duration: result.duration,
                    data_context: result.data_context.clone(),
                    success: success.clone(),
                    request_success_count: result.request_success_count,
                    request_failure_count: result.request_failure_count,
                    request_error_count: result.request_error_count,
                    test_pass_count: result.test_pass_count,
                    test_fail_count: result.test_fail_count,
                }));
            }
            ApicizeRequestResultContent::Runs { runs } => {
                let child_exec_ctrs = self.append_request_result_runs(
                    &result.id,
                    context,
                    runs,
                    Some(exec_ctr),
                    &mut result_context,
                );
                if !child_exec_ctrs.is_empty() {
                    summary.child_exec_ctrs = Some(child_exec_ctrs);
                }
                summary.request_success_count = result.request_success_count;
                summary.request_failure_count = result.request_failure_count;
                summary.request_error_count = result.request_error_count;
                detail = ExecutionResultDetail::Grouped(Box::new(ExecutionResultDetailGroup {
                    exec_ctr,
                    group_id: identifiers.id.clone(),
                    name: identifiers.title.clone(),
                    key: identifiers.key.clone(),
                    tag: identifiers.tag.clone(),
                    row_number: None,
                    run_number: None,
                    executed_at: result.executed_at,
                    duration: result.duration,
                    data_context: result.data_context.clone(),
                    success: success.clone(),
                    request_success_count: result.request_success_count,
                    request_failure_count: result.request_failure_count,
                    request_error_count: result.request_error_count,
                    test_pass_count: result.test_pass_count,
                    test_fail_count: result.test_fail_count,
                }));
            }
            ApicizeRequestResultContent::Execution { execution } => {
                let (status, status_text, has_response_headers, response_body_length) =
                    get_response_info(&execution);

                summary.method = execution.method.clone();
                summary.url = execution.url.clone();
                summary.status = status;
                summary.status_text = status_text;
                summary.has_response_headers = has_response_headers;
                summary.response_body_length = response_body_length;
                summary.error = execution.error.clone();
                summary.test_results = execution.tests.clone();
                summary.request_success_count = result.request_success_count;
                summary.request_failure_count = result.request_failure_count;
                summary.request_error_count = result.request_error_count;

                detail = ExecutionResultDetail::Request(Box::new(ExecutionResultDetailRequest {
                    exec_ctr,
                    request_id: identifiers.id.to_string(),
                    name: identifiers.title.clone(),
                    method: execution.method.clone(),
                    url: execution.url.clone(),
                    key: identifiers.key.clone(),
                    tag: identifiers.tag.clone(),
                    row_number: None,
                    run_number: None,
                    executed_at: result.executed_at,
                    duration: result.duration,
                    test_context: execution.test_context,
                    output_variables: execution.output_variables,
                    tests: execution.tests,
                    error: execution.error,
                    success,
                    request_success_count: result.request_success_count,
                    request_failure_count: result.request_failure_count,
                    request_error_count: result.request_error_count,
                    test_pass_count: result.test_pass_count,
                    test_fail_count: result.test_fail_count,
                }));
            }
        }

        self.results.insert(exec_ctr, (summary, detail));
        exec_ctr
    }

    fn append_group_result(
        &mut self,
        context: &TestRunnerContext,
        result: ApicizeGroupResult,
        level: usize,
        parent_exec_ctr: Option<usize>,
        active_request_ids: &IndexSet<String>,
        updated_request_ids: &mut IndexSet<String>,
    ) -> usize {
        let success = success_from_tallies(&result);

        let group_id = result.get_id();
        let executing_request_or_group_id = context.get_executing_request_or_group_id();
        let exec_ctr = self.next_counter();

        let mut active_request_ids = active_request_ids.clone();
        active_request_ids.insert(group_id.to_string());
        for active_request_id in &active_request_ids {
            self.add_index_entries(active_request_id, executing_request_or_group_id, exec_ctr);
        }

        // Track that this result's request was updated
        updated_request_ids.insert(group_id.to_string());

        let key = context.get_request_key(group_id).unwrap_or_default();
        let identifiers = EntryIdentifiers {
            id: group_id.to_string(),
            title: result.get_title(),
            key,
            tag: result.tag,
            parent_exec_ctr: exec_ctr,
        };

        let mut result_context = ResultContext {
            level: level + 1,
            active_request_ids: &active_request_ids,
            identifiers: &identifiers,
            updated_request_ids,
        };

        self.results.insert(
            exec_ctr,
            (
                ExecutionResultSummary {
                    request_or_group_id: identifiers.id.clone(),
                    exec_ctr,
                    parent_exec_ctr,
                    child_exec_ctrs: Some(vec![]),
                    level,
                    name: identifiers.title.clone(),
                    tag: identifiers.tag.clone(),
                    key: identifiers.key.clone(),
                    method: None,
                    url: None,
                    executed_at: result.executed_at,
                    duration: result.duration,
                    status: None,
                    status_text: None,
                    has_response_headers: false,
                    response_body_length: None,
                    success: success.clone(),
                    error: None,
                    request_success_count: result.request_success_count,
                    request_failure_count: result.request_failure_count,
                    request_error_count: result.request_error_count,
                    test_results: None,
                    run_number: None,
                    run_count: None,
                    row_number: None,
                    row_count: None,
                },
                ExecutionResultDetail::Grouped(Box::new(ExecutionResultDetailGroup {
                    group_id: identifiers.id.clone(),
                    exec_ctr,
                    name: identifiers.title.clone(),
                    key: identifiers.key.clone(),
                    tag: identifiers.tag.clone(),
                    row_number: None,
                    run_number: None,
                    executed_at: result.executed_at,
                    duration: result.duration,
                    data_context: result.data_context.clone(),
                    success: success.clone(),
                    request_success_count: result.request_success_count,
                    request_failure_count: result.request_failure_count,
                    request_error_count: result.request_error_count,
                    test_pass_count: result.test_pass_count,
                    test_fail_count: result.test_fail_count,
                })),
            ),
        );

        let child_exec_ctrs = match result.content {
            ApicizeGroupResultContent::Rows { rows } => {
                self.append_group_result_rows(&result.id, context, rows, &mut result_context)
            }
            ApicizeGroupResultContent::Runs { runs } => {
                self.append_group_result_runs(&result.id, context, runs, &mut result_context)
            }
            ApicizeGroupResultContent::Results { results } => results
                .into_iter()
                .map(|result| {
                    self.append_result(
                        context,
                        result,
                        level + 1,
                        &active_request_ids,
                        Some(exec_ctr),
                        result_context.updated_request_ids,
                    )
                })
                .collect(),
        };

        if !child_exec_ctrs.is_empty() {
            self.results.get_mut(&exec_ctr).unwrap().0.child_exec_ctrs = Some(child_exec_ctrs);
        }

        exec_ctr
    }

    fn append_request_result_rows(
        &mut self,
        request_or_group_id: &str,
        context: &TestRunnerContext,
        rows: Vec<ApicizeRequestResultRow>,
        result_context: &mut ResultContext,
    ) -> Vec<usize> {
        let level = result_context.level;
        let active_request_ids = result_context.active_request_ids;
        let identifiers = result_context.identifiers;
        let mut row_number = 1;
        let row_count = rows.len();
        let mut indexes = Vec::<usize>::with_capacity(row_count);

        let mut active_request_ids = active_request_ids.clone();
        active_request_ids.insert(request_or_group_id.to_string());

        for row in rows {
            let success = success_from_tallies(&row);
            let index = self.next_counter();
            let name = format!(
                "{} (Row {} of {})",
                identifiers.title, row_number, row_count,
            );

            match row.results {
                ApicizeRequestResultRowContent::Runs(runs) => {
                    let exec_ctr = self.next_counter();

                    for active_request_id in &active_request_ids {
                        self.add_index_entries(
                            active_request_id,
                            context.get_executing_request_or_group_id(),
                            exec_ctr,
                        );
                    }

                    self.results.insert(
                        exec_ctr,
                        (
                            ExecutionResultSummary {
                                exec_ctr,
                                request_or_group_id: identifiers.id.clone(),
                                parent_exec_ctr: Some(identifiers.parent_exec_ctr),
                                child_exec_ctrs: Some(vec![]),
                                level,
                                name: name.clone(),
                                method: None,
                                url: None,
                                key: identifiers.key.clone(),
                                tag: identifiers.tag.clone(),
                                executed_at: row.executed_at,
                                duration: row.duration,
                                status: None,
                                status_text: None,
                                has_response_headers: false,
                                response_body_length: None,
                                success: success.clone(),
                                error: None,
                                request_success_count: row.request_success_count,
                                request_failure_count: row.request_failure_count,
                                request_error_count: row.request_error_count,
                                test_results: None,
                                run_number: None,
                                run_count: None,
                                row_number: Some(row_number),
                                row_count: Some(row_count),
                            },
                            ExecutionResultDetail::Grouped(Box::new(ExecutionResultDetailGroup {
                                exec_ctr,
                                group_id: identifiers.id.clone(),
                                name,
                                key: identifiers.key.clone(),
                                tag: identifiers.tag.clone(),
                                row_number: Some(row_number),
                                run_number: None,
                                executed_at: row.executed_at,
                                duration: row.duration,
                                data_context: row.data_context,
                                success,
                                request_success_count: row.request_success_count,
                                request_failure_count: row.request_failure_count,
                                request_error_count: row.request_error_count,
                                test_pass_count: row.test_pass_count,
                                test_fail_count: row.test_fail_count,
                            })),
                        ),
                    );

                    let mut nested_context = ResultContext {
                        level: level + 1,
                        active_request_ids: &active_request_ids,
                        identifiers,
                        updated_request_ids: result_context.updated_request_ids,
                    };
                    let child_indexes = self.append_request_result_runs(
                        request_or_group_id,
                        context,
                        runs,
                        Some(index),
                        &mut nested_context,
                    );

                    if !child_indexes.is_empty() {
                        self.results.get_mut(&index).unwrap().0.child_exec_ctrs =
                            Some(child_indexes);
                    }
                }
                ApicizeRequestResultRowContent::Execution(execution) => {
                    let (status, status_text, has_response_headers, response_body_length) =
                        get_response_info(&execution);

                    let exec_ctr = self.next_counter();
                    for active_request_id in &active_request_ids {
                        self.add_index_entries(
                            active_request_id,
                            context.get_executing_request_or_group_id(),
                            exec_ctr,
                        );
                    }
                    self.results.insert(
                        exec_ctr,
                        (
                            ExecutionResultSummary {
                                exec_ctr,
                                request_or_group_id: identifiers.id.to_string(),
                                parent_exec_ctr: Some(identifiers.parent_exec_ctr),
                                child_exec_ctrs: None,
                                level,
                                name: name.clone(),
                                key: identifiers.key.clone(),
                                tag: identifiers.tag.clone(),
                                method: execution.method.clone(),
                                url: execution.url.clone(),
                                executed_at: row.executed_at,
                                duration: row.duration,
                                status,
                                status_text,
                                has_response_headers,
                                response_body_length,
                                success: success.clone(),
                                error: execution.error.clone(),
                                request_success_count: row.request_success_count,
                                request_failure_count: row.request_failure_count,
                                request_error_count: row.request_error_count,
                                test_results: execution.tests.clone(),
                                run_number: None,
                                run_count: None,
                                row_number: Some(row_number),
                                row_count: Some(row_count),
                            },
                            ExecutionResultDetail::Request(Box::new(
                                ExecutionResultDetailRequest {
                                    exec_ctr,
                                    request_id: identifiers.id.to_string(),
                                    name,
                                    key: identifiers.key.clone(),
                                    tag: identifiers.tag.clone(),
                                    method: execution.method.clone(),
                                    url: execution.url.clone(),
                                    row_number: Some(row_number),
                                    run_number: None,
                                    executed_at: row.executed_at,
                                    duration: row.duration,
                                    test_context: execution.test_context,
                                    output_variables: execution.output_variables,
                                    tests: execution.tests,
                                    error: execution.error,
                                    success,
                                    request_success_count: row.request_success_count,
                                    request_failure_count: row.request_failure_count,
                                    request_error_count: row.request_error_count,
                                    test_pass_count: row.test_pass_count,
                                    test_fail_count: row.test_fail_count,
                                },
                            )),
                        ),
                    );
                }
            }

            indexes.push(index);

            row_number += 1;
        }

        indexes
    }

    /// Get execution summaries, grouped by executing request
    pub fn get_summaries(
        &self,
        request_or_group_id: &str,
        include_all_results: bool,
    ) -> IndexMap<String, Vec<&ExecutionResultSummary>> {
        if let Some(request_results) = self.executing_request_index.get(request_or_group_id) {
            request_results
                .into_iter()
                .filter(|(executing_request_id, _)| {
                    include_all_results || *executing_request_id == request_or_group_id
                })
                .map(|(executing_request_id, exec_ctrs)| {
                    (
                        executing_request_id.to_string(),
                        exec_ctrs // exec_ctr_list
                            .iter()
                            .filter_map(|exec_ctr| self.results.get(exec_ctr))
                            .map(|x| &x.0)
                            .collect(),
                    )
                })
                .collect::<IndexMap<String, Vec<&ExecutionResultSummary>>>()
        } else {
            IndexMap::default()
        }
    }

    /// Helper function to collect child summaries
    fn collect_summaries(
        &self,
        exec_ctr: &usize,
        results: &mut IndexMap<usize, ExecutionResultSummary>,
    ) {
        if let Some((summary, ..)) = self.results.get(exec_ctr) {
            results.insert(summary.exec_ctr, summary.clone());
            if let Some(child_exec_ctrs) = &summary.child_exec_ctrs {
                for child_exec_ctr in child_exec_ctrs {
                    if !results.contains_key(child_exec_ctr) {
                        self.collect_summaries(child_exec_ctr, results);
                    }
                }
            }
        }
    }

    /// Get execution summaries, grouped by executing request
    pub fn get_result_summaries(
        &self,
        exec_ctr: &usize,
    ) -> IndexMap<usize, ExecutionResultSummary> {
        let mut summaries = IndexMap::<usize, ExecutionResultSummary>::new();
        self.collect_summaries(exec_ctr, &mut summaries);
        summaries
    }

    /// Get execution details
    pub fn get_detail(&self, exec_ctr: &usize) -> Result<&ExecutionResultDetail, ApicizeError> {
        match self.results.get(exec_ctr) {
            Some((_, detail)) => Ok(detail),
            None => Err(ApicizeError::InvalidId {
                description: format!("Invalid execution result counter {exec_ctr}"),
            }),
        }
    }

    /// Get execution result summary and detail
    pub fn get_result(
        &self,
        exec_ctr: &usize,
    ) -> Result<(&ExecutionResultSummary, &ExecutionResultDetail), ApicizeError> {
        match self.results.get(exec_ctr) {
            Some((summary, detail)) => Ok((summary, detail)),
            None => Err(ApicizeError::InvalidId {
                description: format!("Invalid execution result counter {exec_ctr}"),
            }),
        }
    }

    /// Delete out any stored request index entries for the specified request/group
    pub fn delete_indexed_request_results(&mut self, executing_request_or_group_id: &str) {
        // Remove all results for which the specified request executed them
        for request_executions in self.executing_request_index.values_mut() {
            request_executions.shift_remove(executing_request_or_group_id);
        }
        // let mut executions_to_clear: IndexSet<usize> = IndexSet::new();

        // // Remove all results for which the specified request executed them
        // for request_executions in self.executing_request_index.values_mut() {
        //     if request_executions.contains_key(executing_request_or_group_id) {
        //         // If there are results for request children, then remove those executions as well
        //         executions_to_clear.extend(
        //             request_executions
        //                 .get(executing_request_or_group_id)
        //                 .unwrap(),
        //         );
        //         request_executions.shift_remove(executing_request_or_group_id);
        //     }
        // }

        // for parent_requests in self.associated_parent_request_index.values_mut() {
        //     parent_requests.remove(executing_request_or_group_id);
        // }

        // // Delete any stored executions identified as being associated with the request/group
        // if !executions_to_clear.is_empty() {
        //     self.results
        //         .retain(|id, _| !executions_to_clear.contains(id));
        // }
    }

    /// Add request index entry, storing which request the execution was returned from
    fn add_index_entries(
        &mut self,
        request_or_group_id: &str,
        executing_request_or_group_id: &str,
        exec_ctr: usize,
    ) {
        if let Some(existing_request) = self.executing_request_index.get_mut(request_or_group_id) {
            if let Some(executing_request) = existing_request.get_mut(executing_request_or_group_id)
            {
                executing_request.push(exec_ctr);
            } else {
                let insert_at = if let Some((first, _)) = existing_request.first() {
                    if first == request_or_group_id && request_or_group_id != executing_request_or_group_id {
                        1
                    } else {
                        0
                    }
                } else {
                    0
                };

                existing_request.shift_insert(
                    insert_at,
                    executing_request_or_group_id.to_string(),
                    vec![exec_ctr],
                );
            }
        } else {
            self.executing_request_index.insert(
                request_or_group_id.to_string(),
                IndexMap::from([(executing_request_or_group_id.to_string(), vec![exec_ctr])]),
            );
        }
    }

    fn append_request_result_runs(
        &mut self,
        request_or_group_id: &str,
        context: &TestRunnerContext,
        runs: Vec<ApicizeRequestResultRun>,
        parent_exec_ctr: Option<usize>,
        result_context: &mut ResultContext,
    ) -> Vec<usize> {
        let level = result_context.level;
        let active_request_ids = result_context.active_request_ids;
        let identifiers = result_context.identifiers;
        let mut run_number = 1;
        let run_count = runs.len();
        let mut exec_ctrs = Vec::<usize>::with_capacity(run_count);

        let mut active_request_ids = active_request_ids.clone();
        active_request_ids.insert(request_or_group_id.to_string());

        for run in runs {
            let success = success_from_tallies(&run);
            let name = format!(
                "{} (Run {} of {})",
                identifiers.title, run_number, run_count,
            );

            let (status, status_text, has_response_headers, response_body_length) =
                get_response_info(&run.execution);

            let exec_ctr = self.next_counter();

            for active_request_id in &active_request_ids {
                self.add_index_entries(
                    active_request_id,
                    context.get_executing_request_or_group_id(),
                    exec_ctr,
                );
            }

            self.results.insert(
                exec_ctr,
                (
                    ExecutionResultSummary {
                        exec_ctr,
                        request_or_group_id: identifiers.id.to_string(),
                        parent_exec_ctr,
                        child_exec_ctrs: None,
                        level,
                        name: name.clone(),
                        key: identifiers.key.clone(),
                        tag: identifiers.tag.clone(),
                        method: run.execution.method.clone(),
                        url: run.execution.url.clone(),
                        executed_at: run.executed_at,
                        duration: run.duration,
                        status,
                        status_text,
                        has_response_headers,
                        response_body_length,
                        success: success.clone(),
                        error: run.execution.error.clone(),
                        request_success_count: run.request_success_count,
                        request_failure_count: run.request_failure_count,
                        request_error_count: run.request_error_count,
                        test_results: run.execution.tests.clone(),
                        run_number: Some(run_number),
                        run_count: Some(run_count),
                        row_number: None,
                        row_count: None,
                    },
                    ExecutionResultDetail::Request(Box::new(ExecutionResultDetailRequest {
                        exec_ctr,
                        request_id: identifiers.id.to_string(),
                        name,
                        key: identifiers.key.clone(),
                        tag: identifiers.tag.clone(),
                        method: run.execution.method.clone(),
                        url: run.execution.url.clone(),
                        row_number: None,
                        run_number: Some(run_number),
                        executed_at: run.executed_at,
                        duration: run.duration,
                        test_context: run.execution.test_context,
                        output_variables: run.execution.output_variables,
                        tests: run.execution.tests,
                        error: run.execution.error,
                        success,
                        request_success_count: run.request_success_count,
                        request_failure_count: run.request_failure_count,
                        request_error_count: run.request_error_count,
                        test_pass_count: run.test_pass_count,
                        test_fail_count: run.test_fail_count,
                    })),
                ),
            );

            exec_ctrs.push(exec_ctr);
            run_number += 1;
        }

        exec_ctrs
    }

    fn append_group_result_rows(
        &mut self,
        request_or_group_id: &str,
        context: &TestRunnerContext,
        rows: Vec<ApicizeGroupResultRow>,
        result_context: &mut ResultContext,
    ) -> Vec<usize> {
        let level = result_context.level;
        let active_request_ids = result_context.active_request_ids;
        let identifiers = result_context.identifiers;
        let mut row_number = 1;
        let row_count = rows.len();
        let mut indexes = Vec::<usize>::with_capacity(row_count);

        let mut active_request_ids = active_request_ids.clone();
        active_request_ids.insert(request_or_group_id.to_string());

        for row in rows {
            let success = success_from_tallies(&row);
            let name = format!(
                "{} (Row {} of {})",
                identifiers.title, row_number, row_count,
            );

            let exec_ctr = self.next_counter();
            for active_request_id in &active_request_ids {
                self.add_index_entries(
                    active_request_id,
                    context.get_executing_request_or_group_id(),
                    exec_ctr,
                );
            }
            self.results.insert(
                exec_ctr,
                (
                    ExecutionResultSummary {
                        exec_ctr,
                        request_or_group_id: identifiers.id.clone(),
                        parent_exec_ctr: Some(identifiers.parent_exec_ctr),
                        child_exec_ctrs: None,
                        level,
                        name: name.clone(),
                        key: identifiers.key.clone(),
                        tag: identifiers.tag.clone(),
                        method: None,
                        url: None,
                        executed_at: row.executed_at,
                        duration: row.duration,
                        status: None,
                        status_text: None,
                        has_response_headers: false,
                        response_body_length: None,
                        success: success.clone(),
                        error: None,
                        request_success_count: row.request_success_count,
                        request_failure_count: row.request_failure_count,
                        request_error_count: row.request_error_count,
                        test_results: None,
                        run_number: None,
                        run_count: None,
                        row_number: Some(row_number),
                        row_count: Some(row_count),
                    },
                    ExecutionResultDetail::Grouped(Box::new(ExecutionResultDetailGroup {
                        exec_ctr,
                        group_id: identifiers.id.clone(),
                        name,
                        key: identifiers.key.clone(),
                        tag: identifiers.tag.clone(),
                        row_number: None,
                        run_number: Some(row_number),
                        executed_at: row.executed_at,
                        duration: row.duration,
                        data_context: row.data_context.clone(),
                        success,
                        request_success_count: row.request_success_count,
                        request_failure_count: row.request_failure_count,
                        request_error_count: row.request_error_count,
                        test_pass_count: row.test_pass_count,
                        test_fail_count: row.test_fail_count,
                    })),
                ),
            );

            let mut child_exec_ctrs: Vec<usize>;
            match row.content {
                ApicizeGroupResultRowContent::Runs { runs } => {
                    let mut nested_context = ResultContext {
                        level: level + 1,
                        active_request_ids: &active_request_ids,
                        identifiers,
                        updated_request_ids: result_context.updated_request_ids,
                    };
                    child_exec_ctrs = self.append_group_result_runs(
                        request_or_group_id,
                        context,
                        runs,
                        &mut nested_context,
                    );
                }
                ApicizeGroupResultRowContent::Results { results } => {
                    child_exec_ctrs = vec![];
                    for result in results {
                        child_exec_ctrs.push(self.append_result(
                            context,
                            result,
                            level + 1,
                            &active_request_ids,
                            Some(exec_ctr),
                            result_context.updated_request_ids,
                        ));
                    }
                }
            }

            if !child_exec_ctrs.is_empty() {
                self.results.get_mut(&exec_ctr).unwrap().0.child_exec_ctrs = Some(child_exec_ctrs);
            }

            indexes.push(exec_ctr);

            row_number += 1;
        }

        indexes
    }

    fn append_group_result_runs(
        &mut self,
        request_or_group_id: &str,
        context: &TestRunnerContext,
        runs: Vec<ApicizeGroupResultRun>,
        result_context: &mut ResultContext,
    ) -> Vec<usize> {
        let level = result_context.level;
        let active_request_ids = result_context.active_request_ids;
        let identifiers = result_context.identifiers;
        let mut run_number = 1;
        let run_count = runs.len();
        let mut child_exec_ctrs = Vec::<usize>::with_capacity(run_count);

        let mut active_request_ids = active_request_ids.clone();
        active_request_ids.insert(request_or_group_id.to_string());

        for run in runs {
            let success = success_from_tallies(&run);
            let name = format!(
                "{} (Run {} of {})",
                identifiers.title, run_number, run_count
            );

            let exec_ctr = self.next_counter();

            for active_request_id in &active_request_ids {
                self.add_index_entries(
                    active_request_id,
                    context.get_executing_request_or_group_id(),
                    exec_ctr,
                );
            }
            self.results.insert(
                exec_ctr,
                (
                    ExecutionResultSummary {
                        exec_ctr,
                        request_or_group_id: identifiers.id.to_string(),
                        parent_exec_ctr: Some(identifiers.parent_exec_ctr),
                        child_exec_ctrs: None,
                        level,
                        name: name.clone(),
                        key: identifiers.key.clone(),
                        tag: identifiers.tag.clone(),
                        method: None,
                        url: None,
                        executed_at: run.executed_at,
                        duration: run.duration,
                        status: None,
                        status_text: None,
                        has_response_headers: false,
                        response_body_length: None,
                        success: success.clone(),
                        error: None,
                        request_success_count: run.request_success_count,
                        request_failure_count: run.request_failure_count,
                        request_error_count: run.request_error_count,
                        test_results: None,
                        run_number: Some(run_number),
                        run_count: Some(run_count),
                        row_number: None,
                        row_count: None,
                    },
                    ExecutionResultDetail::Grouped(Box::new(ExecutionResultDetailGroup {
                        exec_ctr,
                        group_id: identifiers.id.to_string(),
                        name,
                        key: identifiers.key.clone(),
                        tag: identifiers.tag.clone(),
                        row_number: None,
                        run_number: Some(run_number),
                        executed_at: run.executed_at,
                        duration: run.duration,
                        data_context: run.data_context,
                        success,
                        request_success_count: run.request_success_count,
                        request_failure_count: run.request_failure_count,
                        request_error_count: run.request_error_count,
                        test_pass_count: run.test_pass_count,
                        test_fail_count: run.test_fail_count,
                    })),
                ),
            );

            let child_indexes = run
                .results
                .into_iter()
                .map(|result| {
                    self.append_result(
                        context,
                        result,
                        level + 1,
                        &active_request_ids,
                        Some(exec_ctr),
                        result_context.updated_request_ids,
                    )
                })
                .collect::<Vec<usize>>();

            if !child_indexes.is_empty() {
                self.results.get_mut(&exec_ctr).unwrap().0.child_exec_ctrs = Some(child_indexes);
            }

            child_exec_ctrs.push(exec_ctr);

            run_number += 1;
        }

        child_exec_ctrs
    }

    /// Return next incremented counter
    fn next_counter(&mut self) -> usize {
        self.exec_ctr = self.exec_ctr.wrapping_add(1);
        self.exec_ctr
    }
}

fn success_from_tallies(tally: &dyn Tally) -> ExecutionResultSuccess {
    let tallies = tally.get_tallies();
    if tallies.request_error_count > 0 {
        ExecutionResultSuccess::Error
    } else if tallies.test_fail_count > 0 || tallies.request_failure_count > 0 {
        ExecutionResultSuccess::Failure
    } else {
        ExecutionResultSuccess::Success
    }
}

fn get_response_info(
    execution: &ApicizeExecution,
) -> (Option<u16>, Option<String>, bool, Option<usize>) {
    match &execution.test_context.response {
        Some(response) => {
            let response_body_length = match &response.body {
                Some(body) => match body {
                    ApicizeBody::Text { text } => text.len(),
                    ApicizeBody::JSON { text, .. } => text.len(),
                    ApicizeBody::XML { text, .. } => text.len(),
                    ApicizeBody::Form { text, .. } => text.len(),
                    ApicizeBody::Binary { data } => data.len(),
                },
                None => 0,
            };
            (
                Some(response.status),
                Some(response.status_text.clone()),
                response.headers.is_some(),
                Some(response_body_length),
            )
        }
        None => (None, None, false, None),
    }
}

/*
#[cfg(test)]
mod tests {
    use super::*;

    fn create_simple_result(
        _id: &str,
        request_error_count: usize,
        test_fail_count: usize,
    ) -> impl Tally {
        SimpleTally {
            success: request_error_count == 0 && test_fail_count == 0,
            request_success_count: if request_error_count == 0 && test_fail_count == 0 {
                1
            } else {
                0
            },
            request_failure_count: if test_fail_count > 0 && request_error_count == 0 {
                1
            } else {
                0
            },
            request_error_count,
            test_pass_count: 0,
            test_fail_count,
        }
    }

    struct SimpleTally {
        success: bool,
        request_success_count: usize,
        request_failure_count: usize,
        request_error_count: usize,
        test_pass_count: usize,
        test_fail_count: usize,
    }

    impl Tally for SimpleTally {
        fn get_tallies(&self) -> crate::Tallies {
            crate::Tallies {
                success: self.success,
                request_success_count: self.request_success_count,
                request_failure_count: self.request_failure_count,
                request_error_count: self.request_error_count,
                test_pass_count: self.test_pass_count,
                test_fail_count: self.test_fail_count,
            }
        }
    }

    #[test]
    fn test_next_counter_increments() {
        let mut builder = ExecutionResultBuilder::default();
        assert_eq!(builder.next_counter(), 1);
        assert_eq!(builder.next_counter(), 2);
        assert_eq!(builder.next_counter(), 3);
    }

    #[test]
    fn test_add_index_request_result_creates_new_entry() {
        let mut builder = ExecutionResultBuilder::default();
        builder.add_index_request_result("req1", "req1", 1);

        assert!(builder.index_request_results.contains_key("req1"));
        let entries = builder.index_request_results.get("req1").unwrap();
        assert_eq!(entries.get("req1").unwrap(), &vec![1]);
    }

    #[test]
    fn test_add_index_request_result_appends_to_existing() {
        let mut builder = ExecutionResultBuilder::default();
        builder.add_index_request_result("req1", "req1", 1);
        builder.add_index_request_result("req1", "req1", 2);

        let entries = builder.index_request_results.get("req1").unwrap();
        assert_eq!(entries.get("req1").unwrap(), &vec![1, 2]);
    }

    #[test]
    fn test_add_index_request_result_position_zero_for_new_parent() {
        let mut builder = ExecutionResultBuilder::default();
        builder.add_index_request_result("req1", "child1", 1);
        builder.add_index_request_result("req1", "child2", 2);

        let entries = builder.index_request_results.get("req1").unwrap();
        assert_eq!(entries.keys().next().unwrap(), "child2");
    }

    #[test]
    fn test_add_index_request_result_position_one_when_parent_matches() {
        let mut builder = ExecutionResultBuilder::default();
        builder.add_index_request_result("req1", "req1", 1);
        builder.add_index_request_result("req1", "child1", 2);

        let entries = builder.index_request_results.get("req1").unwrap();
        let keys: Vec<_> = entries.keys().collect();
        // When first entry is "req1", new entries are inserted at position 1 (after req1)
        assert_eq!(keys[0], "req1");
        assert_eq!(keys[1], "child1");
        assert_eq!(keys.len(), 2);
    }

    #[test]
    fn test_clear_indexed_request_results() {
        let mut builder = ExecutionResultBuilder::default();
        builder.add_index_request_result("req1", "req1", 1);
        builder.add_index_request_result("req1", "req1", 2);

        assert!(builder.index_request_results.contains_key("req1"));

        builder.clear_indexed_request_results("req1");
        let entries = builder.index_request_results.get("req1");
        assert!(entries.is_none() || entries.unwrap().is_empty());
    }

    #[test]
    fn test_success_from_tallies_error() {
        let result = create_simple_result("req1", 1, 0);
        assert_eq!(success_from_tallies(&result), ExecutionResultSuccess::Error);
    }

    #[test]
    fn test_success_from_tallies_failure() {
        let result = create_simple_result("req1", 0, 1);
        assert_eq!(
            success_from_tallies(&result),
            ExecutionResultSuccess::Failure
        );
    }

    #[test]
    fn test_success_from_tallies_success() {
        let result = create_simple_result("req1", 0, 0);
        assert_eq!(
            success_from_tallies(&result),
            ExecutionResultSuccess::Success
        );
    }
}
 */
