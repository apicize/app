//! Apicize test execution.
//!
//! This library supports dispatching Apicize functional web tests

use std::collections::HashMap;
use std::sync::{Arc, Once};
use std::time::{Duration, Instant};

use async_recursion::async_recursion;
use encoding_rs::{Encoding, UTF_8};
use mime::Mime;
use reqwest::{Body, Client};
use serde_json::Value;
use tokio::select;
use tokio::task::JoinSet;
use tokio_util::sync::CancellationToken;

use crate::apicize::{
    ApicizeBody, ApicizeExecution, ApicizeExecutionGroup, ApicizeExecutionGroupRun,
    ApicizeExecutionItem, ApicizeExecutionRequest, ApicizeExecutionRequestRun, ApicizeRequest,
    ApicizeTestResponse, ExecutionTotals, ExecutionTotalsSource,
};
use crate::oauth2_client_tokens::get_oauth2_client_credentials;
use crate::{apicize::ApicizeHttpResponse, WorkbookRequest};
use crate::{
    ExecutionError, WorkbookAuthorization, WorkbookCertificate, WorkbookExecution, WorkbookProxy,
    WorkbookRequestBody, WorkbookRequestEntry, WorkbookRequestMethod, Workspace,
};

static V8_INIT: Once = Once::new();

#[async_recursion]
async fn run_request_group(
    workspace: Arc<Workspace>,
    cancellation_token: CancellationToken,
    tests_started: Arc<Instant>,
    execution: WorkbookExecution,
    group_child_ids: Vec<String>,
    run_number: usize,
    mut variables: Arc<HashMap<String, Value>>,
) -> ApicizeExecutionGroupRun {
    let mut items: Vec<ApicizeExecutionItem> = vec![];
    let number_of_children = group_child_ids.len();
    let executed_at = tests_started.elapsed().as_millis();
    let start_instant = Instant::now();

    if execution == WorkbookExecution::Sequential || number_of_children < 2 {
        for child_id in group_child_ids {
            let child_result = run_request_item(
                workspace.clone(),
                cancellation_token.clone(),
                tests_started.clone(),
                &child_id,
                variables.clone(),
            )
            .await;

            if let Some(updated_variables) = child_result.get_variables() {
                variables = Arc::new(updated_variables.clone());
            }
            items.push(child_result);
        }
    } else {
        let mut child_items: JoinSet<Option<ApicizeExecutionItem>> = JoinSet::new();
        for id in group_child_ids {
            let cloned_token = cancellation_token.clone();
            let cloned_workspace = workspace.clone();
            let cloned_tests_started = tests_started.clone();
            let cloned_variables = variables.clone();
            child_items.spawn(async move {
                select! {
                    _ = cloned_token.cancelled() => None,
                    result =  run_request_item(
                        cloned_workspace,
                        cloned_token.clone(),
                        cloned_tests_started,
                        &id,
                        cloned_variables,
                    ) => {
                        Some(result)
                    }
                }
            });
        }

        while let Some(child_results) = child_items.join_next().await {
            if let Ok(child_result) = child_results {
                if let Some(result) = child_result {
                    items.push(result);
                }
            }
        }
    }

    let mut executed_run = ApicizeExecutionGroupRun {
        run_number,
        executed_at,
        duration: start_instant.elapsed().as_millis(),
        items: vec![], // placeholder
        variables: None,
        success: true,
        requests_with_passed_tests_count: 0,
        requests_with_failed_tests_count: 0,
        requests_with_errors: 0,
        passed_test_count: 0,
        failed_test_count: 0,
    };

    for item in &items {
        executed_run.add_totals(item);
        executed_run.variables = Option::clone(item.get_variables());
    }
    executed_run.items = items;
    return executed_run;
}

