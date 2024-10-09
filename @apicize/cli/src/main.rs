use apicize_lib::models::apicize::{ApicizeExecution, ApicizeExecutionItem};
use apicize_lib::models::settings::ApicizeSettings;
use apicize_lib::models::{Parameters, Workspace};
use apicize_lib::{cleanup_v8, get_workbooks_directory};
use clap::Parser;
use colored::Colorize;
use num_format::{SystemLocale, ToFormattedString};
use std::ffi::OsStr;
use std::io::{stderr, stdout, Write};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;
use std::{fs, process};

/// Simple program to greet a person
#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    /// Name of the file to run
    file: String,
    /// Global parameter file name (overriding default location, if available)
    #[arg(short, long)]
    globals: Option<String>,
    /// Print configuration information
    #[arg(short, long, default_value_t = false)]
    info: bool,
    /// Name of the output file name for test results
    #[arg(short, long)]
    output: Option<String>,
}

fn duration_to_ms(d: u128, locale: &SystemLocale) -> String {
    let mut ms = d;
    let mins: u128 = ms / 60000;
    ms = ms - mins * 60000;
    let secs: u128 = ms / 1000;
    ms = ms - secs * 1000;
    format!("{:02}:{:02}{}{:03}", mins, secs, locale.decimal(), ms)
}

fn render_execution_item(
    item: &ApicizeExecutionItem,
    level: usize,
    locale: &SystemLocale,
    feedback: &mut Box<dyn Write>,
) {
    let prefix = format!("{:width$}", "", width = level * 3);
    match item {
        ApicizeExecutionItem::Group(group) => {
            let title = format!(
                "{}{} ({} - {} ms)",
                &prefix,
                &group.name,
                duration_to_ms(group.executed_at, locale),
                &group.duration.to_formatted_string(locale),
            );
            writeln!(feedback, "{}", title.white()).unwrap();
            for child in &group.items {
                render_execution_item(&child, level + 1, locale, feedback);
            }
        }
        ApicizeExecutionItem::Request(request) => {
            let title = format!(
                "{}{} ({} - {} ms)",
                prefix,
                &request.name,
                duration_to_ms(request.executed_at, locale),
                &request.duration.to_formatted_string(locale),
            );
            writeln!(feedback, "{}", title.white()).unwrap();

            if let Some(test_response) = &request.tests {
                if let Some(test_results) = &test_response.results {
                    let test_prefix1 = format!("{:width$}", "", width = (level + 1) * 3);
                    let test_prefix2 = format!("{:width$}", "", width = (level + 2) * 3);
                    for result in test_results {
                        print!(
                            "{}{}",
                            test_prefix1.blue(),
                            &result.test_name.join(" ").blue()
                        );
                        if let Some(err) = &result.error {
                            writeln!(feedback, " {}", "[ERROR]".red()).unwrap();
                            writeln!(feedback, "{}{}", test_prefix2, err.red().dimmed()).unwrap();
                        } else if result.success {
                            writeln!(feedback, " {}", "[PASS]".green()).unwrap();
                        } else {
                            writeln!(feedback, " {}", "[FAIL]".yellow()).unwrap();
                        }

                        if let Some(logs) = &result.logs {
                            for log in logs {
                                writeln!(feedback, "{}{}", test_prefix2, log.white().dimmed())
                                    .unwrap();
                            }
                        }
                    }
                }
            }
        }
    }
}

