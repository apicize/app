//! Code generation for dispatched Apicize requests.
//!
//! Converts the *actually dispatched* HTTP request captured in an
//! [`ExecutionResultDetailRequest`] into a runnable code snippet for a variety
//! of languages/runtimes so the user can copy it to the clipboard.
//!
//! The source of truth is `ExecutionResultDetailRequest.test_context.request`
//! (an [`ApicizeHttpRequest`]), which is the request as it was sent to the
//! server: the URL already has query-string parameters baked in, and headers
//! already contain fully-resolved authorization values (Basic, Bearer, API
//! key, etc.).
//!
//! Because resolved authorization values are literal secrets, the caller
//! controls whether they are emitted verbatim (`include_secrets == true`) or
//! replaced with a placeholder (`include_secrets == false`).

use apicize_lib::{ApicizeBody, ApicizeHttpRequest, ExecutionResultDetailRequest};
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use serde_repr::{Deserialize_repr, Serialize_repr};

use crate::error::ApicizeAppError;

/// Placeholder emitted in place of a sensitive header value when secrets are
/// excluded from the generated code.
const SECRET_PLACEHOLDER: &str = "<REPLACE_WITH_SECRET>";

/// Supported code-generation targets.
///
/// Discriminants are stable numeric constants so the TypeScript side can map
/// menu selections directly to these values.
#[derive(Serialize_repr, Deserialize_repr, Copy, Clone, PartialEq, Debug)]
#[repr(u8)]
pub enum CodeGenLanguage {
    /// Node.js using the global `fetch` with `async`/`await`.
    NodeJs = 0,
    /// Python using the `requests` package.
    Python = 1,
    /// Go using the standard `net/http` package.
    Go = 2,
    /// C# using `System.Net.Http.HttpClient` (top-level statements).
    CSharp = 3,
    /// Java using `java.net.http.HttpClient`.
    Java = 4,
}

/// Generate a code snippet that reproduces the dispatched request described by
/// `request` for the given `language`.
///
/// When `include_secrets` is `false`, values of sensitive headers (e.g.
/// `Authorization`, `Cookie`, API-key headers) are replaced with a placeholder
/// the user must fill in before running the snippet.
pub fn generate_code(
    request: &ExecutionResultDetailRequest,
    language: CodeGenLanguage,
    include_secrets: bool,
) -> Result<String, ApicizeAppError> {
    let http = request.test_context.request.as_ref().ok_or_else(|| {
        ApicizeAppError::CodeGenerationError(format!(
            "no dispatched request is available for '{}'",
            request.name
        ))
    })?;

    let dispatch = Dispatch::from_http(http, include_secrets, language);

    let code = match language {
        CodeGenLanguage::NodeJs => gen_node_fetch_async(&dispatch),
        CodeGenLanguage::Python => gen_python(&dispatch),
        CodeGenLanguage::Go => gen_go(&dispatch),
        CodeGenLanguage::CSharp => gen_csharp(&dispatch),
        CodeGenLanguage::Java => gen_java(&dispatch),
    };

    Ok(code)
}

/// Normalized body extracted from an [`ApicizeBody`].
enum GenBody {
    /// No request body.
    None,
    /// UTF-8 text body (JSON/XML/Form/Text all carry a rendered `text`).
    Text(String),
    /// Raw binary body (embedded as Base64 and decoded in the target language).
    Binary(Vec<u8>),
}

/// Language-agnostic view of the request used by the generators.
struct Dispatch {
    method: String,
    url: String,
    /// Headers filtered for the target language, sorted for stable output.
    headers: Vec<(String, String)>,
    body: GenBody,
}

impl Dispatch {
    fn from_http(
        http: &ApicizeHttpRequest,
        include_secrets: bool,
        language: CodeGenLanguage,
    ) -> Self {
        let mut headers: Vec<(String, String)> = http
            .headers
            .iter()
            .filter(|(name, _)| !skip_header(name, language))
            .map(|(name, value)| {
                let value = if !include_secrets && is_sensitive_header(name) {
                    SECRET_PLACEHOLDER.to_string()
                } else {
                    value.clone()
                };
                (name.clone(), value)
            })
            .collect();
        headers.sort_by_key(|a| a.0.to_ascii_lowercase());

        let body = match &http.body {
            None => GenBody::None,
            Some(ApicizeBody::Text { text }) => GenBody::Text(text.clone()),
            Some(ApicizeBody::JSON { text, .. }) => GenBody::Text(text.clone()),
            Some(ApicizeBody::XML { text, .. }) => GenBody::Text(text.clone()),
            Some(ApicizeBody::Form { text, .. }) => GenBody::Text(text.clone()),
            Some(ApicizeBody::Binary { data }) => GenBody::Binary(data.clone()),
        };

        Dispatch {
            method: http.method.clone(),
            url: http.url.clone(),
            headers,
            body,
        }
    }

