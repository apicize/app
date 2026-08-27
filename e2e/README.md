# Apicize End-to-End Tests

UI end-to-end tests for the Apicize Tauri desktop application. The suite drives
the **release binary** through [WebdriverIO](https://webdriver.io/) +
[`tauri-driver`](https://tauri.app/develop/tests/webdriver/) (WebKitWebDriver on
Linux) and exercises the app the way a user would: opening a workbook,
navigating the tree, editing requests, running them against a real backend, and
inspecting results.

A local, deterministic backend is provided by Docker: it runs the **actual
Lambda handlers** from
[apicize/apicize-api-samples](https://github.com/apicize/apicize-api-samples)
behind a small API Gateway emulator, backed by DynamoDB Local. It listens on
`http://localhost:3000`, which matches the "Local Development" scenario in the
bundled demo workbook. A **SOCKS5 proxy** (host port 1080) runs alongside it for
proxy testing.

The docker services share a fixed-subnet network (172.28.5.0/24) with static IPs
(api `172.28.5.10`, socks `172.28.5.20`). The API exposes a `/whoami` endpoint
reporting the observed client address, so the proxy test can prove routing: a
request sent through the SOCKS proxy is seen coming from `172.28.5.20`, while a
direct request is seen from the docker gateway `172.28.5.1`.

## Layout

```
e2e/
├── docker/                     # Local sample-API backend
│   ├── docker-compose.yml      # api + dynamodb + socks services
│   ├── Dockerfile              # runs the vendored Lambda handlers
│   └── api/
│       ├── server.mjs          # API Gateway emulator (imports real handlers)
│       ├── init-dynamo.mjs     # creates the token/quote tables
│       └── src/                # vendored handlers from apicize-api-samples
├── tests/
│   ├── fixtures/               # .apicize workbooks used by the specs
│   ├── helpers/app.ts          # app bootstrap (open workbook via IPC, waits)
│   ├── pageobjects/            # navigation / request-editor / results / editors
│   └── specs/                  # the test specs (run in filename order)
├── wdio.conf.ts                # WebdriverIO config (launches tauri-driver)
└── package.json
```

## Prerequisites

1. **Docker** (for the sample API + DynamoDB Local).
2. **tauri-driver** and **WebKitWebDriver**:
   ```bash
   cargo install tauri-driver --locked
   sudo apt install webkit2gtk-driver      # provides /usr/bin/WebKitWebDriver
   ```
3. **A display.** WebKitWebDriver drives a real webview window, so a running X
   display is required. On a headless machine, wrap the run in `xvfb-run`.
4. **The release binary**, built with the test hooks:
   ```bash
   # from the repo root
   yarn build:prod
   ```
   This produces `app/src-tauri/target/release/apicize`, which the suite launches.

> The suite deliberately runs against the **release** binary (Tauri custom
> protocol origin), not the dev server. If you point it at a dev build the
> bootstrap will fail fast with a clear message.

## Running

Start the backend, then run the specs:

```bash
# from the repo root
yarn workspace apicize-e2e api:up      # build + start docker (api on :3000)
yarn workspace apicize-e2e test        # run the WebdriverIO suite
yarn workspace apicize-e2e api:down    # stop docker, remove volumes
```

Or all-in-one (builds the binary, brings docker up, runs, tears docker down):

```bash
yarn test:e2e:full
```

Run a single spec:

```bash
cd e2e
yarn wdio run wdio.conf.ts --spec tests/specs/03-execution.spec.ts
```

Useful docker helpers:

```bash
yarn workspace apicize-e2e api:logs    # tail the api container logs
```

## What is covered

| Spec | Area |
|------|------|
| `01-launch-and-navigation` | App launch, workbook load, tree rendering, group/section expansion, selection |
| `02-request-editor` | Request fields (method/url/name), Body & Test tabs, editing + tree sync |
| `03-execution` | Running requests/groups against the sample API, status codes, per-test pass/fail, mixed results, clearing |
| `04-parameter-editors` | Scenario and OAuth2 authorization editors, renaming |
| `05-entity-crud` | Add a request via the section menu, configure body/method, run it, delete via the confirmation dialog |
| `06-settings` | Settings panels (Workspace Defaults / Application), toggle behavior |
| `07-graphql-and-viewers` | GraphQL mutation execution, raw-body and response-header viewers |
| `08-navigation-hierarchy` | Add group/subgroup, move requests into/between groups, reorder, and the guard preventing a group being moved into its own descendant (drag-and-drop) |
| `09-stress` | Concurrent-execution stability / no crash-or-deadlock |
| `10-parameter-persistence` | Move scenarios/authorizations/certificates/proxies between the Public / Private / Vault subsections (drag-and-drop) |
| `11-proxy` | Route a request through the SOCKS5 proxy and prove it (client IP = proxy) vs. a direct request (client IP = gateway) |
| `12-data-sets` | Create internal-JSON / external-JSON / external-CSV data sets and convert between all three types (JSON↔CSV round-trip, JSON↔external-JSON) |

## How the backend works

The sample API is deployed to AWS with SAM; there is no upstream Dockerfile. To
get a faithful yet containerized backend, `docker/api/server.mjs` imports the
**unmodified** Lambda handlers (`docker/api/src/`, vendored from the samples
repo) and reproduces what API Gateway does for them:

- request bodies are base64-encoded (`BinaryMediaTypes: '*/*'`),
- `event.headers` / `event.path` / `event.httpMethod` / `event.resource` /
  `event.pathParameters` are populated per the SAM routes,
- responses with `isBase64Encoded` are decoded back to raw bytes.

DynamoDB access uses the default AWS SDK client with the endpoint supplied via
`AWS_ENDPOINT_URL_DYNAMODB` (pointing at the `dynamodb` container). The cipher
key and table names match `env.example.json` from the samples repo. The DynamoDB
host port is published on `8009` (not `8000`) to avoid clashing with the app's
default PKCE listener; the api container reaches DynamoDB over the internal
docker network regardless.

## Test hooks in the app

The UI had no stable test selectors, so a small number of `data-testid`
attributes were added (navigation item names, result test outcomes/status,
result summary counts, the confirmation dialog buttons, and the toast). Most
interactions rely on pre-existing `id`/`aria-label`/`value` attributes. The page
objects in `tests/pageobjects/` centralize all selectors.

## Notes / gotchas

- Specs bootstrap by opening a fixture via the `open_workspace` Tauri IPC
  command (see `tests/helpers/app.ts`), which makes the running window rebuild
  its workspace from the fixture — no native file dialog needed.
- Monaco editors (body, test script, response viewers) are read/written via the
  `.monaco-editor` container, not plain inputs.
- Drag-and-drop (moving requests/groups, and parameters between Public/Private/
  Vault) is driven by the `@dnd-kit` MouseSensor. The page object performs it
  with a single W3C pointer-action chain of small discrete moves + pauses (see
  `navigation.page.ts` `performDrag`) so the sensor's 8px activation and
  `onDragMove` tracking fire reliably. Cyclic-move prevention lives in the
  drag layer (`positionFromEvent`), so it is only exercised through real drags,
  not by calling store/IPC move methods.
- The suite launches one app instance per spec file, so specs are isolated from
  each other.
- Data-set type conversion (JSON ↔ external JSON ↔ external CSV) happens
  in-memory via the Type select, so it is fully testable. Persisting an external
  data set to disk uses a native file dialog and is therefore out of scope for
  automated UI testing; the data-set tests exercise creation, conversion, and
  CSV grid editing without touching the filesystem.