/// Run the specified request entry recursively.  We are marking everything
/// static since this is being launched in a spawn
#[async_recursion]
async fn run_request_item(
    workspace: Arc<Workspace>,
    cancellation_token: CancellationToken,
    tests_started: Arc<Instant>,
    request_id: &String,
    variables: Arc<HashMap<String, Value>>,
) -> ApicizeExecutionItem {
    let entity = workspace.requests.entities.get(request_id).unwrap();
    let params = workspace.retrieve_parameters(entity, &variables);
    let name = entity.get_name().as_str();

    let executed_at = tests_started.elapsed().as_millis();
    let start_instant = Instant::now();

    match entity {
        WorkbookRequestEntry::Info(request) => {
            let mut runs: Vec<ApicizeExecutionRequestRun> = vec![];

            // todo!("It would be nice not to clone these, but with recursion it may be necessary evil");
            let shared_entity = Arc::new(entity.clone());
            let shared_request = Arc::new(request.clone());
            let shared_variables = Arc::new(params.variables);

            if request.multi_run_execution == WorkbookExecution::Sequential || request.runs < 2 {
                for ctr in 0..request.runs {
                    let run = execute_request_run(
                        workspace.clone(),
                        tests_started.clone(),
                        ctr + 1,
                        shared_request.clone(),
                        shared_entity.clone(),
                        shared_variables.clone(),
                    )
                    .await;
                    runs.push(run);
                }
            } else {
                let mut child_runs: JoinSet<Option<ApicizeExecutionRequestRun>> = JoinSet::new();

                for ctr in 0..request.runs {
                    let cloned_cancellation_token = cancellation_token.clone();
                    let cloned_workspace = workspace.clone();
                    let cloned_test_started = tests_started.clone();
                    let cloned_request = shared_request.clone();
                    let cloned_entry = shared_entity.clone();
                    let cloned_variables = shared_variables.clone();
                    child_runs.spawn(async move {
                        select! {
                            _ = cloned_cancellation_token.cancelled() => None,
                            result =  execute_request_run(
                                cloned_workspace,
                                cloned_test_started,
                                ctr + 1,
                                cloned_request,
                                cloned_entry,
                                cloned_variables,
                            ) => {
                                Some(result)
                            }
                        }
                    });
                }

                let completed_runs = child_runs.join_all().await;
                for completed_run in completed_runs {
                    if let Some(run) = completed_run {
                        runs.push(run);
                    }
                }
            }

            let mut executed_request = ApicizeExecutionRequest {
                id: String::from(request_id),
                name: String::from(name),
                executed_at,
                duration: start_instant.elapsed().as_millis(),
                runs: vec![],
                variables: None,
                success: true,
                requests_with_passed_tests_count: 0,
                requests_with_failed_tests_count: 0,
                requests_with_errors: 0,
                passed_test_count: 0,
                failed_test_count: 0,
            };

            for run in &runs {
                executed_request.add_totals(run);
            }

            executed_request.runs = runs;

            ApicizeExecutionItem::Request(Box::new(executed_request))
        }
        WorkbookRequestEntry::Group(group) => {
            let group_child_ids = if let Some(child_ids) = &workspace.requests.child_ids {
                if let Some(group_child_ids) = child_ids.get(&group.id) {
                    group_child_ids.clone()
                } else {
                    vec![]
                }
            } else {
                vec![]
            };

            let mut runs: Vec<ApicizeExecutionGroupRun> = vec![];

            match group.multi_run_execution {
                WorkbookExecution::Sequential => {
                    for ctr in 0..group.runs {
                        runs.push(
                            run_request_group(
                                workspace.clone(),
                                cancellation_token.clone(),
                                tests_started.clone(),
                                group.execution.clone(),
                                group_child_ids.clone(),
                                ctr + 1,
                                variables.clone(),
                            )
                            .await,
                        )
                    }
                }
                WorkbookExecution::Concurrent => {
                    let mut executing_runs: JoinSet<Option<ApicizeExecutionGroupRun>> =
                        JoinSet::new();
                    for ctr in 0..group.runs {
                        let cloned_workspace = workspace.clone();
                        let cloned_token = cancellation_token.clone();
                        let cloned_tests_started = tests_started.clone();
                        let cloned_execution = group.execution.clone();
                        let cloned_group_child_ids = group_child_ids.clone();
                        let cloned_variables = variables.clone();

                        executing_runs.spawn(async move {
                            select! {
                                _ = cloned_token.cancelled() => None,
                                result = run_request_group(
                                    cloned_workspace,
                                    cloned_token.clone(),
                                    cloned_tests_started,
                                    cloned_execution,
                                    cloned_group_child_ids,
                                    ctr + 1,
                                    cloned_variables,
                                ) => {
                                    Some(result)
                                }
                            }
                        });
                    }
                    for completed_run in executing_runs.join_all().await {
                        if let Some(r) = completed_run {
                            runs.push(r);
                        }
                        runs.sort_by_key(|r| r.run_number);
                    }
                }
            }

            let mut executed_group = ApicizeExecutionGroup {
                id: String::from(request_id),
                name: String::from(name),
                executed_at,
                duration: start_instant.elapsed().as_millis(),
                runs: vec![],
                success: true,
                requests_with_passed_tests_count: 0,
                requests_with_failed_tests_count: 0,
                requests_with_errors: 0,
                passed_test_count: 0,
                failed_test_count: 0,
            };

            for run in &runs {
                executed_group.add_totals(run);
            }
            executed_group.runs = runs;

            ApicizeExecutionItem::Group(Box::new(executed_group))
        }
    }
}

