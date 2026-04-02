# :icon[request] Requests :toolbar

## Info Pane :icon[info]

Use this pane to set basic information about your request.

* **Name**: The name used to display the request in navigation and test results
* **Method**: The HTTP method (GET, POST, PUT, DELETE, etc.) specified when calling the endpoint
* **URL**: Full URL (including https:// or http://) to the endpoint you want to call
* **# of Runs**: How many times to run the request
* **Multi-Run Execution**:  Whether multiple runs of the request are executed sequentially or concurrently.  
* **Disable**:  Set this option to disable this request when executing a parent group (the request can be still be executed interactively)
* **Timeout**: How long to wait for a response from the endpoint (in milliseconds)
* **# of Redirects**:  Maximum number of redirects to follow before returning an error
* **Allow Invalid Certificates**: Allow insecure or otherwise invalid certificates for testing purposes
* **Keep Alive**:  Keep HTTP connection active between calls

:image[requests/info.webp]

### See Also

* [**Running Tests**](help:tests/running-tests)
* [**Viewing Test Results**](help:tests/viewing-results)
* [**Requests**](help:workspace/requests)
* [**Workspace**](help:workspace)
