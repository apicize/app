# :icon[settings] Settings :toolbar

## Workbook Defaults :icon[defaults]

### Parameters

This pane is to set default parameters when testing Requests and Groups.  When a Request or Group defines 
a value (including "Off") it will override these defaults.  These parameters include:

* [**Scenario**](help:scenarios): Name/value pairs injected in place of `{{handlebars}}` text
* [**Authorization**](help:authorizations): Authorization sent with request
* [**Certificate**](help:certificates):  Client certificate sent with request
* [**Proxy**](help:proxies):  Proxy used to send request

> Note:  These settings are defaults for the currently open workbook

:image[workspace/parameters.webp]

If you want to use an external CSV or JSON file to populate multiple test cases, you can define a Data Set file (see below).  When 
a Data Set is active, the properties of each row (CSV) or item (JSON) will be populated along with the active Scenario's variables (if set).

### See Also

* [**Running Tests**](help:running-tests)