/// Dispatch requests/groups in the specified workspace, optionally forcing the number of runs
pub async fn run(
    workspace: Arc<Workspace>,
    request_ids: Option<Vec<String>>,
    cancellation_token: Option<CancellationToken>,
    tests_started: Arc<Instant>,
) -> Result<ApicizeExecution, String> {
    // Ensure V8 is initialized
    V8_INIT.call_once(|| {
        let platform = v8::new_unprotected_default_platform(0, false).make_shared();
        v8::V8::initialize_platform(platform);
        v8::V8::initialize();
    });

    let cancellation = match cancellation_token {
        Some(t) => t,
        None => CancellationToken::new(),
    };

    let request_ids_to_execute = request_ids.unwrap_or(workspace.requests.top_level_ids.clone());

    let mut executing_items: JoinSet<Option<ApicizeExecutionItem>> = JoinSet::new();
    for request_id in request_ids_to_execute {
        let cloned_workspace = workspace.clone();
        let cloned_tests_started = tests_started.clone();
        let cloned_token = cancellation.clone();

        executing_items.spawn(async move {
            select! {
                _ = cloned_token.cancelled() => None,
                result = run_request_item(
                    cloned_workspace,
                    cloned_token.clone(),
                    cloned_tests_started,
                    &request_id,
                    Arc::new(HashMap::new()),
                ) => {
                    Some(result)
                }
            }
        });
    }

    let completed_items = executing_items.join_all().await;
    let items: Vec<ApicizeExecutionItem> = completed_items.into_iter().flatten().collect();

    let mut result = ApicizeExecution {
        duration: tests_started.elapsed().as_millis(),
        items: vec![],
        success: true,
        requests_with_passed_tests_count: 0,
        requests_with_failed_tests_count: 0,
        requests_with_errors: 0,
        passed_test_count: 0,
        failed_test_count: 0,
    };

    for item in &items {
        result.add_totals(item);
    }

    result.items = items;
    Ok(result)
}

