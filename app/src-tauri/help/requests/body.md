# :icon[request] Requests :toolbar

## Body Pane :icon[body]

When performing a POST or PUT, you can optionally include body payload of text (incl. JSON or XML), form data or "raw" data (Base64 encoded).  Multipart form data is not yet supported. You will have the option of updating the Content-Type header based upon the body content type, you can also update it manually from the [headers](help:requests/headers) panel.

* :icon[copy] Copy body data to clipboard
* :icon[beautify] Format JSON or XML text
* :icon[add-header] Set Content-Type header to match content
* :icon[file-open] Load body content from file
* :icon[paste] Paste body content from clipboard

When editing text data, selecting JSON or XML as the type will provide syntax highlighting.  Other than that, there is no difference in selecting these.

:image[requests/body-text.webp]

When specifying "Raw" data, you can either open a data file or paste an image from the clipboard (.png format).

:image[requests/body-data.webp]

### See Also

* [**Requests**](help:workspace/requests)
* [**Workspace**](help:workspace)
