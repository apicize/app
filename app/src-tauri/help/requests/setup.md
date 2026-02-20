# :icon[request] Requests :toolbar

## Setup Pane :icon[test]

Use the Setup pane to initialize dyanmically variables used during Request testing. For example, you can 
create a script to randomly generate an email address:

```json
const email = `fake-${Date.now()}-${Math.floor(Math.random())}@fake.com`
console.info(`Using fake email address: ${email}`)
output('email', email)
``` 


Read the section on [**Authoring Tests**](help:authoring-tests) for information on how to create tests.

### See Also

* [**Running Tests**](help:running-tests)
* [**Requests**](help:workspace/requests)
* [**Workspace**](help:home)
