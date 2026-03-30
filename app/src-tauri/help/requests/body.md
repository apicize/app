# :icon[request] Requests :toolbar

## Body Pane :icon[body]

When perfomring a POST or PUT, you can optionally include body payload of text (incl. JSON or XML), form data or "raw" data (Base64 encoded).  Multipart form data is not yet supported.
You will have the option of updating the Content-Type header based upon the body content type, you can also updated it manual from the [headers](help:requests/headers) panel.

When editing text data, selecting JSON or XML as the type will provide syntax highlighting.  Other than that, there is no difference in selecting these.

:image[requests/body-text.webp]

When specifying "Raw" data, you can either open a data file or paste an image from the clipboard.  Clipboard images must be stored in the clipboard as .png format.  File drop is not yet supported.  

:image[requests/body-data.webp]

### See Also

* [**Requests**](help:workspace/requests)
* [**Workspace**](help:home)
