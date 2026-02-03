# :icon[apicize] Welcome to Apicize! :toolbar

# Workspaces and Workbooks

An Apicize Workspace is where you set up your HTTP requests to test.  You can also configure ways to populate 
data used by those requests, facilitate authentication, and set up other security measures.

Workspaces are saved to Workbooks.  You can control how information is saved to workbooks to lower the risk
of unintentionally sharing sensitive authorization credentials or certificates. See the section on 
[parameter storage](help:parameter-storage) for more information.

## Workspace Elements

### :icon[request] [Requests](help:workspace/requests) and [Groups](workspace/groups)

Information about HTTP calls to send and how to test them

### :icon[scenario] [Scenarios](help:workspace/scenarios)

Key-value pairs that can be substituted for Request URLs, headers, body content, etc. using `{{handlebars}}` placeholders for Keys

### :icon[dataset] [Data Sets](help:workspace/data-sets)

Blocks of data to inject into Requests during testing.

### :icon[authorization] [Authorizations](help:workspace/authorizations)

Information required to enable authorization based upon API keys, Basic Authentication, OAuth2 Client and OAuth2 PKCE flows

### :icon[certificate] [Certificates](help:workspace/certificates)

Client SSL certificates used for authentication

### :icon[proxy] [Proxies](help:workspace/proxies)

SOCKS5 or HTTP proxies used to connect to HTTP resources

### :icon[defaults] [Defaults](help:workspace/defaults)

Default Parameter values to use when testing Requests (which can be overriden on individual Requests or Groups)

# Toolbar

The toolbar at the top left (or left side if hiding navigation) supports the following functionality

## File Operations

* :icon[workbook-new] Open new Workbook
* :icon[workbook-open] Open existing Workbook
* :icon[workbook-save] Save Workspace changes to opened Workbook
* :icon[workbook-save-as] Save Workspace changes to different Workbook

## Other Operations

* :icon[settings] [Settings](help:settings)
* :icon[logs] [Communication Logs](help:logs)
