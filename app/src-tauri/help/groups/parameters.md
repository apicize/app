# :icon[group] Request Groups :toolbar

## Parameters Pane :icon[parameters]

This is pane to set parameters when testing your Request or Group.  These parameters include:

* [**Scenario**](help:workspace/scenarios): Name/value pairs injected in place of `{{handlebars}}` text
* [**Authorization**](help:workspace/authorizations): Authorization sent with requests
* [**Certificate**](help:workspace/certificates):  Client certificate sent with requests
* [**Proxy**](help:workspace/proxies):  Proxy used to send requests

These parameters are set hierchically, and default to the level above them, all the way "up" to the workbook's [defaults](help:settings/defaults).
If you set any of these to a value, that value will be used regardless of any parent values set.  If you set any of these to "Off", then
no value will be used for that parameter, regardless of parent values.

:image[groups/parameters.webp]

If you want to run your tests by seeding external data, set that in workbook's [defaults](help:settings/defaults).

### Other Request Group Help

* [**Info**](help:groups/info)
* [**Setup**](help:groups/setup)
* [**Groups Overview**](help:workspace/groups)

### See Also

* [**Default Parameters**](help:settings/defaults)
* [**Running Tests**](help:running-tests)
* [**Requests**](help:workspace/requests)
* [**Workspace**](help:home)
