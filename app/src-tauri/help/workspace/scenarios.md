# :icon[scenario] Scenarios :toolbar

A Scenario is a set of variables that are available when testing [requests](help:requests).  These can be set for any [Request](help:requests) or Group.  If they are set for a Group, they will apply to call child Requests or Groups.  At the simplest level, you can use this capability to inject different values into the same Request(s), without having to modify them.

Scenario variables can be used to dynamically set URLs and posted body content.  Assume you have a Scenario variables called `author` and `quote`.  You can inject those into a [Requests's body](help:requests/body) by using handlebar syntax:

```json
{
    "author":"{{author}}",
    "quote":"{{quote}}"
}
```

Scenario values can be substituted into request names, URLs, headers, query string parameters and body content.  To access a scenario variable in a test, use the global variables `variables` or 

A scenario value can be text, JSON value, JSON fille or CSV file.  The entire data set will be merged in with each call.  If you want to execute Requests or Groups for each row or entry in the external
file, you can set up a Data Set (see [**Running Tests**](help:running-tests))

:image[scenarios.webp]

### See Also

* [**Authoring Tests**](help:authoring-tests)
* [**Running Tests**](help:running-tests)