fn process_execution(
    execution_result: &Result<ApicizeExecution, String>,
    level: usize,
    locale: &SystemLocale,
    feedback: &mut Box<dyn Write>,
) -> usize {
    let mut failure_count = 0;

    match execution_result {
        Ok(execution) => {
            let use_level: usize = if (&execution.runs).len() > 1 {
                level + 1
            } else {
                level
            };

            let mut ctr = 0;
            for run in &execution.runs {
                if ctr > 0 {
                    println!();
                }

                if execution.runs.len() > 1 {
                    ctr = ctr + 1;
                    writeln!(
                        feedback,
                        "{}Run {} of {}",
                        format!("{:width$}", "", width = level * 3),
                        ctr,
                        execution.runs.len()
                    )
                    .unwrap();
                }

                for run_item in &run.items {
                    render_execution_item(&run_item, use_level, locale, feedback);
                }

                writeln!(feedback).unwrap();
                writeln!(
                    feedback,
                    "{}",
                    "--------------- Totals ---------------".white()
                )
                .unwrap();
                writeln!(
                    feedback,
                    "{}{}",
                    "Passed Tests: ".white(),
                    if run.passed_test_count > 0 {
                        run.passed_test_count.to_formatted_string(locale).green()
                    } else {
                        "0".white()
                    }
                )
                .unwrap();

                writeln!(
                    feedback,
                    "{}{}",
                    "Failed Tests: ".white(),
                    if run.failed_test_count > 0 {
                        run.failed_test_count.to_formatted_string(locale).yellow()
                    } else {
                        "0".white()
                    }
                )
                .unwrap();

                writeln!(
                    feedback,
                    "{}{}",
                    "Requests with passed tests: ".white(),
                    if run.requests_with_passed_tests_count > 0 {
                        run.requests_with_passed_tests_count
                            .to_formatted_string(locale)
                            .green()
                    } else {
                        "0".white()
                    }
                )
                .unwrap();

                writeln!(
                    feedback,
                    "{}{}",
                    "Requests with failed tests: ".white(),
                    if run.requests_with_failed_tests_count > 0 {
                        failure_count += run.requests_with_failed_tests_count;
                        run.requests_with_failed_tests_count
                            .to_formatted_string(locale)
                            .yellow()
                    } else {
                        "0".white()
                    }
                )
                .unwrap();

                writeln!(
                    feedback,
                    "{}{}",
                    "Requests with errors: ".white(),
                    if run.requests_with_errors > 0 {
                        failure_count += run.requests_with_errors;
                        run.requests_with_errors.to_formatted_string(locale).red()
                    } else {
                        "0".white()
                    }
                )
                .unwrap();
                writeln!(
                    feedback,
                    "{}",
                    "--------------------------------------".white()
                )
                .unwrap();
            }
        }
        Err(err) => {
            writeln!(
                feedback,
                "{}{}",
                format!("{:width$}", "", width = level * 3),
                err.red()
            )
            .unwrap();
        }
    }

    failure_count
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let args = Args::parse();

    let mut send_output_to = args.output.unwrap_or(String::from(""));
    if send_output_to.to_lowercase() == "stdout" {
        send_output_to = String::from("--");
    }
    let mut feedback: Box<dyn std::io::Write> = if send_output_to == "--" {
        Box::new(stderr())
    } else {
        Box::new(stdout())
    };

    let stored_settings: Option<ApicizeSettings> = match ApicizeSettings::open() {
        Ok(serialized_settings) => Some(serialized_settings.data),
        Err(_err) => None,
    };

    let globals_filename = match args.globals {
        Some(filename) => Some(PathBuf::from(filename)),
        None => None,
    };

    if args.info {
        let global_filename = if let Some(filename) = &globals_filename {
            String::from(filename.to_string_lossy())
        } else {
            let default_globals_filename = Parameters::get_globals_filename();
            String::from(default_globals_filename.to_string_lossy())
        };

        writeln!(feedback, "Global parameters: {}", &global_filename).unwrap();

        writeln!(
            feedback,
            "Default workbooks directory: {}",
            get_workbooks_directory().to_string_lossy()
        )
        .unwrap();
    }

    let locale = SystemLocale::default().unwrap();
    let mut file_name = PathBuf::from(&args.file);

    let mut found = file_name.as_path().is_file();

    // Try adding extension if not in file name
    if !found {
        if file_name.extension() != Some(&OsStr::new("apicize")) {
            file_name.set_extension("apicize");
            found = file_name.as_path().is_file();
        }
    }

    // Try settings workbook path if defined
    if !found {
        if let Some(dir) = stored_settings.and_then(|s| s.workbook_directory) {
            let mut temp = PathBuf::from(dir);
            temp.push(&file_name);
            file_name = temp;
            found = file_name.as_path().is_file();
        }
    }

    if !found {
        eprintln!(
            "{}",
            format!("Error: Apicize file \"{}\" not found", &args.file).red()
        );
        std::process::exit(-1);
    }

    writeln!(
        feedback,
        "{}",
        format!("Opening {}", &file_name.to_string_lossy()).white()
    )
    .unwrap();

    let workspace: Workspace;
    match Workspace::open(&file_name, globals_filename) {
        Ok((wkspc, warnings)) => {
            workspace = wkspc;
            for warning in warnings {
                writeln!(feedback, "{}", format!("WARNING: {warning}").yellow()).unwrap();
            }
        }
        Err(err) => {
            eprintln!(
                "{}",
                format!("Unable to read {}: {}", err.file_name, err.error).red()
            );
            process::exit(-2);
        }
    }

    // initialize_v8();

    let request_ids = workspace.requests.top_level_ids.to_owned();
    let arc_workspace = Arc::new(workspace);
    let mut executions: Vec<Result<ApicizeExecution, String>> = Vec::new();

    let start = Instant::now();
    let arc_test_started = Arc::new(start);
    for request_id in request_ids {
        if let Some(request) = arc_workspace.requests.entities.get(&request_id) {
            let name = request.get_name();
            writeln!(
                feedback,
                "{}",
                if name.len() > 0 {
                    format!("Calling {}", name).blue()
                } else {
                    format!("Calling {} (Unnamed)", request.get_id()).blue()
                }
            )
            .unwrap();
            let result = Workspace::run(
                arc_workspace.clone(),
                &request_id,
                None,
                arc_test_started.clone(),
            )
            .await;
            executions.push(result);
        }
    }

    writeln!(feedback).unwrap();
    writeln!(
        feedback,
        "{}",
        "--------------- Results --------------".white()
    )
    .unwrap();

    let mut failure_count = 0;
    let mut execution_ctr = 0;
    for execution in &executions {
        writeln!(feedback).unwrap();
        execution_ctr = execution_ctr + 1;
        failure_count += process_execution(&execution, 0, &locale, &mut feedback);
    }

    if send_output_to.len() > 0 {
        let serialized = serde_json::to_string(&executions).unwrap();

        let dest: &str;
        let result = if send_output_to == "--" {
            dest = "STDOUT";
            write!(stdout(), "{}", serialized)
        } else {
            dest = send_output_to.as_str();
            fs::write(&send_output_to, serialized)
        };

        match result {
            Ok(_) => writeln!(
                feedback,
                "{}",
                format!("Test results written to {}", dest).blue()
            )
            .unwrap(),
            Err(ref err) => {
                panic!("Unable to write {} - {}", dest, err)
            }
        }
    }

    cleanup_v8();
    process::exit(failure_count as i32);
}
