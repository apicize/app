# Authoring Apicize Tests :toolbar

## Overview

Once a response is received for a request, Apicize can execute a script to validate the response.  It may be as simple as checking the HTTP status code, or it 
may be as sophisticated as parsing the response and checking against values based upon previous responses.

Tests are written in Javascript using BDD-style syntax.  A simple test to make sure the API returned with a 200 status code would look like:

```js
describe('status', () => {
    it('equals 200', () => {
        expect(response.status).to.equal(200)
    })
})
```

Generally speaking, you should structure your tests to **describe** something and how **it** should behave.  By default, Apicize will create a test
like the one shown above for every request.  In most cases, you will want to enhance this testing.

The `expect` assertion is imported from the [Chai](https://www.chaijs.com/api/bdd/) library.  You can consult that library for information on how to write more complex assertions.

## Values Available to Tests

When authoring a test, the following global variables will be available for use in JavaScript:

* `scenario`:  A list of variables defined in the currently active Scenario (if any)
* `output`: A list of values output from previous requests in the group
* `data`:  When a data seed is defined, this will hold the values for the current data row
* `$`: A merged list of previously scenario variables, output variables and data row variables.  These values, as defined, are used 
to populate handlebars values in the request URL, headers, body, etc.
* `request`: Properties describing an HTTP request
* `response`: Properties describing an HTTP response

After executing a request, you can view the response details and examine `testContext` to see all global variables available for use in your testing.

**request** properties include:

* `url` (including query string parameters)
* `method`
* `headers`
* `body`
  * `type`: Type of body data (JSON, XML, Form, Raw, Text)
  * `text`: UTF-8 text of response (when not raw/binary)
  * `data`: For JSON and XML data, this will be a JSON object of the data; for Form, it will be name-value pairs; 
for Raw, it will be a Base64 representation of the binary data

**response** properties include:

* `status`
* `status_text`
* `headers`
* `body`
  * `type`: Type of body data (JSON, XML, Form, Raw, Text)
  * `text`: UTF-8 text of response (when not raw/binary)
  * `data`: For JSON and XML data, this will be a JSON object of the data; for Form, it will be name-value pairs; 
for Raw, it will be a Base64 representation of the binary data
* `auth_token_cached` (set to true if previously generated OAuth token was used)

## Passing Values Between Requests

You may have chains of requests that rely upon values from a previous request.  You can accomplish this by organizing the requests in a group, 
and be sure to set the group's **Group Item Execution** setting to "Sequential", since running them concurrently could cause some requests
to be run out of order.

For example, assume you have a RESTful API with CRUD operations, like in the **demo** project.  The first request in your group creates a record, 
and returns the new `id` in the response.  

Your test after the create could look like this:

```js
describe('status', () => {
    it('equals 200', () => {
        expect(response.status).to.equal(200)
        const data = response.body.data
        output('id', data.id)
        console.info(`New record ID is ${data.id}`)
    })
})
```

This makes the value **id** available to subsequent requests for data injection or testing (in the `output` or `$` global variables).  For example,
you could include `{{id}}` in the URL of the next request to retrieve the record from a RESTful API.

## Using JSONPath to Navigate Data

Apicize includes [JSONPath](https://www.rfc-editor.org/rfc/rfc9535.html) support to assist in navigating data.  If a request or response is identified
as JSON or XML via its Content-Type header, `response.body.data` and/or `request.body.data` will be a JSON object if the body is valid JSON or XML.

You can use the function `.jp` to execute a JSONPath query.  By default, the function takes a JSONPath expression and returns the results.  The library
used to implement this function [jsonpath-plus](https://www.npmjs.com/package/jsonpath-plus), has a number of extensions and options available, and
you can pass an object of parameters to access this additional functionality which you can read about [here](https://www.npmjs.com/package/jsonpath-plus).

For example, assume your response includes JSON data like this:

```json
{
   "orders": [{
        "id": "100",
        "lines": [
            { "id": "100-1", "color": "blue" },
            { "id": "100-2", "color": "red" }
        ]
    }, {
        "id": "101",
        "lines": [
            { "id": "101-1", "color": "blue" }
        ]
    }]
}
```

You can use JSONPath or "normal" JavaScript to get a list of line IDs with the color blue.  
Both return the same result: `['100-1', '101-1']`.

```js
    /// Using JSONPath
    let blues_with_jp = response.body.data.jp('$..lines[?(@.color=="blue")].id')
    /// or with JavaScript
    let blues_with_js = response.body.orders.reduce((ids, o) => {
        return [...ids, ...o.lines.reduce((ids1, l) => {
            if (l.color == 'blue') { ids1.push(l.id) } return ids1
        }, [])]
    }, [])
```

## How Apicize Tests are Run

Apicize uses an embedded version of the [V8](https://v8.dev/) engine to execute your JavaScript tests.  It does *not* include NodeJS or any other JavaScript library functionality, 
except for the [Chai JS Assertion Library](https://www.chaijs.com/) and the [jsonpath-plus](https://www.npmjs.com/package/jsonpath-plus).  This approach is meant to mitigate security
risks that could materialize if somebody were to send out a malicious Apicize test suite.

### See Also

* [**Running Tests**](help:tests/running-tests)
* [**Viewing Test Results**](help:tests/viewing-results)
* [**Integrating with CI/CD and Testing Frameworks**](help:tests/integration)
* [**Requests**](help:workspace/requests)
* [**Workspace**](help:workspace)