/// Execute the specified request's tests
pub fn execute_request_test(
    request: &WorkbookRequest,
    response: &ApicizeHttpResponse,
    variables: &HashMap<String, Value>,
    tests_started: &Arc<Instant>,
) -> Result<Option<ApicizeTestResponse>, ExecutionError> {
    // Return empty test results if no test
    if request.test.is_none() {
        return Ok(None);
    }

    // Create a new Isolate and make it the current one.
    let isolate = &mut v8::Isolate::new(v8::CreateParams::default());

    // Create a stack-allocated handle scope.
    let scope = &mut v8::HandleScope::new(isolate);
    let context = v8::Context::new(scope, Default::default());
    let scope = &mut v8::ContextScope::new(scope, context);

    let mut init_code = String::new();
    init_code.push_str(include_str!("./static/framework.min.js"));
    init_code.push_str(include_str!("./static/routines.js"));

    // Compile the source code
    let v8_code = v8::String::new(scope, &init_code).unwrap();
    let script = v8::Script::compile(scope, v8_code, None).unwrap();
    script.run(scope).unwrap();

    let tc = &mut v8::TryCatch::new(scope);

    let cloned_tests_started = tests_started;

    let mut init_code = String::new();
    init_code.push_str(&format!(
        "runTestSuite({}, {}, {}, {}, () => {{{}}})",
        serde_json::to_string(request).unwrap(),
        serde_json::to_string(response).unwrap(),
        serde_json::to_string(variables).unwrap(),
        std::time::UNIX_EPOCH.elapsed().unwrap().as_millis()
            - cloned_tests_started.elapsed().as_millis()
            + 1,
        request.test.as_ref().unwrap()
    ));

    let v8_code = v8::String::new(tc, &init_code).unwrap();

    let Some(script) = v8::Script::compile(tc, v8_code, None) else {
        let message = tc.message().unwrap();
        let message = message.get(tc).to_rust_string_lossy(tc);
        return Err(ExecutionError::FailedTest(message));
    };

    let Some(value) = script.run(tc) else {
        let message = tc.message().unwrap();
        let message = message.get(tc).to_rust_string_lossy(tc);
        return Err(ExecutionError::FailedTest(message));
    };

    let result = value.to_string(tc);
    let s = result.unwrap().to_rust_string_lossy(tc);
    let test_response: ApicizeTestResponse = serde_json::from_str(&s).unwrap();

    Ok(Some(test_response))
}

/// Dispatch the specified request and execute its tests
pub async fn execute_request_run(
    workspace: Arc<Workspace>,
    tests_started: Arc<Instant>,
    run_number: usize,
    request: Arc<WorkbookRequest>,
    request_as_entry: Arc<WorkbookRequestEntry>,
    variables: Arc<HashMap<String, Value>>,
) -> ApicizeExecutionRequestRun {
    let shared_workspace = workspace.clone();
    let shared_test_started = tests_started.clone();

    let executed_at = shared_test_started.elapsed().as_millis();
    let start_instant = Instant::now();

    let params = shared_workspace.retrieve_parameters(&request_as_entry, &variables);

    let dispatch_response = dispatch_request(
        &request,
        &params.variables,
        params.authorization,
        params.certificate,
        params.proxy,
        params.auth_certificate,
        params.auth_proxy,
    )
    .await;

    match dispatch_response {
        Ok((packaged_request, response)) => {
            let test_result = execute_request_test(
                &request.clone(),
                &response,
                &variables,
                &shared_test_started,
            );
            match test_result {
                Ok(test_response) => {
                    let mut test_count = 0;
                    let mut failed_test_count = 0;
                    let result_variables: Option<HashMap<String, Value>>;
                    let test_results = match test_response {
                        Some(response) => {
                            result_variables = Some(response.variables.clone());
                            if let Some(test_results) = &response.results {
                                test_count = test_results.len();
                                failed_test_count +=
                                    test_results.iter().filter(|r| !r.success).count();
                            }
                            response.results
                        }
                        None => {
                            result_variables = None;
                            None
                        }
                    };

                    ApicizeExecutionRequestRun {
                        run_number,
                        executed_at,
                        duration: start_instant.elapsed().as_millis(),
                        request: Some(packaged_request.clone()),
                        response: Some(response.clone()),
                        success: test_count == 0 || failed_test_count == 0,
                        error: None,
                        tests: test_results,
                        variables: result_variables,
                        requests_with_passed_tests_count: if test_count == 0
                            && failed_test_count == 0
                        {
                            1
                        } else {
                            0
                        },
                        requests_with_failed_tests_count: if failed_test_count > 0 { 1 } else { 0 },
                        requests_with_errors: 0,
                        passed_test_count: test_count - failed_test_count,
                        failed_test_count,
                    }
                }
                Err(err) => ApicizeExecutionRequestRun {
                    run_number,
                    executed_at,
                    duration: start_instant.elapsed().as_millis(),
                    request: Some(packaged_request.clone()),
                    response: Some(response.clone()),
                    success: false,
                    error: Some(err.to_string()),
                    tests: None,
                    variables: None,
                    requests_with_passed_tests_count: 0,
                    requests_with_failed_tests_count: 0,
                    requests_with_errors: 1,
                    passed_test_count: 0,
                    failed_test_count: 0,
                },
            }
        }
        Err(err) => ApicizeExecutionRequestRun {
            run_number,
            executed_at,
            duration: start_instant.elapsed().as_millis(),
            request: None,
            response: None,
            success: false,
            error: Some(err.to_string()),
            tests: None,
            variables: None,
            requests_with_passed_tests_count: 0,
            requests_with_failed_tests_count: 0,
            requests_with_errors: 1,
            passed_test_count: 0,
            failed_test_count: 0,
        },
    }
}

