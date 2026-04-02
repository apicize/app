# :icon[request] Requests :toolbar

## Parameters Pane :icon[parameters]

This is pane to set parameters when testing your Request or Group.  These parameters include:

* [**Scenario**](help:workspace/scenarios): Name/value pairs injected in place of `{{handlebars}}` text
* [**Authorization**](help:workspace/authorizations): Authorization sent with request
* [**Certificate**](help:workspace/certificates):  Client certificate sent with request
* [**Proxy**](help:workspace/proxies):  Proxy used to send request
* [**Data Set**](help:workspace/data-sets):  Data Set used to populate request information

These parameters are set hierarchically, and default to the level above them, all the way "up" to the workbook's [defaults](help:settings/defaults).  If you set any of these to a value, that value will be used regardless of any parent values set.  If you set any of these to "Off", then no value will be used for that parameter, regardless of parent values.

:image[requests/parameters.webp]

### See Also

* [**Default Parameters**](help:settings/defaults)
* [**Running Tests**](help:tests/running-tests)
* [**Requests**](help:workspace/requests)
* [**Groups**](help:workspace/groups)
* [**Workspace**](help:workspace)
