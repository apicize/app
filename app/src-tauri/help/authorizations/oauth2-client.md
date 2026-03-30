# :icon[authorization] Authorizations :toolbar

## OAuth2 Client Flow Authorization

When authorizing using OAuth2 Client Flow, a call is made othe specified Access Token URL with the Client ID and Secret to receive a token. Optionally, you can specify a Scope.  When associating a OAuth2 Client Authorization parameter, Apicize will automatically retrieve the token, and reuse it until either it expires, or you click on "CLEAR ANY CACHED TOKEN" in the Authorization's configuration.

You can optionaly specify a [Certificate](help:workspace/certificates) and/or [Proxy](help:workspace/proxies) to use when retrieving a token. If you specify these settings for the Authorization, they do not automatically apply to [Requests](help:workspace/requests) or [Request Groups](help:workspace/groups), you must configure those separately.

You can use handlebars syntax (i.e. `{{foo}}`) to inject values that are defined *before* the authorization is triggered.

:image[authorization/oauth2-client.webp]

### See Also

* [**Authorizations**](help:workspace/authorizations)
* [**Certificates**](help:workspace/certificates)
* [**Proxies**](help:workspace/proxies)