/// Dispatch the specified request (via reqwest), returning either the repsonse or error
async fn dispatch_request(
    request: &WorkbookRequest,
    variables: &HashMap<String, Value>,
    // scenario: Option<&WorkbookScenario>,
    authorization: Option<&WorkbookAuthorization>,
    certificate: Option<&WorkbookCertificate>,
    proxy: Option<&WorkbookProxy>,
    auth_certificate: Option<&WorkbookCertificate>,
    auth_proxy: Option<&WorkbookProxy>,
) -> Result<(ApicizeRequest, ApicizeHttpResponse), ExecutionError> {
    let method = match request.method {
        Some(WorkbookRequestMethod::Get) => reqwest::Method::GET,
        Some(WorkbookRequestMethod::Post) => reqwest::Method::POST,
        Some(WorkbookRequestMethod::Put) => reqwest::Method::PUT,
        Some(WorkbookRequestMethod::Delete) => reqwest::Method::DELETE,
        Some(WorkbookRequestMethod::Head) => reqwest::Method::HEAD,
        Some(WorkbookRequestMethod::Options) => reqwest::Method::OPTIONS,
        None => reqwest::Method::GET,
        _ => panic!("Invalid method"),
    };

    let timeout: Duration;
    if let Some(t) = request.timeout {
        timeout = Duration::from_millis(t as u64);
    } else {
        timeout = Duration::from_secs(30);
    }

    // let keep_alive: bool;
    // if let Some(b) = request.keep_alive {
    //     keep_alive = b;
    // } else {
    //     keep_alive = true;
    // }

    let subs = &variables
        .iter()
        .map(|(name, value)| {
            let v = if let Some(s) = value.as_str() {
                String::from(s)
            } else {
                format!("{}", value)
            };

            // (pair.name.as_str(), pair.value.as_str())
            (format!("{{{{{}}}}}", name), v)
        })
        .collect();

    // Build the reqwest client and request
    let mut reqwest_builder = Client::builder()
        // .http2_keep_alive_while_idle(keep_alive)
        .timeout(timeout);

    // Add certificate to builder if configured
    if let Some(active_cert) = certificate {
        match active_cert.append_to_builder(reqwest_builder) {
            Ok(updated_builder) => reqwest_builder = updated_builder,
            Err(err) => return Err(err),
        }
    }

    // Add proxy to builder if configured
    if let Some(active_proxy) = proxy {
        match active_proxy.append_to_builder(reqwest_builder) {
            Ok(updated_builder) => reqwest_builder = updated_builder,
            Err(err) => return Err(ExecutionError::Reqwest(err)),
        }
    }

    let builder_result = reqwest_builder.build();
    match builder_result {
        Ok(client) => {
            let mut request_builder = client.request(
                method,
                WorkbookRequestEntry::clone_and_sub(request.url.as_str(), subs),
            );

            // Add headers, including authorization if applicable
            let mut headers = reqwest::header::HeaderMap::new();
            if let Some(h) = &request.headers {
                for nvp in h {
                    if nvp.disabled != Some(true) {
                        headers.insert(
                            reqwest::header::HeaderName::try_from(
                                WorkbookRequestEntry::clone_and_sub(&nvp.name, subs),
                            )
                            .unwrap(),
                            reqwest::header::HeaderValue::try_from(
                                WorkbookRequestEntry::clone_and_sub(&nvp.value, subs),
                            )
                            .unwrap(),
                        );
                    }
                }
            }

            let mut auth_token_cached: Option<bool> = None;
            match authorization {
                Some(WorkbookAuthorization::Basic {
                    username, password, ..
                }) => {
                    request_builder = request_builder.basic_auth(username, Some(password));
                }
                Some(WorkbookAuthorization::ApiKey { header, value, .. }) => {
                    headers.append(
                        reqwest::header::HeaderName::try_from(header).unwrap(),
                        reqwest::header::HeaderValue::try_from(value).unwrap(),
                    );
                }
                Some(WorkbookAuthorization::OAuth2Client {
                    id,
                    access_token_url,
                    client_id,
                    client_secret,
                    scope, // send_credentials_in_body: _,
                    ..
                }) => {
                    match get_oauth2_client_credentials(
                        id,
                        access_token_url,
                        client_id,
                        client_secret,
                        scope,
                        auth_certificate,
                        auth_proxy,
                    )
                    .await
                    {
                        Ok((token, cached)) => {
                            auth_token_cached = Some(cached);
                            request_builder = request_builder.bearer_auth(token);
                        }
                        Err(err) => return Err(err),
                    }
                }
                None => {}
            }

            if !headers.is_empty() {
                request_builder = request_builder.headers(headers);
            }

            // Add query string parameters, if applicable
            if let Some(q) = &request.query_string_params {
                let mut query: Vec<(String, String)> = vec![];
                for nvp in q {
                    if nvp.disabled != Some(true) {
                        query.push((
                            WorkbookRequestEntry::clone_and_sub(&nvp.name, subs),
                            WorkbookRequestEntry::clone_and_sub(&nvp.value, subs),
                        ));
                    }
                }
                request_builder = request_builder.query(&query);
            }

            // Add body, if applicable
            match &request.body {
                Some(WorkbookRequestBody::Text { data }) => {
                    let s = WorkbookRequestEntry::clone_and_sub(data, subs);
                    request_builder = request_builder.body(Body::from(s.clone()));
                }
                Some(WorkbookRequestBody::JSON { data }) => {
                    let s = WorkbookRequestEntry::clone_and_sub(
                        serde_json::to_string(&data).unwrap().as_str(),
                        subs,
                    );
                    request_builder = request_builder.body(Body::from(s.clone()));
                }
                Some(WorkbookRequestBody::XML { data }) => {
                    let s = WorkbookRequestEntry::clone_and_sub(data, subs);
                    request_builder = request_builder.body(Body::from(s.clone()));
                }
                Some(WorkbookRequestBody::Form { data }) => {
                    let form_data = data
                        .iter()
                        .map(|pair| {
                            (
                                String::from(pair.name.as_str()),
                                String::from(pair.value.as_str()),
                            )
                        })
                        .collect::<HashMap<String, String>>();
                    request_builder = request_builder.form(&form_data);
                }
                Some(WorkbookRequestBody::Raw { data }) => {
                    request_builder = request_builder.body(Body::from(data.clone()));
                }
                None => {}
            }

            let mut web_request = request_builder.build()?;

            // Copy value generated for the request so that we can include in the function results
            let request_url = web_request.url().to_string();
            let request_headers = web_request
                .headers()
                .iter()
                .map(|(h, v)| {
                    (
                        String::from(h.as_str()),
                        String::from(v.to_str().unwrap_or("(Header Contains Non-ASCII Data)")),
                    )
                })
                .collect::<HashMap<String, String>>();
            let ref_body = web_request.body_mut();
            let request_body = match ref_body {
                Some(data) => {
                    let bytes = data.as_bytes().unwrap();
                    if bytes.is_empty() {
                        None
                    } else {
                        let request_encoding = UTF_8;

                        let data = bytes.to_vec();
                        let (decoded, _, malformed) = request_encoding.decode(&data);
                        Some(ApicizeBody {
                            data: Some(data.clone()),
                            text: if malformed {
                                None
                            } else {
                                Some(decoded.to_string())
                            },
                        })
                    }
                }
                None => None,
            };

            // Execute the request
            let client_response = client.execute(web_request).await;
            match client_response {
                Err(error) => Err(ExecutionError::Reqwest(error)),
                Ok(response) => {
                    // Collect headers for response
                    let response_headers = response.headers();
                    let headers = if response_headers.is_empty() {
                        None
                    } else {
                        Some(HashMap::from_iter(
                            response_headers
                                .iter()
                                .map(|(h, v)| {
                                    (
                                        String::from(h.as_str()),
                                        String::from(
                                            v.to_str()
                                                .unwrap_or("(Header Contains Non-ASCII Data)"),
                                        ),
                                    )
                                })
                                .collect::<HashMap<String, String>>(),
                        ))
                    };

                    // Determine the default text encoding
                    let response_content_type = response_headers
                        .get(reqwest::header::CONTENT_TYPE)
                        .and_then(|value| value.to_str().ok())
                        .and_then(|value| value.parse::<Mime>().ok());

                    let response_encoding_name = response_content_type
                        .as_ref()
                        .and_then(|mime| mime.get_param("charset").map(|charset| charset.as_str()))
                        .unwrap_or("utf-8");

                    let response_encoding =
                        Encoding::for_label(response_encoding_name.as_bytes()).unwrap_or(UTF_8);

                    // Collect status for response
                    let status = response.status();
                    let status_text = String::from(status.canonical_reason().unwrap_or("Unknown"));

                    // Retrieve response bytes and convert raw data to string
                    let bytes = response.bytes().await?;

                    let response_body = if bytes.is_empty() {
                        None
                    } else {
                        let data = Vec::from(bytes.as_ref());
                        let (decoded, _, malformed) = response_encoding.decode(&data);
                        Some(ApicizeBody {
                            data: Some(data.clone()),
                            text: if malformed {
                                None
                            } else {
                                Some(decoded.to_string())
                            },
                        })
                    };

                    let response = (
                        ApicizeRequest {
                            url: request_url,
                            method: request.method.as_ref().unwrap().as_str().to_string(),
                            headers: request_headers,
                            body: request_body,
                            variables: if variables.is_empty() {
                                None
                            } else {
                                Some(variables.clone())
                            },
                        },
                        ApicizeHttpResponse {
                            status: status.as_u16(),
                            status_text,
                            headers,
                            body: response_body,
                            auth_token_cached,
                        },
                    );

                    Ok(response)
                }
            }
        }
        Err(err) => {
            println!("{}", &err);
            Err(ExecutionError::Reqwest(err))
        }
    }
}

/// Cleanup V8 platform, should only be called once at end of application
pub fn cleanup_v8() {
    unsafe {
        v8::V8::dispose();
    }
    v8::V8::dispose_platform();
}
