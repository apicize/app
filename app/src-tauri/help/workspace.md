# Workspaces and Workbooks :toolbar

An Apicize Workspace is where you set up your HTTP requests to test.  You can also configure ways to populate 
data used by those requests, facilitate authentication, and set up other security measures.

Workspaces are saved to Workbooks.  You can control how information is saved to workbooks to lower the risk
of unintentionally sharing sensitive authorization credentials or certificates. See the section on 
[parameter storage](help:parameter-storage) for more information.

:image[workspace.webp]

## Workspace Elements

### :icon[request] [Requests](help:workspace/requests) / [Groups](help:workspace/groups)

Information about HTTP calls to send and how to test them

### :icon[dataset] [Data Sets](help:workspace/data-sets)

Blocks of data to inject into Requests during testing.

### :icon[scenario] [Scenarios](help:workspace/scenarios)

Key-value pairs that can be substituted for Request URLs, headers, body content, etc. using `{{handlebars}}` placeholders for Keys

### :icon[authorization] [Authorizations](help:workspace/authorizations)

Information required to enable authorization based upon API keys, Basic Authentication, OAuth2 Client and OAuth2 PKCE flows

### :icon[certificate] [Certificates](help:workspace/certificates)

Client SSL certificates used for authentication

### :icon[proxy] [Proxies](help:workspace/proxies)

SOCKS5 or HTTP proxies used to connect to HTTP resources

# Toolbar

The toolbar at the top left (or left side when navigation is hidden) supports the following functionality

## File Operations

* :icon[workbook-new] Open new Workbook
* :icon[workbook-open] Open existing Workbook
* :icon[workbook-save] Save Workspace changes to opened Workbook
* :icon[workbook-save-as] Save Workspace changes to different Workbook

## Other Operations

* :icon[settings] [Application Settings](help:settings/app-settings)
* :icon[logs] [Communication Logs](help:logs)
