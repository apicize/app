// Lightweight API Gateway emulator for the Apicize sample API.
//
// This imports the REAL Lambda handlers vendored from
// https://github.com/apicize/apicize-api-samples (under ./src) and wires them
// up behind a plain Node HTTP server, reproducing the request/response shaping
// that AWS API Gateway performs so the handlers run unmodified:
//   - The REST API is configured with BinaryMediaTypes '*/*', so API Gateway
//     base64-encodes every request body. The handlers decode with
//     Buffer.from(event.body, 'base64'). We reproduce that here.
//   - Responses with isBase64Encoded === true are decoded back to raw bytes.
//   - event.headers, event.path, event.httpMethod, event.resource and
//     event.pathParameters are populated to match the SAM template routes.
//
// DynamoDB access uses the default AWS SDK client; the endpoint is supplied via
// the AWS_ENDPOINT_URL_DYNAMODB environment variable (see docker-compose.yml).

import { createServer } from 'node:http'
import { issueTokenHandler } from './src/issue-token/issue-token.mjs'
import { imageRotateHandler } from './src/image/image.mjs'
import { calcHandler } from './src/calc/calc.mjs'
import { quotesHandler } from './src/quotes/quotes.mjs'
import { quotesGraphQLHandler } from './src/quotes-graphql/quotes-graphql.mjs'

const PORT = parseInt(process.env.PORT ?? '3000', 10)

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Build an API-Gateway-proxy-style event from an incoming HTTP request.
function buildEvent(req, rawBody, { resource, path, pathParameters }) {
  const headers = {}
  for (const [name, value] of Object.entries(req.headers)) {
    headers[name] = Array.isArray(value) ? value.join(',') : value
  }
  return {
    httpMethod: req.method,
    resource,
    path,
    pathParameters,
    headers,
    // API Gateway with BinaryMediaTypes '*/*' base64-encodes the body
    body: rawBody.length > 0 ? rawBody.toString('base64') : '',
    isBase64Encoded: true,
  }
}

function sendResult(res, result) {
  const headers = result.headers ?? {}
  const status = result.statusCode ?? 200
  let body = result.body

  if (result.isBase64Encoded) {
    body = Buffer.from(String(body), 'base64')
  } else if (typeof body !== 'string' && !Buffer.isBuffer(body)) {
    // calc returns a raw number for text responses
    body = String(body)
  }

  res.writeHead(status, headers)
  res.end(body)
}

// Route table matched in order. Each route yields the extra event fields.
function match(method, pathname) {
  if (method === 'POST' && pathname === '/token') {
    return { handler: issueTokenHandler, extra: { resource: '/token', path: '/token', pathParameters: null } }
  }
  if (method === 'POST' && /^\/image\/(right|flip|left)$/.test(pathname)) {
    return { handler: imageRotateHandler, extra: { resource: pathname, path: pathname, pathParameters: null } }
  }
  if (method === 'POST' && pathname === '/calc') {
    return { handler: calcHandler, extra: { resource: '/calc', path: '/calc', pathParameters: null } }
  }
  // /quote/graphql must be checked before the /quote/{id} routes
  if (method === 'POST' && pathname === '/quote/graphql') {
    return { handler: quotesGraphQLHandler, extra: { resource: '/quote/graphql', path: '/quote/graphql', pathParameters: null } }
  }
  if (method === 'POST' && pathname === '/quote') {
    return { handler: quotesHandler, extra: { resource: '/quote', path: '/quote', pathParameters: null } }
  }
  const quoteId = pathname.match(/^\/quote\/([^/]+)$/)
  if (quoteId && ['GET', 'PUT', 'DELETE'].includes(method)) {
    return {
      handler: quotesHandler,
      extra: { resource: '/quote/{id}', path: pathname, pathParameters: { id: decodeURIComponent(quoteId[1]) } },
    }
  }
  return null
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const pathname = url.pathname

    // Health check for docker-compose / wait scripts
    if (req.method === 'GET' && pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok' }))
      return
    }

    // Reports the observed client address. Used by the proxy e2e test: when a
    // request is routed through the SOCKS proxy, the address is the proxy
    // container's IP rather than the docker gateway, proving the proxy was used.
    if (req.method === 'GET' && pathname === '/whoami') {
      const raw = req.socket.remoteAddress ?? ''
      const remoteAddress = raw.replace(/^::ffff:/, '') // normalize IPv4-mapped IPv6
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ remoteAddress }))
      return
    }

    const route = match(req.method, pathname)
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: `No route for ${req.method} ${pathname}` }))
      return
    }

    const rawBody = await readBody(req)
    const event = buildEvent(req, rawBody, route.extra)
    const result = await route.handler(event)
    sendResult(res, result)
  } catch (e) {
    console.error('Unhandled error:', e)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: `${e}` }))
  }
})

server.listen(PORT, () => {
  console.log(`Apicize sample API emulator listening on http://0.0.0.0:${PORT}`)
})
