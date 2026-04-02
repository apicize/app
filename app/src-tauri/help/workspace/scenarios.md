# :icon[scenario] Scenarios :toolbar

A Scenario is a set of variables that are available when testing [requests](help:workspace/requests).  These can be set for any [Request](help:workspace/requests) or [Group](help:workspace/groups).  If they are set for a Group, they will apply to all child Requests or Groups.  At the simplest level, you can use this capability to inject different values into the same Request(s), without having to modify them.  These values can be used as the URL, in query string variables, headers, the body, etc.

To access a scenario variable in a test, use the global variables `data` or `scenario`.

:image[scenarios.webp]

### See Also

* [**Authoring Tests**](help:tests/authoring-tests)
* [**Running Tests**](help:tests/running-tests)
