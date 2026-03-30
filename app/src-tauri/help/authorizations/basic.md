# :icon[authorization] Authorizations :toolbar

## Basic Authorization

When authorizing using Basic Authorization, your user name and password are passed 
in an `Authorization: Basic` request header, each value encoded using Base64 separated by a period.

You can use handlebars syntax (i.e. `{{foo}}`) to inject values that are defined *before* the authorization is triggered.

:image[authorization/basic.webp]

### See Also

* [**Authorizations**](help:workspace/authorizations)

