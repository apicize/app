# :logo :toolbar-top

# What is Apicize?

Apicize is yet another application to test HTTP calls.  Its *raison d'être* is to lower the friction between interactively
testing in development and leveraging that testing in an automated fashion during deployment, post-deployment health checks,
etc.

## What differentiates Apicize?

### Test-Driven

Whenever you set up a Request, you get a default [test](help:requests/test) created which checks for an HTTP status 200.  Obviously,
meaningful testing will often require more than this.  You may want to inspect the response and validate data.  You may want to test for known
error conditions.  Apicize accommodates [BDD style testing](https://en.wikipedia.org/wiki/Behavior-driven_development) using the
[Chai](https://www.chaijs.com/) library.  Apicize supports running Groups of Requests either in Sequence or Concurrently.  This lets
you test chains of dependent requests, or to ensure idempotency by making multiple calls in parallel.

### "All Local" Application

This application runs on your computer and the only external connection it makes are to the APIs you configure in your tests.  It does not store
information anywhere other than your drive.  It does not bombard you with marketing requests to upsell you on collaboration features,
cloud storage, etc.

### Secure

When you execute tests in Apicize, the test code is executed in a [JavaScript V8 engine](https://v8.dev/) that is isolated
from your application and your system.  It does *not* include a NodeJS, Deno, Web Browser or any other supporting runtime, 
which means that your tests cannot access your file system or other resources.

Apicize runs on the [Tauri platform](https://tauri.app/) constructed with Rust.  This mitigates a lot of risk associated with
buffer overruns and other security vulnerabilities.

### CI/CD Friendly

A [command-line test runner](https://github.com/apicize/cli) for Apicize workbooks, with minimal dependencies, 
can be used to execute without a GUI during CI/CD or other automated context.