    fn has_body(&self) -> bool {
        !matches!(self.body, GenBody::None)
    }
}

/// Headers that are managed automatically by the target HTTP client and would
/// break the request (or throw) if set explicitly.
fn skip_header(name: &str, language: CodeGenLanguage) -> bool {
    let lower = name.to_ascii_lowercase();
    // Managed by every client; a stale content-length breaks the request.
    if lower == "content-length" || lower == "host" {
        return true;
    }
    // java.net.http rejects a set of "restricted" headers at build time.
    if language == CodeGenLanguage::Java {
        matches!(
            lower.as_str(),
            "connection" | "date" | "expect" | "from" | "upgrade" | "via" | "warning"
        )
    } else {
        false
    }
}

/// Best-effort detection of headers whose values are secrets. Because the
/// dispatched request only exposes final header values (not the authorization
/// metadata), this relies on well-known header names.
fn is_sensitive_header(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    matches!(
        lower.as_str(),
        "authorization" | "proxy-authorization" | "cookie" | "set-cookie"
    ) || lower.contains("api-key")
        || lower.contains("apikey")
        || lower.contains("api_key")
        || lower.contains("token")
        || lower.contains("secret")
        || lower.starts_with("x-auth")
}

/// Escape a string as the contents of a double-quoted string literal. The
/// result is valid inside JavaScript, Python, Go, C#, and Java double-quoted
/// strings.
fn esc(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 8);
    for c in s.chars() {
        match c {
            '\\' => out.push_str("\\\\"),
            '"' => out.push_str("\\\""),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

fn base64_of(data: &[u8]) -> String {
    BASE64.encode(data)
}

// ---------------------------------------------------------------------------
// Node.js (async fetch)
// ---------------------------------------------------------------------------

fn gen_node_fetch_async(d: &Dispatch) -> String {
    // Assumes execution inside a module where top-level await is available, so
    // no async IIFE wrapper is needed.
    let headers = js_headers(&d.headers, 2);
    let body_line = match &d.body {
        GenBody::None => String::new(),
        GenBody::Text(text) => format!("  body: \"{}\",\n", esc(text)),
        GenBody::Binary(data) => {
            format!(
                "  body: Buffer.from(\"{}\", \"base64\"),\n",
                base64_of(data)
            )
        }
    };
    format!(
        "const response = await fetch(\"{url}\", {{\n  method: \"{method}\",\n{headers}{body}}});",
        url = esc(&d.url),
        method = esc(&d.method),
        headers = headers,
        body = body_line,
    )
}

/// Render a JavaScript `headers: { ... }` block indented by `indent` spaces.
fn js_headers(headers: &[(String, String)], indent: usize) -> String {
    let pad = " ".repeat(indent);
    let mut out = format!("{pad}headers: {{\n");
    for (name, value) in headers {
        out.push_str(&format!("{pad}  \"{}\": \"{}\",\n", esc(name), esc(value)));
    }
    out.push_str(&format!("{pad}}},\n"));
    out
}

// ---------------------------------------------------------------------------
// Python (requests)
// ---------------------------------------------------------------------------

fn gen_python(d: &Dispatch) -> String {
    let mut imports = String::from("import requests");
    if matches!(d.body, GenBody::Binary(_)) {
        imports.push_str("\nimport base64");
    }

    let mut headers = String::from("{\n");
    for (name, value) in &d.headers {
        headers.push_str(&format!("        \"{}\": \"{}\",\n", esc(name), esc(value)));
    }
    headers.push_str("    }");

    let body_arg = match &d.body {
        GenBody::None => String::new(),
        GenBody::Text(text) => format!(",\n    data=\"{}\"", esc(text)),
        GenBody::Binary(data) => {
            format!(",\n    data=base64.b64decode(\"{}\")", base64_of(data))
        }
    };

    format!(
        "{imports}\n\nresponse = requests.request(\n    \"{method}\",\n    \"{url}\",\n    headers={headers}{body},\n)",
        imports = imports,
        method = esc(&d.method),
        url = esc(&d.url),
        headers = headers,
        body = body_arg,
    )
}

// ---------------------------------------------------------------------------
// Go (net/http)
// ---------------------------------------------------------------------------

fn gen_go(d: &Dispatch) -> String {
    let mut imports: Vec<&str> = vec!["net/http"];
    let (body_setup, body_reader) = match &d.body {
        GenBody::None => (String::new(), "nil".to_string()),
        GenBody::Text(text) => {
            imports.push("strings");
            (
                String::new(),
                format!("strings.NewReader(\"{}\")", esc(text)),
            )
        }
        GenBody::Binary(data) => {
            imports.push("bytes");
            imports.push("encoding/base64");
            (
                format!(
                    "\tbody, _ := base64.StdEncoding.DecodeString(\"{}\")\n",
                    base64_of(data)
                ),
                "bytes.NewReader(body)".to_string(),
            )
        }
    };
    imports.sort_unstable();

    let mut import_block = String::from("import (\n");
    for imp in &imports {
        import_block.push_str(&format!("\t\"{}\"\n", imp));
    }
    import_block.push(')');

    let mut header_lines = String::new();
    for (name, value) in &d.headers {
        header_lines.push_str(&format!(
            "\treq.Header.Set(\"{}\", \"{}\")\n",
            esc(name),
            esc(value)
        ));
    }

    format!(
        "package main\n\n{imports}\n\nfunc main() {{\n{body_setup}\treq, err := http.NewRequest(\"{method}\", \"{url}\", {reader})\n\tif err != nil {{\n\t\tpanic(err)\n\t}}\n{headers}\tresp, err := http.DefaultClient.Do(req)\n\tif err != nil {{\n\t\tpanic(err)\n\t}}\n\tdefer resp.Body.Close()\n}}",
        imports = import_block,
        body_setup = body_setup,
        method = esc(&d.method),
        url = esc(&d.url),
        reader = body_reader,
        headers = header_lines,
    )
}

// ---------------------------------------------------------------------------
// C# (HttpClient, top-level statements)
// ---------------------------------------------------------------------------

fn gen_csharp(d: &Dispatch) -> String {
    let mut usings = String::from("using System.Net.Http;");
    if matches!(d.body, GenBody::Text(_)) {
        usings.push_str("\nusing System.Text;");
    }

    let method_expr = csharp_method(&d.method);

    let mut lines = String::new();
    lines.push_str("using var client = new HttpClient();\n");
    lines.push_str(&format!(
        "using var request = new HttpRequestMessage({}, \"{}\");\n",
        method_expr,
        esc(&d.url)
    ));

    // Body content must be set before content headers can be attached.
    match &d.body {
        GenBody::None => {}
        GenBody::Text(text) => {
            lines.push_str(&format!(
                "request.Content = new StringContent(\"{}\", Encoding.UTF8);\n",
                esc(text)
            ));
        }
        GenBody::Binary(data) => {
            lines.push_str(&format!(
                "request.Content = new ByteArrayContent(Convert.FromBase64String(\"{}\"));\n",
                base64_of(data)
            ));
        }
    }

    for (name, value) in &d.headers {
        // Content headers (Content-Type, etc.) belong on the content object.
        // Remove first: StringContent presets Content-Type, and
        // TryAddWithoutValidation will not override an existing header.
        if name.to_ascii_lowercase().starts_with("content-") && d.has_body() {
            lines.push_str(&format!(
                "request.Content.Headers.Remove(\"{}\");\n",
                esc(name)
            ));
            lines.push_str(&format!(
                "request.Content.Headers.TryAddWithoutValidation(\"{}\", \"{}\");\n",
                esc(name),
                esc(value)
            ));
        } else {
            lines.push_str(&format!(
                "request.Headers.TryAddWithoutValidation(\"{}\", \"{}\");\n",
                esc(name),
                esc(value)
            ));
        }
    }

    lines.push_str("using var response = await client.SendAsync(request);");

    format!("{usings}\n\n{lines}", usings = usings, lines = lines)
}

/// Map an HTTP method to the corresponding `HttpMethod` expression in C#.
fn csharp_method(method: &str) -> String {
    match method.to_ascii_uppercase().as_str() {
        "GET" => "HttpMethod.Get".to_string(),
        "POST" => "HttpMethod.Post".to_string(),
        "PUT" => "HttpMethod.Put".to_string(),
        "DELETE" => "HttpMethod.Delete".to_string(),
        "PATCH" => "HttpMethod.Patch".to_string(),
        "HEAD" => "HttpMethod.Head".to_string(),
        "OPTIONS" => "HttpMethod.Options".to_string(),
        other => format!("new HttpMethod(\"{}\")", esc(other)),
    }
}

// ---------------------------------------------------------------------------
// Java (java.net.http)
// ---------------------------------------------------------------------------

fn gen_java(d: &Dispatch) -> String {
    let publisher = match &d.body {
        GenBody::None => "HttpRequest.BodyPublishers.noBody()".to_string(),
        GenBody::Text(text) => {
            format!("HttpRequest.BodyPublishers.ofString(\"{}\")", esc(text))
        }
        GenBody::Binary(data) => format!(
            "HttpRequest.BodyPublishers.ofByteArray(java.util.Base64.getDecoder().decode(\"{}\"))",
            base64_of(data)
        ),
    };

    let mut builder = String::new();
    builder.push_str(&format!(
        "            HttpRequest request = HttpRequest.newBuilder()\n                .uri(URI.create(\"{}\"))\n",
        esc(&d.url)
    ));
    for (name, value) in &d.headers {
        builder.push_str(&format!(
            "                .header(\"{}\", \"{}\")\n",
            esc(name),
            esc(value)
        ));
    }
    builder.push_str(&format!(
        "                .method(\"{}\", {})\n                .build();",
        esc(&d.method),
        publisher
    ));

    format!(
        "import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\nimport java.net.http.HttpResponse;\n\npublic class Main {{\n    public static void main(String[] args) throws Exception {{\n        try (HttpClient client = HttpClient.newHttpClient()) {{\n{builder}\n            client.send(request, HttpResponse.BodyHandlers.ofString());\n        }}\n    }}\n}}",
        builder = builder,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn sample(body: Option<ApicizeBody>) -> ApicizeHttpRequest {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        headers.insert(
            "Authorization".to_string(),
            "Bearer super-secret-token".to_string(),
        );
        // Auto-managed headers should be dropped from output.
        headers.insert("Content-Length".to_string(), "13".to_string());
        headers.insert("Host".to_string(), "example.com".to_string());
        ApicizeHttpRequest {
            url: "https://example.com/api?q=1".to_string(),
            method: "POST".to_string(),
            headers,
            body,
        }
    }

    #[test]
    fn secrets_are_redacted_when_excluded() {
        let d = Dispatch::from_http(&sample(None), false, CodeGenLanguage::NodeJs);
        let code = gen_node_fetch_async(&d);
        assert!(code.contains(SECRET_PLACEHOLDER));
        assert!(!code.contains("super-secret-token"));
    }

    #[test]
    fn secrets_are_included_when_requested() {
        let d = Dispatch::from_http(&sample(None), true, CodeGenLanguage::NodeJs);
        let code = gen_node_fetch_async(&d);
        assert!(code.contains("Bearer super-secret-token"));
    }

    #[test]
    fn managed_headers_are_dropped() {
        let d = Dispatch::from_http(&sample(None), true, CodeGenLanguage::Go);
        let code = gen_go(&d);
        assert!(!code.to_ascii_lowercase().contains("content-length"));
        assert!(!code.contains("req.Header.Set(\"Host\""));
    }

    #[test]
    fn text_body_is_escaped() {
        let body = Some(ApicizeBody::JSON {
            text: "{\"a\":\"line1\nline2\"}".to_string(),
            data: serde_json::Value::Null,
        });
        let d = Dispatch::from_http(&sample(body), true, CodeGenLanguage::Python);
        let code = gen_python(&d);
        assert!(code.contains("\\n"));
        assert!(!code.contains("line1\nline2"));
    }

    #[test]
    fn binary_body_is_base64_encoded() {
        let body = Some(ApicizeBody::Binary {
            data: vec![0u8, 1, 2, 3, 255],
        });
        let d = Dispatch::from_http(&sample(body), true, CodeGenLanguage::Java);
        let code = gen_java(&d);
        let expected = BASE64.encode([0u8, 1, 2, 3, 255]);
        assert!(code.contains(&expected));
        assert!(code.contains("getDecoder().decode"));
    }

    #[test]
    fn all_languages_generate_non_empty() {
        let langs = [
            CodeGenLanguage::NodeJs,
            CodeGenLanguage::Python,
            CodeGenLanguage::Go,
            CodeGenLanguage::CSharp,
            CodeGenLanguage::Java,
        ];
        let body = Some(ApicizeBody::Text {
            text: "hello".to_string(),
        });
        for lang in langs {
            let d = Dispatch::from_http(&sample(body.clone()), true, lang);
            let code = match lang {
                CodeGenLanguage::NodeJs => gen_node_fetch_async(&d),
                CodeGenLanguage::Python => gen_python(&d),
                CodeGenLanguage::Go => gen_go(&d),
                CodeGenLanguage::CSharp => gen_csharp(&d),
                CodeGenLanguage::Java => gen_java(&d),
            };
            assert!(code.contains("example.com"), "{:?} missing url", lang);
            assert!(
                code.to_ascii_lowercase().contains("post"),
                "{:?} missing method",
                lang
            );
        }
    }
}
