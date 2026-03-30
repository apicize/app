# :icon[proxy] Proxies :toolbar

Apicize supports http/s and SOCKS 5 proxies when executing tests.  To add a new Proxy parameter, click on the Plus sign
next to Proxies in the navigation panel.  Select a name for your proxy and its location. Click 
[here](help:parameter-storage) for information on how parameters are stored in Apicize.

To delete a Proxy parameter, select it in the navigation pane, and in its context menu, select "Delete Proxy".

Proxies can be set for [Requests](help:workspace/requests), [Request Groups](help:workspace/groups) or [OAuth2 Authorizations](help:authorizations/oauth2-client).

## Configuration

Configure the proxy using URLs such as:

* `socks5://192.168.1.1:9000`
* `https://myproxy.com`
* `https://myproxy.com:8443`

:image[proxies.webp]

### See Also

* [**Parameter Storage**](help:parameter-storage)

