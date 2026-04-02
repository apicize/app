# :icon[request] Requests :toolbar

In Apicize, Requests define the webservice endpoint you want to call and test.  At a minimum, each request requires a URL and method to be defined.

Requests can optionally be [*grouped*](help:workspace/groups), which allows request tests to be run in concurrently or in sequence, which facilitates passing values between them.  This can be useful, for example, when testing a sequence of API calls to create, retrieve, update and delete a record (i.e. CRUD).

:image[request-overview.webp]

Requests are configured using the following panes:

* [**Info**](help:requests/info): Basic call information (name, URL, method)
* [**Query String**](help:requests/query): Query string variables to append to URL
* [**Headers**](help:requests/headers):  Headers to include with request
* [**Body**](help:requests/body): Data to include in request body when calling with POST/PUT
* [**Test**](help:requests/test): Test script to validate call results
* [**Parameters**](help:requests/parameters): Authorization, certificate, proxy and scenario variables

### See Also

* [**Running Tests**](help:tests/running-tests)
* [**Viewing Test Results**](help:tests/viewing-results)
* [**Authoring Tests**](help:tests/authoring-tests)
* [**Workspace**](help:workspace)
