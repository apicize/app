# :icon[request] Requests :toolbar

## Test Pane :icon[test]

Use the Test pane to write JavaScript that runs before and after a request is sent. Toggle between the two scripts using the buttons at the top right of the editor:

* :icon[test-script] **Test Script (After Execution)**: behavior-driven tests that validate request results and stage data for the next request in a group
* :icon[setup-script] **Setup Script (Before Execution)**: JavaScript that can update the request before it is sent

Both scripts support:

* :icon[copy] Copy script to clipboard
* :icon[beautify] Format script

:image[requests/tests.webp]

### :icon[test-script] Test Script (After Execution)

The test script runs after the response is received. Use `describe` and `it` with `expect` assertions to validate the `response`, and call `output` to make values available to subsequent requests.

Read the section on [**Authoring Tests**](help:tests/authoring-tests) for information on how to create tests.

### :icon[setup-script] Setup Script (Before Execution)

The setup script runs before the request is sent. Changes made to `request` (`url`, `method`, `headers`, `queryStringParams` and `body`) are applied to the request being sent. Headers and query string parameters can be set, read or deleted by name:

```js
request.headers['X-Tenant'] = $.tenant
request.queryStringParams['page'] = $.page ?? 1
delete request.headers['X-Debug']
```

Values passed to `output` are available when populating handlebars values in this request, in its test script, and in subsequent requests.

Scenario, data and output variables (`$`, `scenario`, `data`), `console` and `output` are available in setup scripts. Because the setup script runs before the request is sent, `response`, `describe`, `it` and `expect` are not available.

### See Also

* [**Running Tests**](help:tests/running-tests)
* [**Group Setup Scripts**](help:groups/setup)
* [**Requests**](help:workspace/requests)
* [**Workspace**](help:workspace)
